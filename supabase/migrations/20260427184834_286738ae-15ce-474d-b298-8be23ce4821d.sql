
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.incident_type AS ENUM (
    'atraso', 'falta', 'atestado', 'emergencia',
    'imprevisto_deslocamento', 'ausencia_nao_programada',
    'substituicao_urgente', 'problema_saude', 'outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.incident_status AS ENUM (
    'aberto', 'ciente_rh', 'ciente_coordenacao', 'resolvido', 'cancelado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.shift_type AS ENUM ('manha', 'tarde', 'noite', 'integral');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ TABLES ============
CREATE TABLE IF NOT EXISTS public.incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  reporter_id UUID NOT NULL,
  reporter_name TEXT, -- snapshot for non-professor reporters
  professor_id UUID REFERENCES public.professors(id) ON DELETE SET NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  shift public.shift_type,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  class_group_id UUID REFERENCES public.class_groups(id) ON DELETE SET NULL,
  incident_type public.incident_type NOT NULL,
  expected_arrival_time TIMESTAMPTZ,
  expected_absence_until TIMESTAMPTZ,
  summary TEXT NOT NULL,
  notes TEXT,
  status public.incident_status NOT NULL DEFAULT 'aberto',
  coordinator_id UUID,
  acknowledged_rh_at TIMESTAMPTZ,
  acknowledged_rh_by UUID,
  acknowledged_coord_at TIMESTAMPTZ,
  acknowledged_coord_by UUID,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_incidents_org_status ON public.incident_reports(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_incidents_school ON public.incident_reports(school_id);
CREATE INDEX IF NOT EXISTS idx_incidents_reporter ON public.incident_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_incidents_coord ON public.incident_reports(coordinator_id);

CREATE TABLE IF NOT EXISTS public.incident_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incident_reports(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_incident_attach ON public.incident_attachments(incident_id);

CREATE TABLE IF NOT EXISTS public.incident_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incident_reports(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL, -- created, ack_rh, ack_coord, resolved, cancelled, attachment_added, status_changed
  description TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_incident_audit ON public.incident_audit(incident_id, created_at DESC);

-- ============ HELPER ============
CREATE OR REPLACE FUNCTION public.is_rh(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_uuid AND organization_id = org_uuid AND role = 'rh'
  );
$$;

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.tg_incidents_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS incidents_set_updated_at ON public.incident_reports;
CREATE TRIGGER incidents_set_updated_at
BEFORE UPDATE ON public.incident_reports
FOR EACH ROW EXECUTE FUNCTION public.tg_incidents_updated_at();

-- Auto-resolve coordinator + audit + notifications on insert
CREATE OR REPLACE FUNCTION public.tg_incident_on_create()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_coord_id UUID;
  v_rh RECORD;
  v_admin RECORD;
  v_critical BOOLEAN;
  v_school_name TEXT;
  v_reporter_name TEXT;
BEGIN
  -- Resolve coordinator from school
  IF NEW.coordinator_id IS NULL AND NEW.school_id IS NOT NULL THEN
    SELECT DISTINCT ur.user_id INTO v_coord_id
    FROM public.user_roles ur
    JOIN public.professors p ON p.user_id = ur.user_id AND p.organization_id = NEW.organization_id
    JOIN public.professor_school_courses psc ON psc.professor_id = p.id AND psc.school_id = NEW.school_id AND psc.status = 'ACTIVE'
    WHERE ur.organization_id = NEW.organization_id
      AND ur.role = 'coordenador'
    LIMIT 1;

    IF v_coord_id IS NULL THEN
      SELECT user_id INTO v_coord_id FROM public.user_roles
      WHERE organization_id = NEW.organization_id AND role = 'coordenador' LIMIT 1;
    END IF;

    NEW.coordinator_id := v_coord_id;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS incidents_on_create ON public.incident_reports;
CREATE TRIGGER incidents_on_create
BEFORE INSERT ON public.incident_reports
FOR EACH ROW EXECUTE FUNCTION public.tg_incident_on_create();

CREATE OR REPLACE FUNCTION public.tg_incident_after_create()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_critical BOOLEAN;
  v_school_name TEXT;
  v_reporter_name TEXT;
  v_target RECORD;
BEGIN
  v_critical := NEW.incident_type IN ('atestado','emergencia','problema_saude','substituicao_urgente');

  SELECT nome INTO v_school_name FROM public.schools WHERE id = NEW.school_id;
  v_school_name := COALESCE(v_school_name, '—');
  v_reporter_name := COALESCE(NEW.reporter_name, '');
  IF v_reporter_name = '' THEN
    SELECT full_name INTO v_reporter_name FROM public.profiles WHERE user_id = NEW.reporter_id;
  END IF;
  v_reporter_name := COALESCE(v_reporter_name, 'Usuário');

  -- Audit: created
  INSERT INTO public.incident_audit (incident_id, user_id, action, description, details)
  VALUES (NEW.id, NEW.reporter_id, 'created',
    v_reporter_name || ' registrou ocorrência (' || NEW.incident_type || ')',
    jsonb_build_object('type', NEW.incident_type, 'school', v_school_name));

  -- Notify RH
  FOR v_target IN
    SELECT user_id FROM public.user_roles
    WHERE organization_id = NEW.organization_id AND role = 'rh'
  LOOP
    BEGIN
      INSERT INTO public.notifications (user_id, title, message, type, reference_id)
      VALUES (v_target.user_id,
        'Nova Ocorrência — ' || NEW.incident_type,
        v_reporter_name || ' • ' || v_school_name || ': ' || LEFT(NEW.summary, 120),
        'INCIDENT_NEW', NEW.id);
    EXCEPTION WHEN others THEN NULL; END;
  END LOOP;

  -- Notify Coordinator
  IF NEW.coordinator_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.notifications (user_id, title, message, type, reference_id)
      VALUES (NEW.coordinator_id,
        'Nova Ocorrência na sua escola',
        v_reporter_name || ' • ' || v_school_name || ': ' || LEFT(NEW.summary, 120),
        'INCIDENT_NEW', NEW.id);
    EXCEPTION WHEN others THEN NULL; END;
  END IF;

  -- Notify Admins for critical
  IF v_critical THEN
    FOR v_target IN
      SELECT user_id FROM public.user_roles
      WHERE organization_id = NEW.organization_id AND role = 'admin'
    LOOP
      BEGIN
        INSERT INTO public.notifications (user_id, title, message, type, reference_id)
        VALUES (v_target.user_id,
          'Ocorrência Crítica — ' || NEW.incident_type,
          v_reporter_name || ' • ' || v_school_name || ': ' || LEFT(NEW.summary, 120),
          'INCIDENT_NEW', NEW.id);
      EXCEPTION WHEN others THEN NULL; END;
    END LOOP;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS incidents_after_create ON public.incident_reports;
CREATE TRIGGER incidents_after_create
AFTER INSERT ON public.incident_reports
FOR EACH ROW EXECUTE FUNCTION public.tg_incident_after_create();

-- Status change tracking
CREATE OR REPLACE FUNCTION public.tg_incident_on_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT full_name INTO v_actor FROM public.profiles WHERE user_id = auth.uid();
    v_actor := COALESCE(v_actor, 'Sistema');

    -- Auto stamps
    IF NEW.status = 'ciente_rh' AND OLD.status <> 'ciente_rh' THEN
      NEW.acknowledged_rh_at := now();
      NEW.acknowledged_rh_by := auth.uid();
    END IF;
    IF NEW.status = 'ciente_coordenacao' AND OLD.status <> 'ciente_coordenacao' THEN
      NEW.acknowledged_coord_at := now();
      NEW.acknowledged_coord_by := auth.uid();
    END IF;
    IF NEW.status = 'resolvido' AND OLD.status <> 'resolvido' THEN
      NEW.resolved_at := now();
      NEW.resolved_by := auth.uid();
    END IF;

    -- Audit
    INSERT INTO public.incident_audit (incident_id, user_id, action, description, details)
    VALUES (NEW.id, auth.uid(), 'status_changed',
      v_actor || ' alterou status: ' || OLD.status || ' → ' || NEW.status,
      jsonb_build_object('from', OLD.status, 'to', NEW.status));

    -- Notify reporter
    BEGIN
      INSERT INTO public.notifications (user_id, title, message, type, reference_id)
      VALUES (NEW.reporter_id,
        'Sua ocorrência foi atualizada',
        'Status: ' || REPLACE(NEW.status::text, '_', ' '),
        CASE WHEN NEW.status = 'resolvido' THEN 'INCIDENT_RESOLVED' ELSE 'INCIDENT_ACK' END,
        NEW.id);
    EXCEPTION WHEN others THEN NULL; END;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS incidents_on_status_change ON public.incident_reports;
CREATE TRIGGER incidents_on_status_change
BEFORE UPDATE ON public.incident_reports
FOR EACH ROW EXECUTE FUNCTION public.tg_incident_on_status_change();

-- ============ RLS ============
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "incidents_select_authorized" ON public.incident_reports
FOR SELECT TO authenticated
USING (
  reporter_id = auth.uid()
  OR coordinator_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR public.is_rh(auth.uid(), organization_id)
  OR (professor_id IS NOT NULL AND professor_id = public.get_my_professor_id())
);

CREATE POLICY "incidents_insert_org_member" ON public.incident_reports
FOR INSERT TO authenticated
WITH CHECK (
  reporter_id = auth.uid()
  AND public.has_organization_access(auth.uid(), organization_id)
);

CREATE POLICY "incidents_update_managers" ON public.incident_reports
FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.is_rh(auth.uid(), organization_id)
  OR coordinator_id = auth.uid()
  OR reporter_id = auth.uid()
);

CREATE POLICY "incidents_delete_admin" ON public.incident_reports
FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- attachments
CREATE POLICY "incident_attach_select" ON public.incident_attachments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.incident_reports r
    WHERE r.id = incident_attachments.incident_id
      AND (
        r.reporter_id = auth.uid()
        OR r.coordinator_id = auth.uid()
        OR public.is_admin(auth.uid())
        OR public.is_rh(auth.uid(), r.organization_id)
        OR (r.professor_id IS NOT NULL AND r.professor_id = public.get_my_professor_id())
      )
  )
);

CREATE POLICY "incident_attach_insert" ON public.incident_attachments
FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.incident_reports r
    WHERE r.id = incident_attachments.incident_id
      AND (
        r.reporter_id = auth.uid()
        OR r.coordinator_id = auth.uid()
        OR public.is_admin(auth.uid())
        OR public.is_rh(auth.uid(), r.organization_id)
      )
  )
);

