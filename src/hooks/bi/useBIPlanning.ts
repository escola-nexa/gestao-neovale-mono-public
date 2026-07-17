import { useQuery } from '@tanstack/react-query';
import { biApi as supabase } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { BIFilters } from '@/components/bi/GlobalFilterBar';

export interface PlanningMetrics {
  total_expected: number;
  total_draft: number;
  total_submitted: number;
  total_returned: number;
  total_approved: number;
  total_signed: number;
  total_completed: number;
  on_time_count: number;
  late_count: number;
}

export function useBIPlanning(filters: BIFilters) {
  const { organizationId } = useOrganization();

  const metricsQuery = useQuery({
    queryKey: ['bi-planning-metrics', organizationId, filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_bi_planning_metrics', {
        p_org_id: organizationId!,
        p_school_id: filters.schoolId || null,
        p_bimester_number: filters.bimester ? parseInt(filters.bimester) : null,
      });
      if (error) throw error;
      return (data as unknown as PlanningMetrics[])?.[0] || null;
    },
    enabled: !!organizationId,
    staleTime: 60000,
  });

  // Planning by school for stacked bar chart
  const bySchoolQuery = useQuery({
    queryKey: ['bi-planning-by-school', organizationId, filters],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_plannings')
        .select('school_id, status, schools!inner(nome)')
        .eq('organization_id', organizationId!)
        .not('school_id', 'is', null);
      if (error) throw error;

      const grouped: Record<string, { school: string; DRAFT: number; ENVIADO: number; APROVADO: number; DEVOLVIDO: number }> = {};
      (data || []).forEach((tp: any) => {
        const schoolName = tp.schools?.nome || 'Sem escola';
        if (!grouped[schoolName]) grouped[schoolName] = { school: schoolName, DRAFT: 0, ENVIADO: 0, APROVADO: 0, DEVOLVIDO: 0 };
        if (tp.status === 'DRAFT') grouped[schoolName].DRAFT++;
        else if (['ENVIADO', 'PENDING'].includes(tp.status)) grouped[schoolName].ENVIADO++;
        else if (['ASSINADO', 'APPROVED', 'CONCLUIDO', 'AGUARDANDO_ASSINATURA', 'AGUARDANDO_ASSINATURA_COORDENADOR'].includes(tp.status)) grouped[schoolName].APROVADO++;
        else if (['DEVOLVIDO', 'REJECTED'].includes(tp.status)) grouped[schoolName].DEVOLVIDO++;
      });
      return Object.values(grouped);
    },
    enabled: !!organizationId,
    staleTime: 60000,
  });

  return { metricsQuery, bySchoolQuery };
}
