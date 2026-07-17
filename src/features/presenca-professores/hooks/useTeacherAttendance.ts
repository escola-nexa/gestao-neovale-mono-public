import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { teacherAttendanceApi } from '../api';

export type SheetStatus =
  | 'draft' | 'generated' | 'with_pending_items' | 'under_review'
  | 'approved_by_coordination' | 'approved_by_rh' | 'closed' | 'reopened' | 'cancelled';

export interface MonthlySheet {
  id: string;
  organization_id: string;
  professor_id: string;
  reference_year: number;
  reference_month: number;
  status: SheetStatus;
  total_expected_entries: number;
  total_present_entries: number;
  total_absent_entries: number;
  total_late_entries: number;
  total_pending_entries: number;
  total_divergent_entries: number;
  expected_workload_minutes: number;
  confirmed_workload_minutes: number;
  absence_workload_minutes: number;
  late_minutes_total: number;
  generated_at: string;
  last_recalculated_at: string | null;
  submitted_for_review_at: string | null;
  closed_at: string | null;
  reopened_at: string | null;
  closure_notes: string | null;
  professor_acknowledged_at: string | null;
  professor_acknowledged_by: string | null;
  professors?: { id: string; full_name: string };
}

export interface AttendanceEntry {
  id: string;
  monthly_sheet_id: string;
  professor_id: string;
  school_id: string;
  course_id: string | null;
  class_group_id: string | null;
  subject_id: string | null;
  scheduled_date: string;
  scheduled_start_at: string;
  scheduled_end_at: string;
  actual_call_started_at: string | null;
  computed_status: string;
  manual_status: string | null;
  final_status: string;
  is_manual_adjusted: boolean;
  late_minutes: number;
  early_minutes: number;
  workload_minutes: number;
  confirmed_workload_minutes: number;
  adjustment_reason: string | null;
  schools?: { nome: string };
  class_groups?: { nome: string };
  subjects?: { nome: string };
  courses?: { nome: string };
}

export function useMonthlySheets(year: number, month: number, professorId?: string) {
  const { organizationId } = useOrganization();
  return useQuery({
    queryKey: ['teacher-attendance-sheets', organizationId, year, month, professorId],
    queryFn: async () => {
      return teacherAttendanceApi.getMonthlySheets(organizationId!, year, month, professorId) as Promise<MonthlySheet[]>;
    },
    enabled: !!organizationId,
  });
}

export function useMonthlySheet(sheetId: string | undefined) {
  return useQuery({
    queryKey: ['teacher-attendance-sheet', sheetId],
    queryFn: async () => {
      return teacherAttendanceApi.getMonthlySheet(sheetId!) as Promise<MonthlySheet | null>;
    },
    enabled: !!sheetId,
  });
}

export function useSheetEntries(sheetId: string | undefined) {
  return useQuery({
    queryKey: ['teacher-attendance-entries', sheetId],
    queryFn: async () => {
      return teacherAttendanceApi.getSheetEntries(sheetId!) as Promise<AttendanceEntry[]>;
    },
    enabled: !!sheetId,
  });
}

export function useGenerateSheet() {
  const { organizationId } = useOrganization();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { professorId: string; year: number; month: number }) => {
      return teacherAttendanceApi.generateSheet(organizationId!, params.professorId, params.year, params.month);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-attendance-sheets'] });
      qc.invalidateQueries({ queryKey: ['teacher-attendance-sheet'] });
      qc.invalidateQueries({ queryKey: ['teacher-attendance-entries'] });
      qc.invalidateQueries({ queryKey: ['teacher-attendance-details'] });
      qc.invalidateQueries({ queryKey: ['teacher-attendance-kpis'] });
      toast({ title: 'Folha gerada', description: 'Folha mensal de presença gerada/regenerada com sucesso.' });
    },
    onError: (e: any) => {
      const msg = String(e?.message || '');
      if (msg.includes('no_active_schedule')) {
        toast({
          title: 'Sem grade horária ativa',
          description: 'Este professor não possui grade horária ativa no mês selecionado. Gere/ative a grade antes de criar a folha.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Erro ao gerar folha', description: msg, variant: 'destructive' });
      }
    },
  });
}

