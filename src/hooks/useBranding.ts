import { useEffect, useState, useCallback } from 'react';
import { globalApi } from './globalApi';
import { useOrganization } from '@/hooks/useOrganization';

export interface BrandingSettings {
  id?: string;
  organization_id?: string;
  display_name: string;
  subtitle: string;
  logo_url: string | null;
  icon_url: string | null;
}

const DEFAULTS: BrandingSettings = {
  display_name: 'Neovale',
  subtitle: 'Gestão Acadêmica',
  logo_url: null,
  icon_url: null,
};

export function useBranding() {
  const { organizationId } = useOrganization();
  const [branding, setBranding] = useState<BrandingSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!organizationId) {
      setBranding(DEFAULTS);
      setLoading(false);
      return;
    }
    const data = await globalApi.getOrganizationBranding(organizationId);

    if (data) {
      setBranding({
        id: data.id,
        organization_id: data.organization_id,
        display_name: data.display_name || DEFAULTS.display_name,
        subtitle: data.subtitle || DEFAULTS.subtitle,
        logo_url: data.brand_logo_url,
        icon_url: data.icon_url,
      });
    } else {
      setBranding(DEFAULTS);
    }
    setLoading(false);
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  return { branding, loading, reload: load, organizationId };
}
