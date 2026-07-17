
-- Table for states (Estados)
CREATE TABLE public.states (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  nome text NOT NULL,
  sigla text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(organization_id, sigla)
);

ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordinators can manage states" ON public.states
  FOR ALL USING (is_coordinator(auth.uid(), organization_id))
  WITH CHECK (is_coordinator(auth.uid(), organization_id));

CREATE POLICY "Users can view states" ON public.states
  FOR SELECT USING (has_organization_access(auth.uid(), organization_id));

-- Table for cities (Cidades)
CREATE TABLE public.cities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  state_id uuid NOT NULL REFERENCES public.states(id) ON DELETE CASCADE,
  nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(state_id, nome)
);

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordinators can manage cities" ON public.cities
  FOR ALL USING (is_coordinator(auth.uid(), organization_id))
  WITH CHECK (is_coordinator(auth.uid(), organization_id));

CREATE POLICY "Users can view cities" ON public.cities
  FOR SELECT USING (has_organization_access(auth.uid(), organization_id));

-- Triggers for updated_at
CREATE TRIGGER update_states_updated_at
  BEFORE UPDATE ON public.states
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cities_updated_at
  BEFORE UPDATE ON public.cities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
