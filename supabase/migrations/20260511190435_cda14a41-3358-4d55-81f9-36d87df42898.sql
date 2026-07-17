
-- Enums
CREATE TYPE public.help_category AS ENUM (
  'inicio',
  'cadastros',
  'rotina_pedagogica',
  'recursos_agenda',
  'rh',
  'analise_acompanhamento',
  'comunicacao',
  'compartilhamento_externo',
  'sistema',
  'conta'
);

CREATE TYPE public.help_audience AS ENUM (
  'admin_coord_rh',
  'admin_coord',
  'admin_coord_prof'
);

CREATE TYPE public.help_content_type AS ENUM (
  'video_upload',
  'video_link',
  'pdf',
  'image',
  'link'
);

-- Tabela principal
CREATE TABLE public.help_tutorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  category public.help_category NOT NULL,
  feature_name TEXT NOT NULL DEFAULT 'Geral',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  content_type public.help_content_type NOT NULL,
  content_url TEXT,
  storage_path TEXT,
  file_mime TEXT,
  file_size BIGINT,
  duration_seconds INTEGER,
  cover_color TEXT NOT NULL DEFAULT 'blue',
  cover_icon TEXT NOT NULL DEFAULT 'PlayCircle',
  audience public.help_audience NOT NULL DEFAULT 'admin_coord_prof',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  view_count INTEGER NOT NULL DEFAULT 0,
  search_tsv tsvector,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_help_tutorials_org ON public.help_tutorials(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_help_tutorials_category ON public.help_tutorials(organization_id, category) WHERE deleted_at IS NULL;
CREATE INDEX idx_help_tutorials_featured ON public.help_tutorials(organization_id, is_featured) WHERE deleted_at IS NULL;
CREATE INDEX idx_help_tutorials_search ON public.help_tutorials USING GIN(search_tsv);

-- Trigger para search_tsv
CREATE OR REPLACE FUNCTION public.help_tutorials_tsv_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('portuguese', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.feature_name, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.category::text, '')), 'D');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_help_tutorials_tsv
BEFORE INSERT OR UPDATE ON public.help_tutorials
FOR EACH ROW EXECUTE FUNCTION public.help_tutorials_tsv_trigger();

-- Views (registro de visualizações)
CREATE TABLE public.help_tutorial_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutorial_id UUID NOT NULL REFERENCES public.help_tutorials(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  progress_seconds INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  first_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tutorial_id, user_id)
);

CREATE INDEX idx_help_tutorial_views_user ON public.help_tutorial_views(user_id, organization_id);

-- Helper: papel do usuário na org
CREATE OR REPLACE FUNCTION public.get_user_role_in_org(_user UUID, _org UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role::text FROM public.user_roles
  WHERE user_id = _user AND organization_id = _org
  ORDER BY CASE role::text WHEN 'admin' THEN 1 WHEN 'coordenador' THEN 2 WHEN 'rh' THEN 3 WHEN 'professor' THEN 4 ELSE 5 END
  LIMIT 1;
$$;

-- RLS
ALTER TABLE public.help_tutorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_tutorial_views ENABLE ROW LEVEL SECURITY;

-- SELECT: visibilidade baseada em audience
CREATE POLICY "Help tutorials are viewable by allowed roles"
ON public.help_tutorials FOR SELECT
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = help_tutorials.organization_id
      AND (
        ur.role::text IN ('admin', 'coordenador')
        OR (ur.role::text = 'rh' AND audience = 'admin_coord_rh')
        OR (ur.role::text = 'professor' AND audience = 'admin_coord_prof')
      )
  )
);

-- INSERT/UPDATE/DELETE: apenas admin/coordenador
CREATE POLICY "Admin/coord can insert help tutorials"
ON public.help_tutorials FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = help_tutorials.organization_id
      AND ur.role::text IN ('admin', 'coordenador')
  )
);

CREATE POLICY "Admin/coord can update help tutorials"
ON public.help_tutorials FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = help_tutorials.organization_id
      AND ur.role::text IN ('admin', 'coordenador')
  )
);

CREATE POLICY "Admin/coord can delete help tutorials"
ON public.help_tutorials FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = help_tutorials.organization_id
      AND ur.role::text IN ('admin', 'coordenador')
  )
);

-- Views: o próprio usuário
CREATE POLICY "Users can view own tutorial views"
ON public.help_tutorial_views FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tutorial views"
ON public.help_tutorial_views FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tutorial views"
ON public.help_tutorial_views FOR UPDATE
USING (user_id = auth.uid());

-- RPC para incrementar contador atomicamente
CREATE OR REPLACE FUNCTION public.increment_help_view(_tutorial_id UUID, _progress INTEGER DEFAULT 0, _completed BOOLEAN DEFAULT FALSE)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org UUID;
  v_existed BOOLEAN;
BEGIN
  SELECT organization_id INTO v_org FROM public.help_tutorials WHERE id = _tutorial_id;
  IF v_org IS NULL THEN RETURN; END IF;

  SELECT TRUE INTO v_existed FROM public.help_tutorial_views
   WHERE tutorial_id = _tutorial_id AND user_id = auth.uid();

  INSERT INTO public.help_tutorial_views (tutorial_id, user_id, organization_id, progress_seconds, completed, last_viewed_at)
  VALUES (_tutorial_id, auth.uid(), v_org, _progress, _completed, now())
  ON CONFLICT (tutorial_id, user_id) DO UPDATE
    SET progress_seconds = GREATEST(EXCLUDED.progress_seconds, public.help_tutorial_views.progress_seconds),
        completed = public.help_tutorial_views.completed OR EXCLUDED.completed,
        last_viewed_at = now();

  IF v_existed IS NULL THEN
    UPDATE public.help_tutorials SET view_count = view_count + 1 WHERE id = _tutorial_id;
  END IF;
END;
$$;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('help-content', 'help-content', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Admin/coord can upload help content"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'help-content'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('admin', 'coordenador')
  )
);

CREATE POLICY "Admin/coord can update help content"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'help-content'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('admin', 'coordenador')
  )
);

CREATE POLICY "Admin/coord can delete help content"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'help-content'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('admin', 'coordenador')
  )
);

CREATE POLICY "Authenticated users can read help content"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'help-content'
  AND auth.uid() IS NOT NULL
);
