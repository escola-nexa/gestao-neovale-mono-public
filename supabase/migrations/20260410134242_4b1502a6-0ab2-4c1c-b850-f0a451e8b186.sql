
-- 1. Create ticket_type enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_type') THEN
    CREATE TYPE public.ticket_type AS ENUM ('escola', 'interno');
  END IF;
END $$;

-- 2. Alter tickets table
ALTER TABLE public.tickets
  ALTER COLUMN school_id DROP NOT NULL;

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS type public.ticket_type NOT NULL DEFAULT 'escola';

-- 3. Migrate attachments: rename old, add new JSONB, drop old
ALTER TABLE public.ticket_messages
  RENAME COLUMN attachments TO attachments_old;

ALTER TABLE public.ticket_messages
  ADD COLUMN attachments JSONB DEFAULT NULL;

ALTER TABLE public.ticket_messages
  DROP COLUMN attachments_old;

-- 4. Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage policies
DROP POLICY IF EXISTS "Authenticated users can upload ticket attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view ticket attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own ticket attachments" ON storage.objects;

CREATE POLICY "Authenticated users can upload ticket attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ticket-attachments');

CREATE POLICY "Authenticated users can view ticket attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'ticket-attachments');

CREATE POLICY "Authenticated users can delete own ticket attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'ticket-attachments');

-- 6. Update RLS policies for tickets
DROP POLICY IF EXISTS "Professors can view school tickets" ON public.tickets;
DROP POLICY IF EXISTS "Professors can create school tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins manage all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Authors can view own internal tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can create internal tickets" ON public.tickets;

CREATE POLICY "Professors can view school tickets"
ON public.tickets FOR SELECT TO authenticated
USING (
  type = 'escola' AND school_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.professor_school_courses psc
    JOIN public.professors p ON p.id = psc.professor_id
    WHERE p.user_id = auth.uid()
      AND psc.school_id = tickets.school_id
      AND psc.status = 'ACTIVE'
  )
);

CREATE POLICY "Professors can create school tickets"
ON public.tickets FOR INSERT TO authenticated
WITH CHECK (
  type = 'escola' AND school_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.professor_school_courses psc
    JOIN public.professors p ON p.id = psc.professor_id
    WHERE p.user_id = auth.uid()
      AND psc.school_id = tickets.school_id
      AND psc.status = 'ACTIVE'
  )
);

CREATE POLICY "Admins manage all tickets"
ON public.tickets FOR ALL TO authenticated
USING (
  public.is_admin(auth.uid()) AND public.has_organization_access(auth.uid(), organization_id)
);

CREATE POLICY "Authors can view own internal tickets"
ON public.tickets FOR SELECT TO authenticated
USING (
  type = 'interno' AND opened_by_id = auth.uid()
);

CREATE POLICY "Users can create internal tickets"
ON public.tickets FOR INSERT TO authenticated
WITH CHECK (
  type = 'interno' AND opened_by_id = auth.uid()
);
