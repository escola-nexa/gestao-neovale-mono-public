-- Allow professors to delete their own grade_activities
CREATE POLICY "Professors can delete own grade_activities"
ON public.grade_activities
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM grade_configurations gc
    JOIN professors p ON (p.id = gc.professor_id)
    WHERE gc.id = grade_activities.grade_config_id
      AND p.user_id = auth.uid()
      AND gc.status != 'CLOSED'
  )
);