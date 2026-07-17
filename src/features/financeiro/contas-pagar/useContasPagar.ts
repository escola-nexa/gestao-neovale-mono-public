import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeiroApi } from '@/features/financeiro/api';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

export type EntryStatus =
  | 'draft' | 'pending_approval' | 'approved' | 'scheduled'
  | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' | 'reversed'
  | 'renegotiated';

export type FinancialEntry = {
  id: string;
  organization_id: string;
  kind: 'payable' | 'receivable';
  status: EntryStatus;
  document_number: string | null;
  description: string;
  notes: string | null;
  party_id: string | null;
  account_id: string | null;
  category_id: string | null;
  payment_method_id: string | null;
  competence_date: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  installments_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  party?: { id: string; name: string } | null;
  category?: { id: string; name: string } | null;
  account?: { id: string; name: string } | null;
};

export type EntryListFilters = {
  search?: string;
  status?: EntryStatus | 'all';
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export function useFinancialEntries(filters: EntryListFilters = {}) {
  const { page = 1, pageSize = 25 } = filters;
  return useQuery({
    queryKey: ['fin-entries', filters],
    queryFn: async () => {
      return financeiroApi.getFinancialEntries(filters, 'payable');
    },
  });
}

export function useFinancialEntry(id: string | undefined) {
  return useQuery({
    queryKey: ['fin-entry', id],
    enabled: !!id,
    queryFn: async () => {
      return financeiroApi.getFinancialEntry(id!);
    },
  });
}

export function useEntryInstallments(entryId: string | undefined) {
  return useQuery({
    queryKey: ['fin-installments', entryId],
    enabled: !!entryId,
    queryFn: async () => {
      return financeiroApi.getEntryInstallments(entryId!);
    },
  });
}

export function useEntryAllocations(entryId: string | undefined) {
  return useQuery({
    queryKey: ['fin-allocations', entryId],
    enabled: !!entryId,
    queryFn: async () => {
      return financeiroApi.getEntryAllocations(entryId!);
    },
  });
}

export function useEntryAttachments(entryId: string | undefined) {
  return useQuery({
    queryKey: ['fin-attachments', entryId],
    enabled: !!entryId,
    queryFn: async () => {
      return financeiroApi.getEntryAttachments(entryId!);
    },
  });
}

export function useEntryApprovals(entryId: string | undefined) {
  return useQuery({
    queryKey: ['fin-approvals', entryId],
    enabled: !!entryId,
    queryFn: async () => {
      return financeiroApi.getEntryApprovals(entryId!);
    },
  });
}

export type CreateEntryPayload = {
  description: string;
  document_number?: string | null;
  party_id?: string | null;
  account_id?: string | null;
  category_id?: string | null;
  payment_method_id?: string | null;
  competence_date: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  installments_count: number;
  notes?: string | null;
  allocations?: Array<{
    cost_center_id?: string | null;
    project_id?: string | null;
    school_id?: string | null;
    amount: number;
  }>;
};

export function useCreateEntry() {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateEntryPayload) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      if (!organizationId) throw new Error('Organização não encontrada');

      return financeiroApi.createEntry(organizationId, user.id, { ...payload, kind: 'payable' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-entries'] });
      qc.invalidateQueries({ queryKey: ['financial-dashboard'] });
      toast.success('Título criado em rascunho');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao criar título'),
  });
}

export function useUpdateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CreateEntryPayload> }) => {
      await financeiroApi.updateEntry(id, patch);
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['fin-entries'] });
      qc.invalidateQueries({ queryKey: ['fin-entry', v.id] });
      qc.invalidateQueries({ queryKey: ['financial-dashboard'] });
      toast.success('Título atualizado');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao atualizar'),
  });
}

