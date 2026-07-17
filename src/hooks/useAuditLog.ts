import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';

interface AuditLogParams {
  module: string;
  action: string;
  actionResult?: string;
  details?: Record<string, any>;
  schoolId?: string;
}

export function useAuditLog() {
  const { organizationId } = useOrganization();
  const { user } = useAuth();

  const logEvent = useCallback(async (params: AuditLogParams) => {
    if (!organizationId || !user) return;

    try {
      await supabase.from('audit_events').insert({
        organization_id: organizationId,
        user_id: user.id,
        user_email: user.email,
        user_name: user.nomeCompleto,
        user_role: user.perfil,
        module: params.module,
        action: params.action,
        action_result: params.actionResult || 'success',
        details: params.details || {},
        school_id: params.schoolId || null,
        user_agent: navigator.userAgent,
        device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      });
    } catch {
      // Silent fail - audit logging should never break user flow
    }
  }, [organizationId, user]);

  const recordLogin = useCallback(async () => {
    if (!organizationId || !user) return;
    try {
      await supabase.rpc('record_user_login', {
        p_org_id: organizationId,
        p_user_id: user.id,
        p_email: user.email,
        p_name: user.nomeCompleto,
        p_role: user.perfil,
        p_user_agent: navigator.userAgent,
      });
    } catch {
      // Silent fail
    }
  }, [organizationId, user]);

  return { logEvent, recordLogin };
}
