
-- =========================
-- Cover fields on tickets
-- =========================
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS cover_color text;

-- =========================
-- ticket_checklists
-- =========================
CREATE TABLE IF NOT EXISTS public.ticket_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  title text NOT NULL,
  position double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ticket_checklists_ticket ON public.ticket_checklists(ticket_id, position);
ALTER TABLE public.ticket_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View checklists via ticket access" ON public.ticket_checklists
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND has_organization_access(auth.uid(), t.organization_id)));

CREATE POLICY "Manage checklists by coordinator" ON public.ticket_checklists
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND is_coordinator(auth.uid(), t.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND is_coordinator(auth.uid(), t.organization_id)));

-- =========================
-- ticket_checklist_items
-- =========================
CREATE TABLE IF NOT EXISTS public.ticket_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.ticket_checklists(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  position double precision NOT NULL DEFAULT 0,
  due_date timestamptz,
  assignee_id uuid,
  done_at timestamptz,
  done_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist ON public.ticket_checklist_items(checklist_id, position);
ALTER TABLE public.ticket_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View checklist items via ticket access" ON public.ticket_checklist_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ticket_checklists c
    JOIN public.tickets t ON t.id = c.ticket_id
    WHERE c.id = checklist_id AND has_organization_access(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Manage checklist items by coordinator" ON public.ticket_checklist_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ticket_checklists c
    JOIN public.tickets t ON t.id = c.ticket_id
    WHERE c.id = checklist_id AND is_coordinator(auth.uid(), t.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ticket_checklists c
    JOIN public.tickets t ON t.id = c.ticket_id
    WHERE c.id = checklist_id AND is_coordinator(auth.uid(), t.organization_id)
  ));

-- =========================
-- ticket_labels (catalog per organization)
-- =========================
CREATE TABLE IF NOT EXISTS public.ticket_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);
CREATE INDEX IF NOT EXISTS idx_ticket_labels_org ON public.ticket_labels(organization_id);
ALTER TABLE public.ticket_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View labels in org" ON public.ticket_labels
  FOR SELECT TO authenticated
  USING (has_organization_access(auth.uid(), organization_id));

CREATE POLICY "Manage labels by coordinator" ON public.ticket_labels
  FOR ALL TO authenticated
  USING (is_coordinator(auth.uid(), organization_id))
  WITH CHECK (is_coordinator(auth.uid(), organization_id));

-- =========================
-- ticket_label_assignments (N:N)
-- =========================
CREATE TABLE IF NOT EXISTS public.ticket_label_assignments (
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES public.ticket_labels(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ticket_id, label_id)
);
CREATE INDEX IF NOT EXISTS idx_label_assignments_ticket ON public.ticket_label_assignments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_label_assignments_label ON public.ticket_label_assignments(label_id);
ALTER TABLE public.ticket_label_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View label assignments via ticket access" ON public.ticket_label_assignments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND has_organization_access(auth.uid(), t.organization_id)));

CREATE POLICY "Manage label assignments by coordinator" ON public.ticket_label_assignments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND is_coordinator(auth.uid(), t.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND is_coordinator(auth.uid(), t.organization_id)));

-- =========================
-- ticket_watchers
-- =========================
CREATE TABLE IF NOT EXISTS public.ticket_watchers (
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ticket_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_ticket_watchers_user ON public.ticket_watchers(user_id);
ALTER TABLE public.ticket_watchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View watchers via ticket access" ON public.ticket_watchers
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND has_organization_access(auth.uid(), t.organization_id)));

CREATE POLICY "Self watch" ON public.ticket_watchers
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND has_organization_access(auth.uid(), t.organization_id)));

CREATE POLICY "Self unwatch" ON public.ticket_watchers
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Coordinators manage watchers" ON public.ticket_watchers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND is_coordinator(auth.uid(), t.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND is_coordinator(auth.uid(), t.organization_id)));

-- =========================
-- Default labels seeding
-- =========================
CREATE OR REPLACE FUNCTION public.seed_default_ticket_labels(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ticket_labels (organization_id, name, color) VALUES
    (p_org_id, 'Bug', '#EF4444'),
    (p_org_id, 'Urgente', '#F59E0B'),
    (p_org_id, 'Pedagógico', '#10B981'),
    (p_org_id, 'Financeiro', '#8B5CF6'),
    (p_org_id, 'TI', '#3B82F6'),
    (p_org_id, 'Infraestrutura', '#14B8A6')
  ON CONFLICT (organization_id, name) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_seed_labels_on_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_default_ticket_labels(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_labels_on_org ON public.organizations;
CREATE TRIGGER trg_seed_labels_on_org
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.tg_seed_labels_on_org();

-- Backfill existing organizations
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.organizations LOOP
    PERFORM public.seed_default_ticket_labels(r.id);
  END LOOP;
END $$;

-- =========================
-- updated_at triggers
-- =========================
DROP TRIGGER IF EXISTS trg_checklists_updated ON public.ticket_checklists;
CREATE TRIGGER trg_checklists_updated
  BEFORE UPDATE ON public.ticket_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_checklist_items_updated ON public.ticket_checklist_items;
CREATE TRIGGER trg_checklist_items_updated
  BEFORE UPDATE ON public.ticket_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- Auto-complete checklists when ticket resolved
-- =========================
CREATE OR REPLACE FUNCTION public.tg_complete_checklists_on_resolve()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'resolvido' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.ticket_checklist_items i
    SET is_done = true,
        done_at = COALESCE(done_at, now()),
        done_by = COALESCE(done_by, auth.uid())
    WHERE i.is_done = false
      AND EXISTS (
        SELECT 1 FROM public.ticket_checklists c
        WHERE c.id = i.checklist_id AND c.ticket_id = NEW.id
      );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complete_checklists_on_resolve ON public.tickets;
CREATE TRIGGER trg_complete_checklists_on_resolve
  AFTER UPDATE OF status ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.tg_complete_checklists_on_resolve();

-- =========================
-- Realtime
-- =========================
ALTER TABLE public.ticket_checklists REPLICA IDENTITY FULL;
ALTER TABLE public.ticket_checklist_items REPLICA IDENTITY FULL;
ALTER TABLE public.ticket_labels REPLICA IDENTITY FULL;
ALTER TABLE public.ticket_label_assignments REPLICA IDENTITY FULL;
ALTER TABLE public.ticket_watchers REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_checklists; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_checklist_items; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_labels; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_label_assignments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_watchers; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