function rpcMutation(rpc: 'submit_financial_entry' | 'approve_financial_entry' | 'return_financial_entry' | 'cancel_financial_entry' | 'reverse_financial_entry', successMsg: string) {
  return function useRpc() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (args: { entryId: string; reason?: string; notes?: string }) => {
        const params: any = { _entry_id: args.entryId };
        if (rpc === 'approve_financial_entry') params._notes = args.notes ?? null;
        else if (rpc !== 'submit_financial_entry') params._reason = args.reason ?? '';
        await financeiroApi.rpcEntry(rpc, params);
      },
      onSuccess: (_, v) => {
        qc.invalidateQueries({ queryKey: ['fin-entries'] });
        qc.invalidateQueries({ queryKey: ['fin-entry', v.entryId] });
        qc.invalidateQueries({ queryKey: ['fin-approvals', v.entryId] });
        qc.invalidateQueries({ queryKey: ['fin-installments', v.entryId] });
        qc.invalidateQueries({ queryKey: ['financial-dashboard'] });
        qc.invalidateQueries({ queryKey: ['fin-payable-installments'] });
        toast.success(successMsg);
      },
      onError: (e: any) => toast.error(e.message || 'Erro na operação'),
    });
  };
}

export const useSubmitEntry = rpcMutation('submit_financial_entry', 'Título enviado para aprovação');
export const useApproveEntry = rpcMutation('approve_financial_entry', 'Título aprovado');
export const useReturnEntry = rpcMutation('return_financial_entry', 'Título devolvido para correção');
export const useCancelEntry = rpcMutation('cancel_financial_entry', 'Título cancelado');
export const useReverseEntry = rpcMutation('reverse_financial_entry', 'Título estornado');

export function useUploadAttachment() {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entryId, file, kind }: { entryId: string; file: File; kind: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      if (!organizationId) throw new Error('Organização não encontrada');

      await financeiroApi.uploadAttachment(organizationId, entryId, file, kind, user.id);
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['fin-attachments', v.entryId] });
      toast.success('Anexo enviado');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao enviar anexo'),
  });
}

export async function downloadAttachment(path: string, fileName: string) {
  try {
    const url = await financeiroApi.downloadAttachmentUrl(path);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.target = '_blank';
    a.click();
  } catch (err) {
    toast.error('Não foi possível gerar URL do anexo');
  }
}

export const STATUS_LABEL: Record<EntryStatus, string> = {
  draft: 'Rascunho',
  pending_approval: 'Aguardando aprovação',
  approved: 'Aprovado',
  scheduled: 'Agendado',
  partially_paid: 'Parcialmente pago',
  paid: 'Pago',
  overdue: 'Vencido',
  cancelled: 'Cancelado',
  reversed: 'Estornado',
  renegotiated: 'Renegociado',
};

export const STATUS_VARIANT: Record<EntryStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
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

// Lookup hooks for form selects
export function useFinPartiesLookup() {
  return useQuery({
    queryKey: ['fin-parties-lookup'],
    queryFn: async () => {
      return financeiroApi.getLookup('financial_parties');
    },
  });
}
export function useFinCategoriesLookup() {
  return useQuery({
    queryKey: ['fin-categories-lookup'],
    queryFn: async () => {
      return financeiroApi.getLookup('financial_categories');
    },
  });
}
export function useFinAccountsLookup() {
  return useQuery({
    queryKey: ['fin-accounts-lookup'],
    queryFn: async () => {
      return financeiroApi.getLookup('financial_accounts');
    },
  });
}
export function useFinMethodsLookup() {
  return useQuery({
    queryKey: ['fin-methods-lookup'],
    queryFn: async () => {
      return financeiroApi.getLookup('financial_payment_methods');
    },
  });
}
export function useFinCostCentersLookup() {
  return useQuery({
    queryKey: ['fin-cc-lookup'],
    queryFn: async () => {
      return financeiroApi.getLookup('financial_cost_centers');
    },
  });
}
export function useFinProjectsLookup() {
  return useQuery({
    queryKey: ['fin-proj-lookup'],
    queryFn: async () => {
      return financeiroApi.getLookup('financial_projects');
    },
  });
}
export function useSchoolsLookup() {
  return useQuery({
    queryKey: ['fin-schools-lookup'],
    queryFn: async () => {
      return financeiroApi.getLookup('schools');
    },
  });
}
