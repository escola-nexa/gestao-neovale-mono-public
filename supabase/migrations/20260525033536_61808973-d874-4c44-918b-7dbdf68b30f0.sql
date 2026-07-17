ALTER TABLE public.ticket_messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;

DROP POLICY IF EXISTS "ticket_messages_update_author_or_manager" ON public.ticket_messages;
CREATE POLICY "ticket_messages_update_author_or_manager"
ON public.ticket_messages
FOR UPDATE
USING (
  author_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'coordenador'::app_role)
)
WITH CHECK (
  author_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'coordenador'::app_role)
);

DROP POLICY IF EXISTS "ticket_messages_delete_author_or_manager" ON public.ticket_messages;
CREATE POLICY "ticket_messages_delete_author_or_manager"
ON public.ticket_messages
FOR DELETE
USING (
  author_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'coordenador'::app_role)
);