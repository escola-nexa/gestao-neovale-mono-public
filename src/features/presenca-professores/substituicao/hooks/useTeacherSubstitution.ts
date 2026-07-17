import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { substitutionApi } from '../api';
import { useOrganization } from '@/hooks/useOrganization';

// ============== Status oficiais ==============
export type TSRStatus =
  | 'draft' | 'identified_absence' | 'request_created'
  | 'ticket_created' | 'routed_to_channel'
  | 'awaiting_substitute_indication' | 'substitute_suggested' | 'substitute_confirmed'
  | 'in_execution' | 'execution_completed'
  | 'report_pending' | 'report_generated'
  | 'signed_report_pending' | 'signed_report_uploaded'
  | 'pending_rh_validation' | 'approved_for_payment'
  | 'payment_pending' | 'payment_completed'
  | 'cancelled' | 'reopened'
  // novo fluxo operacional Coordenação <-> R.H. <-> Escola
  | 'rh_in_progress' | 'returned_to_coordinator' | 'substitution_completed';

export type TSRPaymentStatus =
  | 'not_applicable' | 'pending_calculation' | 'calculated' | 'pending_documentation'
  | 'pending_rh_validation' | 'approved_for_payment' | 'payment_scheduled' | 'paid'
  | 'returned_for_correction' | 'cancelled';

export type TSRDocStatus =
  | 'not_required' | 'pending_upload' | 'uploaded' | 'signed' | 'approved' | 'rejected' | 'expired';

export const TSR_STATUS_LABEL: Record<TSRStatus, string> = {
  draft: 'Rascunho',
  identified_absence: 'Ausência identificada',
  request_created: 'Solicitada',
  ticket_created: 'Ticket criado',
  routed_to_channel: 'Roteada ao canal',
  awaiting_substitute_indication: 'Aguardando indicação',
  substitute_suggested: 'Substituto sugerido',
  substitute_confirmed: 'Substituto confirmado',
  in_execution: 'Em execução',
  execution_completed: 'Execução concluída',
  report_pending: 'Relatório pendente',
  report_generated: 'Relatório gerado',
  signed_report_pending: 'Assinatura pendente',
  signed_report_uploaded: 'Relatório assinado',
  pending_rh_validation: 'Aguardando R.H.',
  approved_for_payment: 'Aprovada p/ pagamento',
  payment_pending: 'Pagamento agendado',
  payment_completed: 'Pagamento concluído',
  cancelled: 'Cancelada',
  reopened: 'Reaberta',
  rh_in_progress: 'Em atendimento R.H.',
  returned_to_coordinator: 'Devolvida à coordenação',
  substitution_completed: 'Substituição Finalizada',
};

export const TSR_STATUS_COLOR: Record<TSRStatus, string> = {
  draft: 'bg-slate-100 text-slate-800',
  identified_absence: 'bg-slate-100 text-slate-800',
  request_created: 'bg-amber-100 text-amber-900',
  ticket_created: 'bg-amber-100 text-amber-900',
  routed_to_channel: 'bg-amber-100 text-amber-900',
  awaiting_substitute_indication: 'bg-blue-100 text-blue-900',
  substitute_suggested: 'bg-blue-100 text-blue-900',
  substitute_confirmed: 'bg-indigo-100 text-indigo-900',
  in_execution: 'bg-purple-100 text-purple-900',
  execution_completed: 'bg-purple-100 text-purple-900',
  report_pending: 'bg-cyan-100 text-cyan-900',
  report_generated: 'bg-cyan-100 text-cyan-900',
  signed_report_pending: 'bg-cyan-100 text-cyan-900',
  signed_report_uploaded: 'bg-emerald-100 text-emerald-900',
  pending_rh_validation: 'bg-emerald-100 text-emerald-900',
  approved_for_payment: 'bg-emerald-100 text-emerald-900',
  payment_pending: 'bg-emerald-100 text-emerald-900',
  payment_completed: 'bg-green-100 text-green-900',
  cancelled: 'bg-rose-100 text-rose-900',
  reopened: 'bg-amber-100 text-amber-900',
  rh_in_progress: 'bg-blue-100 text-blue-900',
  returned_to_coordinator: 'bg-indigo-100 text-indigo-900',
  substitution_completed: 'bg-green-100 text-green-900',
};

