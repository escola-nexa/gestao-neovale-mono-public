
ALTER TABLE public.orientations
ADD COLUMN IF NOT EXISTS signature_photo_url text,
ADD COLUMN IF NOT EXISTS signed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS signed_by uuid;
