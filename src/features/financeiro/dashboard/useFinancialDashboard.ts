import { useQuery } from '@tanstack/react-query';
import { financeiroApi } from '@/features/financeiro/api';
import { useOrganization } from '@/hooks/useOrganization';

export interface FinancialDashboardFilters {
  start?: string | null;
  end?: string | null;
  schoolId?: string | null;
  costCenterId?: string | null;
  projectId?: string | null;
}

export interface FinancialDashboardData {
  period: { start: string; end: string };
  kpis: {
    total_a_pagar: number;
    vencido: number;
    a_receber: number;
    recebido: number;
    pago_periodo: number;
    saldo_projetado: number;
    saldo_contas: number;
  };
  substitutions: {
    pending_count: number;
    pending_amount: number;
    overdue_count: number;
    overdue_amount: number;
  };
  flow_by_month: { month: string; income: number; expense: number }[];
  expenses_by_category: { name: string; amount: number }[];
  expenses_by_cost_center: { name: string; amount: number }[];
  upcoming: {
    id: string;
    title: string;
    amount: number;
    due_at: string;
    status: string;
    source: string;
  }[];
  alerts: { severity: 'low' | 'medium' | 'high'; title: string; message: string; amount?: number }[];
  error?: string;
}

export function useFinancialDashboard(filters: FinancialDashboardFilters) {
  const { organizationId } = useOrganization();
  return useQuery({
    enabled: !!organizationId,
    queryKey: ['financial-dashboard', organizationId, filters],
    queryFn: async (): Promise<FinancialDashboardData> => {
      const { data, error } = await financeiroApi.client.rpc('get_financial_dashboard', {
        _org: organizationId!,
        _start: filters.start ?? null,
        _end: filters.end ?? null,
        _school_id: filters.schoolId ?? null,
        _cost_center_id: filters.costCenterId ?? null,
        _project_id: filters.projectId ?? null,
      });
      if (error) throw error;
      return data as unknown as FinancialDashboardData;
    },
  });
}
