import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { substitutionApi } from '../api';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';

// ============== STATUS (Parte 2 — workflow oficial) ==============
export type SubstitutionStatus =
  // Legados (mantidos para compatibilidade)
  | 'OPEN' | 'INDICATED' | 'CONFIRMED' | 'EXECUTED'
  | 'REPORT_SUBMITTED' | 'APPROVED' | 'PAID' | 'CANCELED'
  // Oficiais (Parte 2)
  | 'DRAFT' | 'IDENTIFIED_ABSENCE' | 'REQUEST_CREATED' | 'TICKET_CREATED' | 'ROUTED_TO_CHANNEL'
  | 'AWAITING_SUBSTITUTE_INDICATION' | 'SUBSTITUTE_SUGGESTED' | 'SUBSTITUTE_CONFIRMED'
  | 'IN_EXECUTION' | 'EXECUTION_COMPLETED' | 'REPORT_PENDING' | 'REPORT_GENERATED'
  | 'SIGNED_REPORT_PENDING' | 'SIGNED_REPORT_UPLOADED' | 'PENDING_RH_VALIDATION'
  | 'APPROVED_FOR_PAYMENT' | 'PAYMENT_PENDING' | 'PAYMENT_COMPLETED'
  | 'CANCELLED' | 'REOPENED';

export type PaymentState =
  | 'NOT_APPLICABLE' | 'PENDING_CALCULATION' | 'CALCULATED' | 'PENDING_DOCUMENTATION'
  | 'PENDING_RH_VALIDATION' | 'APPROVED_FOR_PAYMENT' | 'PAYMENT_SCHEDULED' | 'PAID'
  | 'RETURNED_FOR_CORRECTION' | 'CANCELLED';

export type DocState =
  | 'NOT_REQUIRED' | 'PENDING_UPLOAD' | 'UPLOADED' | 'SIGNED' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export const SUBSTITUTION_STATUS_LABEL: Record<SubstitutionStatus, string> = {
  // Legados
  OPEN: 'Aberta',
  INDICATED: 'Substituto indicado',
  CONFIRMED: 'Confirmada',
  EXECUTED: 'Executada',
  REPORT_SUBMITTED: 'Relatório enviado',
  APPROVED: 'Aprovada p/ pagamento',
  PAID: 'Paga',
  CANCELED: 'Cancelada',
  // Oficiais
  DRAFT: 'Rascunho',
  IDENTIFIED_ABSENCE: 'Ausência identificada',
  REQUEST_CREATED: 'Solicitação criada',
  TICKET_CREATED: 'Ticket criado',
  ROUTED_TO_CHANNEL: 'Roteada ao canal',
  AWAITING_SUBSTITUTE_INDICATION: 'Aguardando indicação',
  SUBSTITUTE_SUGGESTED: 'Substituto sugerido',
  SUBSTITUTE_CONFIRMED: 'Substituto confirmado',
  IN_EXECUTION: 'Em execução',
  EXECUTION_COMPLETED: 'Execução concluída',
  REPORT_PENDING: 'Relatório pendente',
  REPORT_GENERATED: 'Relatório gerado',
  SIGNED_REPORT_PENDING: 'Assinatura pendente',
  SIGNED_REPORT_UPLOADED: 'Relatório assinado enviado',
  PENDING_RH_VALIDATION: 'Aguardando validação R.H.',
  APPROVED_FOR_PAYMENT: 'Aprovada p/ pagamento',
  PAYMENT_PENDING: 'Pagamento pendente',
  PAYMENT_COMPLETED: 'Pagamento concluído',
  CANCELLED: 'Cancelada',
  REOPENED: 'Reaberta',
};

