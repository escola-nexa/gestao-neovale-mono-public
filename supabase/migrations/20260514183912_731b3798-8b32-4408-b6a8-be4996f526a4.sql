ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_tickets_archived_at ON public.tickets(archived_at) WHERE archived_at IS NULL;