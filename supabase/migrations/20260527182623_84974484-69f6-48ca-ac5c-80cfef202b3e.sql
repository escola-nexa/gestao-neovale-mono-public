DROP INDEX IF EXISTS public.uniq_wtm_teacher_slot;
DROP INDEX IF EXISTS public.uniq_wtm_class_slot;

CREATE UNIQUE INDEX uniq_wtm_class_slot
  ON public.weekly_teaching_models
     (school_id, weekday, start_time, end_time, class_group_id,
      COALESCE(subject_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status = 'ACTIVE' AND schedule_type = 'CLASS';

CREATE UNIQUE INDEX uniq_wtm_teacher_slot
  ON public.weekly_teaching_models
     (school_id, weekday, start_time, end_time, professor_id,
      COALESCE(subject_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status = 'ACTIVE'
    AND professor_id IS NOT NULL
    AND (class_mode IS NULL OR class_mode = 'PRESENCIAL');