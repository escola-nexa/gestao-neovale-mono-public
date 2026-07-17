ALTER TABLE public.ticket_checklist_items
ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE OR REPLACE FUNCTION public.set_checklist_item_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_checklist_items_created_by ON public.ticket_checklist_items;
CREATE TRIGGER trg_checklist_items_created_by
BEFORE INSERT ON public.ticket_checklist_items
FOR EACH ROW EXECUTE FUNCTION public.set_checklist_item_created_by();