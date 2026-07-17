
CREATE OR REPLACE FUNCTION public.list_orphan_library_files()
RETURNS TABLE(name text, size bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public, storage
AS $$
  SELECT o.name, COALESCE((o.metadata->>'size')::bigint, 0)
  FROM storage.objects o
  WHERE o.bucket_id='library-content'
    AND NOT EXISTS (SELECT 1 FROM public.library_contents lc WHERE lc.storage_path=o.name)
    AND public.has_role(auth.uid(), 'admin'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.list_orphan_lesson_files()
RETURNS TABLE(name text, size bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public, storage
AS $$
  SELECT o.name, COALESCE((o.metadata->>'size')::bigint, 0)
  FROM storage.objects o
  WHERE o.bucket_id='lesson-materials'
    AND NOT EXISTS (SELECT 1 FROM public.lesson_materials lm WHERE lm.file_url LIKE '%'||o.name||'%')
    AND public.has_role(auth.uid(), 'admin'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.list_orphan_chat_files()
RETURNS TABLE(name text, size bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public, storage
AS $$
  SELECT o.name, COALESCE((o.metadata->>'size')::bigint, 0)
  FROM storage.objects o
  WHERE o.bucket_id='chat-attachments'
    AND NOT EXISTS (SELECT 1 FROM public.chat_message_attachments a WHERE a.file_path=o.name)
    AND public.has_role(auth.uid(), 'admin'::app_role);
$$;

REVOKE ALL ON FUNCTION public.list_orphan_library_files() FROM public, anon;
REVOKE ALL ON FUNCTION public.list_orphan_lesson_files()  FROM public, anon;
REVOKE ALL ON FUNCTION public.list_orphan_chat_files()    FROM public, anon;
GRANT EXECUTE ON FUNCTION public.list_orphan_library_files() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_orphan_lesson_files()  TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_orphan_chat_files()    TO authenticated;
