
-- Coluna nova para guardar metadados da grade horária por indicação (disciplina/dia/horário)
ALTER TABLE public.hr_school_indications
  ADD COLUMN IF NOT EXISTS candidato_grade jsonb;

-- Atualiza a RPC para gravar candidato_grade quando vier no payload (retro-compatível)
CREATE OR REPLACE FUNCTION public.submit_school_indication_full(
  p_token text,
  p_keyword text,
  p_course_id uuid,
  p_classes jsonb,
  p_indications jsonb,
  p_indicado_por_nome text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_link RECORD;
  v_org uuid;
  v_school uuid;
  v_class jsonb;
  v_class_id uuid;
  v_class_ids uuid[] := ARRAY[]::uuid[];
  v_ind jsonb;
  v_count int := 0;
  v_indicado text;
  v_grade jsonb;
  v_disciplinas jsonb;
BEGIN
  SELECT * INTO v_link
    FROM external_links
   WHERE token = p_token
     AND content_type = 'hr_school_indication'
     AND is_active = true
   LIMIT 1;
  IF v_link IS NULL THEN
    RAISE EXCEPTION 'Link inválido';
  END IF;

  IF NOT public.is_active_quarterly_keyword(v_link.organization_id, p_keyword) THEN
    RAISE EXCEPTION 'Palavra-chave inválida ou expirada';
  END IF;

  v_org := v_link.organization_id;
  v_school := v_link.school_id;
  v_indicado := nullif(trim(coalesce(p_indicado_por_nome, '')), '');
  IF v_indicado IS NULL THEN
    v_indicado := 'Diretor da escola';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM course_schools
     WHERE school_id = v_school AND course_id = p_course_id
  ) THEN
    RAISE EXCEPTION 'Curso não vinculado à escola';
  END IF;

  FOR v_class IN SELECT * FROM jsonb_array_elements(p_classes) LOOP
    INSERT INTO hr_indication_classes(
      organization_id, external_link_id, school_id, course_id,
      nome, turno, qtd_professores_indicados
    ) VALUES (
      v_org, v_link.id, v_school, p_course_id,
      coalesce(v_class->>'nome', ''),
      coalesce(v_class->>'turno', 'manha'),
      coalesce((v_class->>'qtd')::int, 3)
    )
    RETURNING id INTO v_class_id;
    v_class_ids := v_class_ids || v_class_id;
  END LOOP;

  FOR v_ind IN SELECT * FROM jsonb_array_elements(p_indications) LOOP
    IF nullif(trim(coalesce(v_ind->>'telefone', '')), '') IS NULL THEN
      RAISE EXCEPTION 'Telefone obrigatório para todos os professores indicados';
    END IF;
    IF nullif(trim(coalesce(v_ind->>'nome', '')), '') IS NULL THEN
      RAISE EXCEPTION 'Nome obrigatório para todos os professores indicados';
    END IF;

    -- candidato_grade: metadados opcionais (subject_id, weekday, time_slot_label, turno)
    v_grade := v_ind->'grade';
    -- candidato_disciplinas: aceita string (legado: PEM/UCI/...) ou array (novo)
    IF (v_ind ? 'disciplinas') THEN
      v_disciplinas := v_ind->'disciplinas';
    ELSE
      v_disciplinas := to_jsonb(nullif(trim(coalesce(v_ind->>'funcao', '')), ''));
    END IF;

    INSERT INTO hr_school_indications(
      organization_id, external_link_id, school_id, course_id,
      indication_class_id,
      candidato_nome, candidato_telefone, candidato_email,
      candidato_formacao,
      indicado_por_nome,
      origem,
      status,
      candidato_disciplinas,
      candidato_grade
    ) VALUES (
      v_org, v_link.id, v_school, p_course_id,
      v_class_ids[(v_ind->>'class_index')::int + 1],
      trim(v_ind->>'nome'),
      trim(v_ind->>'telefone'),
      nullif(trim(coalesce(v_ind->>'email', '')), ''),
      nullif(trim(coalesce(v_ind->>'formacao', '')), ''),
      v_indicado,
      'PORTAL_ESCOLA',
      'PENDENTE'::hr_indication_status,
      v_disciplinas,
      v_grade
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'classes', coalesce(array_length(v_class_ids, 1), 0),
    'indications', v_count
  );
END;
$function$;
