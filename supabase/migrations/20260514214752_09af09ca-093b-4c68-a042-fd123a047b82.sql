
-- =========================================
-- OneSignal: settings, logs, prefs
-- =========================================

CREATE TABLE IF NOT EXISTS public.onesignal_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  app_id text,
  rest_api_key text,
  email_from_name text,
  email_from_address text,
  push_enabled boolean NOT NULL DEFAULT false,
  email_enabled boolean NOT NULL DEFAULT false,
  safari_web_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.onesignal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select_org"
ON public.onesignal_settings FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "settings_admin_all"
ON public.onesignal_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
      AND organization_id = onesignal_settings.organization_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
      AND organization_id = onesignal_settings.organization_id
  )
);

CREATE TRIGGER trg_onesignal_settings_updated
BEFORE UPDATE ON public.onesignal_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- send log ----------
CREATE TABLE IF NOT EXISTS public.onesignal_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('push','email')),
  template text,
  subject text,
  message text,
  target_user_ids uuid[],
  target_emails text[],
  external_ids text[],
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  onesignal_id text,
  recipients_count integer,
  error_message text,
  payload jsonb,
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onesignal_log_org_created
  ON public.onesignal_send_log (organization_id, created_at DESC);

ALTER TABLE public.onesignal_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "log_select_managers"
ON public.onesignal_send_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin','coordenador','rh')
      AND organization_id = onesignal_send_log.organization_id
  )
);

-- inserts/updates feitos pela edge function via service_role (bypassa RLS)

-- ---------- user prefs ----------
CREATE TABLE IF NOT EXISTS public.user_notification_prefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  push_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  onesignal_subscription_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prefs_self_select"
ON public.user_notification_prefs FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "prefs_self_upsert"
ON public.user_notification_prefs FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "prefs_self_update"
ON public.user_notification_prefs FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_user_notif_prefs_updated
BEFORE UPDATE ON public.user_notification_prefs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
