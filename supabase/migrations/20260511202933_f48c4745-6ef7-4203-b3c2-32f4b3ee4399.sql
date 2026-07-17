DROP FUNCTION public.list_school_indication_links();

CREATE OR REPLACE FUNCTION public.list_school_indication_links()
RETURNS TABLE(
  link_id uuid,
  school_id uuid,
  school_nome text,
  qtd_cursos integer,
  token text,
  keyword text,
  is_active boolean,
  expires_at timestamp with time zone,
  created_at timestamp with time zone,
  qtd_indicacoes integer,
  qtd_turmas integer,
  qtd_professores integer,
  qtd_aulas integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    (SELECT count(*)::int FROM hr_school_indications hi WHERE hi.external_link_id = el.id) AS qtd_aulas
  FROM external_links el
  JOIN schools s ON s.id = el.school_id
  WHERE el.organization_id = v_org
    AND el.content_type = 'hr_school_indication'
  ORDER BY s.nome;
END;
$function$;