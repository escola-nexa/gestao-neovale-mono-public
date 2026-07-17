import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeiroApi } from '@/features/financeiro/api';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import type { EntryStatus, FinancialEntry, CreateEntryPayload } from '../contas-pagar/useContasPagar';

export type ReceivableStatus = EntryStatus | 'renegotiated';

export type ReceivableListFilters = {
  search?: string;
  status?: ReceivableStatus | 'all' | 'overdue_only';
  from?: string;
  to?: string;
  party_id?: string;
  page?: number;
  pageSize?: number;
};

export function useReceivableEntries(filters: ReceivableListFilters = {}) {
  const { page = 1, pageSize = 25 } = filters;
  return useQuery({
    queryKey: ['fin-receivables', filters],
    queryFn: async () => {
      return financeiroApi.getFinancialEntries(filters, 'receivable');
    },
  });
}

export type CreateReceivablePayload = CreateEntryPayload & {
  late_fee_percent?: number | null;
  daily_interest_percent?: number | null;
  early_discount_percent?: number | null;
  early_discount_days?: number | null;
};

export function useCreateReceivable() {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateReceivablePayload) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      if (!organizationId) throw new Error('Organização não encontrada');

      return financeiroApi.createEntry(organizationId, user.id, { ...payload, kind: 'receivable' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-receivables'] });
      toast.success('Título criado em rascunho');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao criar título'),
  });
}

export function useRegisterReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      installment_id: string;
      amount: number;
      payment_date?: string;
      account_id?: string | null;
      payment_method_id?: string | null;
      reference?: string | null;
      notes?: string | null;
      interest?: number;
      late_fee?: number;
      discount?: number;
    }) => {
      const payload = {
        p_installment_id: p.installment_id,
        p_amount: p.amount,
        p_payment_date: p.payment_date ?? null,
        p_account_id: p.account_id ?? null,
        p_payment_method_id: p.payment_method_id ?? null,
        p_reference: p.reference ?? null,
        p_notes: p.notes ?? null,
        p_interest: p.interest ?? 0,
        p_late_fee: p.late_fee ?? 0,
        p_discount: p.discount ?? 0,
      };
      return financeiroApi.registerReceipt(payload) as unknown as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-receivables'] });
      qc.invalidateQueries({ queryKey: ['fin-entry'] });
      qc.invalidateQueries({ queryKey: ['fin-installments'] });
      qc.invalidateQueries({ queryKey: ['fin-payments-entry'] });
      toast.success('Recebimento registrado');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao baixar recebível'),
  });
}

export function useCalculateCharges(installmentId: string | undefined, paymentDate: string) {
  return useQuery({
    queryKey: ['fin-receivable-charges', installmentId, paymentDate],
    enabled: !!installmentId && !!paymentDate,
    queryFn: async () => {
      const row = await financeiroApi.calculateCharges(installmentId!, paymentDate);
      return row as {
        days_overdue: number;
        base_amount: number;
        late_fee: number;
        interest: number;
        discount: number;
        total_due: number;
      } | null;
    },
  });
}

export function useRenegotiateReceivable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      entry_id: string;
      reason: string;
      total_amount: number;
      first_due_date: string;
      installments_count: number;
      notes?: string | null;
    }) => {
      const payload = {
        p_entry_id: p.entry_id,
        p_reason: p.reason,
        p_total_amount: p.total_amount,
        p_first_due_date: p.first_due_date,
        p_installments_count: p.installments_count,
        p_notes: p.notes ?? null,
      };
      return financeiroApi.renegotiateReceivable(payload) as unknown as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-receivables'] });
      qc.invalidateQueries({ queryKey: ['fin-entry'] });
      qc.invalidateQueries({ queryKey: ['fin-installments'] });
      toast.success('Renegociação realizada — novo título criado');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao renegociar'),
  });
}

export function useRecalculateOverdue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return financeiroApi.recalculateOverdue() as unknown as number;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['fin-receivables'] });
      qc.invalidateQueries({ queryKey: ['fin-entry'] });
      qc.invalidateQueries({ queryKey: ['fin-installments'] });
      toast.success(`${count ?? 0} parcela(s) atualizadas como vencidas`);
    },
    onError: (e: any) => toast.error(e.message || 'Erro'),
  });
}

export const RECEIVABLE_STATUS_LABEL: Record<ReceivableStatus, string> = {
  draft: 'Rascunho',
  pending_approval: 'Aguardando aprovação',
  approved: 'A receber',
  scheduled: 'Agendado',
  partially_paid: 'Recebido parcial',
  paid: 'Recebido',
  overdue: 'Vencido',
  cancelled: 'Cancelado',
  reversed: 'Estornado',
  renegotiated: 'Renegociado',
};

export const RECEIVABLE_STATUS_VARIANT: Record<ReceivableStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  pending_approval: 'secondary',
  approved: 'default',
  scheduled: 'default',
  partially_paid: 'secondary',
  paid: 'default',
  overdue: 'destructive',
  cancelled: 'destructive',
  reversed: 'destructive',
  renegotiated: 'outline',
};
