-- ============================================================================
-- WEBHOOKS — Sistema de notificação para integrações externas
-- ============================================================================

-- 1. TABELA: webhooks (endpoints cadastrados)
CREATE TABLE public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_url TEXT NOT NULL,
  secret TEXT NOT NULL,
  event_types TEXT[] NOT NULL DEFAULT '{}',
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT webhooks_https_only CHECK (target_url ~* '^https://')
);

CREATE INDEX idx_webhooks_org_active ON public.webhooks(organization_id, is_active);
CREATE INDEX idx_webhooks_event_types ON public.webhooks USING GIN(event_types);

-- 2. TABELA: webhook_events (fila de eventos)
CREATE TABLE public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_table TEXT,
  source_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT webhook_events_status_check CHECK (status IN ('pending','processing','completed','failed','no_subscribers'))
);

CREATE INDEX idx_webhook_events_pending ON public.webhook_events(status, created_at) WHERE status = 'pending';
CREATE INDEX idx_webhook_events_org_created ON public.webhook_events(organization_id, created_at DESC);

-- 3. TABELA: webhook_deliveries (log de tentativas)
CREATE TABLE public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.webhook_events(id) ON DELETE CASCADE,
  attempt INTEGER NOT NULL DEFAULT 1,
  request_body JSONB,
  response_status INTEGER,
  response_body TEXT,
  duration_ms INTEGER,
  error TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  delivered_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT webhook_deliveries_status_check CHECK (status IN ('pending','success','failed','retrying'))
);

CREATE INDEX idx_webhook_deliveries_webhook_created ON public.webhook_deliveries(webhook_id, created_at DESC);
CREATE INDEX idx_webhook_deliveries_retry ON public.webhook_deliveries(next_retry_at) WHERE status = 'retrying';
CREATE INDEX idx_webhook_deliveries_event ON public.webhook_deliveries(event_id);

-- ============================================================================
-- RLS POLICIES (apenas admin da organização)
-- ============================================================================

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- webhooks: apenas admin gerencia
CREATE POLICY "Admins manage webhooks of their org"
ON public.webhooks FOR ALL
TO authenticated
USING (is_admin(auth.uid()) AND has_organization_access(auth.uid(), organization_id))
WITH CHECK (is_admin(auth.uid()) AND has_organization_access(auth.uid(), organization_id));

-- webhook_events: admin lê; sistema insere via SECURITY DEFINER
CREATE POLICY "Admins view webhook_events of their org"
ON public.webhook_events FOR SELECT
TO authenticated
USING (is_admin(auth.uid()) AND has_organization_access(auth.uid(), organization_id));

-- webhook_deliveries: admin lê
CREATE POLICY "Admins view webhook_deliveries of their org"
ON public.webhook_deliveries FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.webhooks w
    WHERE w.id = webhook_deliveries.webhook_id
      AND is_admin(auth.uid())
      AND has_organization_access(auth.uid(), w.organization_id)
  )
);

-- ============================================================================
-- FUNCTION: trigger updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_webhooks_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_webhooks_updated_at
BEFORE UPDATE ON public.webhooks
FOR EACH ROW EXECUTE FUNCTION public.update_webhooks_updated_at();

