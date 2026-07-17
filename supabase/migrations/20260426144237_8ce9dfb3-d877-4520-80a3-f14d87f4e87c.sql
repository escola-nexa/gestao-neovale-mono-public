ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_assignees;
ALTER TABLE public.ticket_assignees REPLICA IDENTITY FULL;
ALTER TABLE public.tickets REPLICA IDENTITY FULL;
ALTER TABLE public.ticket_messages REPLICA IDENTITY FULL;
ALTER TABLE public.kanban_lists REPLICA IDENTITY FULL;