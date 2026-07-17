import { supabase } from '@/integrations/supabase/client';
import { nestApi } from '@/lib/api-adapter';

const API_PROVIDER = import.meta.env.VITE_API_PROVIDER || 'supabase';

export const globalApi = {
  getUserRoleAndOrganization: async (userId: string) => {
    if (API_PROVIDER === 'nestjs') {
      try {
        const { data } = await nestApi.get(`/auth/user-role/${userId}`);
        return data;
      } catch {
        return null;
      }
    }
    const { data } = await supabase
      .from('user_roles')
      .select('role, organization_id')
      .eq('user_id', userId)
      .maybeSingle();
    return data;
  },

  getOrganizationBranding: async (organizationId: string) => {
    if (API_PROVIDER === 'nestjs') {
      try {
        const { data } = await nestApi.get(`/organizations/${organizationId}/branding`);
        return data;
      } catch {
        return null;
      }
    }
    const { data } = await supabase
      .from('organizations')
      .select('nome, logo_url, primary_color, secondary_color')
      .eq('id', organizationId)
      .maybeSingle();
    return data;
  },

  getConfigurationStatus: async (organizationId: string) => {
    if (API_PROVIDER === 'nestjs') {
      try {
        const { data } = await nestApi.get(`/organizations/${organizationId}/configuration-status`);
        return data;
      } catch {
        return null;
      }
    }
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .maybeSingle();
    return data;
  },

  getProfessorIdByUserId: async (userId: string) => {
    if (API_PROVIDER === 'nestjs') {
      try {
        const { data } = await nestApi.get(`/professors/by-user/${userId}`);
        return data;
      } catch {
        return null;
      }
    }
    const { data } = await supabase
      .from('professors')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    return data;
  },

  getSharedSlotMapData: async (professorId: string) => {
    if (API_PROVIDER === 'nestjs') {
      try {
        const { data } = await nestApi.get(`/professors/${professorId}/slot-map`);
        return data;
      } catch {
        return null;
      }
    }
    const { data } = await supabase
      .from('weekly_teaching_models')
      .select('*')
      .eq('professor_id', professorId);
    return data || [];
  },

  getChatUnreadCount: async (userId: string) => {
    if (API_PROVIDER === 'nestjs') {
      try {
        const { data } = await nestApi.get(`/chat/unread-count/${userId}`);
        return data?.count || 0;
      } catch {
        return 0;
      }
    }
    const { count } = await supabase
      .from('chat_channel_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return count || 0;
  },

  getSidebarBadges: async (userId: string, organizationId: string) => {
    if (API_PROVIDER === 'nestjs') {
      try {
        const { data } = await nestApi.get(`/sidebar/badges`, { params: { userId, organizationId } });
        return data;
      } catch {
        return {};
      }
    }
    return {};
  },
};
