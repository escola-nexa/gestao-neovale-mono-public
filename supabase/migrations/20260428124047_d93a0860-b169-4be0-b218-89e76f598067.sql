ALTER TABLE public.external_links DROP CONSTRAINT external_links_content_type_check;
ALTER TABLE public.external_links ADD CONSTRAINT external_links_content_type_check
  CHECK (content_type = ANY (ARRAY['planejamentos'::text, 'notas'::text, 'faltas'::text, 'documentos_professor'::text]));