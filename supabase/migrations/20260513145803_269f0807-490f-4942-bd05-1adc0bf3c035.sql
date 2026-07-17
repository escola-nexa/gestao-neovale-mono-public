-- Helper to normalize phone (digits only)
CREATE OR REPLACE FUNCTION public._digits_only(p text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT regexp_replace(coalesce(p,''), '\D', '', 'g')
$$;

-- Index to speed up cross-school active overlap lookups
CREATE INDEX IF NOT EXISTS idx_wtm_org_weekday_active
  ON public.weekly_teaching_models (organization_id, weekday, professor_id)
  WHERE status = 'ACTIVE';

-- RPC: check cross-school teacher conflicts for a portal-of-director session
CREATE OR REPLACE FUNCTION public.check_teacher_external_conflicts(
  p_token   text,
  p_keyword text,
  p_candidates jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_link   RECORD;
  v_result jsonb := '[]'::jsonb;
  v_cand   RECORD;
  v_conflicts jsonb;
  v_weekday weekday;
BEGIN
  -- Validate link (same pattern as get_school_indication_link_info)
  SELECT * INTO v_link FROM external_links
   WHERE token = p_token
     AND content_type = 'hr_school_indication'
     AND is_active = true
   LIMIT 1;
  IF v_link IS NULL THEN
    RETURN jsonb_build_object('error', 'Link inválido ou expirado');
  END IF;
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'Link expirado');
  END IF;
  IF NOT public.is_active_quarterly_keyword(v_link.organization_id, p_keyword) THEN
    RETURN jsonb_build_object('error', 'Palavra-chave inválida ou expirada');
  END IF;

  IF p_candidates IS NULL OR jsonb_typeof(p_candidates) <> 'array' THEN
    RETURN jsonb_build_object('conflicts', '[]'::jsonb);
  END IF;

  -- Iterate over each candidate
  FOR v_cand IN
    SELECT
      (c->>'slot_id')        AS slot_id,
      btrim(c->>'teacher_name')  AS teacher_name,
      _digits_only(c->>'teacher_phone') AS phone_digits,
      (c->>'weekday')        AS weekday_txt,
      (c->>'start_time')::time AS start_time,
      (c->>'end_time')::time   AS end_time
    FROM jsonb_array_elements(p_candidates) AS c
  LOOP
    IF v_cand.teacher_name IS NULL OR length(v_cand.teacher_name) = 0 THEN CONTINUE; END IF;
    IF v_cand.weekday_txt IS NULL THEN CONTINUE; END IF;

    -- Map weekday FE codes (MON..FRI) to enum
    v_weekday := CASE upper(v_cand.weekday_txt)
      WHEN 'MON' THEN 'SEGUNDA'::weekday
      WHEN 'TUE' THEN 'TERCA'::weekday
      WHEN 'WED' THEN 'QUARTA'::weekday
      WHEN 'THU' THEN 'QUINTA'::weekday
      WHEN 'FRI' THEN 'SEXTA'::weekday
      ELSE NULL
    END;
    IF v_weekday IS NULL THEN CONTINUE; END IF;

    SELECT coalesce(jsonb_agg(jsonb_build_object(
        'professor_id',  p.id,
        'professor_name', p.full_name,
        'school_id',     wtm.school_id,
        'school_name',   sc.nome,
        'class_group_id', wtm.class_group_id,
        'class_name',    cg.nome,
        'subject_id',    wtm.subject_id,
        'subject_name',  COALESCE(NULLIF(btrim(sj.nome_boletim), ''), sj.nome),
        'weekday',       wtm.weekday::text,
        'start_time',    to_char(wtm.start_time, 'HH24:MI'),
        'end_time',      to_char(wtm.end_time, 'HH24:MI'),
        'overlap_start', to_char(GREATEST(wtm.start_time, v_cand.start_time), 'HH24:MI'),
        'overlap_end',   to_char(LEAST(wtm.end_time,   v_cand.end_time), 'HH24:MI'),
        'schedule_type', wtm.schedule_type::text
    )), '[]'::jsonb) INTO v_conflicts
    FROM professors p
    JOIN weekly_teaching_models wtm
      ON wtm.professor_id = p.id
     AND wtm.status = 'ACTIVE'
     AND wtm.weekday = v_weekday
     AND wtm.start_time < v_cand.end_time
     AND wtm.end_time   > v_cand.start_time
    LEFT JOIN schools sc      ON sc.id = wtm.school_id
    LEFT JOIN class_groups cg ON cg.id = wtm.class_group_id
    LEFT JOIN subjects sj     ON sj.id = wtm.subject_id
    WHERE p.organization_id = v_link.organization_id
      AND p.deleted_at IS NULL
      AND p.status = 'ativo'
      AND lower(btrim(p.full_name)) = lower(v_cand.teacher_name)
      AND (
            -- match by phone digits when both sides have phone, else fall back to name only
            v_cand.phone_digits = '' 
         OR _digits_only(p.phone) = '' 
         OR _digits_only(p.phone) = v_cand.phone_digits
          )
      AND wtm.school_id <> v_link.school_id;

    IF jsonb_array_length(v_conflicts) > 0 THEN
      v_result := v_result || jsonb_build_object(
        'slot_id',       v_cand.slot_id,
        'teacher_name',  v_cand.teacher_name,
        'weekday',       v_cand.weekday_txt,
        'start_time',    to_char(v_cand.start_time, 'HH24:MI'),
        'end_time',      to_char(v_cand.end_time,   'HH24:MI'),
        'conflicts',     v_conflicts
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('conflicts', v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_teacher_external_conflicts(text, text, jsonb) TO anon, authenticated;