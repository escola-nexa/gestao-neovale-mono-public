import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { auditoriaApi } from '@/features/auditoria/api';
import { useOrganization } from '@/hooks/useOrganization';

export function useUserAuditDetail(userId: string | undefined) {
  const { organizationId } = useOrganization();

  const profileQuery = useQuery({
    queryKey: ['audit-user-profile', userId],
    queryFn: async () => {
      const [{ data: profile }, { data: role }, { data: activity }] = await Promise.all([
        auditoriaApi.client.from('profiles').select('user_id, full_name, email, avatar_url, phone, organization_id, created_at').eq('user_id', userId!).maybeSingle(),
        auditoriaApi.client.from('user_roles').select('role, organization_id').eq('user_id', userId!).single(),
        auditoriaApi.client.from('user_activity_summary').select('*').eq('user_id', userId!).maybeSingle(),
      ]);

      // Get professor bindings
      const { data: prof } = await supabase
        .from('professors')
        .select('id, full_name, specialization')
        .eq('user_id', userId!)
        .maybeSingle();

      let schools: string[] = [];
      if (prof) {
        const { data: bindings } = await supabase
          .from('professor_school_courses')
          .select('schools:school_id(nome), courses:course_id(nome)')
          .eq('professor_id', prof.id)
          .eq('status', 'ACTIVE');
        schools = [...new Set(bindings?.map((b: any) => b.schools?.nome).filter(Boolean) || [])];
      }

      return {
        ...profile,
        role: role?.role,
        activity,
        professor: prof,
        schools,
      };
    },
    enabled: !!userId,
  });

  const eventsQuery = useQuery({
    queryKey: ['audit-user-events', organizationId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_events')
        .select('*')
        .eq('organization_id', organizationId!)
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && !!userId,
  });

  // Module usage breakdown
  const moduleUsageQuery = useQuery({
    queryKey: ['audit-user-modules', organizationId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_events')
        .select('module')
        .eq('organization_id', organizationId!)
        .eq('user_id', userId!);
      if (error) throw error;

      const counts = new Map<string, number>();
      data?.forEach((e: any) => {
        counts.set(e.module, (counts.get(e.module) || 0) + 1);
      });
      return Array.from(counts.entries())
        .map(([module, count]) => ({ module, count }))
        .sort((a, b) => b.count - a.count);
    },
    enabled: !!organizationId && !!userId,
  });

  return { profileQuery, eventsQuery, moduleUsageQuery };
}
