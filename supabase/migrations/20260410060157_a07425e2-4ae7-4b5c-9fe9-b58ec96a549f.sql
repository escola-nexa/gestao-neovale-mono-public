
-- Enable realtime for import_batches
ALTER PUBLICATION supabase_realtime ADD TABLE public.import_batches;

-- Add dry_run_errors column for storing validation results
ALTER TABLE public.import_batches ADD COLUMN IF NOT EXISTS dry_run_errors jsonb DEFAULT NULL;
