
CREATE OR REPLACE FUNCTION public.get_student_duplicates(p_org_id uuid)
RETURNS TABLE (
  tipo text,
  valor_normalizado text,
  group_count integer,
  student_id uuid,
  nome_completo text,
  codigo_matricula text,
  cpf text,
  status text,
  created_at timestamptz,
  schools jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Authorization: only admin or coordenador of the same org
  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'coordenador'::app_role)
    OR public.has_role(auth.uid(), 'rh'::app_role)
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      s.id,
      s.nome_completo,
      s.codigo_matricula,
      s.cpf,
      s.status::text AS status,
      s.created_at,
      NULLIF(upper(btrim(s.codigo_matricula)), '') AS mat_norm,
      NULLIF(regexp_replace(coalesce(s.cpf, ''), '\D', '', 'g'), '') AS cpf_norm
    FROM public.students s
    WHERE s.organization_id = p_org_id
  ),
  dup_mat AS (
    SELECT mat_norm AS valor, count(*)::int AS qtd
    FROM base
    WHERE mat_norm IS NOT NULL
    GROUP BY mat_norm
    HAVING count(*) > 1
  ),
  dup_cpf AS (
    SELECT cpf_norm AS valor, count(*)::int AS qtd
    FROM base
    WHERE cpf_norm IS NOT NULL AND length(cpf_norm) = 11
    GROUP BY cpf_norm
    HAVING count(*) > 1
  ),
  rows_mat AS (
    SELECT 'matricula'::text AS tipo, d.valor AS valor_normalizado, d.qtd AS group_count,
           b.id AS student_id, b.nome_completo, b.codigo_matricula, b.cpf, b.status, b.created_at
    FROM dup_mat d
    JOIN base b ON b.mat_norm = d.valor
  ),
  rows_cpf AS (
    SELECT 'cpf'::text AS tipo, d.valor AS valor_normalizado, d.qtd AS group_count,
           b.id AS student_id, b.nome_completo, b.codigo_matricula, b.cpf, b.status, b.created_at
    FROM dup_cpf d
    JOIN base b ON b.cpf_norm = d.valor
  ),
  unioned AS (
    SELECT * FROM rows_mat
    UNION ALL
    SELECT * FROM rows_cpf
  )
  SELECT
    u.tipo,
    u.valor_normalizado,
    u.group_count,
    u.student_id,
    u.nome_completo,
    u.codigo_matricula,
    u.cpf,
    u.status,
    u.created_at,
    COALESCE((
      SELECT jsonb_agg(DISTINCT jsonb_build_object('id', sc.id, 'nome', sc.nome))
      FROM public.enrollments e
      JOIN public.schools sc ON sc.id = e.school_id
      WHERE e.student_id = u.student_id AND e.status = 'ativa'
    ), '[]'::jsonb) AS schools
  FROM unioned u
  ORDER BY u.tipo, u.valor_normalizado, u.nome_completo;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_duplicates(uuid) TO authenticated;