export const SUBSTITUTION_STATUS_COLOR: Record<SubstitutionStatus, string> = {
  OPEN: 'bg-amber-100 text-amber-900',
  INDICATED: 'bg-blue-100 text-blue-900',
  CONFIRMED: 'bg-indigo-100 text-indigo-900',
  EXECUTED: 'bg-purple-100 text-purple-900',
  REPORT_SUBMITTED: 'bg-cyan-100 text-cyan-900',
  APPROVED: 'bg-emerald-100 text-emerald-900',
  PAID: 'bg-green-100 text-green-900',
  CANCELED: 'bg-rose-100 text-rose-900',
  DRAFT: 'bg-slate-100 text-slate-800',
  IDENTIFIED_ABSENCE: 'bg-slate-100 text-slate-800',
  REQUEST_CREATED: 'bg-amber-100 text-amber-900',
  TICKET_CREATED: 'bg-amber-100 text-amber-900',
  ROUTED_TO_CHANNEL: 'bg-amber-100 text-amber-900',
  AWAITING_SUBSTITUTE_INDICATION: 'bg-blue-100 text-blue-900',
  SUBSTITUTE_SUGGESTED: 'bg-blue-100 text-blue-900',
  SUBSTITUTE_CONFIRMED: 'bg-indigo-100 text-indigo-900',
  IN_EXECUTION: 'bg-purple-100 text-purple-900',
  EXECUTION_COMPLETED: 'bg-purple-100 text-purple-900',
  REPORT_PENDING: 'bg-cyan-100 text-cyan-900',
  REPORT_GENERATED: 'bg-cyan-100 text-cyan-900',
  SIGNED_REPORT_PENDING: 'bg-cyan-100 text-cyan-900',
  SIGNED_REPORT_UPLOADED: 'bg-emerald-100 text-emerald-900',
  PENDING_RH_VALIDATION: 'bg-emerald-100 text-emerald-900',
  APPROVED_FOR_PAYMENT: 'bg-emerald-100 text-emerald-900',
  PAYMENT_PENDING: 'bg-emerald-100 text-emerald-900',
  PAYMENT_COMPLETED: 'bg-green-100 text-green-900',
  CANCELLED: 'bg-rose-100 text-rose-900',
  REOPENED: 'bg-amber-100 text-amber-900',
};

// Fase 1 = Demanda e Roteamento; Fase 2 = Execução e Fechamento
export const STATUS_PHASE: Record<SubstitutionStatus, 1 | 2> = {
  DRAFT: 1, IDENTIFIED_ABSENCE: 1, REQUEST_CREATED: 1, TICKET_CREATED: 1, ROUTED_TO_CHANNEL: 1,
  OPEN: 1, INDICATED: 1,
  AWAITING_SUBSTITUTE_INDICATION: 2, SUBSTITUTE_SUGGESTED: 2, SUBSTITUTE_CONFIRMED: 2,
  IN_EXECUTION: 2, EXECUTION_COMPLETED: 2, REPORT_PENDING: 2, REPORT_GENERATED: 2,
  SIGNED_REPORT_PENDING: 2, SIGNED_REPORT_UPLOADED: 2, PENDING_RH_VALIDATION: 2,
  APPROVED_FOR_PAYMENT: 2, PAYMENT_PENDING: 2, PAYMENT_COMPLETED: 2,
  CONFIRMED: 2, EXECUTED: 2, REPORT_SUBMITTED: 2, APPROVED: 2, PAID: 2,
  CANCELLED: 1, CANCELED: 1, REOPENED: 1,
};

