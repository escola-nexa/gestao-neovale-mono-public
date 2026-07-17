-- As tabelas library_categories e library_contents foram criadas fora da chain
-- de migrations (direto no SQL Editor). Schema base reconstruído a partir de
-- src/integrations/supabase/types.ts; as colunas adicionadas por migrations
-- posteriores (content_type, storage_path, parent_id, published_*, sort_order,
-- lesson_number...) ficam de fora — as próprias migrations as adicionam.

CREATE TABLE IF NOT EXISTS public.library_categories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.library_categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.library_contents (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_id        uuid NOT NULL REFERENCES public.library_categories(id),
  title              text NOT NULL,
  description        text NOT NULL,
  content_url        text,
  cover_color        text NOT NULL DEFAULT '#6366f1',
  cover_icon         text NOT NULL DEFAULT 'book',
  course_id          uuid REFERENCES public.courses(id),
  subject_id         uuid REFERENCES public.subjects(id),
  formative_track_id uuid REFERENCES public.formative_tracks(id),
  created_by         uuid,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.library_contents ENABLE ROW LEVEL SECURITY;
