-- Habilita Realtime nas tabelas que alimentam o Kanban de Professores
ALTER TABLE public.professor_document_files REPLICA IDENTITY FULL;
ALTER TABLE public.professor_documents      REPLICA IDENTITY FULL;
ALTER TABLE public.external_links           REPLICA IDENTITY FULL;
ALTER TABLE public.professor_kanban_state   REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.professor_document_files;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.professor_documents;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.external_links;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.professor_kanban_state;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;