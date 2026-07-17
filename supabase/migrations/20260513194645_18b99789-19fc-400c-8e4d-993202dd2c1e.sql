-- 1) Coluna submitted_at em external_links
ALTER TABLE public.external_links
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

-- Backfill: links que já tinham indicações ficam marcados como enviados
UPDATE public.external_links el
   SET submitted_at = sub.first_at
  FROM (
    SELECT external_link_id, min(created_at) AS first_at
      FROM public.hr_school_indications
     WHERE external_link_id IS NOT NULL
     GROUP BY external_link_id
  ) sub
 WHERE sub.external_link_id = el.id
   AND el.submitted_at IS NULL
   AND el.content_type = 'hr_school_indication';

-- 2) Trigger: marca submitted_at quando o diretor submete indicações
CREATE OR REPLACE FUNCTION public.mark_external_link_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.external_link_id IS NOT NULL THEN
    UPDATE public.external_links
       SET submitted_at = now()
     WHERE id = NEW.external_link_id
       AND submitted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_external_link_submitted ON public.hr_school_indications;
CREATE TRIGGER trg_mark_external_link_submitted
AFTER INSERT ON public.hr_school_indications
FOR EACH ROW
EXECUTE FUNCTION public.mark_external_link_submitted();

-- 3) RPC: reabrir indicações de uma escola (admin/coordenador)
CREATE OR REPLACE FUNCTION public.reopen_school_indication(
  p_link_id uuid,
  p_motivo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_link RECORD;
  v_user uuid := auth.uid();
  v_role text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Informe um motivo (mínimo 5 caracteres) para reabrir.';
  END IF;

  SELECT * INTO v_link
    FROM public.external_links
   WHERE id = p_link_id
     AND content_type = 'hr_school_indication'
   LIMIT 1;
  IF v_link IS NULL THEN
    RAISE EXCEPTION 'Link não encontrado';
  END IF;

  -- Permissão: admin ou coordenador da organização
  SELECT role::text INTO v_role
    FROM public.user_roles
   WHERE user_id = v_user
     AND organization_id = v_link.organization_id
     AND role IN ('admin','coordenador')
   LIMIT 1;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Apenas Administrador ou Coordenador pode reabrir os horários.';
  END IF;

  IF v_link.materialized_at IS NOT NULL THEN
    RAISE EXCEPTION 'A grade desta escola já foi materializada. Desmaterialize antes de reabrir.';
  END IF;

  UPDATE public.external_links
     SET submitted_at = NULL,
         is_active   = true
   WHERE id = p_link_id;

  -- Auditoria (best-effort, não falha o fluxo principal)
  BEGIN
    INSERT INTO public.audit_events (
      organization_id, event_type, entity_type, entity_id, actor_user_id, payload
    ) VALUES (
      v_link.organization_id,
      'RH_LINK_REOPENED',
      'external_link',
      p_link_id,
      v_user,
      jsonb_build_object(
        'school_id', v_link.school_id,
        'motivo', p_motivo,
        'reopened_at', now()
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'link_id', p_link_id,
    'token', v_link.token,
    'reopened_at', now()
  );
END;
$$;

-- 4) Atualiza list_school_indication_links para incluir submitted_at
DROP FUNCTION IF EXISTS public.list_school_indication_links();

CREATE OR REPLACE FUNCTION public.list_school_indication_links()
 RETURNS TABLE(
   link_id uuid, school_id uuid, school_nome text, qtd_cursos integer,
   token text, keyword text, is_active boolean, expires_at timestamp with time zone,
   created_at timestamp with time zone, qtd_indicacoes integer, qtd_turmas integer,
   qtd_professores integer, qtd_aulas integer,
   qtd_aprovadas integer, qtd_pendentes integer, qtd_recusadas integer,
   materialized_at timestamp with time zone, materialized_ano_letivo text,
   submitted_at timestamp with time zone
 )
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_org UUID;
BEGIN
  SELECT organization_id INTO v_org FROM profiles WHERE user_id = auth.uid() LIMIT 1;
  IF v_org IS NULL THEN
    SELECT organization_id INTO v_org FROM profiles WHERE id = auth.uid() LIMIT 1;
  END IF;
  IF v_org IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    el.id AS link_id,
    s.id AS school_id,
    s.nome AS school_nome,
    (SELECT count(*)::int
       FROM course_schools cs
       JOIN courses c ON c.id = cs.course_id
      WHERE cs.school_id = s.id AND c.status = 'ativo') AS qtd_cursos,
    el.token,
    NULL::text AS keyword,
    el.is_active,
    el.expires_at,
    el.created_at,
    (SELECT count(*)::int FROM hr_school_indications hi WHERE hi.external_link_id = el.id) AS qtd_indicacoes,
    (SELECT count(*)::int FROM hr_indication_classes hc WHERE hc.external_link_id = el.id) AS qtd_turmas,
    (SELECT count(DISTINCT COALESCE(
        NULLIF(lower(hi.candidato_email), ''),
        NULLIF(hi.candidato_telefone, ''),
        hi.id::text
      ))::int
       FROM hr_school_indications hi
      WHERE hi.external_link_id = el.id) AS qtd_professores,
    (SELECT count(*)::int FROM hr_school_indications hi WHERE hi.external_link_id = el.id) AS qtd_aulas,
    (SELECT count(*)::int FROM hr_school_indications hi
      WHERE hi.external_link_id = el.id AND hi.status = 'APROVADA') AS qtd_aprovadas,
    (SELECT count(*)::int FROM hr_school_indications hi
      WHERE hi.external_link_id = el.id AND hi.status IN ('PENDENTE','EM_ANALISE')) AS qtd_pendentes,
    (SELECT count(*)::int FROM hr_school_indications hi
      WHERE hi.external_link_id = el.id AND hi.status = 'RECUSADA') AS qtd_recusadas,
    el.materialized_at,
    el.materialized_ano_letivo,
    el.submitted_at
  FROM external_links el
  JOIN schools s ON s.id = el.school_id
  WHERE el.organization_id = v_org
    AND el.content_type = 'hr_school_indication'
  ORDER BY s.nome;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.reopen_school_indication(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_school_indication_links() TO authenticated;