
-- =========================================================
-- Parte 10: Hardening RLS + invariantes do módulo Presença
-- =========================================================

-- ---------- Audit logs: imutáveis ----------
DROP POLICY IF EXISTS "Audit logs no update" ON public.teacher_attendance_audit_logs;
DROP POLICY IF EXISTS "Audit logs no delete" ON public.teacher_attendance_audit_logs;

CREATE POLICY "Audit logs no update"
  ON public.teacher_attendance_audit_logs
  AS RESTRICTIVE
  FOR UPDATE
  USING (false);

CREATE POLICY "Audit logs no delete"
  ON public.teacher_attendance_audit_logs
  AS RESTRICTIVE
  FOR DELETE
  USING (false);

-- ---------- Closure signatures: imutáveis após insert ----------
DROP POLICY IF EXISTS "Signatures no update" ON public.teacher_attendance_closure_signatures;
DROP POLICY IF EXISTS "Signatures no delete" ON public.teacher_attendance_closure_signatures;

CREATE POLICY "Signatures no update"
  ON public.teacher_attendance_closure_signatures
  AS RESTRICTIVE
  FOR UPDATE
  USING (false);

CREATE POLICY "Signatures no delete"
  ON public.teacher_attendance_closure_signatures
  AS RESTRICTIVE
  FOR DELETE
  USING (false);

-- ---------- Adjustments: nunca delete físico ----------
DROP POLICY IF EXISTS "Adjustments no delete" ON public.teacher_attendance_adjustments;
CREATE POLICY "Adjustments no delete"
  ON public.teacher_attendance_adjustments
  AS RESTRICTIVE
  FOR DELETE
  USING (false);

-- ---------- Monthly sheets: delete só admin e somente se não fechada ----------
DROP POLICY IF EXISTS "Only admin delete open sheets" ON public.teacher_attendance_monthly_sheets;
CREATE POLICY "Only admin delete open sheets"
  ON public.teacher_attendance_monthly_sheets
  AS RESTRICTIVE
  FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND status NOT IN ('closed')
  );

-- ---------- Entries: delete só admin e somente se folha aberta ----------
DROP POLICY IF EXISTS "Only admin delete entries when open" ON public.teacher_attendance_entries;
CREATE POLICY "Only admin delete entries when open"
  ON public.teacher_attendance_entries
  AS RESTRICTIVE
  FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.teacher_attendance_monthly_sheets s
      WHERE s.id = teacher_attendance_entries.monthly_sheet_id
        AND s.status NOT IN ('closed')
    )
  );

-- ---------- Trigger: impedir mutação em folha fechada ----------
CREATE OR REPLACE FUNCTION public.guard_teacher_attendance_closed_sheet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_sheet_id uuid;
  v_allow boolean := false;
BEGIN
  -- Permite operações privilegiadas via RPCs de reabertura (controlado a nível de app)
  -- Bypass para service_role
  IF current_setting('request.jwt.claims', true) IS NOT NULL THEN
    BEGIN
      IF (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role' THEN
        RETURN COALESCE(NEW, OLD);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  IF TG_TABLE_NAME = 'teacher_attendance_monthly_sheets' THEN
    -- Não bloqueia mudança de status quando o próprio update está reabrindo
    IF TG_OP = 'UPDATE' AND OLD.status = 'closed' AND NEW.status = 'closed' THEN
      -- Permitir update apenas de campos administrativos seguros (updated_at etc.)
      IF NEW.totals_expected_minutes IS DISTINCT FROM OLD.totals_expected_minutes
         OR NEW.totals_confirmed_minutes IS DISTINCT FROM OLD.totals_confirmed_minutes
         OR NEW.totals_absent_minutes IS DISTINCT FROM OLD.totals_absent_minutes
         OR NEW.totals_late_minutes IS DISTINCT FROM OLD.totals_late_minutes THEN
        RAISE EXCEPTION 'Folha fechada não pode ter totais alterados';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  v_sheet_id := COALESCE(NEW.monthly_sheet_id, OLD.monthly_sheet_id);
  SELECT status INTO v_status
  FROM public.teacher_attendance_monthly_sheets
  WHERE id = v_sheet_id;

  IF v_status = 'closed' THEN
    RAISE EXCEPTION 'Operação bloqueada: folha mensal está fechada';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_closed_entries ON public.teacher_attendance_entries;
CREATE TRIGGER trg_guard_closed_entries
  BEFORE UPDATE OR DELETE ON public.teacher_attendance_entries
  FOR EACH ROW EXECUTE FUNCTION public.guard_teacher_attendance_closed_sheet();

DROP TRIGGER IF EXISTS trg_guard_closed_sheet ON public.teacher_attendance_monthly_sheets;
CREATE TRIGGER trg_guard_closed_sheet
  BEFORE UPDATE ON public.teacher_attendance_monthly_sheets
  FOR EACH ROW EXECUTE FUNCTION public.guard_teacher_attendance_closed_sheet();

-- ---------- Restrictive: professor não altera final_status diretamente ----------
DROP POLICY IF EXISTS "Professors cannot mutate entries directly" ON public.teacher_attendance_entries;
CREATE POLICY "Professors cannot mutate entries directly"
  ON public.teacher_attendance_entries
  AS RESTRICTIVE
  FOR UPDATE
  USING (
    is_coordinator(auth.uid(), organization_id)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- ---------- Settings: restrictive multi-tenant ----------
DROP POLICY IF EXISTS "Settings org isolation" ON public.teacher_attendance_settings;
CREATE POLICY "Settings org isolation"
  ON public.teacher_attendance_settings
  AS RESTRICTIVE
  FOR ALL
  USING (has_organization_access(auth.uid(), organization_id))
  WITH CHECK (has_organization_access(auth.uid(), organization_id));

-- ---------- Sheets / entries: restrictive multi-tenant ----------
DROP POLICY IF EXISTS "Sheets org isolation" ON public.teacher_attendance_monthly_sheets;
CREATE POLICY "Sheets org isolation"
  ON public.teacher_attendance_monthly_sheets
  AS RESTRICTIVE
  FOR ALL
  USING (has_organization_access(auth.uid(), organization_id))
  WITH CHECK (has_organization_access(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Entries org isolation" ON public.teacher_attendance_entries;
CREATE POLICY "Entries org isolation"
  ON public.teacher_attendance_entries
  AS RESTRICTIVE
  FOR ALL
  USING (has_organization_access(auth.uid(), organization_id))
  WITH CHECK (has_organization_access(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Adjustments org isolation" ON public.teacher_attendance_adjustments;
CREATE POLICY "Adjustments org isolation"
  ON public.teacher_attendance_adjustments
  AS RESTRICTIVE
  FOR ALL
  USING (has_organization_access(auth.uid(), organization_id))
  WITH CHECK (has_organization_access(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Signatures org isolation" ON public.teacher_attendance_closure_signatures;
CREATE POLICY "Signatures org isolation"
  ON public.teacher_attendance_closure_signatures
  AS RESTRICTIVE
  FOR ALL
  USING (has_organization_access(auth.uid(), organization_id))
  WITH CHECK (has_organization_access(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Audit logs org isolation" ON public.teacher_attendance_audit_logs;
CREATE POLICY "Audit logs org isolation"
  ON public.teacher_attendance_audit_logs
  AS RESTRICTIVE
  FOR ALL
  USING (has_organization_access(auth.uid(), organization_id))
  WITH CHECK (has_organization_access(auth.uid(), organization_id));