export const PHASE: Record<TSRStatus, 1 | 2> = {
  draft: 1, identified_absence: 1, request_created: 1, ticket_created: 1, routed_to_channel: 1,
  awaiting_substitute_indication: 1, substitute_suggested: 1,
  substitute_confirmed: 2, in_execution: 2, execution_completed: 2,
  report_pending: 2, report_generated: 2, signed_report_pending: 2, signed_report_uploaded: 2,
  pending_rh_validation: 2, approved_for_payment: 2, payment_pending: 2, payment_completed: 2,
  cancelled: 1, reopened: 1,
  rh_in_progress: 1, returned_to_coordinator: 1, substitution_completed: 2,
};

export interface TSRRequest {
  id: string;
  organization_id: string;
  substitution_code: string;
  status: TSRStatus;
  payment_status: TSRPaymentStatus;
  documentation_status: TSRDocStatus;
  workflow_phase: string;
  ticket_id: string | null;
  chat_channel_id: string | null;
  substituted_professor_id: string | null;
  substituted_professor_name: string;
  substituted_professor_cpf: string | null;
  substituted_professor_rg: string | null;
  substituted_professor_registration: string | null;
  substitute_professor_id: string | null;
  substitute_professor_name: string | null;
  substitute_professor_cpf: string | null;
  substitute_professor_rg: string | null;
  substitute_professor_phone: string | null;
  substitute_email: string | null;
  substitute_talent_pool_candidate_id: string | null;
  school_id: string | null;
  course_id: string | null;
  class_group_id: string | null;
  subject_id: string | null;
  school_name_snapshot: string | null;
  course_name_snapshot: string | null;
  class_group_name_snapshot: string | null;
  subject_name_snapshot: string | null;
  absence_reason: string;
  absence_date: string;
  absence_dates?: string[] | null;
  total_class_hours: number;
  hour_class_value: number;
  total_amount: number | null;
  payment_method: string | null;
  bank_data: any;
  director_name: string | null;
  adjunct_director_name: string | null;
  coordinator_name: string | null;
  performed_by_name: string | null;
  notes: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  // novo fluxo operacional
  attended_by?: string | null;
  attended_at?: string | null;
  returned_by?: string | null;
  returned_at?: string | null;
  return_notes?: string | null;
  return_attachment_url?: string | null;
  school_notified_by?: string | null;
  school_notified_at?: string | null;
  school_notification_channel?: string | null;
  school_notification_recipient?: string | null;
  school_notification_proof_url?: string | null;
  school_notification_message?: string | null;
  finalized_at?: string | null;
}

export interface TSROccurrence {
  id: string;
  organization_id: string;
  substitution_request_id: string;
  school_id: string | null;
  course_id: string | null;
  class_group_id: string | null;
  subject_id: string | null;
  scheduled_date: string;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  class_hours: number;
  hour_class_value: number;
  amount: number | null;
  execution_status: string;
  created_at: string;
  updated_at: string;
  /** snapshot livre serializado em evidence_notes (JSON) com nomes/horário */
  evidence_notes: string | null;
}

export interface TSRFilters {
  month?: number | 'all';
  year?: number | 'all';
  schoolId?: string | 'all';
  courseId?: string | 'all';
  classGroupId?: string | 'all';
  subjectId?: string | 'all';
  substitutedProfessorId?: string | 'all';
  substituteProfessorId?: string | 'all';
  status?: TSRStatus | 'all';
  paymentStatus?: TSRPaymentStatus | 'all';
  search?: string;
  phase?: 1 | 2 | 'completed' | 'cancelled' | 'all';
}

const TABLE = 'teacher_substitution_requests' as const;

