
-- 1) Colunas extras em attendance_records
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS teacher_attendance_entry_id uuid NULL REFERENCES public.teacher_attendance_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS call_started_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS call_submitted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS call_created_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_records_call_submitted_at
  ON public.attendance_records(call_submitted_at)
  WHERE call_submitted_at IS NOT NULL;

-- 2) Função principal: computa presença docente a partir de uma chamada
CREATE OR REPLACE FUNCTION public.compute_teacher_attendance_from_student_call(
  p_attendance_record_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec record;
  v_settings record;
  v_entry record;
  v_sheet_id uuid;
  v_call_at timestamptz;
  v_early int := 20;
  v_late int := 20;
  v_after int := 120;
  v_diff_sec bigint;
  v_late_min int := 0;
  v_early_min int := 0;
  v_computed text;
  v_final text;
  v_divergence text := NULL;
  v_existing_call timestamptz;
  v_wtm_prof uuid;
  v_wtm_school uuid;
BEGIN
  -- 1. Carregar chamada
  SELECT ar.*, COALESCE(ar.call_submitted_at, ar.created_at) AS effective_call_at
    INTO v_rec
  FROM public.attendance_records ar
  WHERE ar.id = p_attendance_record_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'attendance_record_not_found');
  END IF;

  v_call_at := v_rec.effective_call_at;

  -- 2. Settings
  SELECT allowed_early_minutes, allowed_late_minutes, max_call_after_class_minutes,
         auto_compute_on_student_call
    INTO v_settings
  FROM public.teacher_attendance_settings
  WHERE organization_id = v_rec.organization_id;

  IF FOUND THEN
    v_early := COALESCE(v_settings.allowed_early_minutes, 20);
    v_late  := COALESCE(v_settings.allowed_late_minutes, 20);
    v_after := COALESCE(v_settings.max_call_after_class_minutes, 120);
    IF v_settings.auto_compute_on_student_call = false THEN
      RETURN jsonb_build_object('ok', true, 'skipped', 'auto_compute_disabled');
    END IF;
  END IF;

  -- 3. Localiza entry mais próxima do horário da chamada
  SELECT e.*
    INTO v_entry
  FROM public.teacher_attendance_entries e
  WHERE e.organization_id = v_rec.organization_id
    AND e.class_group_id  = v_rec.class_group_id
    AND e.subject_id      = v_rec.subject_id
    AND e.scheduled_date  = v_rec.occurrence_date
    AND e.is_manual_adjusted = false
  ORDER BY ABS(EXTRACT(EPOCH FROM (e.scheduled_start_at - v_call_at)))
  LIMIT 1;

  IF v_entry.id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'no_matching_entry');
  END IF;

  v_sheet_id := v_entry.monthly_sheet_id;
  v_existing_call := v_entry.actual_call_submitted_at;

  -- 4. Só atualiza se for a primeira chamada (ou mais cedo que a registrada)
  IF v_existing_call IS NOT NULL AND v_existing_call <= v_call_at THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'already_computed',
      'entry_id', v_entry.id, 'final_status', v_entry.final_status);
  END IF;

  -- 5. Detecta divergências (professor/escola)
  SELECT wtm.professor_id, wtm.school_id
    INTO v_wtm_prof, v_wtm_school
  FROM public.weekly_teaching_models wtm
  WHERE wtm.id = v_entry.weekly_teaching_model_id;

  IF v_wtm_prof IS NOT NULL AND v_wtm_prof <> v_rec.professor_id THEN
    v_divergence := 'divergent_professor';
  ELSIF v_entry.class_group_id IS DISTINCT FROM v_rec.class_group_id
     OR v_entry.subject_id     IS DISTINCT FROM v_rec.subject_id THEN
    v_divergence := 'divergent_schedule';
  END IF;

  -- 6. Calcula minutos de atraso/adiantamento
  v_diff_sec := EXTRACT(EPOCH FROM (v_call_at - v_entry.scheduled_start_at))::bigint;

  IF v_diff_sec >= 0 THEN
    v_late_min  := (v_diff_sec / 60)::int;
    v_early_min := 0;
  ELSE
    v_late_min  := 0;
    v_early_min := ((-v_diff_sec) / 60)::int;
  END IF;

  -- 7. Classifica status
  IF v_divergence IS NOT NULL THEN
    v_computed := v_divergence;
    v_final := 'manual_review_required';
  ELSIF v_call_at BETWEEN (v_entry.scheduled_start_at - make_interval(mins => v_early))
                      AND (v_entry.scheduled_start_at + make_interval(mins => v_late)) THEN
    v_computed := 'present_on_time';
    v_final := 'present';
  ELSIF v_call_at > (v_entry.scheduled_start_at + make_interval(mins => v_late))
    AND v_call_at <= (v_entry.scheduled_end_at  + make_interval(mins => v_after)) THEN
    v_computed := 'present_with_delay';
    v_final := 'present_with_delay';
  ELSE
    v_computed := 'present_outside_window';
    v_final := 'manual_review_required';
  END IF;

  -- 8. Atualiza entry
  UPDATE public.teacher_attendance_entries
  SET attendance_record_id     = v_rec.id,
      actual_call_started_at   = COALESCE(v_rec.call_started_at, v_call_at),
      actual_call_submitted_at = v_call_at,
      late_minutes             = v_late_min,
      early_minutes            = v_early_min,
      confirmed_workload_minutes = workload_minutes,
      computed_status          = v_computed,
      final_status             = v_final,
      divergence_reason        = v_divergence,
      updated_at               = now()
  WHERE id = v_entry.id;

  -- 9. Vincula entry de volta no attendance_record
  UPDATE public.attendance_records
  SET teacher_attendance_entry_id = v_entry.id
  WHERE id = v_rec.id
    AND (teacher_attendance_entry_id IS DISTINCT FROM v_entry.id);

  -- 10. Recalcula folha
  PERFORM public.recalc_teacher_attendance_sheet(v_sheet_id);

  -- 11. Auditoria (best effort)
  BEGIN
    INSERT INTO public.teacher_attendance_audit_logs (
      organization_id, monthly_sheet_id, entry_id, action, actor_id, metadata
    ) VALUES (
      v_rec.organization_id, v_sheet_id, v_entry.id,
      'auto_compute_from_student_call',
      v_rec.call_created_by,
      jsonb_build_object(
        'attendance_record_id', v_rec.id,
        'call_at', v_call_at,
        'computed_status', v_computed,
        'final_status', v_final,
        'late_minutes', v_late_min,
        'early_minutes', v_early_min,
        'divergence', v_divergence
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'entry_id', v_entry.id,
    'sheet_id', v_sheet_id,
    'computed_status', v_computed,
    'final_status', v_final,
    'late_minutes', v_late_min,
    'early_minutes', v_early_min,
    'divergence', v_divergence
  );
END;
$$;

-- 3) Trigger function nova (substitui a antiga, mantendo o mesmo nome de trigger)
CREATE OR REPLACE FUNCTION public.trg_attendance_records_update_teacher_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Roda quando há um horário real de chamada
  IF COALESCE(NEW.call_submitted_at, NEW.created_at) IS NOT NULL THEN
    PERFORM public.compute_teacher_attendance_from_student_call(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- 4) Recria o trigger para rodar em INSERT e UPDATE
DROP TRIGGER IF EXISTS trg_attendance_records_teacher_presence ON public.attendance_records;

CREATE TRIGGER trg_attendance_records_teacher_presence
AFTER INSERT OR UPDATE OF call_submitted_at, status, start_time, occurrence_date
ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.trg_attendance_records_update_teacher_entry();