CREATE POLICY "incident_attach_delete" ON public.incident_attachments
FOR DELETE TO authenticated
USING (
  uploaded_by = auth.uid()
  OR public.is_admin(auth.uid())
);

-- audit (read-only externally; inserts via triggers)
CREATE POLICY "incident_audit_select" ON public.incident_audit
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.incident_reports r
    WHERE r.id = incident_audit.incident_id
      AND (
        r.reporter_id = auth.uid()
        OR r.coordinator_id = auth.uid()
        OR public.is_admin(auth.uid())
        OR public.is_rh(auth.uid(), r.organization_id)
        OR (r.professor_id IS NOT NULL AND r.professor_id = public.get_my_professor_id())
      )
  )
);

-- ============ STORAGE ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('incident-attachments', 'incident-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "incident_storage_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'incident-attachments'
  AND EXISTS (
    SELECT 1 FROM public.incident_attachments a
    JOIN public.incident_reports r ON r.id = a.incident_id
    WHERE a.file_path = storage.objects.name
      AND (
        r.reporter_id = auth.uid()
        OR r.coordinator_id = auth.uid()
        OR public.is_admin(auth.uid())
        OR public.is_rh(auth.uid(), r.organization_id)
      )
  )
);

CREATE POLICY "incident_storage_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'incident-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "incident_storage_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'incident-attachments'
  AND (owner = auth.uid() OR public.is_admin(auth.uid()))
);

-- realtime
ALTER TABLE public.incident_reports REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.incident_reports;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