export function useGenerateSheetsBatch() {
  const { organizationId } = useOrganization();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { year: number; month: number; schoolId?: string | null; professorIds?: string[] | null }) => {
      return teacherAttendanceApi.generateSheetsBatch(organizationId!, params.year, params.month, params.schoolId, params.professorIds) as any;
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['teacher-attendance-sheets'] });
      qc.invalidateQueries({ queryKey: ['teacher-attendance-kpis'] });
      const semLabel = res.semester === 'FIRST' ? '1º semestre' : res.semester === 'SECOND' ? '2º semestre' : null;
      const parts = [
        `${res.created} criadas`,
        `${res.updated} atualizadas`,
        `${res.skipped} ignoradas`,
      ];
      if (res.out_of_semester && res.out_of_semester > 0) parts.push(`${res.out_of_semester} fora do semestre`);
      toast({
        title: semLabel ? `Geração concluída (${semLabel})` : 'Geração em lote concluída',
        description: parts.join(' · '),
      });
    },
    onError: (e: any) => toast({ title: 'Erro na geração em lote', description: e.message, variant: 'destructive' }),
  });
}

export function useRecalcSheet() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (sheetId: string) => {
      return teacherAttendanceApi.recalcSheet(sheetId);
    },
    onSuccess: (_d, sheetId) => {
      qc.invalidateQueries({ queryKey: ['teacher-attendance-sheet', sheetId] });
      qc.invalidateQueries({ queryKey: ['teacher-attendance-entries', sheetId] });
      qc.invalidateQueries({ queryKey: ['teacher-attendance-sheets'] });
      qc.invalidateQueries({ queryKey: ['teacher-attendance-sheet-details', sheetId] });
      qc.invalidateQueries({ queryKey: ['teacher-attendance-kpis'] });
      toast({ title: 'Folha recalculada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useSheetDetails(sheetId: string | undefined) {
  return useQuery({
    queryKey: ['teacher-attendance-sheet-details', sheetId],
    queryFn: async () => {
      return teacherAttendanceApi.getSheetDetails(sheetId!);
    },
    enabled: !!sheetId,
  });
}

export function useAttendanceDashboardKpis(year: number, month: number, schoolId?: string | null) {
  const { organizationId } = useOrganization();
  return useQuery({
    queryKey: ['teacher-attendance-kpis', organizationId, year, month, schoolId ?? null],
    queryFn: async () => {
      return teacherAttendanceApi.getDashboardKpis(organizationId!, year, month, schoolId);
    },
    enabled: !!organizationId,
  });
}

export function useUpdateSheetStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { sheetId: string; status: SheetStatus; closureNotes?: string }) => {
      await teacherAttendanceApi.updateSheetStatus(params.sheetId, params.status, params.closureNotes);
    },
    onSuccess: (_d, p) => {
      qc.invalidateQueries({ queryKey: ['teacher-attendance-sheet', p.sheetId] });
      qc.invalidateQueries({ queryKey: ['teacher-attendance-sheets'] });
      toast({ title: 'Status atualizado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useRequestAdjustment() {
  const { organizationId } = useOrganization();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: {
      entryId: string; sheetId: string; requestType: string; requestedStatus: string;
      reason: string; previousStatus?: string;
    }) => {
      await teacherAttendanceApi.requestAdjustmentLegacy(organizationId!, params.entryId, params.sheetId, params.requestType, params.requestedStatus, params.reason, params.previousStatus);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-attendance-adjustments'] });
      toast({ title: 'Solicitação enviada', description: 'Sua solicitação de ajuste foi enviada.' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useSheetAdjustments(sheetId: string | undefined) {
  return useQuery({
    queryKey: ['teacher-attendance-adjustments', sheetId],
    queryFn: async () => {
      return teacherAttendanceApi.getSheetAdjustments(sheetId!);
    },
    enabled: !!sheetId,
  });
}

export function useAttendanceSettings() {
  const { organizationId } = useOrganization();
  return useQuery({
    queryKey: ['teacher-attendance-settings', organizationId],
    queryFn: async () => {
      return teacherAttendanceApi.getAttendanceSettings(organizationId!);
    },
    enabled: !!organizationId,
  });
}

export function useSaveAttendanceSettings() {
  const { organizationId } = useOrganization();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: any) => {
      await teacherAttendanceApi.saveAttendanceSettings(organizationId!, values);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-attendance-settings'] });
      toast({ title: 'Configurações salvas' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

// =====================
// Workflow RPCs (Parte 6)
// =====================
function useWorkflowMutation<TArgs>(
  fn: (args: TArgs) => Promise<any>,
  invalidateSheetId: (args: TArgs) => string,
  successMsg: string,
) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_d, args) => {
      const id = invalidateSheetId(args);
      qc.invalidateQueries({ queryKey: ['teacher-attendance-sheet', id] });
      qc.invalidateQueries({ queryKey: ['teacher-attendance-sheets'] });
      qc.invalidateQueries({ queryKey: ['teacher-attendance-sheet-details', id] });
      qc.invalidateQueries({ queryKey: ['teacher-attendance-adjustments', id] });
      qc.invalidateQueries({ queryKey: ['teacher-attendance-kpis'] });
      toast({ title: successMsg });
    },
    onError: (e: any) => toast({ title: 'Erro', description: friendlyError(e.message), variant: 'destructive' }),
  });
}

function friendlyError(msg: string): string {
  if (!msg) return 'Operação não permitida.';
  if (msg.includes('sheet_closed')) return 'Folha já está fechada.';
  if (msg.includes('sheet_not_closed')) return 'Folha não está fechada.';
  if (msg.includes('sheet_already_closed')) return 'Folha já está fechada.';
  if (msg.includes('sheet_has_no_entries')) return 'A folha não possui nenhuma aula registrada.';
  if (msg.includes('sheet_has_pending_items')) return 'Existem aulas pendentes. Resolva-as ou envie com justificativa.';
  if (msg.includes('_tap_assert_sheet_open') || msg.includes('sheet_not_open')) return 'Folha não está aberta para esta ação.';
  if (msg.includes('override_reason_required')) return 'Justificativa obrigatória para fechar com pendências.';
  if (msg.includes('reason_required')) return 'Justificativa obrigatória (mínimo 5 caracteres).';
  if (msg.includes('permission_denied')) return 'Você não tem permissão para esta ação.';
  if (msg.includes('already_reviewed')) return 'Solicitação já foi revisada.';
  if (msg.includes('invalid_decision')) return 'Decisão inválida.';
  return msg;
}

export function useRequestAdjustmentRpc() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { entryId: string; sheetId: string; requestType: string; requestedStatus: string; reason: string; evidenceUrl?: string | null }) => {
      return teacherAttendanceApi.requestAdjustmentRpc(params.entryId, params.requestType, params.requestedStatus, params.reason, params.evidenceUrl);
    },
    onSuccess: (_d, p) => {
      qc.invalidateQueries({ queryKey: ['teacher-attendance-adjustments', p.sheetId] });
      qc.invalidateQueries({ queryKey: ['teacher-attendance-sheet-details', p.sheetId] });
      toast({ title: 'Solicitação enviada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: friendlyError(e.message), variant: 'destructive' }),
  });
}

export function useReviewAdjustment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { adjustmentId: string; sheetId: string; decision: 'approved' | 'rejected'; notes?: string }) => {
      return teacherAttendanceApi.reviewAdjustment(params.adjustmentId, params.decision, params.notes);
    },
    onSuccess: (_d, p) => {
      qc.invalidateQueries({ queryKey: ['teacher-attendance-adjustments', p.sheetId] });
      qc.invalidateQueries({ queryKey: ['teacher-attendance-sheet', p.sheetId] });
      qc.invalidateQueries({ queryKey: ['teacher-attendance-entries', p.sheetId] });
      qc.invalidateQueries({ queryKey: ['teacher-attendance-sheet-details', p.sheetId] });
      qc.invalidateQueries({ queryKey: ['teacher-attendance-sheets'] });
      toast({ title: p.decision === 'approved' ? 'Ajuste aprovado' : 'Ajuste rejeitado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: friendlyError(e.message), variant: 'destructive' }),
  });
}

export function useSubmitSheetForReview() {
  return useWorkflowMutation<{ sheetId: string; notes?: string; force?: boolean }>(
    async ({ sheetId, notes, force }) => {
      return teacherAttendanceApi.submitSheetForReview(sheetId, notes, force);
    },
    (p) => p.sheetId, 'Folha enviada para revisão',
  );
}

export function useApproveSheetCoordination() {
  return useWorkflowMutation<{ sheetId: string; notes?: string }>(
    async ({ sheetId, notes }) => {
      return teacherAttendanceApi.approveSheetCoordination(sheetId, notes);
    },
    (p) => p.sheetId, 'Aprovado pela Coordenação',
  );
}

export function useApproveSheetRh() {
  return useWorkflowMutation<{ sheetId: string; notes?: string }>(
    async ({ sheetId, notes }) => {
      return teacherAttendanceApi.approveSheetRh(sheetId, notes);
    },
    (p) => p.sheetId, 'Aprovado pelo R.H.',
  );
}

export function useCloseSheet() {
  return useWorkflowMutation<{ sheetId: string; closureNotes?: string }>(
    async ({ sheetId, closureNotes }) => {
      return teacherAttendanceApi.closeSheet(sheetId, closureNotes);
    },
    (p) => p.sheetId, 'Folha fechada',
  );
}

export function useReopenSheet() {
  return useWorkflowMutation<{ sheetId: string; reason: string }>(
    async ({ sheetId, reason }) => {
      return teacherAttendanceApi.reopenSheet(sheetId, reason);
    },
    (p) => p.sheetId, 'Folha reaberta',
  );
}

export function useAcknowledgeSheet() {
  return useWorkflowMutation<{ sheetId: string }>(
    async ({ sheetId }) => {
      return teacherAttendanceApi.acknowledgeSheet(sheetId);
    },
    (p) => p.sheetId, 'Ciência registrada',
  );
}

export function useGenerateSheetPdf() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (sheetId: string) => {
      return teacherAttendanceApi.generateSheetPdf(sheetId) as Promise<{ pdf_url: string; file_name?: string; generated_at: string; audit_hash: string }>;
    },
    onSuccess: async (data) => {
      try {
        const resp = await fetch(data.pdf_url);
        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = data.file_name || `Folha Mensal - ${data.generated_at?.slice(0, 10) || 'professor'}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
        toast({ title: 'PDF gerado', description: 'O download foi iniciado.' });
      } catch {
        window.open(data.pdf_url, '_blank');
        toast({ title: 'PDF gerado', description: 'Abrimos em nova aba (não foi possível baixar direto).' });
      }
    },
    onError: (e: any) => toast({ title: 'Erro ao gerar PDF', description: e.message, variant: 'destructive' }),
  });
}

export function useAttendanceBiReport(year: number, month: number, filters?: {
  schoolId?: string | null; courseId?: string | null; subjectId?: string | null;
  professorId?: string | null; status?: string | null;
}) {
  const { organizationId } = useOrganization();
  return useQuery({
    queryKey: ['teacher-attendance-bi', organizationId, year, month, filters],
    queryFn: async () => {
      return teacherAttendanceApi.getBiReport(organizationId!, year, month, filters);
    },
    enabled: !!organizationId,
  });
}

export function useAttendanceDailySeries(year: number, month: number, filters?: {
  schoolId?: string | null; courseId?: string | null; subjectId?: string | null;
  professorId?: string | null; status?: string | null;
}) {
  const { organizationId } = useOrganization();
  return useQuery({
    queryKey: ['teacher-attendance-daily-series', organizationId, year, month, filters],
    queryFn: async () => {
      return teacherAttendanceApi.getDailySeries(organizationId!, year, month, filters);
    },
    enabled: !!organizationId,
  });
}

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Rascunho',
  generated: 'Gerada',
  with_pending_items: 'Com pendências',
  under_review: 'Em revisão',
  approved_by_coordination: 'Aprovada (Coordenação)',
  approved_by_rh: 'Aprovada (R.H.)',
  closed: 'Fechada',
  reopened: 'Reaberta',
  cancelled: 'Cancelada',
};

export const FINAL_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  present: 'Presente',
  present_with_delay: 'Presente c/ atraso',
  absent: 'Ausente',
  justified_absence: 'Falta justificada',
  cancelled: 'Cancelada',
  ignored: 'Ignorada',
  manual_review_required: 'Revisão manual',
  planning_auto: 'Planejamento (auto)',
};

/** Checa se o professor tem grade ativa no mês — usado para habilitar "Gerar folha (selecionado)". */
export function useProfessorHasActiveGrade(professorId: string | null, year: number, month: number) {
  const { organizationId } = useOrganization();
  return useQuery({
    queryKey: ['professor-has-active-grade', organizationId, professorId, year, month],
    queryFn: async () => {
      return teacherAttendanceApi.professorHasActiveGrade(organizationId!, professorId!, year, month);
    },
    enabled: !!organizationId && !!professorId,
  });
}

export interface SchoolBreakdownRow {
  school_id: string | null;
  school_name: string | null;
  total_entries: number;
  class_entries: number;
  planning_entries: number;
  present_entries: number;
  late_entries: number;
  absent_entries: number;
  pending_entries: number;
  divergent_entries: number;
  expected_class_minutes: number;
  confirmed_class_minutes: number;
  expected_planning_minutes: number;
  confirmed_planning_minutes: number;
  expected_total_minutes: number;
  confirmed_total_minutes: number;
}

/** Conferência por escola: somatórios separados por escola para a folha mensal. */
export function useSheetSchoolBreakdown(sheetId: string | null) {
  return useQuery({
    queryKey: ['teacher-attendance-school-breakdown', sheetId],
    queryFn: async () => {
      return teacherAttendanceApi.getSheetSchoolBreakdown(sheetId!) as Promise<SchoolBreakdownRow[]>;
    },
    enabled: !!sheetId,
  });
}
