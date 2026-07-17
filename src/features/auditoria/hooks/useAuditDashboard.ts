import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { auditoriaApi } from '@/features/auditoria/api';
import { useOrganization } from '@/hooks/useOrganization';

export interface AuditKPIs {
  total_users: number;
  active_today: number;
  active_7_days: number;
  active_30_days: number;
  never_accessed: number;
  inactive_users: number;
}

export interface UserActivityRow {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  user_role: string;
  last_access_at: string | null;
  first_access_at: string | null;
  total_access_count: number;
  organization_id: string;
  school_names?: string[];
}

export type ActivityClassification =
  | 'nunca_acessou'
  | 'acesso_hoje'
  | 'acesso_recente'
  | 'ativo_regularmente'
  | 'baixa_frequencia'
  | 'inativo_7d'
  | 'inativo_15d'
  | 'inativo_30d'
  | 'inativo_60d'
  | 'inativo_90d'
  | 'situacao_critica';

export function classifyUser(lastAccess: string | null, totalCount: number): ActivityClassification {
  if (!lastAccess) return 'nunca_acessou';
  const now = new Date();
  const last = new Date(lastAccess);
  const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'acesso_hoje';
  if (diffDays <= 3) return 'acesso_recente';
  if (diffDays <= 7 && totalCount >= 5) return 'ativo_regularmente';
  if (diffDays <= 7) return 'inativo_7d';
  if (diffDays <= 15) return 'inativo_15d';
  if (diffDays <= 30) return 'inativo_30d';
  if (diffDays <= 60) return 'inativo_60d';
  if (diffDays <= 90) return 'inativo_90d';
  return 'situacao_critica';
}

export function classificationLabel(c: ActivityClassification): string {
  const labels: Record<ActivityClassification, string> = {
    nunca_acessou: 'Nunca acessou',
    acesso_hoje: 'Acesso hoje',
    acesso_recente: 'Acesso recente',
    ativo_regularmente: 'Ativo regularmente',
    baixa_frequencia: 'Baixa frequência',
    inativo_7d: 'Inativo 7 dias',
    inativo_15d: 'Inativo 15 dias',
    inativo_30d: 'Inativo 30 dias',
    inativo_60d: 'Inativo 60 dias',
    inativo_90d: 'Inativo 90+ dias',
    situacao_critica: 'Situação crítica',
  };
  return labels[c];
}

export function classificationColor(c: ActivityClassification): string {
  const colors: Record<ActivityClassification, string> = {
    nunca_acessou: 'bg-muted text-muted-foreground',
    acesso_hoje: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    acesso_recente: 'bg-blue-100 text-blue-700 border-blue-200',
    ativo_regularmente: 'bg-green-100 text-green-700 border-green-200',
    baixa_frequencia: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    inativo_7d: 'bg-orange-100 text-orange-700 border-orange-200',
    inativo_15d: 'bg-orange-200 text-orange-800 border-orange-300',
    inativo_30d: 'bg-red-100 text-red-700 border-red-200',
    inativo_60d: 'bg-red-200 text-red-800 border-red-300',
    inativo_90d: 'bg-destructive/20 text-destructive border-destructive/30',
    situacao_critica: 'bg-destructive text-destructive-foreground',
  };
  return colors[c];
}

export function daysSinceAccess(lastAccess: string | null): number | null {
  if (!lastAccess) return null;
  const now = new Date();
  const last = new Date(lastAccess);
  return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
}

export function useAuditDashboard() {
  const { organizationId } = useOrganization();

  const kpisQuery = useQuery({
    queryKey: ['audit-kpis', organizationId],
    queryFn: async () => {
      const { data, error } = await auditoriaApi.client.rpc('get_audit_dashboard_kpis', {
        p_org_id: organizationId!,
      });
      if (error) throw error;
      const row = (data as any)?.[0] || data;
      return {
        total_users: Number(row?.total_users || 0),
        active_today: Number(row?.active_today || 0),
        active_7_days: Number(row?.active_7_days || 0),
        active_30_days: Number(row?.active_30_days || 0),
        never_accessed: Number(row?.never_accessed || 0),
        inactive_users: Number(row?.inactive_users || 0),
      } as AuditKPIs;
    },
    enabled: !!organizationId,
    staleTime: 30000,
  });

  const usersQuery = useQuery({
    queryKey: ['audit-users-activity', organizationId],
    queryFn: async () => {
      // Get all users in org from user_roles + profiles
      const { data: roles, error: rolesErr } = await supabase
        .from('user_roles')
        .select('user_id, role, organization_id')
        .eq('organization_id', organizationId!);
      if (rolesErr) throw rolesErr;

      const userIds = roles?.map(r => r.user_id) || [];
      if (userIds.length === 0) return [];

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      // Get activity summaries
      const { data: activities } = await supabase
        .from('user_activity_summary')
        .select('*')
        .in('user_id', userIds);

      // Get professor school bindings
      const { data: bindings } = await supabase
        .from('professor_school_courses')
        .select('professor_id, schools:school_id(nome)')
        .eq('organization_id', organizationId!)
        .eq('status', 'ACTIVE');

      const { data: professors } = await supabase
        .from('professors')
        .select('id, user_id')
        .eq('organization_id', organizationId!)
        .in('user_id', userIds);

      const profMap = new Map<string, string>();
      professors?.forEach((p: any) => profMap.set(p.user_id, p.id));

      const schoolMap = new Map<string, string[]>();
      bindings?.forEach((b: any) => {
        const profId = b.professor_id;
        if (!schoolMap.has(profId)) schoolMap.set(profId, []);
        const name = (b.schools as any)?.nome;
        if (name && !schoolMap.get(profId)!.includes(name)) {
          schoolMap.get(profId)!.push(name);
        }
      });

      const profileMap = new Map<string, any>();
      profiles?.forEach((p: any) => profileMap.set(p.user_id, p));

      const activityMap = new Map<string, any>();
      activities?.forEach((a: any) => activityMap.set(a.user_id, a));

      return roles!.map(r => {
        const profile = profileMap.get(r.user_id);
        const activity = activityMap.get(r.user_id);
        const profId = profMap.get(r.user_id);
        const schools = profId ? schoolMap.get(profId) || [] : [];

        return {
          id: r.user_id,
          user_id: r.user_id,
          user_email: profile?.email || '',
          user_name: profile?.full_name || '',
          user_role: r.role,
          last_access_at: activity?.last_access_at || null,
          first_access_at: activity?.first_access_at || null,
          total_access_count: activity?.total_access_count || 0,
          organization_id: r.organization_id,
          school_names: schools,
        } as UserActivityRow;
      });
    },
    enabled: !!organizationId,
    staleTime: 30000,
  });

  // Daily access counts for chart (last 30 days)
  const dailyAccessQuery = useQuery({
    queryKey: ['audit-daily-access', organizationId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('audit_events')
        .select('created_at')
        .eq('organization_id', organizationId!)
        .eq('action', 'login')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Aggregate by day
      const dayMap = new Map<string, number>();
      for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        dayMap.set(d.toISOString().split('T')[0], 0);
      }
      data?.forEach((e: any) => {
        const day = e.created_at.split('T')[0];
        dayMap.set(day, (dayMap.get(day) || 0) + 1);
      });

      return Array.from(dayMap.entries()).map(([date, count]) => ({ date, count }));
    },
    enabled: !!organizationId,
    staleTime: 60000,
  });

  return { kpisQuery, usersQuery, dailyAccessQuery };
}
