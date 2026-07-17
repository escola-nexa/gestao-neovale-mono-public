import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeiroApi } from '@/features/financeiro/api';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

/**
 * Hooks compartilhados para os cadastros do módulo Financeiro (Fase 2A).
 *
 * Todas as consultas respeitam organization_id e as permissões granulares
 * são validadas no banco (RLS + has_financial_permission).
 *
 * Política de exclusão:
 *  - Tentamos DELETE primeiro. Se o banco retornar restrição (registro já
 *    utilizado), caímos para soft-delete (active = false).
 *  - Apenas admins conseguem DELETE físico via RLS.
 */

export type FinancialAccountSubtype =
  | 'checking' | 'savings' | 'cash' | 'digital_wallet' | 'investment';

export type FinancialAccount = {
  id: string;
  organization_id: string;
  name: string;
  account_type: 'BANK' | 'CASH' | 'WALLET';
  account_subtype: FinancialAccountSubtype | null;
  bank_name: string | null;
  bank_code: string | null;
  agency: string | null;
  branch: string | null;
  account_number: string | null;
  account_digit: string | null;
  pix_key: string | null;
  pix_key_type: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM' | null;
  initial_balance: number;
  initial_balance_date: string | null;
  current_balance: number;
  allows_negative_balance: boolean;
  is_reconcilable: boolean;
  is_default: boolean;
  currency: string;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type FinancialPartyType =
  | 'SUPPLIER' | 'CUSTOMER' | 'BENEFICIARY'
  | 'EMPLOYEE' | 'PROFESSOR' | 'GOVERNMENT' | 'OTHER';

export type FinancialParty = {
  id: string;
  organization_id: string;
  party_type: FinancialPartyType;
  party_types: FinancialPartyType[];
  person_type: 'PF' | 'PJ';
  name: string;
  legal_name: string | null;
  trade_name: string | null;
  document_type: 'CPF' | 'CNPJ' | 'PASSPORT' | 'OTHER' | null;
  document: string | null;
  state_registration: string | null;
  email: string | null;
  phone: string | null;
  pix_key: string | null;
  pix_key_type: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM' | null;
  bank_name: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  professor_id: string | null;
  profile_id: string | null;
  default_category_id: string | null;
  default_cost_center_id: string | null;
  default_payment_method_id: string | null;
  is_blocked: boolean;
  block_reason: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
};

export type FinancialEntryType = 'income' | 'expense' | 'transfer' | 'adjustment';
export type FinancialCategoryNature =
  | 'operational' | 'administrative' | 'personnel'
  | 'tax' | 'financial' | 'investment' | 'other';

export type FinancialCategory = {
  id: string;
  organization_id: string;
  parent_id: string | null;
  code: string | null;
  name: string;
  /** Legado: mantido em sync pelo banco (RECEITA/DESPESA). */
  nature: 'RECEITA' | 'DESPESA';
  entry_type: FinancialEntryType;
  category_nature: FinancialCategoryNature;
  description: string | null;
  level: number;
  accepts_entries: boolean;
  is_system: boolean;
  active: boolean;
  notes: string | null;
};

export type FinancialCostCenter = {
  id: string;
  organization_id: string;
  parent_id: string | null;
  code: string | null;
  name: string;
  school_id: string | null;
  city_id: string | null;
  project_id: string | null;
  description: string | null;
  responsible_user_id: string | null;
  allows_allocations: boolean;
  valid_from: string | null;
  valid_until: string | null;
  level: number;
  active: boolean;
  notes: string | null;
};

export type FinancialProjectStatus =
  | 'planning' | 'active' | 'suspended' | 'completed' | 'cancelled';

export type FinancialProject = {
  id: string;
  organization_id: string;
  code: string | null;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  status: FinancialProjectStatus;
  responsible_user_id: string | null;
  customer_id: string | null;
  school_id: string | null;
  cost_center_id: string | null;
  active: boolean;
};

export type FinancialProjectSummary = {
  project_id: string;
  budget: number;
  committed: number;
  realized: number;
  balance: number;
};

export type FinancialPaymentMethod = {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  method_type:
    | 'PIX' | 'TED' | 'DOC' | 'BOLETO' | 'DINHEIRO'
    | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'TRANSFERENCIA' | 'OUTRO';
  direction: 'IN' | 'OUT' | 'BOTH';
  default_account_id: string | null;
  requires_bank_account: boolean;
  requires_reference: boolean;
  requires_proof: boolean;
  supports_batch: boolean;
  supports_installments: boolean;
  settlement_days: number;
  notes: string | null;
  active: boolean;
};

export type FinancialPaymentTerm = {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  installment_count: number;
  first_due_days: number;
  interval_days: number;
  percentage_distribution: number[];
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type FinancialDocumentType = {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  direction: 'IN' | 'OUT' | 'BOTH';
  requires_number: boolean;
  requires_issue_date: boolean;
  requires_attachment: boolean;
  allows_duplicate_number: boolean;
  retention_days: number;
  is_system: boolean;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type FinancialSettings = {
  id: string;
  organization_id: string;
  default_currency: string;
  fiscal_year_start_month: number;
  fiscal_year_start_day: number;
  timezone: string;
  accounting_basis: 'cash' | 'accrual';
  approval_required_above: number | null;
  default_account_id: string | null;
  default_payment_method_id: string | null;
  default_cost_center_id: string | null;
  default_substitution_category_id: string | null;
  default_route_category_id: string | null;
  require_document_for_approval: boolean;
  require_receipt_for_payment: boolean;
  allow_partial_payment: boolean;
  allow_negative_bank_balance: boolean;
  enforce_segregation: boolean;
  enable_budget_control: boolean;
  budget_exceed_action: 'block' | 'warn' | 'allow';
  overdue_grace_days: number;
  auto_number_entries: boolean;
  entry_prefix: string;
  batch_prefix: string;
  require_monthly_closure: boolean;
  allowed_import_formats: string[];
  allow_physical_delete: boolean;
  notes: string | null;
};


type TableName =
  | 'financial_accounts'
  | 'financial_parties'
  | 'financial_categories'
  | 'financial_cost_centers'
  | 'financial_projects'
  | 'financial_payment_methods'
  | 'financial_payment_terms'
  | 'financial_document_types'
  | 'financial_charge_rules'
  | 'financial_settings';

/* ----------------------------- LIST HOOKS ----------------------------- */

function useList<T>(table: TableName, orderBy = 'name') {
  const { organizationId } = useOrganization();
  return useQuery({
    enabled: !!organizationId,
    queryKey: [table, organizationId],
    queryFn: async () => {
      return financeiroApi.listRegisters(table, organizationId!, orderBy);
    },
  });
}

export const useFinancialAccounts = () => useList<FinancialAccount>('financial_accounts');
export const useFinancialParties = () => useList<FinancialParty>('financial_parties');
export const useFinancialCategories = () => useList<FinancialCategory>('financial_categories');
export const useFinancialCostCenters = () =>
  useList<FinancialCostCenter>('financial_cost_centers');
export const useFinancialProjects = () => useList<FinancialProject>('financial_projects');

export function useFinancialProjectSummary() {
  const { organizationId } = useOrganization();
  return useQuery({
    enabled: !!organizationId,
    queryKey: ['financial_project_summary', organizationId],
    queryFn: async () => {
      const data = await financeiroApi.getFinancialProjectSummary(organizationId!);
      const map = new Map<string, FinancialProjectSummary>();
      ((data ?? []) as FinancialProjectSummary[]).forEach((r: any) => map.set(r.project_id, r));
      return map;
    },
  });
}
export const useFinancialPaymentMethods = () =>
  useList<FinancialPaymentMethod>('financial_payment_methods');
export const useFinancialPaymentTerms = () =>
  useList<FinancialPaymentTerm>('financial_payment_terms');
export const useFinancialDocumentTypes = () =>
  useList<FinancialDocumentType>('financial_document_types');
export const useFinancialChargeRules = () =>
  useList<FinancialChargeRule>('financial_charge_rules');

export type FinancialChargeRule = {
  id: string;
  organization_id: string;
  name: string;
  direction: 'IN' | 'OUT' | 'BOTH';
  fine_type: 'none' | 'fixed' | 'percentage';
  fine_value: number;
  interest_type: 'none' | 'fixed' | 'percentage' | 'daily_percentage' | 'monthly_percentage';
  interest_value: number;
  discount_type: 'none' | 'fixed' | 'percentage';
  discount_value: number;
  discount_until_days: number;
  grace_period_days: number;
  calculation_basis: 'principal' | 'principal_plus_fine';
  is_default: boolean;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ChargeCalcResult = {
  rule_id: string;
  rule_name: string;
  principal: number;
  fine: number;
  interest: number;
  discount: number;
  total: number;
  days_overdue: number;
  reference_date: string;
  due_date: string;
  memo: Array<Record<string, any>>;
};

export function useFinancialSettings() {
  const { organizationId } = useOrganization();
  return useQuery({
    enabled: !!organizationId,
    queryKey: ['financial_settings', organizationId],
    queryFn: async () => {
      return financeiroApi.getFinancialSettings(organizationId!);
    },
  });
}

/* ----------------------------- MUTATIONS ------------------------------ */

export function useSaveRegister<T extends { id?: string }>(table: TableName, label = 'Registro') {
  const qc = useQueryClient();
  const { organizationId } = useOrganization();
  return useMutation({
    mutationFn: async (values: T) => {
      if (!organizationId) throw new Error('Organização não encontrada');
      const payload: any = { ...values, organization_id: organizationId };
      return financeiroApi.saveRegister(table, payload);
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: [table] });
      toast.success(r.mode === 'insert' ? `${label} criado(a).` : `${label} atualizado(a).`);
    },
    onError: (err: any) => toast.error(err?.message ?? 'Falha ao salvar registro.'),
  });
}

export function useToggleActive(table: TableName, label = 'Registro') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await financeiroApi.updateRegisterStatus(table, id, active);
    },
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: [table] });
      toast.success(v.active ? `${label} reativado(a).` : `${label} inativado(a).`);
    },
    onError: (err: any) => toast.error(err?.message ?? 'Falha ao alterar status.'),
  });
}

