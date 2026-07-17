import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Replace, ArrowLeft, XCircle, UserPlus, FileCheck2, DollarSign, CheckCircle2, Ticket, MessageSquare, RotateCcw, Upload, FileDown } from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';
import { generateSubstitutionReportPdf } from './utils/substitutionReportPdf';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { isManagerRole, isAdminRole } from '@/lib/roles';
import {
  useTSRDetail, useTSRCandidates, useTSRDocuments, useTSRPayment, useTSRHistory, useTSRAudit,
  useTSROccurrences,
  useCreateTSRTicket, useRouteTSRChannel, useSuggestTSRCandidate, useConfirmTSRSubstitute,
  useConfirmTSRExecution, useGenerateTSRDeclaration, useGenerateTSRReceipt,
  useApproveTSRPayment, useScheduleTSRPayment, useMarkTSRPaid,
  useReturnTSRForCorrection, useCancelTSR,
  TSR_STATUS_LABEL, TSR_STATUS_COLOR, PHASE,
} from './hooks/useTeacherSubstitution';
import { SubstitutionDocumentsPanel } from './components/SubstitutionDocumentsPanel';
import { OperationalFlowPanel } from './components/OperationalFlowPanel';
import { RhNextActionBanner } from './components/RhNextActionBanner';
import { useHasFinancialAccess } from './components/FinancialAccessGuard';
import { AbsenceAttachmentsViewer } from './components/AbsenceAttachmentsViewer';
import {
  ApprovePaymentDialog, SchedulePaymentDialog, MarkPaidDialog,
  ReturnForCorrectionDialog, ReasonDialog,
} from './components/FinancialActionDialogs';
import { formatTSRPaymentStatus } from './hooks/useTeacherSubstitutionFinancial';
import { Paperclip } from 'lucide-react';



const BRL = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0);

