CREATE OR REPLACE FUNCTION public.get_professors_with_authorized_doc_access(_organization_id uuid)
RETURNS TABLE(professor_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT (el.scope_json->>'professor_id')::uuid AS professor_id
  FROM public.external_links el
  JOIN public.external_access_logs eal ON eal.external_link_id = el.id
  WHERE el.content_type = 'documentos_professor'
    AND el.organization_id = _organization_id
    AND el.scope_json ? 'professor_id'
    AND eal.access_status = 'authorized'
$$;

GRANT EXECUTE ON FUNCTION public.get_professors_with_authorized_doc_access(uuid) TO authenticated;