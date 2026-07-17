
-- Parte 10: Hardening RLS, permissões e validações finais

-- 1) teacher_substitution_requests: bloquear DELETE físico (usar cancelamento)
DROP POLICY IF EXISTS tsr_delete ON public.teacher_substitution_requests;
CREATE POLICY tsr_no_delete
ON public.teacher_substitution_requests
FOR DELETE
USING (false);

-- 2) teacher_substitution_payments: bloquear DELETE
DROP POLICY IF EXISTS tsp_delete ON public.teacher_substitution_payments;
CREATE POLICY tsp_no_delete
ON public.teacher_substitution_payments
FOR DELETE
USING (false);

-- 3) teacher_substitution_settings: restringir SELECT a Admin/Coord/RH
DROP POLICY IF EXISTS tss_select ON public.teacher_substitution_settings;
CREATE POLICY tss_select
ON public.teacher_substitution_settings
FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'coordenador'::app_role)
    OR has_role(auth.uid(), 'rh'::app_role)
  )
);

-- 4) teacher_substitution_audit_logs: garantir bloqueio explícito de UPDATE/DELETE
DROP POLICY IF EXISTS tsa_no_update ON public.teacher_substitution_audit_logs;
DROP POLICY IF EXISTS tsa_no_delete ON public.teacher_substitution_audit_logs;
CREATE POLICY tsa_no_update
ON public.teacher_substitution_audit_logs
FOR UPDATE
USING (false);
CREATE POLICY tsa_no_delete
ON public.teacher_substitution_audit_logs
FOR DELETE
USING (false);

-- 5) teacher_substitution_status_history: imutável (sem UPDATE/DELETE)
DROP POLICY IF EXISTS tsh_no_update ON public.teacher_substitution_status_history;
DROP POLICY IF EXISTS tsh_no_delete ON public.teacher_substitution_status_history;
CREATE POLICY tsh_no_update
ON public.teacher_substitution_status_history
FOR UPDATE
USING (false);
CREATE POLICY tsh_no_delete
ON public.teacher_substitution_status_history
FOR DELETE
USING (false);

-- 6) Trigger de validação: travar alteração de valores em pagamento já pago
CREATE OR REPLACE FUNCTION public.validate_teacher_substitution_payment_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.status = 'paid'
     AND (
       NEW.total_amount IS DISTINCT FROM OLD.total_amount
       OR NEW.hours IS DISTINCT FROM OLD.hours
       OR NEW.hourly_rate IS DISTINCT FROM OLD.hourly_rate
       OR NEW.substitute_professor_id IS DISTINCT FROM OLD.substitute_professor_id
     )
  THEN
    RAISE EXCEPTION 'Não é permitido alterar valor, horas, taxa ou substituto de um pagamento já marcado como pago.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_teacher_substitution_payment_lock
  ON public.teacher_substitution_payments;
CREATE TRIGGER trg_teacher_substitution_payment_lock
BEFORE UPDATE ON public.teacher_substitution_payments
FOR EACH ROW
EXECUTE FUNCTION public.validate_teacher_substitution_payment_lock();

-- 7) Trigger de validação: bloquear total_amount negativo (defesa em profundidade)
CREATE OR REPLACE FUNCTION public.validate_teacher_substitution_payment_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.total_amount IS NOT NULL AND NEW.total_amount < 0 THEN
    RAISE EXCEPTION 'O valor total do pagamento não pode ser negativo.'
      USING ERRCODE = '22023';
  END IF;
  IF NEW.hours IS NOT NULL AND NEW.hours < 0 THEN
    RAISE EXCEPTION 'A quantidade de horas não pode ser negativa.'
      USING ERRCODE = '22023';
  END IF;
  IF NEW.hourly_rate IS NOT NULL AND NEW.hourly_rate < 0 THEN
    RAISE EXCEPTION 'A taxa hora-aula não pode ser negativa.'
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_teacher_substitution_payment_amount_check
  ON public.teacher_substitution_payments;
CREATE TRIGGER trg_teacher_substitution_payment_amount_check
BEFORE INSERT OR UPDATE ON public.teacher_substitution_payments
FOR EACH ROW
EXECUTE FUNCTION public.validate_teacher_substitution_payment_amount();
