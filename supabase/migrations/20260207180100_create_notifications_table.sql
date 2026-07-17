-- Create notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN (
    'ORIENTATION_CREATED',
    'ORIENTATION_ACCEPTED',
    'ORIENTATION_REJECTED',
    'ORIENTATION_SIGNED',
    'GENERAL'
  )),
  reference_id uuid,
  read boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON public.notifications(read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: System can insert notifications (via service role)
CREATE POLICY "Service role can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on notifications
CREATE TRIGGER set_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Function to create notification when orientation is created
CREATE OR REPLACE FUNCTION public.notify_orientation_created()
RETURNS TRIGGER AS $$
DECLARE
  professor_user_id uuid;
  professor_name text;
  orientation_type_label text;
BEGIN
  -- Get professor's user_id and name
  SELECT p.user_id, p.full_name INTO professor_user_id, professor_name
  FROM public.professors p
  WHERE p.id = NEW.professor_id;

  -- Get orientation type label (simplified for now)
  orientation_type_label := REPLACE(NEW.orientation_type, '_', ' ');

  -- Create notification for the professor
  IF professor_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (
      professor_user_id,
      'Nova Orientação Atribuída',
      'Uma nova orientação de ' || orientation_type_label || ' foi atribuída a você.',
      'ORIENTATION_CREATED',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notification when orientation is inserted with PENDENTE status
CREATE TRIGGER orientation_created_notification
AFTER INSERT ON public.orientations
FOR EACH ROW
WHEN (NEW.status = 'PENDENTE')
EXECUTE FUNCTION public.notify_orientation_created();

-- Add comments for documentation
COMMENT ON TABLE public.notifications IS 'Tabela de notificações do sistema para usuários';
COMMENT ON COLUMN public.notifications.type IS 'Tipo da notificação: ORIENTATION_CREATED, ORIENTATION_ACCEPTED, ORIENTATION_REJECTED, ORIENTATION_SIGNED, GENERAL';
COMMENT ON COLUMN public.notifications.reference_id IS 'ID de referência do objeto relacionado (ex: orientation_id)';
COMMENT ON COLUMN public.notifications.read IS 'Indica se a notificação foi lida pelo usuário';