export function useTSRList(filters: TSRFilters = {}) {
  const { organizationId, userRole } = useOrganization();
  const qc = useQueryClient();


  return useQuery({
    enabled: !!organizationId,
    queryKey: ['tsr_list', organizationId, userRole, filters],
    queryFn: async (): Promise<TSRRequest[]> => {
      let userId: string | undefined;
      if (userRole === 'coordenador') {
        const u = localStorage.getItem('supabase.auth.token'); // Rough fallback if needed or we let backend handle
      }
      const data = await substitutionApi.getTSRList(organizationId!, userRole, filters, undefined);
      let rows = data as TSRRequest[];
      if (filters.month && filters.month !== 'all') {
        rows = rows.filter(r => new Date(r.absence_date + 'T00:00').getMonth() + 1 === filters.month);
      }
      if (filters.year && filters.year !== 'all') {
        rows = rows.filter(r => new Date(r.absence_date + 'T00:00').getFullYear() === filters.year);
      }
      if (filters.phase && filters.phase !== 'all') {
        rows = rows.filter(r => {
          if (filters.phase === 'completed') return r.status === 'payment_completed';
          if (filters.phase === 'cancelled') return r.status === 'cancelled';
          if (r.status === 'cancelled' || r.status === 'payment_completed') return false;
          return PHASE[r.status] === filters.phase;
        });
      }
      if (filters.search) {
        const s = filters.search.toLowerCase();
        rows = rows.filter(r =>
          (r.substitution_code || '').toLowerCase().includes(s) ||
          (r.substituted_professor_name || '').toLowerCase().includes(s) ||
          (r.substitute_professor_name || '').toLowerCase().includes(s) ||
          (r.school_name_snapshot || '').toLowerCase().includes(s)
        );
      }
      return rows;
    },
  });
}

export function useTSRKpis(filters: TSRFilters = {}) {
  const { data = [] } = useTSRList(filters);
  return useMemo(() => {
    const open = data.filter(r => ['request_created','ticket_created','routed_to_channel'].includes(r.status)).length;
    const awaitingIndication = data.filter(r => ['routed_to_channel','awaiting_substitute_indication'].includes(r.status)).length;
    const confirmed = data.filter(r => r.status === 'substitute_confirmed').length;
    const reportPending = data.filter(r => ['execution_completed','report_pending','signed_report_pending'].includes(r.status)).length;
    const awaitingPayment = data.filter(r => ['approved_for_payment','payment_pending','pending_rh_validation','signed_report_uploaded'].includes(r.status)).length;
    const currentMonth = new Date().getMonth();
    const paidThisMonth = data.filter(r =>
      r.status === 'payment_completed' &&
      new Date(r.updated_at).getMonth() === currentMonth
    ).length;
    const totalPending = data
      .filter(r => !['payment_completed','cancelled'].includes(r.status))
      .reduce((s, r) => s + Number(r.total_amount || 0), 0);
    const totalPaid = data
      .filter(r => r.status === 'payment_completed')
      .reduce((s, r) => s + Number(r.total_amount || 0), 0);
    return { open, awaitingIndication, confirmed, reportPending, awaitingPayment, paidThisMonth, totalPending, totalPaid };
  }, [data]);
}

export function useTSRDetail(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ['tsr_detail', id],
    queryFn: async () => {
      const data = await substitutionApi.getTSRDetail(id!);
      return data as any as TSRRequest | null;
    },
  });
}

// candidatos
export function useTSRCandidates(requestId: string | undefined) {
  return useQuery({
    enabled: !!requestId,
    queryKey: ['tsr_candidates', requestId],
    queryFn: async () => {
      const data = await substitutionApi.getTSRCandidates(requestId!);
      return (data || []) as any[];
    },
  });
}

// documentos
export function useTSRDocuments(requestId: string | undefined) {
  return useQuery({
    enabled: !!requestId,
    queryKey: ['tsr_documents', requestId],
    queryFn: async () => {
      const data = await substitutionApi.getTSRDocuments(requestId!);
      return (data || []) as any[];
    },
  });
}

// pagamento
export function useTSRPayment(requestId: string | undefined) {
  return useQuery({
    enabled: !!requestId,
    queryKey: ['tsr_payment', requestId],
    queryFn: async () => {
      const data = await substitutionApi.getTSRPayment(requestId!);
      return data as any;
    },
  });
}

// histórico de status
export function useTSRHistory(requestId: string | undefined) {
  return useQuery({
    enabled: !!requestId,
    queryKey: ['tsr_history', requestId],
    queryFn: async () => {
      const data = await substitutionApi.getTSRHistory(requestId!);
      return (data || []) as any[];
    },
  });
}

// auditoria
export function useTSRAudit(requestId: string | undefined) {
  return useQuery({
    enabled: !!requestId,
    queryKey: ['tsr_audit', requestId],
    queryFn: async () => {
      const data = await substitutionApi.getTSRAudit(requestId!);
      return (data || []) as any[];
    },
  });
}

