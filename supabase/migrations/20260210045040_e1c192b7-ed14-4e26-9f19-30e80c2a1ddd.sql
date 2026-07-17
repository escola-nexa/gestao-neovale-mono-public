
-- Fix: Restrict student data access for professors to only students in their classes
-- This addresses both students_table_pii_exposure and students_pii_broad findings

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view students of their organization" ON public.students;

-- Coordinators and admins can view all students in their organization
CREATE POLICY "Coordinators can view all students"
ON public.students FOR SELECT
USING (is_coordinator(auth.uid(), organization_id));

-- Professors can only view students enrolled in classes they teach
CREATE POLICY "Professors can view enrolled students"
ON public.students FOR SELECT
USING (
  is_professor(auth.uid(), organization_id)
  AND EXISTS (
    SELECT 1 FROM enrollments e
    JOIN weekly_teaching_models wtm ON wtm.class_group_id = e.class_group_id
      AND wtm.school_id = e.school_id
      AND wtm.course_id = e.course_id
    JOIN professors p ON p.id = wtm.professor_id
    WHERE e.student_id = students.id
    AND p.user_id = auth.uid()
    AND wtm.status = 'ACTIVE'
    AND e.status = 'ativa'
  )
);
