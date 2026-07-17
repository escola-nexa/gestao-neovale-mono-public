import { useEffect, useState, useCallback } from 'react';
import { onesignalApi } from '@/features/onesignal/api';
import { useOrganization } from '@/hooks/useOrganization';

export interface OneSignalSettings {
  id?: string;
  organization_id: string;
  app_id: string | null;
  rest_api_key: string | null;
  email_from_name: string | null;
  email_from_address: string | null;
  push_enabled: boolean;
  email_enabled: boolean;
  safari_web_id: string | null;
}

export function useOneSignalSettings() {
  const { organizationId } = useOrganization();
  const [settings, setSettings] = useState<OneSignalSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    const data = await onesignalApi.getSettings(organizationId);
    setSettings((data as any) ?? {
      organization_id: organizationId,
      app_id: '',
      rest_api_key: '',
      email_from_name: '',
      email_from_address: '',
      push_enabled: false,
      email_enabled: false,
      safari_web_id: '',
    });
    setLoading(false);
  }, [organizationId]);

  useEffect(() => { fetch(); }, [fetch]);

  const save = useCallback(async (patch: Partial<OneSignalSettings>) => {
    if (!organizationId) throw new Error('no org');
    const payload = { ...settings, ...patch, organization_id: organizationId };
    await onesignalApi.saveSettings(organizationId, payload);
    await fetch();
  }, [organizationId, settings, fetch]);

  return { settings, loading, save, refetch: fetch };
}
