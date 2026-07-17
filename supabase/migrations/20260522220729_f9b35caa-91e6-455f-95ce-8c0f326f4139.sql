
-- 1) Notification types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'ORIENTATION_CREATED','ORIENTATION_ACCEPTED','ORIENTATION_REJECTED','ORIENTATION_SIGNED',
    'GENERAL','TICKET_CREATED','TICKET_RESOLVED','TICKET_STATUS_CHANGED','TICKET_MESSAGE','TICKET_UPDATED',
    'TEACHER_ATTENDANCE_PENDING','TEACHER_ATTENDANCE_ADJUSTMENT_REQUESTED',
    'TEACHER_ATTENDANCE_READY_RH','TEACHER_ATTENDANCE_CLOSED','TEACHER_ATTENDANCE_REOPENED',
    'TEACHER_ATTENDANCE_GENERAL'
  ]));

-- 2) Helper to emit notifications
CREATE OR REPLACE FUNCTION public._emit_teacher_attendance_notifications(
  p_sheet_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_audience text[]   -- 'admin','coordenador','rh','professor'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sheet RECORD;
  v_user uuid;
  v_prof_uid uuid;
BEGIN
  SELECT * INTO v_sheet FROM teacher_attendance_monthly_sheets WHERE id = p_sheet_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Role-based recipients in org
  IF cardinality(p_audience) > 0 THEN
    FOR v_user IN
      SELECT DISTINCT ur.user_id
        FROM user_roles ur
       WHERE ur.organization_id = v_sheet.organization_id
         AND ur.role::text = ANY(p_audience)
    LOOP
      INSERT INTO notifications (user_id, title, message, type, reference_id)
      VALUES (v_user, p_title, p_message, p_type, p_sheet_id);
    END LOOP;
  END IF;

  -- Sheet owner professor
  IF 'professor' = ANY(p_audience) THEN
    SELECT auth_user_id INTO v_prof_uid FROM professors WHERE id = v_sheet.professor_id;
    IF v_prof_uid IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, reference_id)
      VALUES (v_prof_uid, p_title, p_message, p_type, p_sheet_id);
    END IF;
  END IF;
END;
$$;

-- 3) Trigger: monthly sheet status changes
CREATE OR REPLACE FUNCTION public.trg_teacher_attendance_sheet_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prof_name text;
  v_month text;
