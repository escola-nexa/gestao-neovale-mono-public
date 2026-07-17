
ALTER TABLE public.school_visits 
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deletion_reason text DEFAULT NULL;
