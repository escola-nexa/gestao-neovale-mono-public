
-- Create ticket_assignees junction table
CREATE TABLE public.ticket_assignees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ticket_id, user_id)
);

-- Enable RLS
ALTER TABLE public.ticket_assignees ENABLE ROW LEVEL SECURITY;

-- Users can view assignees for tickets in their org
CREATE POLICY "Users can view ticket assignees"
ON public.ticket_assignees
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_assignees.ticket_id
    AND has_organization_access(auth.uid(), t.organization_id)
  )
);

-- Admins and coordinators can manage assignees
CREATE POLICY "Coordinators can manage ticket assignees"
ON public.ticket_assignees
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_assignees.ticket_id
    AND is_coordinator(auth.uid(), t.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_assignees.ticket_id
    AND is_coordinator(auth.uid(), t.organization_id)
  )
);

-- Index for performance
CREATE INDEX idx_ticket_assignees_ticket_id ON public.ticket_assignees(ticket_id);
CREATE INDEX idx_ticket_assignees_user_id ON public.ticket_assignees(user_id);
