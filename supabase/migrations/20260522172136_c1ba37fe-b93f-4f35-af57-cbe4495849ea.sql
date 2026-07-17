
CREATE OR REPLACE FUNCTION public._oneoff_cleanup_garbage()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage
AS $$
DECLARE r jsonb := '{}'::jsonb; c int;
BEGIN
  PERFORM set_config('storage.allow_delete_query','true', true);

  WITH d AS (DELETE FROM storage.objects o WHERE o.bucket_id='library-content' AND NOT EXISTS (SELECT 1 FROM public.library_contents lc WHERE lc.storage_path=o.name) RETURNING 1) SELECT count(*) INTO c FROM d;
  r := r || jsonb_build_object('library_content_files', c);

  WITH d AS (DELETE FROM storage.objects o WHERE o.bucket_id='lesson-materials' AND NOT EXISTS (SELECT 1 FROM public.lesson_materials lm WHERE lm.file_url LIKE '%'||o.name||'%') RETURNING 1) SELECT count(*) INTO c FROM d;
  r := r || jsonb_build_object('lesson_materials_files', c);

  WITH d AS (DELETE FROM storage.objects o WHERE o.bucket_id='chat-attachments' AND NOT EXISTS (SELECT 1 FROM public.chat_message_attachments a WHERE a.file_path=o.name) RETURNING 1) SELECT count(*) INTO c FROM d;
  r := r || jsonb_build_object('chat_attachments_files', c);

  WITH d AS (DELETE FROM storage.objects o WHERE o.bucket_id='hiring-documents' AND EXISTS (SELECT 1 FROM public.hr_hiring_documents h WHERE h.file_path=o.name AND h.deleted_at IS NOT NULL) RETURNING 1) SELECT count(*) INTO c FROM d;
  r := r || jsonb_build_object('hiring_documents_files', c);

  WITH d AS (DELETE FROM public.hr_hiring_documents WHERE deleted_at IS NOT NULL RETURNING 1) SELECT count(*) INTO c FROM d; r := r || jsonb_build_object('hr_hiring_documents', c);
  WITH d AS (DELETE FROM public.pre_plannings    WHERE deleted_at IS NOT NULL RETURNING 1) SELECT count(*) INTO c FROM d; r := r || jsonb_build_object('pre_plannings', c);
  WITH d AS (DELETE FROM public.formative_tracks WHERE deleted_at IS NOT NULL RETURNING 1) SELECT count(*) INTO c FROM d; r := r || jsonb_build_object('formative_tracks', c);
  WITH d AS (DELETE FROM public.school_visits    WHERE deleted_at IS NOT NULL RETURNING 1) SELECT count(*) INTO c FROM d; r := r || jsonb_build_object('school_visits', c);
  WITH d AS (DELETE FROM public.professor_school_courses WHERE status='INACTIVE' RETURNING 1) SELECT count(*) INTO c FROM d; r := r || jsonb_build_object('professor_school_courses_inactive', c);

  RAISE NOTICE 'cleanup result: %', r;
  RETURN r;
END;
$$;

SELECT public._oneoff_cleanup_garbage();

DROP FUNCTION public._oneoff_cleanup_garbage();
