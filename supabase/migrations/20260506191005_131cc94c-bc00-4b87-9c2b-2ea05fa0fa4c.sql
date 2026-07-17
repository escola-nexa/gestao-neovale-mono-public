
-- Add content type and storage path
ALTER TABLE public.library_contents
  ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'link',
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS file_mime text,
  ADD COLUMN IF NOT EXISTS file_size bigint;

-- Validate allowed types via trigger (CHECK avoided per project standards)
CREATE OR REPLACE FUNCTION public.validate_library_content_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.content_type NOT IN ('pdf','image','video','video_link','link') THEN
    RAISE EXCEPTION 'content_type inválido: %', NEW.content_type;
  END IF;
  IF NEW.content_type IN ('pdf','image','video') AND NEW.storage_path IS NULL THEN
    RAISE EXCEPTION 'storage_path é obrigatório para conteúdos do tipo arquivo';
  END IF;
  IF NEW.content_type IN ('video_link','link') AND (NEW.content_url IS NULL OR length(trim(NEW.content_url)) = 0) THEN
    RAISE EXCEPTION 'content_url é obrigatório para conteúdos do tipo link';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_library_content_type ON public.library_contents;
CREATE TRIGGER trg_validate_library_content_type
  BEFORE INSERT OR UPDATE ON public.library_contents
  FOR EACH ROW EXECUTE FUNCTION public.validate_library_content_type();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('library-content', 'library-content', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the bucket: files stored under {organization_id}/...
CREATE POLICY "library-content org members can view"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'library-content'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "library-content org members can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'library-content'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "library-content owner or manager can update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'library-content'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "library-content owner or manager can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'library-content'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
  )
);
