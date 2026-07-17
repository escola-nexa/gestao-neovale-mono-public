-- Migration 3: Create Orientations table (only if it doesn't exist with all columns)
-- Note: Table already exists, so we skip creation

-- Create storage bucket for evidences (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidences', 'evidences', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for evidences bucket (drop existing first to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload evidences" ON storage.objects;
DROP POLICY IF EXISTS "Users can view evidences" ON storage.objects;

CREATE POLICY "Users can upload evidences"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'evidences' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view evidences"
ON storage.objects FOR SELECT
USING (bucket_id = 'evidences');