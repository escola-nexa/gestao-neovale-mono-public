ALTER TABLE public.external_access_logs
  ADD COLUMN IF NOT EXISTS document_origin_type text,
  ADD COLUMN IF NOT EXISTS document_origin_id uuid,
  ADD COLUMN IF NOT EXISTS document_status_at_access text,
  ADD COLUMN IF NOT EXISTS pdf_viewed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pdf_downloaded boolean DEFAULT false;