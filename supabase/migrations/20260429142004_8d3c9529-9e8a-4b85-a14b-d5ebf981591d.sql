DO $$ BEGIN
  CREATE TYPE public.talent_period AS ENUM ('MANHA', 'TARDE', 'NOITE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.talent_weekday AS ENUM ('SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.talent_pool_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text NOT NULL,
  phone_is_whatsapp boolean NOT NULL DEFAULT false,
  state_id uuid REFERENCES public.states(id) ON DELETE SET NULL,
  city_id  uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  free_periods public.talent_period[] NOT NULL DEFAULT '{}',
  free_weekdays public.talent_weekday[] NOT NULL DEFAULT '{}',
  formation_area text,
  has_licentiate boolean NOT NULL DEFAULT false,
  resume_path text,
  schooling_path text,
  graduate_path text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_talent_pool_org ON public.talent_pool_candidates(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_talent_pool_state ON public.talent_pool_candidates(state_id);
CREATE INDEX IF NOT EXISTS idx_talent_pool_city ON public.talent_pool_candidates(city_id);

CREATE OR REPLACE FUNCTION public.set_talent_pool_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_talent_pool_updated_at ON public.talent_pool_candidates;
CREATE TRIGGER trg_talent_pool_updated_at
BEFORE UPDATE ON public.talent_pool_candidates
FOR EACH ROW EXECUTE FUNCTION public.set_talent_pool_updated_at();

ALTER TABLE public.talent_pool_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers manage talent pool" ON public.talent_pool_candidates;
CREATE POLICY "Managers manage talent pool"
ON public.talent_pool_candidates
FOR ALL TO authenticated
USING (is_coordinator(auth.uid(), organization_id))
WITH CHECK (is_coordinator(auth.uid(), organization_id));

INSERT INTO storage.buckets (id, name, public)
VALUES ('talent-pool-resumes', 'talent-pool-resumes', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Managers read talent resumes" ON storage.objects;
CREATE POLICY "Managers read talent resumes"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'talent-pool-resumes'
  AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE is_coordinator(auth.uid(), o.id)
  )
);

DROP POLICY IF EXISTS "Managers upload talent resumes" ON storage.objects;
CREATE POLICY "Managers upload talent resumes"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'talent-pool-resumes'
  AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE is_coordinator(auth.uid(), o.id)
  )
);

DROP POLICY IF EXISTS "Managers update talent resumes" ON storage.objects;
CREATE POLICY "Managers update talent resumes"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'talent-pool-resumes'
  AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE is_coordinator(auth.uid(), o.id)
  )
);

DROP POLICY IF EXISTS "Managers delete talent resumes" ON storage.objects;
CREATE POLICY "Managers delete talent resumes"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'talent-pool-resumes'
  AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE is_coordinator(auth.uid(), o.id)
  )
);