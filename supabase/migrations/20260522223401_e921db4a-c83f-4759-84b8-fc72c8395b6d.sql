ALTER TABLE public.teacher_attendance_entries DROP CONSTRAINT IF EXISTS teacher_attendance_entries_computed_status_check;
ALTER TABLE public.teacher_attendance_entries ADD CONSTRAINT teacher_attendance_entries_computed_status_check
  CHECK (computed_status = ANY (ARRAY[
    'pending','present_on_time','present_with_delay','present_outside_window',
    'absent_no_call','divergent_professor','divergent_schedule','cancelled_non_letivo',
    'not_expected','manual_review_required','planning_auto'
  ]));

ALTER TABLE public.teacher_attendance_entries DROP CONSTRAINT IF EXISTS teacher_attendance_entries_final_status_check;
ALTER TABLE public.teacher_attendance_entries ADD CONSTRAINT teacher_attendance_entries_final_status_check
  CHECK (final_status = ANY (ARRAY[
    'pending','present','present_with_delay','absent','justified_absence',
    'cancelled','ignored','manual_review_required','planning_auto'
  ]));