-- 1. Add icons jsonb column for multi-size icons
ALTER TABLE public.pwa_settings
  ADD COLUMN IF NOT EXISTS icons jsonb DEFAULT '[]'::jsonb;

-- 2. Dedup table for push
CREATE TABLE IF NOT EXISTS public.pwa_pushed_notifications (
  notification_id uuid PRIMARY KEY,
  pushed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pwa_pushed_notifications ENABLE ROW LEVEL SECURITY;
-- No policies = only service_role can access (used by edge function only)

-- Cleanup helper (optional, run periodically)
CREATE INDEX IF NOT EXISTS idx_pushed_notifications_pushed_at
  ON public.pwa_pushed_notifications(pushed_at);

-- 3. Trigger function: invoke push-notify edge function via pg_net
CREATE OR REPLACE FUNCTION public.trigger_push_notify_on_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, net
AS $$
DECLARE
  v_url text := 'https://sczpzqxedmzkddumncbh.supabase.co/functions/v1/push-notify';
  v_pref_push boolean;
BEGIN
  -- Skip if user disabled push
  SELECT push_enabled INTO v_pref_push
  FROM public.user_notification_prefs
  WHERE user_id = NEW.user_id;

  IF v_pref_push IS NOT NULL AND v_pref_push = false THEN
    RETURN NEW;
  END IF;

  -- Fire-and-forget HTTP POST (errors are silent so they never block the insert)
  BEGIN
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type','application/json'),
      body := jsonb_build_object('notification_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    -- swallow
    NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_notify_on_notification ON public.notifications;
CREATE TRIGGER trg_push_notify_on_notification
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.trigger_push_notify_on_notification();