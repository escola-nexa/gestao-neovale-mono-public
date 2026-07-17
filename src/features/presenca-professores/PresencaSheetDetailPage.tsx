import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { NeovaleStatCard } from '@/components/ui/NeovaleStatCard';
import {
  Loader2, RefreshCw, RotateCw, CheckCircle2, Lock, Unlock, Download,
  Clock, UserCheck, CalendarCheck2, BookOpen, GraduationCap, AlertTriangle, XCircle, Send,
} from 'lucide-react';
import * as React from 'react';
import { useMemo, useState } from 'react';
import {
  useMonthlySheet, useSheetEntries, useRecalcSheet,
  useSheetAdjustments, useReviewAdjustment,
  useSubmitSheetForReview, useApproveSheetCoordination, useApproveSheetRh,
  useCloseSheet, useReopenSheet, useSheetDetails, useGenerateSheetPdf,
  useGenerateSheet, useSheetSchoolBreakdown,
  STATUS_LABEL, FINAL_STATUS_LABEL,
} from './hooks/useTeacherAttendance';
import { useAuth } from '@/contexts/AuthContext';
import { isManagerRole } from '@/lib/roles';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SubmitForReviewDialog } from './components/SubmitForReviewDialog';
import { SheetSchoolGroup } from './components/SheetSchoolGroup';
import { minutesToHm } from './utils/slotTime';