export default function SubstituicaoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userRole } = useOrganization();
  const canManage = isManagerRole(userRole);
  const isAdminRh = userRole === 'admin' || userRole === 'rh';
  const hasFinancialAccess = useHasFinancialAccess();

  const { data: r, isLoading } = useTSRDetail(id);
  const { branding } = useBranding();
  const [pdfBusy, setPdfBusy] = useState(false);
  const { data: candidates = [] } = useTSRCandidates(id);
  const { data: documents = [] } = useTSRDocuments(id);
  const { data: payment } = useTSRPayment(id);
  const { data: history = [] } = useTSRHistory(id);
  const { data: audit = [] } = useTSRAudit(id);
  const { data: occurrences = [] } = useTSROccurrences(id);

  const createTicket = useCreateTSRTicket();
  const routeChannel = useRouteTSRChannel();
  const suggest = useSuggestTSRCandidate();
  const confirmSub = useConfirmTSRSubstitute();
  const confirmExec = useConfirmTSRExecution();
  const genDecl = useGenerateTSRDeclaration();
  const genRec = useGenerateTSRReceipt();
  const approve = useApproveTSRPayment();
  const schedule = useScheduleTSRPayment();
  const pay = useMarkTSRPaid();
  const returnFix = useReturnTSRForCorrection();
  const cancelReq = useCancelTSR();

  const [suggestOpen, setSuggestOpen] = useState(false);
  const [sName, setSName] = useState(''); const [sCpf, setSCpf] = useState('');
  const [sPhone, setSPhone] = useState(''); const [sNotes, setSNotes] = useState('');
  const [activeTab, setActiveTab] = useState('resumo');

  // Diálogos financeiros / administrativos
  const [approveOpen, setApproveOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (isLoading || !r) {
    return <div className="p-8 text-center text-muted-foreground">Carregando…</div>;
  }

  const phase = PHASE[r.status];

  async function act(fn: () => Promise<any>, ok: string) {
    try { await fn(); toast({ title: ok }); }
    catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  }

  async function onConfirmCandidate(candidateId: string) {
    await act(() => confirmSub.mutateAsync({ id: id!, candidate_id: candidateId }), 'Substituto confirmado');
  }
  async function onSuggest() {
    if (!sName.trim()) return;
    await act(() => suggest.mutateAsync({
      id: id!, professor_id: null,
      candidate_data: { name: sName, cpf: sCpf, phone: sPhone },
      notes: sNotes || undefined,
    }), 'Candidato registrado');
    setSuggestOpen(false); setSName(''); setSCpf(''); setSPhone(''); setSNotes('');
  }


  const isCancelled = r.status === 'cancelled';
  const isPaid = r.status === 'payment_completed';

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Presença dos Professores', href: '/presenca-professores' },
          { label: 'Substituição', href: '/presenca-professores/substituicao' },
          { label: r.substitution_code },
        ]}
        title="Detalhe da Substituição"
        icon={Replace}
        actions={
          <div className="flex items-center gap-2">
            {isAdminRh && r.substitute_professor_name && (
              <Button
                variant="outline"
                disabled={pdfBusy}
                onClick={async () => {
                  try {
                    setPdfBusy(true);
                    await generateSubstitutionReportPdf({ request: r, includeFinancials: hasFinancialAccess, branding });
                  } catch (e: any) {
                    toast({ title: 'Falha ao gerar PDF', description: e?.message, variant: 'destructive' });
                  } finally {
                    setPdfBusy(false);
                  }
                }}
              >
                <FileDown className="h-4 w-4 mr-2" /> {pdfBusy ? 'Gerando…' : 'Baixar PDF'}
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
          </div>
        }
      />

      {/* Banner de próxima ação — visível para R.H. e Admin */}
      {isAdminRh && (
        <RhNextActionBanner
          request={r}
          isRhStrict={userRole === 'rh' || userRole === 'admin'}
          onGoToDocuments={() => setActiveTab('documentos')}
          onGoToHistory={() => setActiveTab('historico')}
        />
      )}

      {/* Header summary */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="font-mono text-xs">{r.substitution_code}</Badge>
              <Badge className={TSR_STATUS_COLOR[r.status]} variant="secondary">{TSR_STATUS_LABEL[r.status]}</Badge>
              <Badge variant="outline" className="text-xs">
                Fase {phase} — {phase === 1 ? 'Demanda e Roteamento' : 'Execução e Fechamento'}
              </Badge>
              {hasFinancialAccess && (
                <Badge variant="outline" className="text-xs">Pagamento: {formatTSRPaymentStatus(r.payment_status)}</Badge>
              )}
              <Badge variant="outline" className="text-xs">Documentação: {r.documentation_status}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Criada em {new Date(r.created_at).toLocaleString('pt-BR')}
            </div>
          </div>

          {(() => {
            const allDates: string[] = Array.isArray((r as any).absence_dates) && (r as any).absence_dates.length
              ? ((r as any).absence_dates as string[])
              : (r.absence_date ? [r.absence_date] : []);
            const fmt = (d: string) => new Date(d + 'T00:00').toLocaleDateString('pt-BR');
            const datesLabel = allDates.length === 0
              ? '—'
              : allDates.length === 1
                ? fmt(allDates[0])
                : `${fmt(allDates[0])} → ${fmt(allDates[allDates.length - 1])} (${allDates.length} datas)`;
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <Info label={allDates.length > 1 ? 'Período da ausência' : 'Data da ausência'} value={datesLabel} />
                <Info label="Escola" value={r.school_name_snapshot || '—'} />
                <Info label="Curso" value={r.course_name_snapshot || '—'} />
                <Info
                  label={occurrences.length > 1 ? 'Turmas / Disciplinas' : 'Turma'}
                  value={
                    occurrences.length > 1
                      ? `${new Set(occurrences.map(o => o.class_group_id).filter(Boolean)).size} turmas · ${new Set(occurrences.map(o => o.subject_id).filter(Boolean)).size} disciplinas`
                      : (r.class_group_name_snapshot || '—')
                  }
                />
                {occurrences.length <= 1 && (
                  <Info label="Disciplina" value={r.subject_name_snapshot || '—'} />
                )}
                <Info label="Professor substituído" value={r.substituted_professor_name} />
                <Info label="Professor substituto" value={r.substitute_professor_name || '—'} />
                <Info label="Motivo" value={r.absence_reason} />
                <Info label="Horas-aula" value={Number(r.total_class_hours).toFixed(2)} />
                {hasFinancialAccess && (
                  <>
                    <Info label="Valor da hora-aula" value={BRL(Number(r.hour_class_value))} />
                    <Info label="Valor total" value={<span className="font-semibold">{BRL(Number(r.total_amount || 0))}</span>} />
                  </>
                )}
                <Info label="Ticket" value={r.ticket_id ? <span className="font-mono text-xs">{r.ticket_id.slice(0, 8)}…</span> : '—'} />
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {occurrences.length > 1 && (
        <Card>
          <CardContent className="p-5">
            <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Aulas da solicitação ({occurrences.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Data</th>
                    <th className="text-left px-3 py-2">Tempo</th>
                    <th className="text-left px-3 py-2">Turma</th>
                    <th className="text-left px-3 py-2">Disciplina</th>
                    <th className="text-right px-3 py-2">H/A</th>
                  </tr>
                </thead>
                <tbody>
                  {occurrences.map((o) => {
                    let snap: any = {};
                    try { snap = o.evidence_notes ? JSON.parse(o.evidence_notes) : {}; } catch { /* legado */ }
                    const dayLabel = new Date(o.scheduled_date + 'T00:00')
                      .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' });
                    const horario = snap.start_time && snap.end_time
                      ? `${snap.slot_label || ''} ${snap.start_time}–${snap.end_time}`.trim()
                      : '—';
                    return (
                      <tr key={o.id} className="border-b last:border-0">
                        <td className="px-3 py-2">{dayLabel}</td>
                        <td className="px-3 py-2 text-xs">{horario}</td>
                        <td className="px-3 py-2">{snap.class_group_name || '—'}</td>
                        <td className="px-3 py-2">{snap.subject_name || '—'}</td>
                        <td className="px-3 py-2 text-right">{Number(o.class_hours).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        {/* RESUMO + AÇÕES (novo fluxo operacional) */}
        <TabsContent value="resumo">
          <OperationalFlowPanel request={r} onGoToDocuments={() => setActiveTab('documentos')} />

          {/* Cancelar (admin) */}
          {isAdminRh && !isCancelled && r.status !== 'substitution_completed' && (
            <Card className="mt-4">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Ações administrativas</div>
                <Button variant="outline" className="text-rose-700" onClick={() => setCancelOpen(true)}>
                  <XCircle className="h-4 w-4 mr-2" /> Cancelar substituição
                </Button>
              </CardContent>
            </Card>
          )}

          {r.notes && (
            <Card className="mt-4">
              <CardContent className="p-4 text-sm whitespace-pre-wrap">{r.notes}</CardContent>
            </Card>
          )}
        </TabsContent>

        {/* DOCUMENTOS */}
        <TabsContent value="documentos" className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Paperclip className="h-4 w-4 text-amber-700" />
                <div className="text-sm font-semibold uppercase tracking-wide text-amber-900">
                  Comprovantes do motivo da ausência
                </div>
                {Array.isArray((r as any).absence_attachments) && (r as any).absence_attachments.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {(r as any).absence_attachments.length}
                  </Badge>
                )}
              </div>
              <AbsenceAttachmentsViewer attachments={((r as any).absence_attachments || []) as any} />
            </CardContent>
          </Card>

          <SubstitutionDocumentsPanel
            requestId={id!}
            organizationId={r.organization_id}
            status={r.status}
            canManage={canManage}
            documents={documents}
          />
        </TabsContent>


        {/* HISTÓRICO */}
        <TabsContent value="historico">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm font-medium mb-3">Histórico de status</div>
              {history.length === 0 && <div className="text-sm text-muted-foreground">Sem registros.</div>}
              <ol className="space-y-2 text-sm">
                {history.map((h: any) => (
                  <li key={h.id} className="border-l-2 border-primary/30 pl-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {h.from_status && <Badge variant="outline" className="text-xs">{h.from_status}</Badge>}
                      <span className="text-muted-foreground text-xs">→</span>
                      <Badge variant="secondary" className="text-xs">{h.to_status}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                    {h.notes && <div className="text-xs mt-1 italic">"{h.notes}"</div>}
                  </li>
                ))}
              </ol>

              <div className="text-sm font-medium mt-6 mb-3">Auditoria ({audit.length})</div>
              <ol className="space-y-1 text-xs">
                {audit.map((a: any) => (
                  <li key={a.id} className="flex justify-between border-b last:border-b-0 py-1">
                    <span><strong>{a.action}</strong> {a.reason ? `· ${a.reason}` : ''}</span>
                    <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString('pt-BR')}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diálogos financeiros / administrativos (substituem prompts) */}
      <ApprovePaymentDialog open={approveOpen} onOpenChange={setApproveOpen} requestId={id!} organizationId={r.organization_id} />
      <SchedulePaymentDialog open={scheduleOpen} onOpenChange={setScheduleOpen} requestId={id!} organizationId={r.organization_id} />
      <MarkPaidDialog open={payOpen} onOpenChange={setPayOpen} requestId={id!} organizationId={r.organization_id} />
      <ReturnForCorrectionDialog open={returnOpen} onOpenChange={setReturnOpen} requestId={id!} organizationId={r.organization_id} />
      <ReasonDialog
        open={cancelOpen} onOpenChange={setCancelOpen}
        title="Cancelar substituição"
        description="Esta ação encerra a solicitação. A justificativa fica registrada em auditoria."
        label="Motivo do cancelamento *"
        confirmLabel="Cancelar substituição" destructive
        isPending={cancelReq.isPending}
        onConfirm={async (reason) => {
          await cancelReq.mutateAsync({ id: id!, reason });
          toast({ title: 'Substituição cancelada' });
        }}
      />
    </div>
  );
}


function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
