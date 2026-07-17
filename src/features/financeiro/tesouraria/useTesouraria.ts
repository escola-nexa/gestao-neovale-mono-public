import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { financeiroApi } from "../api";

export type AccountBalance = {
  account_id: string;
  account_name: string;
  current_balance: number;
  reconciled_balance: number;
  pending_in: number;
  pending_out: number;
  projected_balance: number;
};

export function useAccountBalances(horizonDays: number = 30) {
  return useQuery({
    queryKey: ["account-balances", horizonDays],
    queryFn: async () => {
      return financeiroApi.getAccountBalances(horizonDays);
    },
  });
}

export function useBankTransactions(accountId: string | null, status?: string) {
  return useQuery({
    queryKey: ["bank-transactions", accountId, status],
    queryFn: async () => {
      if (!accountId) return [];
      return financeiroApi.getBankTransactions(accountId, status);
    },
    enabled: !!accountId,
  });
}

export function useImportBankStatement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { account_id: string; file: File; format: "OFX" | "CSV" }) => {
      const content = await params.file.text();
      return financeiroApi.importBankStatement({
        account_id: params.account_id,
        file_name: params.file.name,
        file_format: params.format,
        file_content: content,
      });
    },
    onSuccess: (r) => {
      toast.success(`Extrato importado: ${r.imported} novas, ${r.duplicates} duplicadas, ${r.failed} falhas`);
      qc.invalidateQueries({ queryKey: ["bank-transactions"] });
      qc.invalidateQueries({ queryKey: ["account-balances"] });
      qc.invalidateQueries({ queryKey: ["import-batches"] });
    },
    onError: (e: Error) => toast.error(`Erro ao importar: ${e.message}`),
  });
}

export function useAutoReconcile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { account_id: string; date_from?: string; date_to?: string }) => {
      return financeiroApi.autoReconcile(params);
    },
    onSuccess: (r) => {
      toast.success(`${r.auto_matched} transação(ões) conciliada(s) automaticamente`);
      qc.invalidateQueries({ queryKey: ["bank-transactions"] });
      qc.invalidateQueries({ queryKey: ["account-balances"] });
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export function useReconcileMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { bank_transaction_id: string; matches: { installment_id: string; amount: number }[]; notes?: string }) => {
      await financeiroApi.reconcileMatch(params);
    },
    onSuccess: () => {
      toast.success("Conciliação registrada");
      qc.invalidateQueries({ queryKey: ["bank-transactions"] });
      qc.invalidateQueries({ queryKey: ["account-balances"] });
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export function useUndoReconcile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { reconciliation_id: string; reason: string }) => {
      await financeiroApi.undoReconcile(params);
    },
    onSuccess: () => {
      toast.success("Conciliação desfeita");
      qc.invalidateQueries({ queryKey: ["bank-transactions"] });
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export function useTransfers() {
  return useQuery({
    queryKey: ["financial-transfers"],
    queryFn: async () => {
      return financeiroApi.getTransfers();
    },
  });
}

export function useCreateTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      source_account_id: string;
      destination_account_id: string;
      amount: number;
      transfer_date: string;
      description?: string;
      reference?: string;
    }) => {
      return financeiroApi.createTransfer(params);
    },
    onSuccess: () => {
      toast.success("Transferência registrada");
      qc.invalidateQueries({ queryKey: ["financial-transfers"] });
      qc.invalidateQueries({ queryKey: ["account-balances"] });
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export function useCancelTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { transfer_id: string; reason: string }) => {
      await financeiroApi.cancelTransfer(params);
    },
    onSuccess: () => {
      toast.success("Transferência cancelada");
      qc.invalidateQueries({ queryKey: ["financial-transfers"] });
      qc.invalidateQueries({ queryKey: ["account-balances"] });
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export function useImportBatches(accountId?: string | null) {
  return useQuery({
    queryKey: ["import-batches", accountId],
    queryFn: async () => {
      return financeiroApi.getImportBatches(accountId);
    },
  });
}