const AUDIT_LABEL: Record<string, string> = {
  sheet_generated: 'Folha gerada',
  generate_sheet: 'Folha gerada',
  sheet_recalculated: 'Folha recalculada',
  recalculate_sheet: 'Folha recalculada',
  sheet_submitted_for_review: 'Enviada para revisão',
  submit_for_review: 'Enviada para revisão',
  sheet_approved_coordination: 'Aprovada pela Coordenação',
  approve_coordination: 'Aprovada pela Coordenação',
  sheet_approved_rh: 'Aprovada pelo R.H.',
  approve_rh: 'Aprovada pelo R.H.',
  sheet_closed: 'Folha fechada',
  close_sheet: 'Folha fechada',
  sheet_reopened: 'Folha reaberta',
  reopen_sheet: 'Folha reaberta',
  adjustment_requested: 'Ajuste solicitado',
  request_adjustment: 'Ajuste solicitado',
  adjustment_approved: 'Ajuste aprovado',
  adjustment_rejected: 'Ajuste rejeitado',
  review_adjustment: 'Ajuste revisado',
  professor_acknowledged: 'Ciência do professor',
  teacher_presence_computed: 'Presença computada',
  compute_presence: 'Presença computada',
  pdf_generated: 'PDF gerado',
  generate_pdf: 'PDF gerado',
  entry_updated: 'Lançamento atualizado',
  entry_created: 'Lançamento criado',
  entry_deleted: 'Lançamento removido',
};

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  coordinator: 'Coordenador',
  coordenador: 'Coordenador',
  rh: 'R.H.',
  professor: 'Professor',
  teacher: 'Professor',
  system: 'Sistema',
};

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function PresencaSheetDetailPage() {
  const { sheetId } = useParams<{ sheetId: string }>();
  const { user } = useAuth();
  const manager = isManagerRole(user?.perfil);
  const isAdmin = user?.perfil === 'admin';
  const isRh = user?.perfil === 'rh' || isAdmin;

  const { data: sheet, isLoading } = useMonthlySheet(sheetId);
  const { data: entries = [], isLoading: loadingEntries } = useSheetEntries(sheetId);
  const { data: breakdown = [] } = useSheetSchoolBreakdown(sheetId || null);
  const { data: adjustments = [] } = useSheetAdjustments(sheetId);
  const recalc = useRecalcSheet();
  const submitReview = useSubmitSheetForReview();
  const approveCoord = useApproveSheetCoordination();
  const approveRh = useApproveSheetRh();
  const closeSheet = useCloseSheet();
  const reopenSheet = useReopenSheet();
  const reviewAdj = useReviewAdjustment();
  const pdf = useGenerateSheetPdf();
  const regen = useGenerateSheet();
  const { data: details } = useSheetDetails(sheetId);
  const auditLogs: any[] = details?.audit_logs || [];

  const [reopenOpen, setReopenOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [closureNotes, setClosureNotes] = useState('');
  const [submitReviewOpen, setSubmitReviewOpen] = useState(false);

  // Agrupa entradas por escola (estável por nome) + computa cursos/turmas distintos
  // IMPORTANTE: hooks (useMemo) precisam ser chamados ANTES de qualquer early return.
  const groupedBySchool = useMemo(() => {
    const map = new Map<string, { schoolId: string; schoolName: string; items: any[]; courseIds: Set<string>; classIds: Set<string> }>();
    for (const e of (entries as any[]) || []) {
      const id = e.school_id || 'sem-escola';
      const name = e.schools?.nome || '— Sem escola —';
      if (!map.has(id)) map.set(id, { schoolId: id, schoolName: name, items: [], courseIds: new Set(), classIds: new Set() });
      const g = map.get(id)!;
      g.items.push(e);
      if (e.course_id) g.courseIds.add(e.course_id);
      if (e.class_group_id) g.classIds.add(e.class_group_id);
    }
    return Array.from(map.values()).sort((a, b) => a.schoolName.localeCompare(b.schoolName, 'pt-BR'));
  }, [entries]);

  const distinctsBySchool = useMemo(() => {
    const m: Record<string, { courses: number; classes: number }> = {};
    for (const g of groupedBySchool) {
      m[g.schoolId] = { courses: g.courseIds.size, classes: g.classIds.size };
    }
    return m;
  }, [groupedBySchool]);

  if (isLoading || !sheet) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin"/></div>;
  }

  const locked = ['closed','approved_by_rh'].includes(sheet.status);

  // Cor do badge de status
  const statusTone = (() => {
    switch (sheet.status) {
      case 'closed':
      case 'approved_by_rh': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'approved_by_coordination': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'under_review': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'with_pending_items': return 'bg-red-100 text-red-700 border-red-200';
      case 'reopened': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  })();

  // CH consolidada
  const expectedClass = (sheet as any).expected_class_minutes ?? 0;
  const confirmedClass = (sheet as any).confirmed_class_minutes ?? 0;
  const expectedPlan = (sheet as any).expected_planning_minutes ?? 0;
  const confirmedPlan = (sheet as any).confirmed_planning_minutes ?? 0;
  const expectedTotal = expectedClass + expectedPlan;
  const confirmedTotal = confirmedClass + confirmedPlan;
  const pctTotal = expectedTotal > 0 ? Math.min(100, Math.round((confirmedTotal / expectedTotal) * 100)) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Rotina Pedagógica' },
          { label: 'Presença dos Professores', href: '/presenca-professores' },
          { label: 'Folhas de Presença', href: '/presenca-professores/folhas' },
          { label: 'Folha mensal' },
        ]}
        title="Folha mensal"
        eyebrow={`${MONTHS[sheet.reference_month-1]}/${sheet.reference_year}`}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-base font-semibold text-foreground">
              {sheet.professors?.full_name || 'Professor'}
            </span>
            <span className="text-muted-foreground">•</span>
            <Badge variant="outline" className={`text-xs ${statusTone}`}>{STATUS_LABEL[sheet.status]}</Badge>
          </span> as any
        }
        backTo="/presenca-professores/folhas"
      />

      {/* Barra de ações — fora do PageHeader para que o título ocupe toda a largura */}
      <div className="flex flex-wrap items-center gap-2 -mt-2">
        {/* Grupo: Documentos */}
        <Button variant="outline" size="sm" onClick={() => pdf.mutate(sheet.id)} disabled={pdf.isPending}>
          {pdf.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Download className="h-4 w-4 mr-2"/>}
          PDF
        </Button>

        {/* Grupo: Conferência */}
        {manager && !locked && (
          <>
            <Separator orientation="vertical" className="h-6 hidden sm:block" />
            <Button variant="outline" size="sm" onClick={() => recalc.mutate(sheet.id)} disabled={recalc.isPending}>
              {recalc.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <RefreshCw className="h-4 w-4 mr-2"/>}
              Recalcular
            </Button>
            {['generated','with_pending_items','under_review','reopened'].includes(sheet.status) && (
              <Button variant="outline" size="sm" onClick={() => setRegenOpen(true)} disabled={regen.isPending}>
                {regen.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <RotateCw className="h-4 w-4 mr-2"/>}
                Regenerar folha
              </Button>
            )}
          </>
        )}

        {/* Grupo: Fluxo de aprovação */}
        <Separator orientation="vertical" className="h-6 hidden sm:block" />
        {manager && ['draft','generated','with_pending_items','reopened'].includes(sheet.status) && (
          <Button size="sm" onClick={() => setSubmitReviewOpen(true)} disabled={submitReview.isPending}>
            {submitReview.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Send className="h-4 w-4 mr-2"/>}
            Enviar para revisão
          </Button>
        )}
        {manager && sheet.status === 'under_review' && (
          <Button size="sm" onClick={() => approveCoord.mutate({ sheetId: sheet.id })}>
            <CheckCircle2 className="h-4 w-4 mr-2"/>Aprovar (Coord.)
          </Button>
        )}
        {isRh && sheet.status === 'approved_by_coordination' && (
          <Button size="sm" onClick={() => approveRh.mutate({ sheetId: sheet.id })}>
            <CheckCircle2 className="h-4 w-4 mr-2"/>Aprovar (R.H.)
          </Button>
        )}
        {isRh && !locked && ['approved_by_rh','approved_by_coordination','reopened','with_pending_items','generated','under_review'].includes(sheet.status) && (
          <Button size="sm" variant="outline" onClick={() => setCloseOpen(true)}>
            <Lock className="h-4 w-4 mr-2"/>Fechar folha
          </Button>
        )}
        {isRh && locked && (
          <Button size="sm" variant="outline" onClick={() => setReopenOpen(true)}>
            <Unlock className="h-4 w-4 mr-2"/>Reabrir
          </Button>
        )}
      </div>

      {/* Metadados da folha */}
      <Card>
        <CardContent className="pt-5 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <Meta icon={CalendarCheck2} label="Gerada em" value={sheet.generated_at ? format(new Date(sheet.generated_at), "dd/MM/yyyy HH:mm") : '—'}/>
          <Meta icon={RefreshCw} label="Último recálculo" value={sheet.last_recalculated_at ? format(new Date(sheet.last_recalculated_at), "dd/MM/yyyy HH:mm") : '—'}/>
          <Meta icon={Lock} label="Fechada em" value={sheet.closed_at ? format(new Date(sheet.closed_at), "dd/MM/yyyy HH:mm") : '—'}/>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <NeovaleStatCard label="Aulas previstas" value={(sheet as any).total_class_entries ?? sheet.total_expected_entries} icon={GraduationCap} tone="neutral" />
        <NeovaleStatCard label="Planejamento (PL)" value={(sheet as any).total_planning_entries ?? 0} icon={BookOpen} tone="info" />
        <NeovaleStatCard label="Presentes" value={sheet.total_present_entries} icon={CheckCircle2} tone="success" />
        <NeovaleStatCard label="Ausências" value={sheet.total_absent_entries} icon={XCircle} tone="danger" />
        <NeovaleStatCard label="Divergências" value={sheet.total_divergent_entries} icon={AlertTriangle} tone="warning" />
      </div>

      {/* Carga horária consolidada */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Carga horária
            </h3>
            <span className="text-xs text-muted-foreground">
              Cumprimento total: <b className="text-foreground">{pctTotal}%</b> ({minutesToHm(confirmedTotal)} de {minutesToHm(expectedTotal)})
            </span>
          </div>
          <Progress value={pctTotal} className="h-2" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Meta label="Aulas — prevista" value={minutesToHm(expectedClass)} />
            <Meta label="Aulas — confirmada" value={minutesToHm(confirmedClass)} accent="text-foreground" />
            <Meta label="Planejamento — prevista" value={minutesToHm(expectedPlan)} />
            <Meta label="Planejamento — confirmada" value={minutesToHm(confirmedPlan)} accent="text-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Resumo por escola (apenas se houver >1) */}
      {breakdown.length > 1 && (
        <Card>
          <CardContent className="pt-5 space-y-2">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <h3 className="font-semibold text-sm">Resumo por escola</h3>
              <p className="text-xs text-muted-foreground">
                Dados separados por escola para conferência — o fechamento da folha é consolidado.
              </p>
            </div>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Escola</TableHead>
                    <TableHead className="text-center">Cursos</TableHead>
                    <TableHead className="text-center">Turmas</TableHead>
                    <TableHead className="text-center" title="Aulas + Planejamento">Aulas + PL</TableHead>
                    <TableHead className="text-center">Presentes</TableHead>
                    <TableHead className="text-center">Ausências</TableHead>
                    <TableHead className="text-center">Divergências</TableHead>
                    <TableHead className="text-center">CH prev.</TableHead>
                    <TableHead className="text-center">CH conf.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakdown.map((b) => {
                    const dist = distinctsBySchool[b.school_id] || { courses: 0, classes: 0 };
                    return (
                      <TableRow key={b.school_id || 'sem-escola'}>
                        <TableCell className="font-medium text-sm">{b.school_name || '— sem escola —'}</TableCell>
                        <TableCell className="text-center text-xs">{dist.courses}</TableCell>
                        <TableCell className="text-center text-xs">{dist.classes}</TableCell>
                        <TableCell className="text-center text-xs">
                          <span className="font-medium">{b.class_entries}</span>
                          <span className="text-muted-foreground"> + </span>
                          <span className="text-blue-600">{b.planning_entries}</span>
                        </TableCell>
                        <TableCell className="text-center text-green-600">{b.present_entries}</TableCell>
                        <TableCell className="text-center text-red-600">{b.absent_entries}</TableCell>
                        <TableCell className="text-center text-red-600">{b.divergent_entries}</TableCell>
                        <TableCell className="text-center text-xs">{minutesToHm(b.expected_total_minutes)}</TableCell>
                        <TableCell className="text-center text-xs">{minutesToHm(b.confirmed_total_minutes)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {(() => {
                    const t = breakdown.reduce((a, b) => ({
                      cls: a.cls + b.class_entries,
                      pl: a.pl + b.planning_entries,
                      pres: a.pres + b.present_entries,
                      abs: a.abs + b.absent_entries,
                      div: a.div + b.divergent_entries,
                      ep: a.ep + b.expected_total_minutes,
                      cp: a.cp + b.confirmed_total_minutes,
                    }), { cls: 0, pl: 0, pres: 0, abs: 0, div: 0, ep: 0, cp: 0 });
                    const totalCourses = Object.values(distinctsBySchool).reduce((s, d) => s + d.courses, 0);
                    const totalClasses = Object.values(distinctsBySchool).reduce((s, d) => s + d.classes, 0);
                    return (
                      <TableRow className="bg-muted/40 font-semibold">
                        <TableCell>Total consolidado (fechamento)</TableCell>
                        <TableCell className="text-center text-xs">{totalCourses}</TableCell>
                        <TableCell className="text-center text-xs">{totalClasses}</TableCell>
                        <TableCell className="text-center text-xs">{t.cls} + <span className="text-blue-600">{t.pl}</span></TableCell>
                        <TableCell className="text-center text-green-600">{t.pres}</TableCell>
                        <TableCell className="text-center text-red-600">{t.abs}</TableCell>
                        <TableCell className="text-center text-red-600">{t.div}</TableCell>
                        <TableCell className="text-center text-xs">{minutesToHm(t.ep)}</TableCell>
                        <TableCell className="text-center text-xs">{minutesToHm(t.cp)}</TableCell>
                      </TableRow>
                    );
                  })()}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Listagem agrupada por escola */}
      {loadingEntries ? (
        <Card><CardContent className="pt-5 text-center py-10"><Loader2 className="h-5 w-5 animate-spin mx-auto"/></CardContent></Card>
      ) : groupedBySchool.length === 0 ? (
        <Card><CardContent className="pt-5 text-center py-10 text-muted-foreground">Nenhuma aula prevista neste mês.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {groupedBySchool.map((g) => (
            <SheetSchoolGroup
              key={g.schoolId}
              schoolName={g.schoolName}
              entries={g.items}
              flat={groupedBySchool.length === 1}
            />
          ))}
        </div>
      )}


      {manager && adjustments.length > 0 && (
        <Card>
          <CardContent className="pt-5 space-y-3">
            <h3 className="font-semibold">Solicitações de ajuste</h3>
            <div className="space-y-2">
              {adjustments.map((a: any) => (
                <div key={a.id} className="border rounded p-3 flex items-center justify-between gap-3">
                  <div className="text-sm">
                    <div className="font-medium">
                      {FINAL_STATUS_LABEL[a.previous_status] || a.previous_status || '—'} → {FINAL_STATUS_LABEL[a.requested_status] || a.requested_status}
                      <Badge className="ml-2 text-xs" variant="outline">{a.status}</Badge>
                    </div>
                    <div className="text-muted-foreground text-xs mt-1">{a.reason}</div>
                  </div>
                  {a.status === 'pending' && !locked && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => reviewAdj.mutate({ adjustmentId: a.id, sheetId: sheet.id, decision: 'rejected' })}>Rejeitar</Button>
                      <Button size="sm" onClick={() => reviewAdj.mutate({ adjustmentId: a.id, sheetId: sheet.id, decision: 'approved' })}>Aprovar</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {manager && auditLogs.length > 0 && (
        <Card>
          <CardContent className="pt-5">
            <h3 className="font-semibold mb-3">Trilha de auditoria</h3>
            <ScrollArea className="max-h-72 pr-3">
              <ul className="divide-y divide-border">
                {auditLogs.map((a: any) => {
                  const label = AUDIT_LABEL[a.action] || a.action;
                  const when = a.created_at
                    ? format(new Date(a.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                    : '';
                  const actor = a.actor_name || a.actor_email || 'Sistema';
                  const role = a.actor_role ? ROLE_LABEL[a.actor_role] || a.actor_role : null;
                  return (
                    <li key={a.id} className="py-1.5 flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className="font-medium">{label}</span>
                          <span className="text-xs text-muted-foreground">{when}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          por <span className="text-foreground">{actor}</span>
                          {role && <> • {role}</>}
                        </div>
                        {a.reason && <div className="text-xs mt-0.5">{a.reason}</div>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Dialog open={reopenOpen} onOpenChange={setReopenOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Reabrir folha</DialogTitle></DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo da reabertura (obrigatório)" rows={4}/>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReopenOpen(false)}>Cancelar</Button>
            <Button disabled={!reason.trim() || reopenSheet.isPending} onClick={async () => {
              await reopenSheet.mutateAsync({ sheetId: sheet.id, reason });
              setReopenOpen(false); setReason('');
            }}>Reabrir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Fechar folha mensal</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {sheet.total_pending_entries > 0
              ? `Existem ${sheet.total_pending_entries} aula(s) pendente(s). ${isAdmin ? 'Como admin, você pode fechar com justificativa.' : 'Resolva-as antes de fechar.'}`
              : 'Após fechar, a folha não poderá ser alterada sem reabertura.'}
          </p>
          <Textarea value={closureNotes} onChange={(e) => setClosureNotes(e.target.value)} placeholder="Observações de fechamento (obrigatório se houver pendências)" rows={3}/>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)}>Cancelar</Button>
            <Button disabled={closeSheet.isPending || (sheet.total_pending_entries > 0 && (!isAdmin || !closureNotes.trim()))}
              onClick={async () => {
                await closeSheet.mutateAsync({ sheetId: sheet.id, closureNotes });
                setCloseOpen(false); setClosureNotes('');
              }}>
              <Lock className="h-4 w-4 mr-2"/>Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={regenOpen} onOpenChange={setRegenOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Regenerar folha mensal</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta ação reconstrói a folha a partir da grade horária atual do professor, incluindo as horas de <strong className="text-blue-600">Planejamento (1/3)</strong>.
            Ajustes manuais aprovados sobre aulas que ainda existirem serão preservados. Use após alterações na grade.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenOpen(false)}>Cancelar</Button>
            <Button disabled={regen.isPending} onClick={async () => {
              await regen.mutateAsync({ professorId: sheet.professor_id, year: sheet.reference_year, month: sheet.reference_month });
              setRegenOpen(false);
            }}>
              <RotateCw className="h-4 w-4 mr-2"/>Regenerar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SubmitForReviewDialog
        open={submitReviewOpen}
        onOpenChange={setSubmitReviewOpen}
        target={{
          id: sheet.id,
          professorName: sheet.professors?.full_name,
          referenceMonth: sheet.reference_month,
          referenceYear: sheet.reference_year,
          pending: sheet.total_pending_entries || 0,
          divergent: sheet.total_divergent_entries || 0,
          status: sheet.status,
          expectedMinutes: sheet.expected_workload_minutes || 0,
          confirmedMinutes: sheet.confirmed_workload_minutes || 0,
          totalEntries: entries.length,
        }}
        isPending={submitReview.isPending}
        onConfirm={({ notes, force }) => {
          submitReview.mutate(
            { sheetId: sheet.id, notes, force },
            { onSuccess: () => setSubmitReviewOpen(false) },
          );
        }}
      />
    </div>
  );
}

function Meta({ label, value, icon: Icon, accent }: { label: string; value: string; icon?: React.ComponentType<{ className?: string }>; accent?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </p>
      <p className={`font-medium ${accent || ''}`}>{value}</p>
    </div>
  );
}
