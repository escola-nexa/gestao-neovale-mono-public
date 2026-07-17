
DROP TRIGGER IF EXISTS trg_incident_create_ticket ON public.incident_reports;
DROP TRIGGER IF EXISTS trg_incident_sync_ticket ON public.incident_reports;
DROP FUNCTION IF EXISTS public.create_ticket_from_incident() CASCADE;
DROP FUNCTION IF EXISTS public.sync_ticket_from_incident() CASCADE;
DROP FUNCTION IF EXISTS public.notify_incident_stakeholders() CASCADE;
DROP FUNCTION IF EXISTS public.assign_incident_coordinator() CASCADE;
DROP FUNCTION IF EXISTS public.log_incident_audit() CASCADE;

DROP TABLE IF EXISTS public.incident_audit CASCADE;
DROP TABLE IF EXISTS public.incident_attachments CASCADE;
DROP TABLE IF EXISTS public.incident_reports CASCADE;

DROP TYPE IF EXISTS public.incident_status CASCADE;
DROP TYPE IF EXISTS public.incident_type CASCADE;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname ILIKE '%incident%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;
