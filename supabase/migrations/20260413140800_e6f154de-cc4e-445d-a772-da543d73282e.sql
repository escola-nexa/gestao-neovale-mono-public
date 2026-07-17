
-- Fix 1: Notification INSERT policy self-referential bug
DROP POLICY IF EXISTS "Restricted notification inserts" ON public.notifications;

CREATE POLICY "Restricted notification inserts"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'coordenador')
      AND ur.organization_id IN (
        SELECT ur2.organization_id FROM user_roles ur2 WHERE ur2.user_id = notifications.user_id
      )
  )
);

-- Fix 2: Evidences bucket - restrict DELETE/UPDATE to file owner
DROP POLICY IF EXISTS "Authenticated users can delete evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update evidence files" ON storage.objects;

CREATE POLICY "Owners can delete evidence files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'evidences'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Owners can update evidence files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'evidences'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Fix 3: Lesson-materials bucket - restrict DELETE/UPDATE to coordinators
DROP POLICY IF EXISTS "Authenticated users can delete lesson material files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update lesson material files" ON storage.objects;

CREATE POLICY "Coordinators can delete lesson material files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'lesson-materials'
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'coordenador')
  )
);

CREATE POLICY "Coordinators can update lesson material files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'lesson-materials'
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'coordenador')
  )
);
