import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { substitutionApi } from '../api';

/** Verifica se o usuário logado pode ver a área financeira da Substituição. */
export function useMyTSRFinancialAccess() {
  return useQuery({
    queryKey: ['tsr-financial', 'my-access'],
    queryFn: async () => {
      const data = await substitutionApi.getMyTSRFinancialAccess();
      const row = Array.isArray(data) ? data[0] : data;
      return {
        canAccess: Boolean(row?.can_access),
        reason: (row?.reason ?? 'unknown') as string,
      };
    },
    staleTime: 60_000,
  });
}

/** KPIs do painel financeiro (Admin / R.H. autorizado). */
export function useTSRFinancialKpis(params: { year?: number | null; month?: number | null }) {
  return useQuery({
    queryKey: ['tsr-financial', 'kpis', params.year ?? null, params.month ?? null],
    queryFn: async () => {
      const data = await substitutionApi.getTSRFinancialKpis({
        year: params.year ?? null,
        month: params.month ?? null,
      });
      return (data ?? {}) as Record<string, any>;
    },
  });
}

export interface TSRPaymentsListFilters {
  year?: number | null;
  month?: number | null;
  status?: TSRPaymentState | null;
  schoolId?: string | null;
  payeeSearch?: string | null;
  cpf?: string | null;
  dateFrom?: string | null; // YYYY-MM-DD
  dateTo?: string | null;   // YYYY-MM-DD
  page?: number;            // 1-based
  pageSize?: number;
}

export interface TSRPaymentRow {
  id: string;
  organization_id: string;
  substitution_request_id: string;
  payee_name: string;
  payee_cpf: string | null;
  payment_method: string | null;
  total_class_hours: number;
  hour_class_value: number;
  net_amount: number;
  payment_status: TSRPaymentState;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
  request_school_id: string | null;
  request_school_name: string | null;
  request_code: string | null;
  substituted_professor_name: string | null;
  substitute_professor_name: string | null;
  request_date: string | null;
  absence_date: string | null;
  request_status: string | null;
  [k: string]: any;
}

/**
 * Lista paginada server-side de pagamentos com filtros por ano, mês, status,
 * escola, beneficiário, CPF e período. Substitui a antiga implementação
 * client-side que filtrava ano/mês no navegador.
 */
export function useTSRPaymentsList(filters: TSRPaymentsListFilters) {
  const pageSize = Math.max(1, filters.pageSize ?? 25);
  const page = Math.max(1, filters.page ?? 1);
  return useQuery({
    queryKey: ['tsr-financial', 'payments-paged', { ...filters, page, pageSize }],
    queryFn: async () => {
      const data = await substitutionApi.getTSRPaymentsList({
        year: filters.year ?? null,
        month: filters.month ?? null,
        status: filters.status ?? null,
        schoolId: filters.schoolId ?? null,
        payeeSearch: filters.payeeSearch ?? null,
        cpf: filters.cpf ?? null,
        dateFrom: filters.dateFrom ?? null,
        dateTo: filters.dateTo ?? null,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      const obj = (data ?? {}) as { total?: number; rows?: TSRPaymentRow[] };
      return {
        total: Number(obj.total ?? 0),
        rows: (obj.rows ?? []) as TSRPaymentRow[],
        page,
        pageSize,
      };
    },
  });
}

/** Detalhe financeiro completo (RPC). */
export function useTSRFinancialDetails(substitutionRequestId?: string | null) {
  return useQuery({
    queryKey: ['tsr-financial', 'details', substitutionRequestId],
    queryFn: async () => {
      const data = await substitutionApi.getTSRFinancialDetails(substitutionRequestId!);
      return data as any;
    },
    enabled: !!substitutionRequestId,
  });
}

/** Lista usuários R.H. da organização com acesso financeiro (somente Admin). */
export function useTSRFinancialAccessUsers() {
  return useQuery({
    queryKey: ['tsr-financial', 'access-users'],
    queryFn: async () => {
      const data = await substitutionApi.getTSRFinancialAccessUsers();
      return (data ?? []) as any[];
    },
  });
}

export function useGrantTSRFinancialAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { user_id: string; notes?: string | null }) => {
      const data = await substitutionApi.grantTSRFinancialAccess({
        user_id: p.user_id,
        notes: p.notes ?? null,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tsr-financial', 'access-users'] });
      qc.invalidateQueries({ queryKey: ['tsr-financial', 'my-access'] });
    },
  });
}

export function useRevokeTSRFinancialAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { user_id: string; reason: string }) => {
      await substitutionApi.revokeTSRFinancialAccess({
        user_id: p.user_id,
        reason: p.reason,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tsr-financial', 'access-users'] });
      qc.invalidateQueries({ queryKey: ['tsr-financial', 'my-access'] });
    },
  });
}

/** Estados oficiais do ciclo financeiro de substituição (Fase 0A). */
export type TSRPaymentState =
  | 'not_applicable'
  | 'pending_calculation'
  | 'calculated'
  | 'pending_documentation'
  | 'pending_rh_validation'
  | 'approved_for_payment'
  | 'payment_scheduled'
  | 'paid'
  | 'returned_for_correction'
  | 'cancelled';

export const TSR_PAYMENT_STATE_ORDER: TSRPaymentState[] = [
  'not_applicable',
  'pending_calculation',
  'calculated',
  'pending_documentation',
  'pending_rh_validation',
  'approved_for_payment',
  'payment_scheduled',
  'paid',
  'returned_for_correction',
  'cancelled',
];

export const TSR_PAYMENT_STATUS_LABEL: Record<TSRPaymentState, string> = {
  not_applicable: 'Não aplicável',
  pending_calculation: 'Pendente de cálculo',
  calculated: 'Calculado',
  pending_documentation: 'Pendente de documentação',
  pending_rh_validation: 'Pendente de validação do R.H.',
  approved_for_payment: 'Aprovado para pagamento',
  payment_scheduled: 'Pagamento agendado',
  paid: 'Pago',
  returned_for_correction: 'Devolvido para correção',
  cancelled: 'Cancelado',
};

/** Helper para exibir um rótulo amigável mesmo em valores desconhecidos. */
export function formatTSRPaymentStatus(status?: string | null): string {
  if (!status) return '—';
  return TSR_PAYMENT_STATUS_LABEL[status as TSRPaymentState] ?? status;
}
