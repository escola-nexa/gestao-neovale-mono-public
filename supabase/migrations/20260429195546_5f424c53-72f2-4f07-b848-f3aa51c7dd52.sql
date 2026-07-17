REVOKE EXECUTE ON FUNCTION public.is_hr_manager(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_hr_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_hr_manager(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_hr_admin(UUID) TO authenticated;