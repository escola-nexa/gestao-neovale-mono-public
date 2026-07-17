ALTER TABLE public.library_contents
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.library_contents(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_library_contents_parent ON public.library_contents(parent_id) WHERE parent_id IS NOT NULL;