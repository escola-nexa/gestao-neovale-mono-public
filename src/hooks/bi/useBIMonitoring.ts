import { useQuery } from '@tanstack/react-query';
import { biApi as supabase } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { BIFilters } from '@/components/bi/GlobalFilterBar';
import { useBIExecutive, BISummaryKPIs } from './useBIExecutive';
import { useBISchools } from './useBISchools';
import { useBICities } from './useBICities';
import { useBIInsights } from './useBIInsights';

export interface EvolutionPoint {
  period: string;
  compliance: number;
  risk: number;
}

export function useBIMonitoring(filters: BIFilters) {
  const { organizationId } = useOrganization();
  const { kpisQuery, teachersQuery } = useBIExecutive(filters, 0, 1000);
  const { schoolsQuery } = useBISchools(filters);
  const { citiesQuery } = useBICities(filters);
  const { insightsQuery } = useBIInsights(filters);

  // Real evolution from snapshots or per-bimester queries
  const evolutionQuery = useQuery({
    queryKey: ['bi-monitoring-evolution', organizationId, filters.schoolId],
    queryFn: async (): Promise<EvolutionPoint[]> => {
      // Try snapshots first
      const { data: snapshots } = await supabase
        .from('bi_metric_snapshots')
        .select('*')
        .eq('organization_id', organizationId!)
        .eq('scope_type', 'global')
        .order('snapshot_date', { ascending: true })
        .limit(20);

      if (snapshots && snapshots.length >= 2) {
        return snapshots.map(s => ({
          period: new Date(s.snapshot_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
          compliance: Number(s.avg_compliance_score) || 0,
          risk: Number(s.avg_risk_score) || 0,
        }));
      }

      // Fallback: query per bimester
      const points: EvolutionPoint[] = [];
      for (const bim of [1, 2, 3, 4]) {
        const { data } = await supabase.rpc('get_bi_summary_kpis', {
          p_org_id: organizationId!,
          p_school_id: filters.schoolId || null,
          p_bimester_number: bim,
        });
        if (data) {
          const kpi = (data as unknown as BISummaryKPIs[])?.[0];
          if (kpi && Number(kpi.total_active_teachers) > 0) {
            points.push({
              period: `${bim}º Bim`,
              compliance: Number(kpi.avg_compliance_score) || 0,
              risk: Number(kpi.avg_risk_score) || 0,
            });
          }
        }
      }

      return points;
    },
    enabled: !!organizationId,
    staleTime: 120000,
  });

  return { kpisQuery, teachersQuery, schoolsQuery, citiesQuery, insightsQuery, evolutionQuery };
}