// ============= MUTATIONS =============
function invalidate(qc: ReturnType<typeof useQueryClient>, id?: string) {
  qc.invalidateQueries({ queryKey: ['tsr_list'] });
  if (id) {
    qc.invalidateQueries({ queryKey: ['tsr_detail', id] });
    qc.invalidateQueries({ queryKey: ['tsr_candidates', id] });
    qc.invalidateQueries({ queryKey: ['tsr_documents', id] });
    qc.invalidateQueries({ queryKey: ['tsr_payment', id] });
    qc.invalidateQueries({ queryKey: ['tsr_history', id] });
    qc.invalidateQueries({ queryKey: ['tsr_audit', id] });
  }
}

// Ocorrências (datas × aulas) vinculadas à solicitação.
// IMPORTANTE: 1 solicitação pode conter N ocorrências (multi-data / multi-disciplina).
export function useTSROccurrences(requestId: string | undefined) {
  return useQuery({
    enabled: !!requestId,
    queryKey: ['tsr_occurrences', requestId],
    queryFn: async () => {
      const data = await substitutionApi.getTSROccurrences(requestId!);
      return (data || []) as any as TSROccurrence[];
    },
  });
}

export interface CreateTSROccurrenceInput {
  scheduled_date: string;
  school_id: string;
  course_id: string;
  class_group_id: string;
  subject_id: string;
  class_hours?: number;
  hour_class_value?: number;
  scheduled_start_at?: string | null;
  scheduled_end_at?: string | null;
  /** Metadados livres serializados em evidence_notes (turma, disciplina, slot etc.) */
  snapshot?: Record<string, any>;
}

/**
 * Cria 1 solicitação + N ocorrências (data × aula).
 * O trigger `trg_tso_recalc_parent_*` recalcula no request pai:
 *   absence_date  = MIN(scheduled_date)
 *   absence_dates = ARRAY_AGG(DISTINCT scheduled_date)
 *   total_class_hours = SUM(class_hours)
 */
export function useCreateTSRWithOccurrences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      request: CreateTSRInput;
      occurrences: CreateTSROccurrenceInput[];
    }): Promise<string> => {
      const requestId = await substitutionApi.createTSR({
        organization_id: input.request.organization_id,
        substituted_professor_id: input.request.substituted_professor_id ?? null,
        substituted_professor_data: input.request.substituted_professor_data ?? {},
        school_id: input.request.school_id ?? null,
        course_id: input.request.course_id ?? null,
        class_group_id: input.request.class_group_id ?? null,
        subject_id: input.request.subject_id ?? null,
        absence_reason: input.request.absence_reason,
        absence_date: input.request.absence_date,
        total_class_hours: input.request.total_class_hours,
        hour_class_value: input.request.hour_class_value ?? null,
        context: input.request.context ?? {},
      });

      // Recupera organization_id e substituted_professor_id para alimentar ocorrências
      const orgId = input.request.organization_id;
      const subProfId = input.request.substituted_professor_id ?? null;
      const rate = input.request.hour_class_value ?? 0;

      const rows = input.occurrences.map(o => ({
        organization_id: orgId,
        substitution_request_id: requestId,
        substituted_professor_id: subProfId,
        school_id: o.school_id,
        course_id: o.course_id,
        class_group_id: o.class_group_id,
        subject_id: o.subject_id,
        scheduled_date: o.scheduled_date,
        scheduled_start_at: o.scheduled_start_at ?? null,
        scheduled_end_at: o.scheduled_end_at ?? null,
        class_hours: o.class_hours ?? 1,
        hour_class_value: o.hour_class_value ?? rate,
        evidence_notes: o.snapshot ? JSON.stringify(o.snapshot) : null,
      }));

      if (rows.length) {
        await substitutionApi.createTSROccurrences(rows);
      }

      return requestId;
    },
    onSuccess: (id) => invalidate(qc, id),
  });
}

export interface CreateTSRInput {
  organization_id: string;
  substituted_professor_id?: string | null;
  substituted_professor_data?: { name?: string; cpf?: string; rg?: string; registration?: string };
  school_id?: string | null;
  course_id?: string | null;
  class_group_id?: string | null;
  subject_id?: string | null;
  absence_reason: string;
  absence_date: string;
  total_class_hours: number;
  hour_class_value?: number | null;
  context?: any;
}

