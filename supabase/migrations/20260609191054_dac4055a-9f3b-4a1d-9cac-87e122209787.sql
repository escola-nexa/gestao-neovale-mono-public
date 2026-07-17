CREATE OR REPLACE FUNCTION public.get_student_import_conflicts(p_org_id uuid)
RETURNS TABLE(
  batch_id uuid,
  row_number int,
  attempted_name text,
  attempted_matricula text,
  error_message text,
  attempted_at timestamptz,
  existing_student_id uuid,
  existing_name text,
  existing_matricula text,
  existing_cpf text,
  existing_status text,
  existing_schools jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'coordenador'::app_role)
    OR public.has_role(auth.uid(), 'rh'::app_role)
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    r.batch_id,
    r.row_number,
    r.student_name AS attempted_name,
    r.codigo_matricula AS attempted_matricula,
    r.error_message,
    r.created_at AS attempted_at,
    s.id AS existing_student_id,
    s.nome_completo AS existing_name,
    s.codigo_matricula AS existing_matricula,
    s.cpf AS existing_cpf,
    s.status::text AS existing_status,
    COALESCE((
      SELECT jsonb_agg(DISTINCT jsonb_build_object('id', sc.id, 'nome', sc.nome))
      FROM public.enrollments e
      JOIN public.schools sc ON sc.id = e.school_id
      WHERE e.student_id = s.id AND e.status = 'ativa'
    ), '[]'::jsonb) AS existing_schools
  FROM public.import_batch_rows r
  JOIN public.import_batches b ON b.id = r.batch_id
  LEFT JOIN public.students s
    ON s.organization_id = b.organization_id
   AND NULLIF(upper(btrim(s.codigo_matricula)),'') = NULLIF(upper(btrim(r.codigo_matricula)),'')
  WHERE b.organization_id = p_org_id
    AND r.status = 'ERROR'
    AND (
      r.error_message ILIKE '%duplicate key%'
      OR r.error_message ILIKE '%duplicad%'
      OR r.error_message ILIKE '%unique%'
      OR r.error_message ILIKE '%já existe%'
    )
  ORDER BY r.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_import_conflicts(uuid) TO authenticated, service_role;