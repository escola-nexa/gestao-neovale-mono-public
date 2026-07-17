-- ================================================================
-- MÓDULO: Itinerário Formativo (Formative Tracks)
-- ================================================================

-- 1. Criar tabela formative_tracks
CREATE TABLE public.formative_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX idx_formative_tracks_organization ON public.formative_tracks(organization_id);
CREATE INDEX idx_formative_tracks_status ON public.formative_tracks(status);

-- Constraint de unicidade por tenant (excluindo deletados)
CREATE UNIQUE INDEX idx_formative_tracks_unique_name 
ON public.formative_tracks(organization_id, name) 
WHERE deleted_at IS NULL;

-- 2. Adicionar formative_track_id na tabela courses
ALTER TABLE public.courses 
ADD COLUMN formative_track_id UUID REFERENCES public.formative_tracks(id);

-- Índice para performance
CREATE INDEX idx_courses_formative_track ON public.courses(formative_track_id);

-- 3. Enable RLS
ALTER TABLE public.formative_tracks ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies para formative_tracks

-- Admins e Coordenadores podem gerenciar (CRUD)
CREATE POLICY "Admins and coordinators can manage formative_tracks"
ON public.formative_tracks
FOR ALL
USING (is_coordinator(auth.uid(), organization_id));

-- Todos os usuários da organização podem visualizar
CREATE POLICY "Users can view formative_tracks of their organization"
ON public.formative_tracks
FOR SELECT
USING (has_organization_access(auth.uid(), organization_id));

-- 5. Trigger para updated_at
CREATE TRIGGER update_formative_tracks_updated_at
BEFORE UPDATE ON public.formative_tracks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();