export function useCreateTSR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTSRInput): Promise<string> => {
      const data = await substitutionApi.createTSR(input);
      return data as string;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useCreateTSRTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const data = await substitutionApi.createTSRTicket(id);
      return data;
    },
    onSuccess: (_d, id) => invalidate(qc, id),
  });
}

export function useRouteTSRChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const data = await substitutionApi.routeTSRChannel(id);
      return data;
    },
    onSuccess: (_d, id) => invalidate(qc, id),
  });
}

export function useSuggestTSRCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; professor_id?: string | null; candidate_data?: any; notes?: string }) => {
      const data = await substitutionApi.suggestTSRCandidate(p);
      return data;
    },
    onSuccess: (_d, p) => invalidate(qc, p.id),
  });
}

export function useConfirmTSRSubstitute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; candidate_id: string }) => {
      const data = await substitutionApi.confirmTSRSubstitute(p);
      return data;
    },
    onSuccess: (_d, p) => invalidate(qc, p.id),
  });
}

export function useConfirmTSRExecution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await substitutionApi.confirmTSRExecution(id);
    },
    onSuccess: (_d, id) => invalidate(qc, id),
  });
}

export function useGenerateTSRDeclaration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string }) => {
      const data = await substitutionApi.generateTSRDeclaration(p);
      return data as { document_id: string; signed_url: string | null; storage_path: string; file_name: string };
    },
    onSuccess: (_d, p) => invalidate(qc, p.id),
  });
}

export function useGenerateTSRReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string }) => {
      const data = await substitutionApi.generateTSRReceipt(p);
      return data as { document_id: string; signed_url: string | null; storage_path: string; file_name: string; total_amount: number };
    },
    onSuccess: (_d, p) => invalidate(qc, p.id),
  });
}

// Upload de arquivo do usuário (relatório assinado, anexo, comprovante)
export function useUploadTSRFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      id: string;
      organization_id: string;
      document_type: 'signed_report' | 'supporting_document' | 'payment_proof' | 'other';
      file: File;
      notes?: string;
    }) => {
      const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      if (!ALLOWED.includes(p.file.type)) {
        throw new Error('Formato não suportado. Use PDF, PNG, JPG ou JPEG.');
      }
      const ext = p.file.name.split('.').pop() || 'bin';
      const fileName = `${p.document_type}_${Date.now()}.${ext}`;
      const storage_path = `${p.organization_id}/${p.id}/${fileName}`;

      await substitutionApi.uploadFile('teacher-substitutions', storage_path, p.file);
      const signedUrl = await substitutionApi.createSignedUrl('teacher-substitutions', storage_path, 60 * 60 * 24 * 7);

      const data = await substitutionApi.uploadTSRDocumentMetadata({
        id: p.id,
        document_type: p.document_type,
        file_url: signedUrl,
        storage_path: storage_path,
        file_name: p.file.name,
        mime_type: p.file.type,
        file_size_bytes: p.file.size,
        notes: p.notes ?? null,
      });
      return data;
    },
    onSuccess: (_d, p) => invalidate(qc, p.id),
  });
}

// Gera signed URL on-demand para visualizar um documento existente
export async function getTSRSignedUrl(storage_path: string, expiresSec = 60 * 10) {
  const signedUrl = await substitutionApi.createSignedUrl('teacher-substitutions', storage_path, expiresSec);
  return signedUrl ?? null;
}


export function useApproveTSRPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; notes?: string }) => {
      await substitutionApi.approveTSRPayment(p);
    },
    onSuccess: (_d, p) => invalidate(qc, p.id),
  });
}

export function useScheduleTSRPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      id: string;
      payment_reference?: string | null;
      payment_method?: string | null;
      scheduled_for?: string | null; // ISO date or datetime
      notes?: string | null;
    }) => {
      await substitutionApi.scheduleTSRPayment(p);
    },
    onSuccess: (_d, p) => invalidate(qc, p.id),
  });
}

export function useMarkTSRPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      id: string;
      payment_proof_document_id?: string | null;
      payment_reference?: string | null;
      payment_method?: string | null;
      paid_at?: string | null;
      notes?: string | null;
    }) => {
      await substitutionApi.markTSRPaid(p);
    },
    onSuccess: (_d, p) => invalidate(qc, p.id),
  });
}


