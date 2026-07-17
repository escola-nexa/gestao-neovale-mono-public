import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeiroApi } from '@/features/financeiro/api';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

export type FinancialPayment = {
  id: string;
  organization_id: string;
  installment_id: string;
  entry_id: string;
  kind: 'payment' | 'reversal';
  amount: number;
  payment_date: string;
  account_id: string | null;
  payment_method_id: string | null;
  reference: string | null;
  notes: string | null;
  reversal_of_id: string | null;
  reversal_reason: string | null;
  batch_item_id: string | null;
  created_by: string;
  created_at: string;
};

export function useInstallmentPayments(installmentId?: string) {
  return useQuery({
    queryKey: ['fin-payments', installmentId],
    enabled: !!installmentId,
    queryFn: async () => {
      return financeiroApi.getInstallmentPayments(installmentId!);
    },
  });
}

export function useEntryPayments(entryId?: string) {
  return useQuery({
    queryKey: ['fin-payments-entry', entryId],
    enabled: !!entryId,
    queryFn: async () => {
      return financeiroApi.getEntryPayments(entryId!);
    },
  });
}

export function useRegisterPayment() {
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
    }) => {
      const payload = {
        p_installment_id: p.installment_id,
        p_amount: p.amount,
        p_payment_date: p.payment_date ?? null,
        p_account_id: p.account_id ?? null,
        p_payment_method_id: p.payment_method_id ?? null,
        p_reference: p.reference ?? null,
        p_notes: p.notes ?? null,
      };
      return financeiroApi.registerPayment(payload) as unknown as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-payments'] });
      qc.invalidateQueries({ queryKey: ['fin-payments-entry'] });
      qc.invalidateQueries({ queryKey: ['fin-installments'] });
      qc.invalidateQueries({ queryKey: ['fin-entry'] });
      qc.invalidateQueries({ queryKey: ['fin-entries'] });
      qc.invalidateQueries({ queryKey: ['fin-payable-installments'] });
      qc.invalidateQueries({ queryKey: ['financial-dashboard'] });
      qc.invalidateQueries({ queryKey: ['account-balances'] });
      toast.success('Pagamento registrado');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao registrar pagamento'),
  });
}

export function useReversePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { payment_id: string; reason: string }) => {
      await financeiroApi.reversePayment({
        p_payment_id: p.payment_id,
        p_reason: p.reason,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-payments'] });
      qc.invalidateQueries({ queryKey: ['fin-payments-entry'] });
      qc.invalidateQueries({ queryKey: ['fin-installments'] });
      qc.invalidateQueries({ queryKey: ['fin-entry'] });
      qc.invalidateQueries({ queryKey: ['fin-entries'] });
      qc.invalidateQueries({ queryKey: ['fin-payable-installments'] });
      qc.invalidateQueries({ queryKey: ['financial-dashboard'] });
      qc.invalidateQueries({ queryKey: ['account-balances'] });
      toast.success('Pagamento estornado');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao estornar'),
  });
}

export function useUploadPaymentReceipt() {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      paymentId,
      entryId,
      installmentId,
      file,
    }: {
      paymentId: string;
      entryId: string;
      installmentId: string;
      file: File;
    }) => {
      if (!user?.id) throw new Error('Não autenticado');
      if (!organizationId) throw new Error('Organização não encontrada');
      await financeiroApi.uploadPaymentReceipt(organizationId, entryId, paymentId, installmentId, file, user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-attachments'] });
      toast.success('Comprovante anexado');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao anexar'),
  });
}

// ===================== LOTES =====================

export type PaymentBatch = {
  id: string;
  organization_id: string;
  name: string;
  method_type: string;
  status: 'draft' | 'sent' | 'processed' | 'partially_processed' | 'rejected' | 'cancelled';
  account_id: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
  processed_at: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type PaymentBatchItem = {
  id: string;
  batch_id: string;
  installment_id: string;
  entry_id: string;
  party_id: string | null;
  amount: number;
  pix_key: string | null;
  pix_key_type: string | null;
  pix_key_override: boolean;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  error_message: string | null;
  payment_id: string | null;
};

export function usePaymentBatches() {
  return useQuery({
    queryKey: ['fin-payment-batches'],
    queryFn: async () => {
      return financeiroApi.getPaymentBatches();
    },
  });
}

export function usePaymentBatch(id?: string) {
  return useQuery({
    queryKey: ['fin-payment-batch', id],
    enabled: !!id,
    queryFn: async () => {
      return financeiroApi.getPaymentBatch(id!);
    },
  });
}

export function useCreatePaymentBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      name: string; method_type?: string; installment_ids: string[];
      account_id?: string | null; scheduled_for?: string | null; notes?: string | null;
    }) => {
      const payload = {
        p_name: p.name,
        p_method_type: p.method_type ?? 'pix',
        p_installment_ids: p.installment_ids,
        p_account_id: p.account_id ?? null,
        p_scheduled_for: p.scheduled_for ?? null,
        p_notes: p.notes ?? null,
      };
      return financeiroApi.createPaymentBatch(payload) as unknown as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-payment-batches'] });
      toast.success('Lote criado');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao criar lote'),
  });
}