// Mapa oficial de transições (Parte 2)
const ALLOWED_TRANSITIONS: Record<string, SubstitutionStatus[]> = {
  DRAFT: ['REQUEST_CREATED', 'CANCELLED'],
  OPEN: ['REQUEST_CREATED', 'CANCELLED'],
  IDENTIFIED_ABSENCE: ['DRAFT', 'CANCELLED'],
  REQUEST_CREATED: ['TICKET_CREATED', 'CANCELLED'],
  TICKET_CREATED: ['ROUTED_TO_CHANNEL', 'CANCELLED'],
  ROUTED_TO_CHANNEL: ['AWAITING_SUBSTITUTE_INDICATION', 'SUBSTITUTE_SUGGESTED', 'CANCELLED'],
  AWAITING_SUBSTITUTE_INDICATION: ['SUBSTITUTE_SUGGESTED', 'CANCELLED'],
  SUBSTITUTE_SUGGESTED: ['SUBSTITUTE_CONFIRMED', 'CANCELLED'],
  SUBSTITUTE_CONFIRMED: ['IN_EXECUTION', 'CANCELLED'],
  IN_EXECUTION: ['EXECUTION_COMPLETED', 'CANCELLED'],
  EXECUTION_COMPLETED: ['REPORT_GENERATED', 'REPORT_PENDING', 'CANCELLED'],
  REPORT_PENDING: ['REPORT_GENERATED', 'CANCELLED'],
  REPORT_GENERATED: ['SIGNED_REPORT_PENDING', 'SIGNED_REPORT_UPLOADED', 'CANCELLED'],
  SIGNED_REPORT_PENDING: ['SIGNED_REPORT_UPLOADED', 'CANCELLED'],
  SIGNED_REPORT_UPLOADED: ['PENDING_RH_VALIDATION', 'APPROVED_FOR_PAYMENT', 'CANCELLED'],
  PENDING_RH_VALIDATION: ['APPROVED_FOR_PAYMENT', 'REPORT_GENERATED', 'CANCELLED'],
  APPROVED_FOR_PAYMENT: ['PAYMENT_PENDING', 'PAYMENT_COMPLETED'],
  PAYMENT_PENDING: ['PAYMENT_COMPLETED'],
  PAYMENT_COMPLETED: [],
  CANCELLED: ['REOPENED'],
  CANCELED: ['REOPENED'],
  REOPENED: ['REQUEST_CREATED'],
  // legados read-only
  INDICATED: [], CONFIRMED: [], EXECUTED: [], REPORT_SUBMITTED: [], APPROVED: [], PAID: [],
};

export function getAllowedTransitions(status: SubstitutionStatus): SubstitutionStatus[] {
  return ALLOWED_TRANSITIONS[status] || [];
}

export interface SubstitutionRequest {
  id: string;
  code?: string | null;
  organization_id: string;
  school_id: string;
  course_id: string | null;
  class_group_id: string | null;
  subject_id: string | null;
  absent_professor_id: string;
  substitute_professor_id: string | null;
  ticket_id: string | null;
  absence_date: string;
  total_class_hours: number;
  hourly_rate: number;
  total_amount: number;
  reason: string | null;
  notes: string | null;
  status: SubstitutionStatus;
  phase?: 1 | 2;
  payment_state?: PaymentState;
  doc_state?: DocState;
  requested_by: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  canceled_by: string | null;
  canceled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  // joined names (built in client)
  school_name?: string;
  absent_professor_name?: string;
  substitute_professor_name?: string;
  subject_name?: string;
  class_group_name?: string;
}

export interface ListFilters {
  status?: SubstitutionStatus | 'all';
  schoolId?: string | 'all';
  search?: string;
  from?: string;
  to?: string;
}

export function useSubstitutionList(filters: ListFilters = {}) {
  const { organizationId } = useOrganization();
  const qc = useQueryClient();

  useEffect(() => {
    if (!organizationId) return;
  }, [organizationId, qc]);

  return useQuery({
    enabled: !!organizationId,
    queryKey: ['substitution_requests', organizationId, filters],
    queryFn: async (): Promise<SubstitutionRequest[]> => {
      let q = supabase
        .from('substitution_requests' as any)
        .select('*')
        .eq('organization_id', organizationId!)
        .order('absence_date', { ascending: false })
        .limit(500);

      if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters.schoolId && filters.schoolId !== 'all') q = q.eq('school_id', filters.schoolId);
      if (filters.from) q = q.gte('absence_date', filters.from);
      if (filters.to)   q = q.lte('absence_date', filters.to);

      const { data, error } = await q;
      if (error) throw error;
      const rows = (data || []) as any[];

      const profIds = Array.from(new Set(rows.flatMap(r => [r.absent_professor_id, r.substitute_professor_id]).filter(Boolean)));
      const schoolIds = Array.from(new Set(rows.map(r => r.school_id).filter(Boolean)));
      const subjectIds = Array.from(new Set(rows.map(r => r.subject_id).filter(Boolean)));
      const classIds = Array.from(new Set(rows.map(r => r.class_group_id).filter(Boolean)));

      const [profs, schools, subjects, groups] = await Promise.all([
              ]);

      const pMap = new Map<string, string>((profs.data || []).map((p: any) => [p.id, p.nome_completo]));
      const sMap = new Map<string, string>((schools.data || []).map((p: any) => [p.id, p.name]));
      const subMap = new Map<string, string>((subjects.data || []).map((p: any) => [p.id, p.name]));
      const cMap = new Map<string, string>((groups.data || []).map((p: any) => [p.id, p.name]));

      let out = rows.map(r => ({
        ...r,
        absent_professor_name: pMap.get(r.absent_professor_id) || '—',
        substitute_professor_name: r.substitute_professor_id ? pMap.get(r.substitute_professor_id) : null,
        school_name: sMap.get(r.school_id) || '—',
        subject_name: r.subject_id ? subMap.get(r.subject_id) : null,
        class_group_name: r.class_group_id ? cMap.get(r.class_group_id) : null,
      })) as SubstitutionRequest[];

      if (filters.search) {
        const s = filters.search.toLowerCase();
        out = out.filter(r =>
          (r.absent_professor_name || '').toLowerCase().includes(s) ||
          (r.substitute_professor_name || '').toLowerCase().includes(s) ||
          (r.school_name || '').toLowerCase().includes(s) ||
          (r.code || '').toLowerCase().includes(s)
        );
      }
      return out;
    },
  });
}

