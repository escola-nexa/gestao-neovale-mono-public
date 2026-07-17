
-- 1. Colunas
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.ticket_checklists ADD COLUMN IF NOT EXISTS created_by uuid;

-- 2. Backfill de tickets a partir da 1ª mensagem
UPDATE public.tickets t
SET created_by = sub.author_id
FROM (
  SELECT DISTINCT ON (ticket_id) ticket_id, author_id
  FROM public.ticket_messages
  ORDER BY ticket_id, created_at ASC
) sub
WHERE sub.ticket_id = t.id AND t.created_by IS NULL;

-- 3. Trigger genérico set_created_by
CREATE OR REPLACE FUNCTION public.tg_set_created_by()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_tickets_set_created_by ON public.tickets;
CREATE TRIGGER trg_tickets_set_created_by
BEFORE INSERT ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.tg_set_created_by();

DROP TRIGGER IF EXISTS trg_checklists_set_created_by ON public.ticket_checklists;
CREATE TRIGGER trg_checklists_set_created_by
BEFORE INSERT ON public.ticket_checklists
FOR EACH ROW EXECUTE FUNCTION public.tg_set_created_by();

DROP TRIGGER IF EXISTS trg_checklist_items_set_created_by ON public.ticket_checklist_items;
CREATE TRIGGER trg_checklist_items_set_created_by
BEFORE INSERT ON public.ticket_checklist_items
FOR EACH ROW EXECUTE FUNCTION public.tg_set_created_by();