/**
 * Tenta DELETE físico; em caso de violação de FK ou permissão insuficiente,
 * faz soft-delete (active=false) para preservar histórico.
 */
export function useDeleteRegister(table: TableName, label = 'Registro') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return financeiroApi.deleteRegister(table, id);
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: [table] });
      toast.success(
        r.soft
          ? `${label} já utilizado — foi apenas inativado.`
          : `${label} excluído(a).`,
      );
    },
    onError: (err: any) => toast.error(err?.message ?? 'Falha ao excluir registro.'),
  });
}
export function useReplaceAndDeactivateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fromId, toId }: { fromId: string; toId: string }) => {
      await financeiroApi.replaceAndDeactivateCategory(fromId, toId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial_categories'] });
      toast.success('Categoria substituída e inativada.');
    },
    onError: (err: any) => toast.error(err?.message ?? 'Falha na substituição.'),
  });
}

export function useOrgUsersLite() {
  const { organizationId } = useOrganization();
  return useQuery({
    enabled: !!organizationId,
    queryKey: ['org-users-lite', organizationId],
    queryFn: async () => {
      return financeiroApi.getOrgUsersLite(organizationId!);
    },
  });
}

export function useTransferAllocationsAndDeactivateCC() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fromId, toId }: { fromId: string; toId: string }) => {
      await financeiroApi.transferAllocationsAndDeactivateCC(fromId, toId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial_cost_centers'] });
      toast.success('Lançamentos transferidos e centro inativado.');
    },
    onError: (err: any) => toast.error(err?.message ?? 'Falha na transferência.'),
  });
}

