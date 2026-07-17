
-- =============================================
-- ACOMPANHAMENTO ESCOLAR MODULE
-- =============================================

-- Table: school_visits (Visitas Escolares)
CREATE TABLE public.school_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  action_name text NOT NULL,
  description text DEFAULT '',
  objective text DEFAULT '',
  logistics_notes text DEFAULT '',
  responsible_user_id uuid NOT NULL,
  priority text NOT NULL DEFAULT 'media',
  status text NOT NULL DEFAULT 'agendada',
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz,
  form_pdf_url text,
  visit_type text NOT NULL DEFAULT 'visita',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: school_visit_users (Usuários envolvidos na visita)
CREATE TABLE public.school_visit_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.school_visits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: school_visit_schools (Escolas envolvidas na visita)
CREATE TABLE public.school_visit_schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.school_visits(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id),
  city text,
  arrival_at timestamptz,
  departure_at timestamptz,
  visit_status text NOT NULL DEFAULT 'pendente',
  route_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: school_visit_records (Registros de visita por escola)
CREATE TABLE public.school_visit_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_school_id uuid NOT NULL REFERENCES public.school_visit_schools(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  objective text DEFAULT '',
  executive_summary text DEFAULT '',
  referrals text DEFAULT '',
  pending_items text DEFAULT '',
  next_steps text DEFAULT '',
  final_notes text DEFAULT '',
  recorded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: school_visit_participants (Pessoas encontradas na visita)
CREATE TABLE public.school_visit_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_record_id uuid NOT NULL REFERENCES public.school_visit_records(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text DEFAULT '',
  school_link text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: school_visit_attachments (Evidências e anexos)
CREATE TABLE public.school_visit_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_record_id uuid REFERENCES public.school_visit_records(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES public.school_visits(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text DEFAULT 'document',
  file_size bigint DEFAULT 0,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: booklet_deliveries (Entregas de Apostilas)
CREATE TABLE public.booklet_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  action_name text NOT NULL,
  description text DEFAULT '',
  objective text DEFAULT '',
  logistics_notes text DEFAULT '',
  responsible_user_id uuid NOT NULL,
  priority text NOT NULL DEFAULT 'media',
  status text NOT NULL DEFAULT 'agendada',
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz,
  form_pdf_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: booklet_delivery_users (Usuários envolvidos na entrega)
CREATE TABLE public.booklet_delivery_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.booklet_deliveries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: booklet_delivery_schools (Escolas envolvidas na entrega)
CREATE TABLE public.booklet_delivery_schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.booklet_deliveries(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id),
  city text,
  delivery_status text NOT NULL DEFAULT 'pendente',
  receiver_name text,
  receiver_role text,
  received_at timestamptz,
  delivery_notes text DEFAULT '',
  route_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: booklet_delivery_items (Apostilas por entrega)
CREATE TABLE public.booklet_delivery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_school_id uuid NOT NULL REFERENCES public.booklet_delivery_schools(id) ON DELETE CASCADE,
  booklet_name text NOT NULL,
  quantity_expected integer NOT NULL DEFAULT 0,
  quantity_delivered integer NOT NULL DEFAULT 0,
  unit text DEFAULT 'unidade',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: booklet_delivery_attachments (Evidências de entrega)
CREATE TABLE public.booklet_delivery_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_school_id uuid REFERENCES public.booklet_delivery_schools(id) ON DELETE CASCADE,
  delivery_id uuid REFERENCES public.booklet_deliveries(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text DEFAULT 'document',
  file_size bigint DEFAULT 0,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.school_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_visit_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_visit_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_visit_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_visit_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_visit_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booklet_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booklet_delivery_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booklet_delivery_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booklet_delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booklet_delivery_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for school_visits
CREATE POLICY "Coordinators can manage school_visits" ON public.school_visits FOR ALL TO public USING (is_coordinator(auth.uid(), organization_id));

-- RLS Policies for school_visit_users
CREATE POLICY "Coordinators can manage visit_users" ON public.school_visit_users FOR ALL TO public USING (EXISTS (SELECT 1 FROM public.school_visits sv WHERE sv.id = school_visit_users.visit_id AND is_coordinator(auth.uid(), sv.organization_id)));

-- RLS Policies for school_visit_schools
CREATE POLICY "Coordinators can manage visit_schools" ON public.school_visit_schools FOR ALL TO public USING (EXISTS (SELECT 1 FROM public.school_visits sv WHERE sv.id = school_visit_schools.visit_id AND is_coordinator(auth.uid(), sv.organization_id)));

-- RLS Policies for school_visit_records
CREATE POLICY "Coordinators can manage visit_records" ON public.school_visit_records FOR ALL TO public USING (is_coordinator(auth.uid(), organization_id));

-- RLS Policies for school_visit_participants
CREATE POLICY "Coordinators can manage visit_participants" ON public.school_visit_participants FOR ALL TO public USING (EXISTS (SELECT 1 FROM public.school_visit_records vr WHERE vr.id = school_visit_participants.visit_record_id AND is_coordinator(auth.uid(), vr.organization_id)));

-- RLS Policies for school_visit_attachments
CREATE POLICY "Coordinators can manage visit_attachments" ON public.school_visit_attachments FOR ALL TO public USING (is_coordinator(auth.uid(), organization_id));

-- RLS Policies for booklet_deliveries
CREATE POLICY "Coordinators can manage booklet_deliveries" ON public.booklet_deliveries FOR ALL TO public USING (is_coordinator(auth.uid(), organization_id));

-- RLS Policies for booklet_delivery_users
CREATE POLICY "Coordinators can manage delivery_users" ON public.booklet_delivery_users FOR ALL TO public USING (EXISTS (SELECT 1 FROM public.booklet_deliveries bd WHERE bd.id = booklet_delivery_users.delivery_id AND is_coordinator(auth.uid(), bd.organization_id)));

-- RLS Policies for booklet_delivery_schools
CREATE POLICY "Coordinators can manage delivery_schools" ON public.booklet_delivery_schools FOR ALL TO public USING (EXISTS (SELECT 1 FROM public.booklet_deliveries bd WHERE bd.id = booklet_delivery_schools.delivery_id AND is_coordinator(auth.uid(), bd.organization_id)));

-- RLS Policies for booklet_delivery_items
CREATE POLICY "Coordinators can manage delivery_items" ON public.booklet_delivery_items FOR ALL TO public USING (EXISTS (SELECT 1 FROM public.booklet_delivery_schools bds JOIN public.booklet_deliveries bd ON bd.id = bds.delivery_id WHERE bds.id = booklet_delivery_items.delivery_school_id AND is_coordinator(auth.uid(), bd.organization_id)));

-- RLS Policies for booklet_delivery_attachments
CREATE POLICY "Coordinators can manage delivery_attachments" ON public.booklet_delivery_attachments FOR ALL TO public USING (is_coordinator(auth.uid(), organization_id));

-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('school-monitoring', 'school-monitoring', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload monitoring files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'school-monitoring');
CREATE POLICY "Authenticated users can read monitoring files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'school-monitoring');
CREATE POLICY "Authenticated users can delete monitoring files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'school-monitoring');
