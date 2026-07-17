
-- =============================================
-- FIX 1: Make evidences bucket PRIVATE
-- =============================================
UPDATE storage.buckets SET public = false WHERE id = 'evidences';

-- Add proper RLS policies for evidences bucket
CREATE POLICY "Authenticated users can upload evidences"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'evidences');

CREATE POLICY "Authenticated users can view evidences"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'evidences');

CREATE POLICY "Authenticated users can update evidences"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'evidences');

CREATE POLICY "Authenticated users can delete evidences"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'evidences');

-- =============================================
-- FIX 2: Fix weekly_teaching_models RLS
-- Remove overly broad SELECT that lets professors see ALL schedules
-- Keep coordinator access, restrict professor to own schedules only
-- =============================================
DROP POLICY IF EXISTS "Users can view teaching models of their organizations" ON public.weekly_teaching_models;
DROP POLICY IF EXISTS "Professors can view own teaching models" ON public.weekly_teaching_models;

-- Coordinators can view all in their org
CREATE POLICY "Coordinators can view all teaching models"
ON public.weekly_teaching_models FOR SELECT
TO authenticated
USING (is_coordinator(auth.uid(), organization_id));

-- Professors can only view their own teaching models
CREATE POLICY "Professors can view own teaching models"
ON public.weekly_teaching_models FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM professors p
  WHERE p.id = weekly_teaching_models.professor_id
  AND p.user_id = auth.uid()
));
