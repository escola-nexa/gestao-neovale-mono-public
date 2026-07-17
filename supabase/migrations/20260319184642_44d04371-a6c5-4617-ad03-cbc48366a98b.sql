
-- Tabela de palavras-chave trimestrais
CREATE TABLE public.quarterly_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) NOT NULL,
  keyword_hash text NOT NULL,
  starts_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de links externos
CREATE TABLE public.external_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) NOT NULL,
  school_id uuid REFERENCES public.schools(id) NOT NULL,
  created_by uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('planejamentos', 'notas', 'faltas')),
  scope_json jsonb NOT NULL DEFAULT '{}',
  token text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de logs de acesso externo
CREATE TABLE public.external_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) NOT NULL,
  external_link_id uuid REFERENCES public.external_links(id),
  school_id uuid REFERENCES public.schools(id),
  content_type text,
  access_status text NOT NULL,
  access_type text NOT NULL,
  ip_address text,
  city_name text,
  latitude numeric,
  longitude numeric,
  user_agent text,
  device_type text,
  accessed_at timestamptz NOT NULL DEFAULT now(),
  keyword_valid boolean,
  failure_reason text,
  action_performed text
);

-- Indexes
CREATE INDEX idx_quarterly_keywords_org ON public.quarterly_keywords(organization_id);
CREATE INDEX idx_quarterly_keywords_active ON public.quarterly_keywords(organization_id, is_active, expires_at);
CREATE INDEX idx_external_links_token ON public.external_links(token);
CREATE INDEX idx_external_links_org_school ON public.external_links(organization_id, school_id);
CREATE INDEX idx_external_access_logs_link ON public.external_access_logs(external_link_id);
CREATE INDEX idx_external_access_logs_org ON public.external_access_logs(organization_id);

-- RLS
ALTER TABLE public.quarterly_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_access_logs ENABLE ROW LEVEL SECURITY;

-- quarterly_keywords policies
CREATE POLICY "Admins can manage keywords" ON public.quarterly_keywords
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- external_links policies  
CREATE POLICY "Admin and coordinators can manage links" ON public.external_links
  FOR ALL TO authenticated
  USING (public.has_organization_access(auth.uid(), organization_id))
  WITH CHECK (public.has_organization_access(auth.uid(), organization_id));

-- external_access_logs policies
CREATE POLICY "Admin and coordinators can view logs" ON public.external_access_logs
  FOR SELECT TO authenticated
  USING (public.has_organization_access(auth.uid(), organization_id));

CREATE POLICY "Anyone can insert logs" ON public.external_access_logs
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Updated_at triggers
CREATE TRIGGER update_quarterly_keywords_updated_at
  BEFORE UPDATE ON public.quarterly_keywords
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_external_links_updated_at
  BEFORE UPDATE ON public.external_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
