CREATE OR REPLACE FUNCTION public.audit_teacher_planning_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_planning_action(
      NEW.organization_id,
      NEW.pre_planning_id,
      NEW.id,
      CASE NEW.status::text
        WHEN 'DRAFT' THEN 'EDIT_STARTED'
        WHEN 'ENVIADO' THEN 'SUBMITTED'
        WHEN 'PENDING' THEN 'SUBMITTED'
        WHEN 'DEVOLVIDO' THEN 'RETURNED'
        WHEN 'REJECTED' THEN 'RETURNED'
        WHEN 'AGUARDANDO_ASSINATURA' THEN 'AWAITING_SIGNATURE'
        WHEN 'ASSINADO' THEN 'SIGNED'
        WHEN 'APPROVED' THEN 'SIGNED'
        WHEN 'CONCLUIDO' THEN 'COMPLETED'
        ELSE 'STATUS_CHANGED'
      END,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'changed_at', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;