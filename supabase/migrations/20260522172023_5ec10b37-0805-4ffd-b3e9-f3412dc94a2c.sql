
CREATE OR REPLACE FUNCTION public.admin_cleanup_garbage()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  r jsonb := '{}'::jsonb;
  c int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  PERFORM set_config('storage.allow_delete_query','true', true);

  -- Storage cleanups
  WITH d AS (
    DELETE FROM storage.objects o
    WHERE o.bucket_id='library-content'
      AND NOT EXISTS (SELECT 1 FROM public.library_contents lc WHERE lc.storage_path=o.name)
    RETURNING 1
  ) SELECT count(*) INTO c FROM d;
  r := r || jsonb_build_object('library_content_files', c);

  WITH d AS (
    DELETE FROM storage.objects o
    WHERE o.bucket_id='lesson-materials'
      AND NOT EXISTS (SELECT 1 FROM public.lesson_materials lm WHERE lm.file_url LIKE '%'||o.name||'%')
    RETURNING 1
  ) SELECT count(*) INTO c FROM d;
  r := r || jsonb_build_object('lesson_materials_files', c);

  WITH d AS (
    DELETE FROM storage.objects o
    WHERE o.bucket_id='chat-attachments'
      AND NOT EXISTS (SELECT 1 FROM public.chat_message_attachments a WHERE a.file_path=o.name)
    RETURNING 1
  ) SELECT count(*) INTO c FROM d;
  r := r || jsonb_build_object('chat_attachments_files', c);

  WITH d AS (
    DELETE FROM storage.objects o
    WHERE o.bucket_id='hiring-documents'
      AND EXISTS (SELECT 1 FROM public.hr_hiring_documents h WHERE h.file_path=o.name AND h.deleted_at IS NOT NULL)
    RETURNING 1
  ) SELECT count(*) INTO c FROM d;
  r := r || jsonb_build_object('hiring_documents_files', c);

  -- DB soft-deleted
  WITH d AS (DELETE FROM public.hr_hiring_documents WHERE deleted_at IS NOT NULL RETURNING 1)
  SELECT count(*) INTO c FROM d;
  r := r || jsonb_build_object('hr_hiring_documents', c);

  WITH d AS (DELETE FROM public.pre_plannings WHERE deleted_at IS NOT NULL RETURNING 1)
  SELECT count(*) INTO c FROM d;
  r := r || jsonb_build_object('pre_plannings', c);

  WITH d AS (DELETE FROM public.formative_tracks WHERE deleted_at IS NOT NULL RETURNING 1)
  SELECT count(*) INTO c FROM d;
  r := r || jsonb_build_object('formative_tracks', c);

  WITH d AS (DELETE FROM public.school_visits WHERE deleted_at IS NOT NULL RETURNING 1)
  SELECT count(*) INTO c FROM d;
  r := r || jsonb_build_object('school_visits', c);

  WITH d AS (DELETE FROM public.subjects WHERE deleted_at IS NOT NULL RETURNING 1)
  SELECT count(*) INTO c FROM d;
  r := r || jsonb_build_object('subjects', c);

  WITH d AS (DELETE FROM public.professors WHERE deleted_at IS NOT NULL RETURNING 1)
  SELECT count(*) INTO c FROM d;
  r := r || jsonb_build_object('professors', c);

  WITH d AS (DELETE FROM public.professor_school_courses WHERE status='INACTIVE' RETURNING 1)
  SELECT count(*) INTO c FROM d;
  r := r || jsonb_build_object('professor_school_courses_inactive', c);

  RETURN r;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_cleanup_garbage() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_cleanup_garbage() TO authenticated;

-- Drop helpers no longer needed
DROP FUNCTION IF EXISTS public.list_orphan_library_files();
DROP FUNCTION IF EXISTS public.list_orphan_lesson_files();
DROP FUNCTION IF EXISTS public.list_orphan_chat_files();
