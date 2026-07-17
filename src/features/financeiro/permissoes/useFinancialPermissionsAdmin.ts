import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeiroApi } from '@/features/financeiro/api';

export type FinPermission = {
  id: string;
  key: string;
  category: string;
  action: string;
  name: string;
  is_sensitive: boolean;
};

export type FinTemplate = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
};

export type FinUserRow = {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  template_code: string | null;
  permission_count: number;
  scope_count: number;
};

export function useFinancialPermissionsCatalog() {
  return useQuery({
    queryKey: ['fin-perm', 'catalog'],
    queryFn: async () => {
      return financeiroApi.getPermissionsCatalog();
    },
  });
}

export function useFinancialUsers() {
  return useQuery({
    queryKey: ['fin-perm', 'users'],
    queryFn: async (): Promise<FinUserRow[]> => {
      return financeiroApi.getFinancialUsers();
    },
  });
}

export function useUserFinancialPermissions(userId: string | null) {
  return useQuery({
    queryKey: ['fin-perm', 'user', userId],
    enabled: !!userId,
    queryFn: async () => {
      return financeiroApi.getUserPermissions(userId!);
    },
  });
}

export function useUserFinancialScopes(userId: string | null) {
  return useQuery({
    queryKey: ['fin-perm', 'user-scopes', userId],
    enabled: !!userId,
    queryFn: async () => {
      return financeiroApi.getUserScopes(userId!);
    },
  });
}

export function useUserFinancialAuditLog(userId: string | null) {
  return useQuery({
    queryKey: ['fin-perm', 'audit', userId],
    enabled: !!userId,
    queryFn: async () => {
      return financeiroApi.getUserAuditLog(userId!);
    },
  });
}

export function useGrantFinancialPermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { userId: string; permissionKey: string; limitAmount?: number | null; notes?: string | null }) => {
      await financeiroApi.grantPermission(p);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['fin-perm'] });
      qc.invalidateQueries({ queryKey: ['fin-perm', 'user', v.userId] });
    },
  });
}

export function useRevokeFinancialPermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { userId: string; permissionKey: string; reason: string }) => {
      await financeiroApi.revokePermission(p);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['fin-perm'] });
      qc.invalidateQueries({ queryKey: ['fin-perm', 'user', v.userId] });
    },
  });
}

export function useApplyFinancialTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { userId: string; templateId: string }) => {
      await financeiroApi.applyTemplate(p);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['fin-perm'] });
      qc.invalidateQueries({ queryKey: ['fin-perm', 'user', v.userId] });
    },
  });
}

export function useSetApprovalLimit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { userId: string; permissionKey: string; maxAmount: number }) => {
      await financeiroApi.grantPermission({ ...p, limitAmount: p.maxAmount });
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['fin-perm', 'user', v.userId] });
    },
  });
}

export function useAddScope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      userId: string;
      organizationId: string;
      scopeType: 'school' | 'cost_center' | 'project' | 'bank_account' | 'city' | 'organization';
      scopeValue: string;
    }) => {
      await financeiroApi.addScope(p);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['fin-perm', 'user-scopes', v.userId] });
      qc.invalidateQueries({ queryKey: ['fin-perm', 'users'] });
    },
  });
}

export function useRemoveScope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; userId: string }) => {
      await financeiroApi.removeScope(p.id);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['fin-perm', 'user-scopes', v.userId] });
      qc.invalidateQueries({ queryKey: ['fin-perm', 'users'] });
    },
  });
}