BEGIN
  SELECT full_name INTO v_prof_name FROM professors WHERE id = NEW.professor_id;
  v_month := lpad(NEW.reference_month::text, 2, '0') || '/' || NEW.reference_year::text;

  -- Generated with pending items
  IF (TG_OP = 'INSERT' AND NEW.status = 'with_pending_items')
     OR (TG_OP = 'UPDATE' AND NEW.status = 'with_pending_items' AND OLD.status IS DISTINCT FROM 'with_pending_items') THEN
    PERFORM _emit_teacher_attendance_notifications(
      NEW.id, 'TEACHER_ATTENDANCE_PENDING',
      'Folha de presença com pendências',
      'Folha de ' || COALESCE(v_prof_name,'professor') || ' (' || v_month || ') foi gerada com pendências para revisão.',
      ARRAY['admin','coordenador','rh']
    );
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status = 'approved_by_coordination' AND OLD.status IS DISTINCT FROM 'approved_by_coordination' THEN
    PERFORM _emit_teacher_attendance_notifications(
      NEW.id, 'TEACHER_ATTENDANCE_READY_RH',
      'Folha pronta para revisão do R.H.',
      'Folha de ' || COALESCE(v_prof_name,'professor') || ' (' || v_month || ') aprovada pela coordenação e pronta para R.H.',
      ARRAY['rh']
    );
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status = 'closed' AND OLD.status IS DISTINCT FROM 'closed' THEN
    PERFORM _emit_teacher_attendance_notifications(
      NEW.id, 'TEACHER_ATTENDANCE_CLOSED',
      'Folha de presença fechada',
      'Folha mensal de ' || COALESCE(v_prof_name,'professor') || ' (' || v_month || ') foi fechada.',
      ARRAY['professor','coordenador','rh']
    );
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status = 'reopened' AND OLD.status IS DISTINCT FROM 'reopened' THEN
    PERFORM _emit_teacher_attendance_notifications(
      NEW.id, 'TEACHER_ATTENDANCE_REOPENED',
      'Folha de presença reaberta',
      'Folha mensal de ' || COALESCE(v_prof_name,'professor') || ' (' || v_month || ') foi reaberta com justificativa.',
      ARRAY['professor','coordenador','rh','admin']
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_teacher_attendance_sheet_notify ON public.teacher_attendance_monthly_sheets;
CREATE TRIGGER trg_teacher_attendance_sheet_notify
AFTER INSERT OR UPDATE OF status ON public.teacher_attendance_monthly_sheets
FOR EACH ROW EXECUTE FUNCTION public.trg_teacher_attendance_sheet_notify();

-- 4) Trigger: adjustment requested
CREATE OR REPLACE FUNCTION public.trg_teacher_attendance_adjustment_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_prof_name text; v_sheet RECORD;
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;
  SELECT * INTO v_sheet FROM teacher_attendance_monthly_sheets WHERE id = NEW.monthly_sheet_id;
  SELECT full_name INTO v_prof_name FROM professors WHERE id = v_sheet.professor_id;

  PERFORM _emit_teacher_attendance_notifications(
    NEW.monthly_sheet_id, 'TEACHER_ATTENDANCE_ADJUSTMENT_REQUESTED',
    'Solicitação de ajuste de presença',
    COALESCE(v_prof_name,'Professor') || ' solicitou um ajuste na folha de presença.',
    ARRAY['admin','coordenador','rh']
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_teacher_attendance_adjustment_notify ON public.teacher_attendance_adjustments;
CREATE TRIGGER trg_teacher_attendance_adjustment_notify
AFTER INSERT ON public.teacher_attendance_adjustments
FOR EACH ROW EXECUTE FUNCTION public.trg_teacher_attendance_adjustment_notify();

-- 5) Audit log RPC for PDF generation
CREATE OR REPLACE FUNCTION public.log_teacher_attendance_pdf_generated(
  p_monthly_sheet_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sheet RECORD;
  v_prof_uid uuid;
  v_role text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_sheet FROM teacher_attendance_monthly_sheets WHERE id = p_monthly_sheet_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'sheet_not_found'; END IF;

  -- Permission: org manager or owner professor
  SELECT auth_user_id INTO v_prof_uid FROM professors WHERE id = v_sheet.professor_id;

  IF v_prof_uid = v_uid THEN
    v_role := 'professor';
  ELSIF has_role(v_uid, 'admin'::app_role) THEN
    v_role := 'admin';
  ELSIF has_role(v_uid, 'coordenador'::app_role) THEN
    v_role := 'coordenador';
  ELSIF has_role(v_uid, 'rh'::app_role) THEN
    v_role := 'rh';
  ELSE
    RAISE EXCEPTION 'permission_denied';
  END IF;

  IF v_role <> 'professor' AND NOT has_organization_access(v_uid, v_sheet.organization_id) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  INSERT INTO teacher_attendance_audit_logs (organization_id, monthly_sheet_id, actor_user_id, actor_role, action, reason)
  VALUES (v_sheet.organization_id, p_monthly_sheet_id, v_uid, v_role, 'pdf_generated', 'PDF da folha mensal gerado');

  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.log_teacher_attendance_pdf_generated(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.log_teacher_attendance_pdf_generated(uuid) TO authenticated;

-- 6) BI report RPC
CREATE OR REPLACE FUNCTION public.get_teacher_attendance_bi_report(
  p_organization_id uuid,
  p_reference_year int,
  p_reference_month int,
  p_school_id uuid DEFAULT NULL,
  p_course_id uuid DEFAULT NULL,
  p_subject_id uuid DEFAULT NULL,
  p_professor_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_kpis jsonb;
  v_by_school jsonb;
  v_by_prof jsonb;
  v_by_subject jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT has_organization_access(v_uid, p_organization_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;

  WITH s AS (
    SELECT s.*
      FROM teacher_attendance_monthly_sheets s
     WHERE s.organization_id = p_organization_id
       AND s.reference_year = p_reference_year
       AND s.reference_month = p_reference_month
       AND (p_professor_id IS NULL OR s.professor_id = p_professor_id)
       AND (p_status IS NULL OR s.status = p_status)
  ),
  e AS (
    SELECT te.*
      FROM teacher_attendance_entries te
      JOIN s ON s.id = te.monthly_sheet_id
     WHERE (p_school_id IS NULL OR te.school_id = p_school_id)
       AND (p_course_id IS NULL OR te.course_id = p_course_id)
       AND (p_subject_id IS NULL OR te.subject_id = p_subject_id)
  )
  SELECT jsonb_build_object(
    'sheets_total', (SELECT count(*) FROM s),
    'sheets_closed', (SELECT count(*) FROM s WHERE status IN ('closed','approved_by_rh')),
    'sheets_with_pending', (SELECT count(*) FROM s WHERE status = 'with_pending_items' OR total_pending_entries > 0),
    'entries_total', (SELECT count(*) FROM e),
    'entries_present', (SELECT count(*) FROM e WHERE final_status IN ('present','present_with_delay')),
    'entries_late', (SELECT count(*) FROM e WHERE final_status = 'present_with_delay'),
    'entries_absent', (SELECT count(*) FROM e WHERE final_status IN ('absent','justified_absence')),
    'entries_divergent', (SELECT count(*) FROM e WHERE final_status = 'manual_review_required'),
    'expected_workload_minutes', (SELECT COALESCE(sum(workload_minutes),0) FROM e),
    'confirmed_workload_minutes', (SELECT COALESCE(sum(confirmed_workload_minutes),0) FROM e),
    'absent_workload_minutes', (SELECT COALESCE(sum(workload_minutes) FILTER (WHERE final_status IN ('absent','justified_absence')),0) FROM e),
    'late_minutes_total', (SELECT COALESCE(sum(late_minutes),0) FROM e),
    'presence_percent', CASE WHEN (SELECT count(*) FROM e) > 0
                             THEN round(100.0 * (SELECT count(*) FROM e WHERE final_status IN ('present','present_with_delay'))::numeric / (SELECT count(*) FROM e), 1)
                             ELSE 0 END
  ) INTO v_kpis;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_by_school FROM (
    SELECT sc.id AS school_id, sc.nome AS school_name,
           count(*) AS entries,
           count(*) FILTER (WHERE e.final_status IN ('present','present_with_delay')) AS present,
           count(*) FILTER (WHERE e.final_status IN ('absent','justified_absence')) AS absent,
           COALESCE(sum(e.workload_minutes),0) AS expected_min,
           COALESCE(sum(e.confirmed_workload_minutes),0) AS confirmed_min
      FROM teacher_attendance_entries e
      JOIN schools sc ON sc.id = e.school_id
      JOIN teacher_attendance_monthly_sheets sh ON sh.id = e.monthly_sheet_id
     WHERE sh.organization_id = p_organization_id
       AND sh.reference_year = p_reference_year
       AND sh.reference_month = p_reference_month
       AND (p_school_id IS NULL OR e.school_id = p_school_id)
       AND (p_course_id IS NULL OR e.course_id = p_course_id)
       AND (p_subject_id IS NULL OR e.subject_id = p_subject_id)
       AND (p_professor_id IS NULL OR e.professor_id = p_professor_id)
       AND (p_status IS NULL OR sh.status = p_status)
     GROUP BY sc.id, sc.nome
     ORDER BY sc.nome
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_by_prof FROM (
    SELECT pr.id AS professor_id, pr.full_name AS professor_name,
           count(*) AS entries,
           count(*) FILTER (WHERE e.final_status = 'present_with_delay') AS late,
           count(*) FILTER (WHERE e.final_status IN ('absent','justified_absence')) AS absent,
           COALESCE(sum(e.late_minutes),0) AS late_minutes
      FROM teacher_attendance_entries e
      JOIN professors pr ON pr.id = e.professor_id
      JOIN teacher_attendance_monthly_sheets sh ON sh.id = e.monthly_sheet_id
     WHERE sh.organization_id = p_organization_id
       AND sh.reference_year = p_reference_year
       AND sh.reference_month = p_reference_month
       AND (p_school_id IS NULL OR e.school_id = p_school_id)
       AND (p_course_id IS NULL OR e.course_id = p_course_id)
       AND (p_subject_id IS NULL OR e.subject_id = p_subject_id)
       AND (p_professor_id IS NULL OR e.professor_id = p_professor_id)
       AND (p_status IS NULL OR sh.status = p_status)
     GROUP BY pr.id, pr.full_name
     ORDER BY late DESC, absent DESC
     LIMIT 50
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_by_subject FROM (
    SELECT sub.id AS subject_id, sub.nome AS subject_name,
           count(*) FILTER (WHERE e.final_status IN ('absent','justified_absence')) AS absent_count,
           count(*) AS total
      FROM teacher_attendance_entries e
      LEFT JOIN subjects sub ON sub.id = e.subject_id
      JOIN teacher_attendance_monthly_sheets sh ON sh.id = e.monthly_sheet_id
     WHERE sh.organization_id = p_organization_id
       AND sh.reference_year = p_reference_year
       AND sh.reference_month = p_reference_month
       AND (p_school_id IS NULL OR e.school_id = p_school_id)
       AND (p_course_id IS NULL OR e.course_id = p_course_id)
       AND (p_subject_id IS NULL OR e.subject_id = p_subject_id)
       AND (p_professor_id IS NULL OR e.professor_id = p_professor_id)
     GROUP BY sub.id, sub.nome
     ORDER BY absent_count DESC NULLS LAST
     LIMIT 50
  ) t;

  RETURN jsonb_build_object(
    'ok', true,
    'kpis', v_kpis,
    'by_school', v_by_school,
    'by_professor', v_by_prof,
    'by_subject_absent', v_by_subject
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_teacher_attendance_bi_report(uuid,int,int,uuid,uuid,uuid,uuid,text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_teacher_attendance_bi_report(uuid,int,int,uuid,uuid,uuid,uuid,text) TO authenticated;

-- 7) Storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('teacher-attendance-pdfs','teacher-attendance-pdfs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Org members read attendance PDFs" ON storage.objects;
CREATE POLICY "Org members read attendance PDFs" ON storage.objects FOR SELECT
USING (
  bucket_id = 'teacher-attendance-pdfs'
  AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Service role writes attendance PDFs" ON storage.objects;
CREATE POLICY "Service role writes attendance PDFs" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'teacher-attendance-pdfs' AND auth.role() = 'service_role');
