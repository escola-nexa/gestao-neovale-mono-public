CREATE OR REPLACE FUNCTION public.is_coordinator(user_uuid uuid, org_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_uuid 
    AND organization_id = org_uuid 
    AND role IN ('coordenador', 'admin', 'rh')
  )
$function$;