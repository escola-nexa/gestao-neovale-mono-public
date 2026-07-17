import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeiroApi } from '@/features/financeiro/api';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

export type BudgetStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';
export type OverrunMode = 'ALERT' | 'REQUIRE_APPROVAL' | 'BLOCK';

export interface FinancialBudget {
  id: string;
  organization_id: string;
  name: string;
  year: number;
  month: number | null;
  status: BudgetStatus;
  overrun_mode: OverrunMode;
  alert_threshold_percent: number;
  total_planned: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialBudgetLine {
  id: string;
  budget_id: string;
  organization_id: string;
  category_id: string;
  cost_center_id: string;
  school_id: string | null;
  project_id: string | null;
  month: number | null;
  planned_amount: number;
  notes: string | null;
}

export interface BudgetConsumptionRow {
  line_id: string;
  category_id: string;
  category_name: string;
  cost_center_id: string;
  cost_center_name: string;
  school_id: string | null;
  project_id: string | null;
  month: number | null;
  planned: number;
  committed: number;
  realized: number;
  available: number;
  consumption_percent: number;
}

export function useBudgets() {
  const { organizationId } = useOrganization();
  return useQuery({
    enabled: !!organizationId,
    queryKey: ['financial_budgets', organizationId],
    queryFn: async () => {
      return financeiroApi.getBudgets(organizationId!);
    },
  });
}

export function useBudget(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ['financial_budget', id],
    queryFn: async () => {
      return financeiroApi.getBudget(id!);
    },
  });
}

export function useBudgetLines(budgetId?: string) {
  return useQuery({
    enabled: !!budgetId,
    queryKey: ['financial_budget_lines', budgetId],
    queryFn: async () => {
      return financeiroApi.getBudgetLines(budgetId!);
    },
  });
}

export function useBudgetConsumption(budgetId?: string) {
  return useQuery({
    enabled: !!budgetId,
    queryKey: ['budget_consumption', budgetId],
    queryFn: async () => {
      return financeiroApi.getBudgetConsumption(budgetId!);
    },
  });
}

export function useSaveBudget() {
  const qc = useQueryClient();
  const { organizationId } = useOrganization();
  return useMutation({
    mutationFn: async (b: Partial<FinancialBudget> & { id?: string }) => {
      if (!organizationId) throw new Error('Sem organização');
      const payload: any = { ...b, organization_id: organizationId };
      return financeiroApi.saveBudget(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial_budgets'] });
      toast.success('Orçamento salvo.');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Falha ao salvar orçamento.'),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await financeiroApi.deleteBudget(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial_budgets'] });
      toast.success('Orçamento removido.');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Falha ao remover.'),
  });
}

export function useSaveBudgetLine() {
  const qc = useQueryClient();
  const { organizationId } = useOrganization();
  return useMutation({
    mutationFn: async (line: Partial<FinancialBudgetLine> & { budget_id: string; id?: string }) => {
      const payload: any = { ...line, organization_id: organizationId };
      await financeiroApi.saveBudgetLine(payload);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['financial_budget_lines', v.budget_id] });
      qc.invalidateQueries({ queryKey: ['budget_consumption', v.budget_id] });
      toast.success('Linha salva.');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Falha ao salvar linha.'),
  });
}

export function useDeleteBudgetLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; budget_id: string }) => {
      await financeiroApi.deleteBudgetLine(id);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['financial_budget_lines', v.budget_id] });
      qc.invalidateQueries({ queryKey: ['budget_consumption', v.budget_id] });
      toast.success('Linha removida.');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Falha ao remover.'),
  });
}

/* ----------------------- Fechamento ----------------------- */

export type ClosureScope = 'ORG' | 'SCHOOL' | 'COST_CENTER';
export type ClosureStatus = 'OPEN' | 'CLOSED';

export interface PeriodClosure {
  id: string;
  organization_id: string;
  year: number;
  month: number;
  scope: ClosureScope;
  school_id: string | null;
  cost_center_id: string | null;
  status: ClosureStatus;
  closed_by: string | null;
  closed_at: string | null;
  reopened_by: string | null;
  reopened_at: string | null;
  reopen_reason: string | null;
  notes: string | null;
  created_at: string;
}

export function useClosures(filters: { year?: number; status?: ClosureStatus | 'ALL' }) {
  const { organizationId } = useOrganization();
  return useQuery({
    enabled: !!organizationId,
    queryKey: ['financial_period_closures', organizationId, filters],
    queryFn: async () => {
      return financeiroApi.getClosures(organizationId!, filters);
    },
  });
}

export function useClosePeriod() {
  const qc = useQueryClient();
  const { organizationId } = useOrganization();
  return useMutation({
    mutationFn: async (params: {
      year: number;
      month: number;
      scope: ClosureScope;
      schoolId?: string | null;
      costCenterId?: string | null;
      notes?: string | null;
    }) => {
      await financeiroApi.closePeriod({ ...params, organizationId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial_period_closures'] });
      toast.success('Período fechado.');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Falha ao fechar período.'),
  });
}

export function useReopenPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await financeiroApi.reopenPeriod({ id, reason });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial_period_closures'] });
      toast.success('Período reaberto.');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Falha ao reabrir período.'),
  });
}

export function useClosureAudit(closureId?: string) {
  return useQuery({
    enabled: !!closureId,
    queryKey: ['financial_closure_audit', closureId],
    queryFn: async () => {
      return financeiroApi.getClosureAudit(closureId!);
    },
  });
}