export function useReturnTSRForCorrection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; reason: string }) => {
      await substitutionApi.returnTSRForCorrection(p);
    },
    onSuccess: (_d, p) => invalidate(qc, p.id),
  });
}

export function useCancelTSR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; reason: string; force?: boolean }) => {
      await substitutionApi.cancelTSR(p);
    },
    onSuccess: (_d, p) => invalidate(qc, p.id),
  });
}

// ============= INTEGRAÇÕES =============

export interface TSRDashboardKpis {
  requested: number;
  confirmed: number;
  executed: number;
  pending_signed_report: number;
  approved_for_payment: number;
  paid: number;
  cancelled: number;
  total_calculated: number;
  total_pending: number;
  total_paid: number;
  avg_hours_to_confirmation: number | null;
  avg_hours_to_payment: number | null;
  filters: { month: number | null; year: number | null; school_id: string | null };
}

export function useTSRDashboardKpis(filters: { month?: number; year?: number; school_id?: string } = {}) {
  return useQuery({
    queryKey: ['tsr_dashboard_kpis', filters],
    queryFn: async () => {
      const data = await substitutionApi.getTSRDashboardKpis(filters);
      return data as unknown as TSRDashboardKpis;
    },
  });
}

export function useTSRBiReport(filters: { from?: string; to?: string; school_id?: string } = {}) {
  return useQuery({
    queryKey: ['tsr_bi_report', filters],
    queryFn: async () => {
      const data = await substitutionApi.getTSRBiReport(filters);
      return (data || []) as any[];
    },
  });
}

export function useLinkTSRAttendanceEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      id: string;
      teacher_attendance_entry_id: string;
      annual_class_occurrence_id?: string;
      mark_as_justified?: boolean;
    }) => {
      const data = await substitutionApi.linkTSRAttendanceEntry(p);
      return data as string;
    },
    onSuccess: (_d, p) => invalidate(qc, p.id),
  });
}

// ============= NOVO FLUXO OPERACIONAL =============

export function useTSRRhTake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await substitutionApi.tsrRhTake(id);
    },
    onSuccess: (_d, id) => invalidate(qc, id),
  });
}

export interface TSRRhReturnInput {
  id: string;
  substitute_professor_id?: string | null;
  substitute_talent_pool_candidate_id?: string | null;
  substitute_name?: string | null;
  substitute_cpf?: string | null;
  substitute_rg?: string | null;
  substitute_phone?: string | null;
  substitute_email?: string | null;
  substitute_pix?: string | null;
  notes?: string | null;
  attachment_url?: string | null;
}

export function useTSRRhReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: TSRRhReturnInput) => {
      await substitutionApi.tsrRhReturn(p);
    },
    onSuccess: (_d, p) => invalidate(qc, p.id),
  });
}

export function useTSRCoordReturnToRh() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; reason: string }) => {
      await substitutionApi.tsrCoordReturnToRh(p);
    },
    onSuccess: (_d, p) => invalidate(qc, p.id),
  });
}

export interface TSRNotifySchoolInput {
  id: string;
  channel: string;
  recipient?: string | null;
  proof_url?: string | null;
  message?: string | null;
  notified_at?: string | null;
}

export function useTSRNotifySchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: TSRNotifySchoolInput) => {
      await substitutionApi.tsrNotifySchool(p);
    },
    onSuccess: (_d, p) => invalidate(qc, p.id),
  });
}

// Upload de comprovação de comunicação à escola para o bucket teacher-substitutions
export async function uploadTSRSchoolNotificationProof(
  organization_id: string,
  request_id: string,
  file: File,
): Promise<{ storage_path: string; signed_url: string | null }> {
  const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
  if (!ALLOWED.includes(file.type)) {
    throw new Error('Formato não suportado. Use PDF, PNG, JPG ou JPEG.');
  }
  const ext = file.name.split('.').pop() || 'bin';
  const storage_path = `${organization_id}/${request_id}/school_notification_${Date.now()}.${ext}`;
  await substitutionApi.uploadFile('teacher-substitutions', storage_path, file);
  const signedUrl = await substitutionApi.createSignedUrl('teacher-substitutions', storage_path, 60 * 60 * 24 * 30);
  return { storage_path, signed_url: signedUrl ?? null };
}


