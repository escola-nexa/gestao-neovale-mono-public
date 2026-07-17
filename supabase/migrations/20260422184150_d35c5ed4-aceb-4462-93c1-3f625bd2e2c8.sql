
-- ============================================
-- Tabela principal: professor_documents (1:1)
-- ============================================
CREATE TABLE public.professor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID NOT NULL UNIQUE REFERENCES public.professors(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Admissional (only admin/coordinator can edit)
  admission_date DATE,
  function_title TEXT,
  admission_status TEXT NOT NULL DEFAULT 'em_analise' CHECK (admission_status IN ('em_analise', 'aprovado', 'contratado', 'desligado')),
  termination_date DATE,

  -- Dados pessoais
  full_name TEXT,
  nationality TEXT,
  birth_city TEXT,
  birth_state TEXT,
  birth_date DATE,
  marital_status TEXT,
  education_level TEXT,
  gender TEXT,
  height NUMERIC(4,2),
  weight NUMERIC(5,2),
  race TEXT,
  hair_color TEXT,
  eye_color TEXT,
  blood_type TEXT,

  -- Documentos
  cpf TEXT,
  rg_number TEXT,
  rg_issuer TEXT,
  rg_state TEXT,
  rg_issue_date DATE,
  work_card_number TEXT,
  work_card_series TEXT,
  work_card_state TEXT,
  cnh_number TEXT,
  cnh_state TEXT,
  cnh_category TEXT,
  cnh_issue_date DATE,
  cnh_expiry DATE,
  first_license_date DATE,
  voter_id TEXT,
  voter_zone TEXT,
  voter_section TEXT,
  military_cert TEXT,
  pis_nit TEXT,

  -- Endereço & Contato
  email TEXT,
  phone TEXT,
  address TEXT,
  address_complement TEXT,
  neighborhood TEXT,
  zip_code TEXT,
  address_city TEXT,
  address_state TEXT,

  -- Bancário
  bank_name TEXT,
  bank_branch TEXT,
  bank_account TEXT,
  has_sicredi_account BOOLEAN DEFAULT false,
  pix_type TEXT,
  pix_key TEXT,

  -- Família
  father_name TEXT,
  mother_name TEXT,
  spouse_name TEXT,
  spouse_nationality TEXT,
  spouse_birth_city TEXT,
  spouse_birth_state TEXT,
  spouse_birth_date DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_professor_documents_professor_id ON public.professor_documents(professor_id);
CREATE INDEX idx_professor_documents_organization_id ON public.professor_documents(organization_id);

ALTER TABLE public.professor_documents ENABLE ROW LEVEL SECURITY;

-- Helper function: get professor_id from user
CREATE OR REPLACE FUNCTION public.get_my_professor_id()
RETURNS UUID
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.professors
  WHERE user_id = auth.uid() AND deleted_at IS NULL
  LIMIT 1;
$$;

-- RLS: Admins/coordinators can do everything in their org
CREATE POLICY "Coordinators manage all professor documents"
  ON public.professor_documents
  FOR ALL
  USING (is_coordinator(auth.uid(), organization_id))
  WITH CHECK (is_coordinator(auth.uid(), organization_id));

-- RLS: Professors can SELECT only their own document
CREATE POLICY "Professors view own documents"
  ON public.professor_documents
  FOR SELECT
  USING (professor_id = get_my_professor_id());

-- RLS: Professors can INSERT their own document
CREATE POLICY "Professors insert own documents"
  ON public.professor_documents
  FOR INSERT
  WITH CHECK (professor_id = get_my_professor_id());

-- RLS: Professors can UPDATE their own document
CREATE POLICY "Professors update own documents"
  ON public.professor_documents
  FOR UPDATE
  USING (professor_id = get_my_professor_id())
  WITH CHECK (professor_id = get_my_professor_id());

-- Trigger: prevent professors from changing admissional fields
CREATE OR REPLACE FUNCTION public.protect_admission_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If user is admin/coordinator, allow everything
  IF is_coordinator(auth.uid(), NEW.organization_id) THEN
    RETURN NEW;
  END IF;

  -- Otherwise, restore admissional fields from OLD
  IF TG_OP = 'UPDATE' THEN
    NEW.admission_date := OLD.admission_date;
    NEW.function_title := OLD.function_title;
    NEW.admission_status := OLD.admission_status;
    NEW.termination_date := OLD.termination_date;
  END IF;

  -- For INSERT by professor, force default status and clear admin fields
  IF TG_OP = 'INSERT' THEN
    NEW.admission_date := NULL;
    NEW.function_title := NULL;
    NEW.admission_status := 'em_analise';
    NEW.termination_date := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_admission_fields
  BEFORE INSERT OR UPDATE ON public.professor_documents
  FOR EACH ROW EXECUTE FUNCTION public.protect_admission_fields();

CREATE TRIGGER trg_professor_documents_updated_at
  BEFORE UPDATE ON public.professor_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Tabela: professor_children (1:N)
-- ============================================
CREATE TABLE public.professor_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID NOT NULL REFERENCES public.professors(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birth_date DATE,
  city TEXT,
  state TEXT,
  cpf TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_professor_children_professor_id ON public.professor_children(professor_id);

ALTER TABLE public.professor_children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordinators manage children"
  ON public.professor_children FOR ALL
  USING (is_coordinator(auth.uid(), organization_id))
  WITH CHECK (is_coordinator(auth.uid(), organization_id));

CREATE POLICY "Professors view own children"
  ON public.professor_children FOR SELECT
  USING (professor_id = get_my_professor_id());

CREATE POLICY "Professors insert own children"
  ON public.professor_children FOR INSERT
  WITH CHECK (professor_id = get_my_professor_id());

CREATE POLICY "Professors update own children"
  ON public.professor_children FOR UPDATE
  USING (professor_id = get_my_professor_id())
  WITH CHECK (professor_id = get_my_professor_id());

CREATE POLICY "Professors delete own children"
  ON public.professor_children FOR DELETE
  USING (professor_id = get_my_professor_id());

CREATE TRIGGER trg_professor_children_updated_at
  BEFORE UPDATE ON public.professor_children
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Tabela: professor_document_files (1:N)
-- ============================================
CREATE TABLE public.professor_document_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID NOT NULL REFERENCES public.professors(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_professor_doc_files_professor_id ON public.professor_document_files(professor_id);

ALTER TABLE public.professor_document_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordinators manage document files"
  ON public.professor_document_files FOR ALL
  USING (is_coordinator(auth.uid(), organization_id))
  WITH CHECK (is_coordinator(auth.uid(), organization_id));

CREATE POLICY "Professors view own files"
  ON public.professor_document_files FOR SELECT
  USING (professor_id = get_my_professor_id());

CREATE POLICY "Professors insert own files"
  ON public.professor_document_files FOR INSERT
  WITH CHECK (professor_id = get_my_professor_id() AND uploaded_by = auth.uid());

CREATE POLICY "Professors delete own files"
  ON public.professor_document_files FOR DELETE
  USING (professor_id = get_my_professor_id());

-- ============================================
-- Storage bucket: professor-documents (privado)
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('professor-documents', 'professor-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Path convention: {organization_id}/{professor_id}/{category}/{filename}
CREATE POLICY "Coordinators manage professor-documents storage"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'professor-documents'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT organization_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'coordenador')
    )
  )
  WITH CHECK (
    bucket_id = 'professor-documents'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT organization_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'coordenador')
    )
  );

CREATE POLICY "Professors view own professor-documents storage"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'professor-documents'
    AND (storage.foldername(name))[2]::uuid = get_my_professor_id()
  );

CREATE POLICY "Professors upload own professor-documents storage"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'professor-documents'
    AND (storage.foldername(name))[2]::uuid = get_my_professor_id()
  );

CREATE POLICY "Professors delete own professor-documents storage"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'professor-documents'
    AND (storage.foldername(name))[2]::uuid = get_my_professor_id()
  );
