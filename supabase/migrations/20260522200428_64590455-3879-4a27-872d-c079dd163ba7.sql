REVOKE EXECUTE ON FUNCTION public.materialize_grade_from_indications(uuid, text, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.materialize_grade_from_indications(uuid, text, boolean, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.materialize_grade_from_indications(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.materialize_grade_from_indications(uuid, text, boolean, jsonb) TO authenticated;