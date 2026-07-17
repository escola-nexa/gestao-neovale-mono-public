import { useQuery } from '@tanstack/react-query';
import { biApi as supabase } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { BIFilters } from '@/components/bi/GlobalFilterBar';
import { useBIExecutive, BISummaryKPIs } from './useBIExecutive';

export interface TrendPoint {
  period: string;
  compliance: number;
  risk: number;
  learning: number;
  planning?: number;
  attendance?: number;
  grades?: number;
  bimester?: number;
}

export interface TrendProjection {
  label: string;
  current: number;
  projected: number;
  direction: 'up' | 'down' | 'stable';
  confidence: string;
}

export interface TemporalTrendRow {
  snapshot_month: string;
  avg_compliance: number;
  avg_risk: number;
  avg_planning: number;
  avg_attendance: number;
  avg_grades: number;
  total_teachers: number;
  teachers_critical: number;
  compliance_change: number;
  risk_change: number;
}

function linearProjection(values: number[]): number {
  if (values.length < 2) return values[0] ?? 0;
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  values.forEach((y, x) => {
    sumX += x; sumY += y; sumXY += x * y; sumXX += x * x;
  });
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return Math.max(0, Math.min(100, intercept + slope * n));
}

function getDirection(current: number, projected: number): 'up' | 'down' | 'stable' {
  const diff = projected - current;
  if (Math.abs(diff) < 2) return 'stable';
  return diff > 0 ? 'up' : 'down';
}

export function useBITrends(filters: BIFilters) {
  const { organizationId } = useOrganization();
  const { kpisQuery } = useBIExecutive(filters, 0, 1);

  // Fetch temporal trends from the new RPC
  const temporalTrendsQuery = useQuery({
    queryKey: ['bi-temporal-trends', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_bi_temporal_trends', {
        p_org_id: organizationId!,
        p_months_back: 6,
      });
      if (error) throw error;
      return (data as unknown as TemporalTrendRow[]) || [];
    },
    enabled: !!organizationId,
    staleTime: 120000,
  });

  // Fetch per-bimester KPIs for real trends
  const bimesterQueries = useQuery({
    queryKey: ['bi-trends-bimesters', organizationId, filters.schoolId],
    queryFn: async () => {
      const results: { bimester: number; kpis: BISummaryKPIs }[] = [];
      for (const bim of [1, 2, 3, 4]) {
        const { data, error } = await supabase.rpc('get_bi_summary_kpis', {
          p_org_id: organizationId!,
          p_school_id: filters.schoolId || null,
          p_bimester_number: bim,
        });
        if (!error && data) {
          const kpi = (data as unknown as BISummaryKPIs[])?.[0];
          if (kpi && kpi.total_active_teachers > 0) {
            results.push({ bimester: bim, kpis: kpi });
          }
        }
      }
      return results;
    },
    enabled: !!organizationId,
    staleTime: 120000,
  });

  const trendsQuery = useQuery({
    queryKey: ['bi-trends-computed', temporalTrendsQuery.data, bimesterQueries.data, kpisQuery.data],
    queryFn: () => {
      const temporal = temporalTrendsQuery.data || [];
      const bimesterData = bimesterQueries.data || [];
      const currentKpis = kpisQuery.data;

      // Priority 1: Use temporal trends from snapshots (monthly real data)
      let trendData: TrendPoint[] = [];

      if (temporal.length > 0) {
        trendData = temporal.map(t => ({
          period: t.snapshot_month,
          compliance: Number(t.avg_compliance) || 0,
          risk: Number(t.avg_risk) || 0,
          planning: Number(t.avg_planning) || 0,
          attendance: Number(t.avg_attendance) || 0,
          grades: Number(t.avg_grades) || 0,
          learning: Math.max(0, 100 - (Number(t.avg_risk) || 0)),
        }));
      }
      // Priority 2: bimester data
      else if (bimesterData.length > 0) {
        trendData = bimesterData.map(bd => ({
          period: `${bd.bimester}º Bim`,
          compliance: Number(bd.kpis.avg_compliance_score) || 0,
          risk: Number(bd.kpis.avg_risk_score) || 0,
          learning: Math.max(0, 100 - (Number(bd.kpis.avg_risk_score) || 0)),
          bimester: bd.bimester,
        }));
      }
      // Priority 3: current KPIs as single point
      else if (currentKpis) {
        trendData = [{
          period: 'Atual',
          compliance: Number(currentKpis.avg_compliance_score) || 0,
          risk: Number(currentKpis.avg_risk_score) || 0,
          learning: Math.max(0, 100 - (Number(currentKpis.avg_risk_score) || 0)),
        }];
      }

      // Calculate projections
      const complianceValues = trendData.map(t => t.compliance);
      const riskValues = trendData.map(t => t.risk);
      const currentCompliance = complianceValues[complianceValues.length - 1] || 0;
      const currentRisk = riskValues[riskValues.length - 1] || 0;
      const projectedCompliance = linearProjection(complianceValues);
      const projectedRisk = linearProjection(riskValues);

      // Trend changes from temporal data
      const lastTemporal = temporal[temporal.length - 1];
      const complianceMonthlyChange = lastTemporal ? Number(lastTemporal.compliance_change) : 0;
      const riskMonthlyChange = lastTemporal ? Number(lastTemporal.risk_change) : 0;

      const projections: TrendProjection[] = [
        {
          label: 'Conformidade Geral',
          current: currentCompliance,
          projected: projectedCompliance,
          direction: getDirection(currentCompliance, projectedCompliance),
          confidence: trendData.length >= 3 ? 'Alta (dados de ' + trendData.length + ' períodos)' : trendData.length >= 2 ? 'Moderada' : 'Baixa (poucos dados)',
        },
        {
          label: 'Risco Médio',
          current: currentRisk,
          projected: projectedRisk,
          direction: getDirection(currentRisk, projectedRisk),
          confidence: trendData.length >= 3 ? 'Alta' : 'Baixa (poucos dados)',
        },
        {
          label: 'Variação Mensal Conformidade',
          current: complianceMonthlyChange,
          projected: complianceMonthlyChange,
          direction: complianceMonthlyChange > 0 ? 'up' : complianceMonthlyChange < 0 ? 'down' : 'stable',
          confidence: temporal.length >= 2 ? 'Real (dado mensal)' : 'Sem dados históricos',
        },
        {
          label: 'Professores Críticos',
          current: Number(currentKpis?.teachers_critical) || 0,
          projected: Math.max(0, Math.round((Number(currentKpis?.teachers_critical) || 0) * (projectedRisk / Math.max(1, currentRisk)))),
          direction: getDirection(currentRisk, projectedRisk),
          confidence: 'Estimativa baseada em tendência de risco',
        },
      ];

      return {
        trendData,
        projections,
        temporalData: temporal,
        dataSource: temporal.length > 1 ? 'snapshots_mensais' : trendData.length > 1 ? 'bimesters' : 'snapshot_atual',
      };
    },
    enabled: !!temporalTrendsQuery.data || !!bimesterQueries.data || !!kpisQuery.data,
    staleTime: 60000,
  });

  return { trendsQuery, kpisQuery, temporalTrendsQuery };
}
