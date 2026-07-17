-- Tabela de escolas
CREATE TABLE public.schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  director TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Por enquanto, permitir acesso total para usuários autenticados (ajuste fino depois)
CREATE POLICY "Authenticated users can view schools" ON public.schools
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert schools" ON public.schools
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update schools" ON public.schools
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete schools" ON public.schools
  FOR DELETE USING (auth.role() = 'authenticated');