-- ============================================================================
-- FUNCTION GENÉRICA: enqueue_webhook_event
-- Insere um evento na fila se houver pelo menos 1 webhook ativo inscrito.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enqueue_webhook_event(
  p_organization_id UUID,
  p_event_type TEXT,
  p_payload JSONB,
  p_source_table TEXT DEFAULT NULL,
  p_source_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_has_subscriber BOOLEAN;
BEGIN
  -- Otimização: só insere se houver assinante
  SELECT EXISTS (
    SELECT 1 FROM public.webhooks
    WHERE organization_id = p_organization_id
      AND is_active = true
      AND p_event_type = ANY(event_types)
  ) INTO v_has_subscriber;

  IF NOT v_has_subscriber THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.webhook_events (organization_id, event_type, payload, source_table, source_id, status)
  VALUES (p_organization_id, p_event_type, COALESCE(p_payload, '{}'::jsonb), p_source_table, p_source_id, 'pending')
  RETURNING id INTO v_event_id;

  -- Notifica o dispatcher (reativo)
  PERFORM pg_notify('webhook_event', v_event_id::text);

  RETURN v_event_id;
END;
$$;

-- ============================================================================
-- TRIGGER FUNCTION GENÉRICA por tabela
-- ============================================================================
CREATE OR REPLACE FUNCTION public.tg_webhook_emit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT := TG_ARGV[0];          -- ex: 'school'
  v_org_id UUID;
  v_event TEXT;
  v_payload JSONB;
  v_source_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event := v_prefix || '.created';
    v_payload := to_jsonb(NEW);
    v_source_id := NEW.id;
    v_org_id := NEW.organization_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Detecta mudança de status
    IF (to_jsonb(NEW) ? 'status') AND (to_jsonb(NEW)->>'status') IS DISTINCT FROM (to_jsonb(OLD)->>'status') THEN
      v_event := v_prefix || '.status_changed';
    ELSE
      v_event := v_prefix || '.updated';
    END IF;
    v_payload := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    v_source_id := NEW.id;
    v_org_id := NEW.organization_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_event := v_prefix || '.deleted';
    v_payload := to_jsonb(OLD);
    v_source_id := OLD.id;
    v_org_id := OLD.organization_id;
  END IF;

  IF v_org_id IS NOT NULL THEN
    PERFORM public.enqueue_webhook_event(v_org_id, v_event, v_payload, TG_TABLE_NAME, v_source_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- ATTACH TRIGGERS (AFTER, para não bloquear)
-- ============================================================================

-- Acadêmico
CREATE TRIGGER trg_webhook_schools AFTER INSERT OR UPDATE OR DELETE ON public.schools
FOR EACH ROW EXECUTE FUNCTION public.tg_webhook_emit('school');

CREATE TRIGGER trg_webhook_courses AFTER INSERT OR UPDATE OR DELETE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.tg_webhook_emit('course');

CREATE TRIGGER trg_webhook_subjects AFTER INSERT OR UPDATE OR DELETE ON public.subjects
FOR EACH ROW EXECUTE FUNCTION public.tg_webhook_emit('subject');

CREATE TRIGGER trg_webhook_class_groups AFTER INSERT OR UPDATE OR DELETE ON public.class_groups
FOR EACH ROW EXECUTE FUNCTION public.tg_webhook_emit('class_group');

-- Pessoas
CREATE TRIGGER trg_webhook_professors AFTER INSERT OR UPDATE OR DELETE ON public.professors
FOR EACH ROW EXECUTE FUNCTION public.tg_webhook_emit('professor');

CREATE TRIGGER trg_webhook_students AFTER INSERT OR UPDATE OR DELETE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.tg_webhook_emit('student');

CREATE TRIGGER trg_webhook_enrollments AFTER INSERT OR UPDATE OR DELETE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.tg_webhook_emit('enrollment');

-- Pedagógico
CREATE TRIGGER trg_webhook_pre_plannings AFTER INSERT OR UPDATE OR DELETE ON public.pre_plannings
FOR EACH ROW EXECUTE FUNCTION public.tg_webhook_emit('pre_planning');

CREATE TRIGGER trg_webhook_teacher_plannings AFTER INSERT OR UPDATE OR DELETE ON public.teacher_plannings
FOR EACH ROW EXECUTE FUNCTION public.tg_webhook_emit('teacher_planning');

-- Frequência & Notas
CREATE TRIGGER trg_webhook_attendance AFTER INSERT OR UPDATE ON public.attendance_records
FOR EACH ROW EXECUTE FUNCTION public.tg_webhook_emit('attendance');

-- Orientações
CREATE TRIGGER trg_webhook_orientations AFTER INSERT OR UPDATE ON public.orientations
FOR EACH ROW EXECUTE FUNCTION public.tg_webhook_emit('orientation');

-- Acompanhamento
CREATE TRIGGER trg_webhook_booklet_deliveries AFTER INSERT OR UPDATE ON public.booklet_deliveries
FOR EACH ROW EXECUTE FUNCTION public.tg_webhook_emit('delivery');

-- Compartilhamento
CREATE TRIGGER trg_webhook_external_links AFTER INSERT OR UPDATE ON public.external_links
FOR EACH ROW EXECUTE FUNCTION public.tg_webhook_emit('external_link');