/**
 * Save dedicado a `financial_accounts`:
 *  - Em UPDATE, NUNCA envia current_balance (bloqueado pelo trigger no banco).
 *  - Em INSERT, current_balance = initial_balance.
 *  - Se marcar is_default=true, desmarca as demais da organização (a unique
 *    index garante consistência, mas isto evita erro ao trocar a padrão).
 */
export function useSaveFinancialAccount() {
  const qc = useQueryClient();
  const { organizationId } = useOrganization();
  return useMutation({
    mutationFn: async (values: Partial<FinancialAccount> & { id?: string }) => {
      if (!organizationId) throw new Error('Organização não encontrada');
      const payload: any = { ...values, organization_id: organizationId };
      return financeiroApi.saveFinancialAccount(payload);
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['financial_accounts'] });
      qc.invalidateQueries({ queryKey: ['account-balances'] });
      toast.success(r.mode === 'insert' ? 'Conta criada.' : 'Conta atualizada.');
    },
    onError: (err: any) => toast.error(err?.message ?? 'Falha ao salvar a conta.'),
  });
}




/* ------------------------- AUX: lista de professores ------------------ */

export function useProfessorsForBeneficiary() {
  const { organizationId } = useOrganization();
  return useQuery({
    enabled: !!organizationId,
    queryKey: ['professors-beneficiary', organizationId],
    queryFn: async () => {
      return financeiroApi.getProfessorsForBeneficiary(organizationId!);
    },
  });
}

export function useSchoolsLite() {
  const { organizationId } = useOrganization();
  return useQuery({
    enabled: !!organizationId,
    queryKey: ['schools-lite', organizationId],
    queryFn: async () => {
      return financeiroApi.getSchoolsLite(organizationId!);
    },
  });
}