export function useMarkBatchSent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (batchId: string) => {
      await financeiroApi.markBatchSent(batchId);
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['fin-payment-batches'] });
      qc.invalidateQueries({ queryKey: ['fin-payment-batch', id] });
      toast.success('Lote marcado como enviado');
    },
    onError: (e: any) => toast.error(e.message || 'Erro'),
  });
}

export function useProcessBatchItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      item_id: string; batch_id: string; success: boolean;
      error_message?: string | null; reference?: string | null; payment_date?: string | null;
    }) => {
      await financeiroApi.processBatchItem({
        p_item_id: p.item_id,
        p_success: p.success,
        p_error_message: p.error_message ?? null,
        p_payment_date: p.payment_date ?? null,
        p_reference: p.reference ?? null,
      });
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['fin-payment-batches'] });
      qc.invalidateQueries({ queryKey: ['fin-payment-batch', v.batch_id] });
      qc.invalidateQueries({ queryKey: ['fin-installments'] });
      qc.invalidateQueries({ queryKey: ['fin-entry'] });
      toast.success(v.success ? 'Item pago' : 'Falha registrada');
    },
    onError: (e: any) => toast.error(e.message || 'Erro'),
  });
}

export function useUpdateItemPix() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { item_id: string; pix_key: string; pix_key_type: string }) => {
      await financeiroApi.updateItemPix({
        p_item_id: p.item_id, p_pix_key: p.pix_key, p_pix_key_type: p.pix_key_type,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-payment-batch'] });
      toast.success('Chave Pix atualizada');
    },
    onError: (e: any) => toast.error(e.message || 'Erro'),
  });
}

// ===================== Parcelas pagáveis (para montar lote) =====================

export function usePayableInstallments() {
  const { organizationId } = useOrganization();
  return useQuery({
    queryKey: ['fin-payable-installments', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      return financeiroApi.getPayableInstallments(organizationId!);
    },
  });
}

// ===================== Export Lote (XLSX/CSV) =====================

export function exportBatchCsv(batchName: string, items: any[]) {
  const header = ['beneficiario', 'documento', 'chave_pix', 'tipo_chave', 'valor', 'referencia_titulo'];
  const rows = items.map((it) => [
    it.party?.name ?? '',
    it.party?.document ?? '',
    it.pix_key ?? '',
    it.pix_key_type ?? '',
    Number(it.amount).toFixed(2).replace('.', ','),
    it.entry?.document_number ?? it.entry?.description ?? '',
  ]);
  const escape = (v: any) => {
    const s = String(v ?? '');
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(escape).join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${slug(batchName)}.csv`);
}

export function exportBatchXlsx(batchName: string, items: any[]) {
  // Mini XLSX writer would be heavy; serve a TSV with .xls extension that Excel opens natively.
  const header = ['Beneficiário', 'Documento', 'Chave Pix', 'Tipo Chave', 'Valor', 'Título'];
  const rows = items.map((it) => [
    it.party?.name ?? '', it.party?.document ?? '', it.pix_key ?? '', it.pix_key_type ?? '',
    Number(it.amount).toFixed(2), it.entry?.document_number ?? it.entry?.description ?? '',
  ]);
  const tsv = [header, ...rows].map((r) => r.join('\t')).join('\n');
  const blob = new Blob(['\uFEFF' + tsv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  triggerDownload(blob, `${slug(batchName)}.xls`);
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function slug(s: string) {
  return (s || 'lote').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_');
}

export const BATCH_STATUS_LABEL: Record<string, string> = {
  draft: 'Rascunho',
  sent: 'Enviado',
  processed: 'Processado',
  partially_processed: 'Parcialmente processado',
  rejected: 'Rejeitado',
  cancelled: 'Cancelado',
};
export const ITEM_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente', success: 'Pago', failed: 'Falhou', cancelled: 'Cancelado',
};