export function useSubstitutionKpis() {
  const { data } = useSubstitutionList();
  const list = data || [];
  const phase1 = list.filter(r => STATUS_PHASE[r.status] === 1 && !['CANCELLED','CANCELED'].includes(r.status)).length;
  const phase2 = list.filter(r => STATUS_PHASE[r.status] === 2 &&
    !['PAYMENT_COMPLETED','PAID','CANCELLED','CANCELED'].includes(r.status)).length;
  const awaiting = list.filter(r => ['APPROVED','APPROVED_FOR_PAYMENT','PAYMENT_PENDING'].includes(r.status)).length;
  const paid = list.filter(r => ['PAID','PAYMENT_COMPLETED'].includes(r.status)).length;
  return {
    total: list.length,
    open: list.filter(r => ['OPEN','DRAFT','REQUEST_CREATED','TICKET_CREATED','ROUTED_TO_CHANNEL'].includes(r.status)).length,
    inProgress: phase1 + phase2,
    awaitingPayment: awaiting,
    paid,
    totalAmount: list.reduce((s, r) => s + Number(r.total_amount || 0), 0),
  };
}

export interface CreateSubstitutionInput {
  school_id: string;
  course_id?: string | null;
  class_group_id?: string | null;
  subject_id?: string | null;
  absent_professor_id: string;
  substitute_professor_id?: string | null;
  absence_date: string;
  total_class_hours: number;
  hourly_rate: number;
  reason?: string | null;
  notes?: string | null;
}

export function useCreateSubstitution() {
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSubstitutionInput) => {
      if (!organizationId || !user) throw new Error('Sessão inválida');
      const payload: any = {
        organization_id: organizationId,
        requested_by: user.id,
        status: 'REQUEST_CREATED',
        phase: 1,
        ...input,
      };
      const { data, error } = await supabase
        .from('substitution_requests' as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['substitution_requests'] }),
  });
}

/**
 * Workflow oficial Parte 2 — usa RPC `transition_substitution_status`
 * que valida transições permitidas e registra histórico/auditoria.
 */
export function useTransitionSubstitution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, to, note }: { id: string; to: SubstitutionStatus; note?: string }) => {
      const { data, error } = await supabase.rpc('transition_substitution_status' as any, {
        _id: id,
        _to_status: to,
        _note: note ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['substitution_requests'] });
      qc.invalidateQueries({ queryKey: ['substitution_request'] });
      qc.invalidateQueries({ queryKey: ['substitution_status_history'] });
    },
  });
}

/** Legacy alias mantido para telas antigas. */
export const useUpdateSubstitutionStatus = useTransitionSubstitution;

export function useSubstitution(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ['substitution_request', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('substitution_requests' as any)
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as any as SubstitutionRequest | null;
    },
  });
}

export interface StatusHistoryEntry {
  id: string;
  from_status: SubstitutionStatus | null;
  to_status: SubstitutionStatus;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

export function useSubstitutionHistory(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ['substitution_status_history', id],
    queryFn: async (): Promise<StatusHistoryEntry[]> => {
      const { data, error } = await supabase
        .from('substitution_status_history' as any)
        .select('*')
        .eq('substitution_id', id!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as any;
    },
  });
}
