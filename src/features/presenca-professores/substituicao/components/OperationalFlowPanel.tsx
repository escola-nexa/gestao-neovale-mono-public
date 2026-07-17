import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2, UserPlus, RotateCcw, Upload, School, Ticket, Clock, FileDown, Sparkles,
  PlayCircle, FileText, ShieldCheck, DollarSign, Send,
} from 'lucide-react';
import { substitutionApi } from '@/features/presenca-professores/substituicao/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { useBranding } from '@/hooks/useBranding';
import { isAdminRole } from '@/lib/roles';
import {
  TSRRequest,
  useTSRRhTake, useTSRRhReturn, useTSRCoordReturnToRh, useTSRNotifySchool,
  uploadTSRSchoolNotificationProof,
  useConfirmTSRExecution, useApproveTSRPayment, useReturnTSRForCorrection,
  useTSRDocuments,
} from '../hooks/useTeacherSubstitution';
import { generateSubstitutionReportPdf } from '../utils/substitutionReportPdf';
import { useHasFinancialAccess } from './FinancialAccessGuard';
import { ApprovePaymentDialog, ReturnForCorrectionDialog, ReasonDialog } from './FinancialActionDialogs';


interface Props {
  request: TSRRequest;
  onGoToDocuments?: () => void;
}

const CHANNELS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-mail' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'outro', label: 'Outro' },
];

export function OperationalFlowPanel({ request: r, onGoToDocuments }: Props) {
  const { userRole, organizationId } = useOrganization();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isAdmin = isAdminRole(userRole);
  // Ações operacionais de R.H. (assumir atendimento, devolver com substituto):
  // Admin é elevado aqui para também poder operar como R.H. nesta tela
  // (seleção de substituto nos 3 modos). O perfil `rh` continua tendo acesso
  // normal. Coordenador (sem admin) vê apenas o fluxo de acompanhamento.
  const isRhStrict = userRole === 'rh' || isAdmin;
  const isCoord = userRole === 'coordenador' || isAdmin;
  // Card "aguardando R.H. / abrir ticket": apenas coordenador puro.
  const isCoordView = userRole === 'coordenador';

  function openTicketForRh() {
    const params = new URLSearchParams({
      type: 'interno',
      assignRh: '1',
      title: `Solicitação de substituição ${r.substitution_code} — acompanhamento`,
      description:
        `Acompanhamento da solicitação de substituição **${r.substitution_code}**.\n\n` +
        `- Professor ausente: ${r.substituted_professor_name}\n` +
        `- Data da ausência: ${new Date(r.absence_date + 'T00:00').toLocaleDateString('pt-BR')}\n` +
        `- Escola: ${r.school_name_snapshot || '—'}\n` +
        `- Curso/Turma: ${r.course_name_snapshot || '—'} / ${r.class_group_name_snapshot || '—'}\n` +
        `- Disciplina: ${r.subject_name_snapshot || '—'}\n` +
        `- Motivo: ${r.absence_reason}\n\n` +
        `Favor dar andamento à indicação do substituto.`,
      tsrId: r.id,
      tsrCode: r.substitution_code,
    });
    if (r.school_id) params.set('schoolId', r.school_id);
    navigate(`/tickets/novo?${params.toString()}`);
  }

  const take = useTSRRhTake();
  const rhReturn = useTSRRhReturn();
  const coordReturnToRh = useTSRCoordReturnToRh();
  const notify = useTSRNotifySchool();

  // Professores disponíveis para selecionar como substituto
  const { data: professors = [] } = useQuery({
    enabled: !!organizationId && isRhStrict && (r.status === 'rh_in_progress' || r.status === 'request_created'),
    queryKey: ['tsr_substitute_professors', organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('professors')
        .select('id, full_name, cpf')
        .eq('organization_id', organizationId!)
        .eq('status', 'ACTIVE')
        .order('full_name');
      return data || [];
    },
  });

  // Banco de Talentos (substituto)
  const { data: talents = [] } = useQuery({
    enabled: !!organizationId && isRhStrict,
    queryKey: ['tsr_substitute_talents', organizationId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('talent_pool_candidates')
        .select('id, full_name, email, phone, cpf, pix, classifications')
        .eq('organization_id', organizationId!)
        .is('deleted_at', null)
        .order('full_name');
      return (data || []) as Array<{
        id: string; full_name: string; email: string | null; phone: string | null;
        cpf: string | null; pix: string | null;
        classifications: string[] | null;
      }>;
    },
  });

  // Sugestão da coordenação: existe enquanto o R.H. ainda não devolveu (mostra
  // até `returned_at` ser preenchido). Antes a regra usava `!attended_at`, o que
  // fazia o banner sumir assim que o R.H. assumia o atendimento — e o R.H. perdia
  // a referência da sugestão original. Agora persistimos durante toda a Fase 2.
  const coordSuggestion = (!r.returned_at && r.substitute_professor_name)
    ? {
        name: r.substitute_professor_name,
        cpf: r.substitute_professor_cpf || '',
        rg: r.substitute_professor_rg || '',
        phone: r.substitute_professor_phone || '',
      }
    : null;

  // Form state — devolução R.H.
  type Source = 'professor' | 'talent' | 'manual';
  const [subSource, setSubSource] = useState<Source>('professor');
  const [subProfId, setSubProfId] = useState<string | null>(null);
  const [subTalentId, setSubTalentId] = useState<string | null>(null);
  const [subName, setSubName] = useState(coordSuggestion?.name || '');
  const [subCpf, setSubCpf] = useState(coordSuggestion?.cpf || '');
  const [subRg, setSubRg] = useState(coordSuggestion?.rg || '');
  const [subPhone, setSubPhone] = useState(coordSuggestion?.phone || '');
  const [subEmail, setSubEmail] = useState('');
  const [subPix, setSubPix] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [savingPdf, setSavingPdf] = useState(false);

  // Form state — comunicação escola
  const [channel, setChannel] = useState('whatsapp');
  const [recipient, setRecipient] = useState(r.director_name || r.coordinator_name || '');
  const [message, setMessage] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Re-hidrata o formulário quando carrega a request (caso já tenha sugestão da coordenação)
  useEffect(() => {
    if (coordSuggestion && !subName) {
      setSubName(coordSuggestion.name);
      setSubCpf(coordSuggestion.cpf);
      setSubRg(coordSuggestion.rg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.id]);

  const { branding } = useBranding();
  const hasFinancialAccess = useHasFinancialAccess();

  async function handleAct<T>(fn: () => Promise<T>, ok: string) {
    try { await fn(); toast({ title: ok }); }
    catch (e: any) { toast({ title: 'Erro', description: e?.message || 'Falhou', variant: 'destructive' }); }
  }

  function selectProf(id: string | null) {
    setSubProfId(id);
    setSubTalentId(null);
    if (!id) return;
    const p = professors.find((x: any) => x.id === id);
    if (p) {
      setSubName(p.full_name || '');
      setSubCpf(p.cpf || '');
    }
  }

  function selectTalent(id: string | null) {
    setSubTalentId(id);
    setSubProfId(null);
    if (!id) return;
    const t = talents.find((x: any) => x.id === id);
    if (t) {
      setSubName(t.full_name || '');
      setSubCpf(t.cpf || subCpf);
      setSubPhone(t.phone || subPhone);
      setSubEmail(t.email || subEmail);
      setSubPix(t.pix || subPix);
    }
  }

  function applyCoordSuggestion() {
    if (!coordSuggestion) return;
    setSubSource('manual');
    setSubProfId(null);
    setSubTalentId(null);
    setSubName(coordSuggestion.name);
    setSubCpf(coordSuggestion.cpf);
    setSubRg(coordSuggestion.rg);
    toast({ title: 'Sugestão da coordenação aplicada' });
  }

  /** Habilitação do botão: em todos os modos exige Nome, CPF, Telefone e PIX. */
  const hasRequiredFields =
    subName.trim().length > 0 &&
    subCpf.trim().length > 0 &&
    subPhone.trim().length > 0 &&
    subPix.trim().length > 0;

  const canConfirm =
    hasRequiredFields && (
      (subSource === 'professor' && !!subProfId) ||
      (subSource === 'talent' && !!subTalentId) ||
      (subSource === 'manual')
    );

  const confirmHint = !canConfirm
    ? (subSource === 'professor' && !subProfId
        ? 'Selecione um professor cadastrado para continuar.'
        : subSource === 'talent' && !subTalentId
          ? 'Selecione um candidato do Banco de Talentos.'
          : 'Preencha os campos obrigatórios: Nome, CPF, Telefone e PIX.')
    : null;

  /** Confirma o substituto (sinaliza aceite) e devolve a solicitação à coordenação. */
  async function handleConfirmSubstitute() {
    if (!canConfirm) {
      toast({ title: confirmHint || 'Complete o cadastro do substituto', variant: 'destructive' });
      return;
    }
    let talentIdToLink: string | null = subSource === 'talent' ? subTalentId : null;

    // Se modo manual e não houver vínculo, cria/recupera entrada no Banco de Talentos
    if (subSource === 'manual' && !subProfId && organizationId) {
      try {
        const cpfClean = (subCpf || '').replace(/\D/g, '');
        let existing: any = null;
        if (cpfClean) {
          const { data } = await (supabase as any)
            .from('talent_pool_candidates')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('cpf', subCpf)
            .is('deleted_at', null)
            .maybeSingle();
          existing = data;
        }
        if (!existing && subPhone) {
          const { data } = await (supabase as any)
            .from('talent_pool_candidates')
            .select('id')
            .eq('organization_id', organizationId)
            .ilike('full_name', subName.trim())
            .eq('phone', subPhone)
            .is('deleted_at', null)
            .maybeSingle();
          existing = data;
        }
        if (existing?.id) {
          talentIdToLink = existing.id;
        } else {
          const { data: userData } = await substitutionApi.getUser();
          const { data: inserted } = await substitutionApi.insertTalentPoolCandidate({
            organization_id: organizationId,
            full_name: subName.trim(),
            cpf: subCpf || null,
            email: subEmail || null,
            phone: subPhone || '',
            pix: subPix || null,
            phone_is_whatsapp: false,
            free_periods: [],
            free_weekdays: [],
            has_licentiate: false,
            notes: `Cadastro automático via Substituição ${r.substitution_code} em ${new Date().toLocaleDateString('pt-BR')}`,
            classifications: ['Sem Histórico'],
            created_by: userData.user?.id || null,
          }).select('id').maybeSingle();
          talentIdToLink = inserted?.id ?? null;
        }
      } catch (err) {
        console.warn('Falha ao adicionar ao Banco de Talentos (continuando):', err);
      }
    }
    await handleAct(() => rhReturn.mutateAsync({
      id: r.id,
      substitute_professor_id: subProfId,
      substitute_talent_pool_candidate_id: talentIdToLink,
      substitute_name: subName,
      substitute_cpf: subCpf || null,
      substitute_rg: subRg || null,
      substitute_phone: subPhone || null,
      substitute_email: subEmail || null,
      substitute_pix: subPix || null,
      notes: returnNotes || null,
    }), 'Substituto confirmado — devolvido à coordenação');
  }

  async function handleDownloadPdf() {
    try {
      setSavingPdf(true);
      await generateSubstitutionReportPdf({
        request: r,
        includeFinancials: hasFinancialAccess,
        branding,
      });
    } catch (e: any) {
      toast({ title: 'Falha ao gerar PDF', description: e?.message, variant: 'destructive' });
    } finally {
      setSavingPdf(false);
    }
  }


  function handleReturnToRh() { setReturnRhOpen(true); }


  async function handleNotify() {
    if (!channel) { toast({ title: 'Selecione o canal', variant: 'destructive' }); return; }
    let proof_url: string | null = null;
    if (proofFile) {
      try {
        setUploading(true);
        const res = await uploadTSRSchoolNotificationProof(r.organization_id, r.id, proofFile);
        proof_url = res.signed_url;
      } catch (e: any) {
        toast({ title: 'Falha no upload', description: e?.message, variant: 'destructive' });
        setUploading(false);
        return;
      } finally { setUploading(false); }
    }
    await handleAct(() => notify.mutateAsync({
      id: r.id, channel, recipient: recipient || null,
      proof_url, message: message || null,
    }), 'Escola informada — substituição finalizada');
  }

  const finalized = r.status === 'substitution_completed';
  const cancelled = r.status === 'cancelled';

  // Status pós-finalização
  const POST_EXEC: TSRRequest['status'][] = ['execution_completed','report_pending','report_generated','signed_report_pending','signed_report_uploaded','pending_rh_validation','approved_for_payment','payment_pending','payment_completed'];
  const isPostExec = (POST_EXEC as string[]).includes(r.status);
  const isExecConfirmed = r.status !== 'substitution_completed' && isPostExec;
  const isReportReady = ['signed_report_uploaded','pending_rh_validation','approved_for_payment','payment_pending','payment_completed'].includes(r.status);
  const isApprovedFin = ['approved_for_payment','payment_pending','payment_completed'].includes(r.status);
  const isPaid = r.status === 'payment_completed';

  // Documentos da solicitação (relatório assinado para liberar validação)
  const { data: docs = [] } = useTSRDocuments(isExecConfirmed || r.status === 'substitution_completed' ? r.id : undefined);
  const hasSignedReport = (docs || []).some((d: any) => d.document_type === 'signed_report' && d.document_status !== 'cancelled');

  const confirmExec = useConfirmTSRExecution();
  const approveFin = useApproveTSRPayment();
  const returnFix = useReturnTSRForCorrection();

  async function handleConfirmExecution() {
    await handleAct(() => confirmExec.mutateAsync(r.id), 'Execução confirmada');
  }

  const [approveOpen, setApproveOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnRhOpen, setReturnRhOpen] = useState(false);

  function handleApproveFinancial() { setApproveOpen(true); }
  function handleReturnForCorrection() { setReturnOpen(true); }


  return (
    <>
    <div className="space-y-4">

      {/* Linha do tempo (8 etapas) */}
      <Card>
        <CardContent className="p-4">
          <div className="text-sm font-medium mb-3">Fluxo operacional</div>
          <ol className="flex flex-wrap gap-2 text-xs">
            <Step done={true} label="1. Solicitada"
              meta={new Date(r.created_at).toLocaleString('pt-BR')} />
            <Step done={!!r.attended_at}
              active={r.status === 'rh_in_progress'}
              label="2. Atendimento R.H."
              meta={r.attended_at ? new Date(r.attended_at).toLocaleString('pt-BR') : '—'} />
            <Step done={!!r.returned_at}
              active={r.status === 'returned_to_coordinator'}
              label="3. Devolvida à coordenação"
              meta={r.returned_at ? new Date(r.returned_at).toLocaleString('pt-BR') : '—'} />
            <Step done={!!r.school_notified_at}
              active={r.status === 'substitution_completed'}
              label="4. Informada à escola"
              meta={r.school_notified_at ? new Date(r.school_notified_at).toLocaleString('pt-BR') : '—'} />
            <Step done={isExecConfirmed}
              active={r.status === 'substitution_completed'}
              label="5. Execução confirmada"
              meta={isExecConfirmed ? 'OK' : '—'} />
            <Step done={isReportReady}
              active={['execution_completed','report_pending','report_generated','signed_report_pending'].includes(r.status)}
              label="6. Relatório assinado"
              meta={hasSignedReport ? 'Anexado' : '—'} />
            <Step done={isApprovedFin}
              active={['signed_report_uploaded','pending_rh_validation'].includes(r.status)}
              label="7. Validado pelo R.H."
              meta={isApprovedFin ? 'Encaminhado' : '—'} />
            <Step done={isPaid}
              active={['approved_for_payment','payment_pending'].includes(r.status)}
              label="8. Pagamento"
              meta={isPaid ? 'Pago' : (isApprovedFin ? 'Em andamento' : '—')} />
          </ol>
        </CardContent>
      </Card>

      {/* Cancelada */}
      {cancelled && (
        <Card><CardContent className="p-4 text-sm text-rose-700">
          Substituição cancelada. {r.cancel_reason ? `Motivo: ${r.cancel_reason}` : ''}
        </CardContent></Card>
      )}

      {/* Etapa 2 — R.H. assume */}
      {!cancelled && r.status === 'request_created' && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">Aguardando R.H.</Badge>
              <div className="text-sm">
                {isCoordView
                  ? 'Sua solicitação foi enviada ao R.H. e está aguardando atendimento. Você voltará a participar do fluxo nas Fases 3 (Devolvida à coordenação) e 4 (Informar a escola).'
                  : 'Esta solicitação está na fila do R.H. para atendimento.'}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {isRhStrict && (
                <Button onClick={() => handleAct(() => take.mutateAsync(r.id), 'Atendimento assumido')}>
                  <UserPlus className="h-4 w-4 mr-2" /> Assumir atendimento (R.H.)
                </Button>
              )}
              {isCoordView && (
                <Button variant="outline" onClick={openTicketForRh}>
                  <Ticket className="h-4 w-4 mr-2" /> Abrir ticket para o R.H.
                </Button>
              )}
            </div>
            {isCoordView && (
              <div className="text-xs text-muted-foreground">
                Use o ticket para acompanhar ou cobrar o R.H. sobre esta substituição. Ele é aberto já atribuído à equipe de R.H.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Etapa 2.1 — R.H. já assumiu, coordenador aguardando */}
      {!cancelled && r.status === 'rh_in_progress' && isCoordView && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-blue-50 text-blue-900 border-blue-200">
                <Clock className="h-3 w-3 mr-1" /> R.H. em atendimento
              </Badge>
              <div className="text-sm">
                O R.H. já assumiu o atendimento desta solicitação. Você voltará a participar nas Fases 3 (Devolvida à coordenação) e 4 (Informar a escola).
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={openTicketForRh}>
                <Ticket className="h-4 w-4 mr-2" /> Abrir ticket para o R.H.
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Use o ticket para acompanhar ou cobrar o R.H. sobre esta substituição. Ele é aberto já atribuído à equipe de R.H.
            </div>
          </CardContent>
        </Card>
      )}


      {/* Etapa 3 — R.H. confirma substituto */}
      {!cancelled && (r.status === 'rh_in_progress' || (r.status === 'request_created' && isRhStrict)) && isRhStrict && (
        <Card id="rh-action-form" className="transition-shadow scroll-mt-24 border-blue-200">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-sm font-semibold text-blue-900">
                  Confirmar substituto e devolver à coordenação
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Ao confirmar, registra o aceite do professor e devolve a solicitação para a coordenação (Fase 3).
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={savingPdf}>
                <FileDown className="h-4 w-4 mr-2" /> {savingPdf ? 'Gerando…' : 'Baixar PDF Relatório'}
              </Button>
            </div>

            {coordSuggestion && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
                <div className="flex-1 text-sm">
                  <div className="font-medium text-amber-900">Sugestão da coordenação</div>
                  <div className="text-amber-900/90">
                    <strong>{coordSuggestion.name}</strong>
                    {coordSuggestion.cpf && ` · CPF ${coordSuggestion.cpf}`}
                    {coordSuggestion.rg && ` · RG ${coordSuggestion.rg}`}
                  </div>
                  <div className="text-xs text-amber-900/70 mt-0.5">
                    Você pode usar essa sugestão, escolher outro nome ou cadastrar manualmente.
                  </div>
                </div>
                <Button size="sm" variant="outline" className="bg-white" onClick={applyCoordSuggestion}>
                  Usar sugestão
                </Button>
              </div>
            )}

            {/* Segmented control de origem */}
            <div>
              <Label className="text-xs text-muted-foreground">Origem do substituto</Label>
              <div className="mt-1 grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
                {([
                  { v: 'professor', label: 'Professor cadastrado' },
                  { v: 'talent', label: 'Banco de Talentos' },
                  { v: 'manual', label: 'Cadastrar manualmente' },
                ] as { v: Source; label: string }[]).map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => {
                      setSubSource(opt.v);
                      if (opt.v !== 'professor') setSubProfId(null);
                      if (opt.v !== 'talent') setSubTalentId(null);
                    }}
                    className={`text-xs font-medium rounded-md px-2 py-1.5 transition ${
                      subSource === opt.v
                        ? 'bg-white shadow text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {subSource === 'professor' && (
              <div>
                <Label>Selecione o professor cadastrado</Label>
                <SearchableSelect
                  value={subProfId || ''}
                  onValueChange={(v) => selectProf(v || null)}
                  options={professors.map((p: any) => ({
                    value: p.id,
                    label: p.full_name,
                    description: p.cpf || undefined,
                    keywords: p.cpf || '',
                  }))}
                  placeholder="Buscar por nome ou CPF…"
                />
              </div>
            )}

            {subSource === 'talent' && (
              <div>
                <Label>Selecione no Banco de Talentos</Label>
                <SearchableSelect
                  value={subTalentId || ''}
                  onValueChange={(v) => selectTalent(v || null)}
                  options={talents.map((t: any) => ({
                    value: t.id,
                    label: t.full_name,
                    description: [t.phone, t.email].filter(Boolean).join(' · ') || undefined,
                    keywords: `${t.phone || ''} ${t.email || ''}`,
                  }))}
                  placeholder={talents.length ? 'Buscar candidato…' : 'Nenhum candidato no Banco de Talentos'}
                  disabled={!talents.length}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Nome do substituto *</Label>
                <Input value={subName} onChange={(e) => setSubName(e.target.value)} />
              </div>
              <div>
                <Label>CPF *</Label>
                <Input value={subCpf} onChange={(e) => setSubCpf(e.target.value)} placeholder="000.000.000-00" />
              </div>
              <div>
                <Label>Telefone *</Label>
                <Input value={subPhone} onChange={(e) => setSubPhone(e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <Label>Chave PIX *</Label>
                <Input value={subPix} onChange={(e) => setSubPix(e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" />
              </div>
              <div>
                <Label>RG</Label>
                <Input value={subRg} onChange={(e) => setSubRg(e.target.value)} />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={subEmail} onChange={(e) => setSubEmail(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Observações para a coordenação</Label>
              <Textarea rows={3} value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Ex.: professor confirmou disponibilidade por WhatsApp." />
            </div>

            {subSource === 'manual' && !subProfId && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                Como não foi selecionado um professor cadastrado, este substituto será adicionado automaticamente ao
                <strong> Banco de Talentos</strong> ao confirmar.
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2 border-t">
              {confirmHint && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                  {confirmHint}
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button onClick={handleConfirmSubstitute} disabled={rhReturn.isPending || !canConfirm}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Confirmar substituto
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Etapa 4 — coordenação informa escola */}
      {!cancelled && r.status === 'returned_to_coordinator' && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <div className="text-sm font-medium mb-1">Substituto indicado pelo R.H.</div>
              <div className="bg-muted rounded p-3 text-sm grid grid-cols-1 md:grid-cols-3 gap-2">
                <div><span className="text-xs text-muted-foreground">Nome:</span> {r.substitute_professor_name || '—'}</div>
                <div><span className="text-xs text-muted-foreground">CPF:</span> {r.substitute_professor_cpf || '—'}</div>
                <div><span className="text-xs text-muted-foreground">RG:</span> {r.substitute_professor_rg || '—'}</div>
              </div>
              {r.return_notes && (
                <div className="text-xs italic mt-2">Notas do R.H.: "{r.return_notes}"</div>
              )}
            </div>

            {isCoord && (
              <>
                <div className="text-sm font-medium pt-2 border-t">Informar escola e finalizar</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Canal usado *</Label>
                    <Select value={channel} onValueChange={setChannel}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Destinatário (escola)</Label>
                    <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Diretor, coordenador…" />
                  </div>
                </div>
                <div>
                  <Label>Texto da mensagem enviada <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)}
                    placeholder="Cole aqui o texto enviado à escola (não obrigatório)." />
                </div>
                <div>
                  <Label>Comprovação — print/PDF <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Input type="file" accept=".pdf,image/png,image/jpeg"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
                  {proofFile && <div className="text-xs text-muted-foreground mt-1">{proofFile.name}</div>}
                </div>

                <div className="flex flex-wrap gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={handleReturnToRh}>
                    <RotateCcw className="h-4 w-4 mr-2" /> Devolver ao R.H.
                  </Button>
                  <Button onClick={handleNotify} disabled={notify.isPending || uploading}>
                    <School className="h-4 w-4 mr-2" /> Confirmar comunicação e finalizar
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Finalizada (após coord. informar escola) */}
      {finalized && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-medium">Comunicação à escola concluída</span>
              <Badge className="bg-green-100 text-green-900" variant="secondary">Etapa 4 ✓</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm pt-2">
              <div><span className="text-xs text-muted-foreground">Canal:</span> {r.school_notification_channel || '—'}</div>
              <div><span className="text-xs text-muted-foreground">Destinatário:</span> {r.school_notification_recipient || '—'}</div>
              <div><span className="text-xs text-muted-foreground">Comunicado em:</span> {r.school_notified_at ? new Date(r.school_notified_at).toLocaleString('pt-BR') : '—'}</div>
              <div><span className="text-xs text-muted-foreground">Substituto:</span> {r.substitute_professor_name || '—'}</div>
            </div>
            {r.school_notification_message && (
              <div className="bg-muted rounded p-2 text-xs whitespace-pre-wrap mt-2">
                <div className="font-medium mb-1">Mensagem enviada:</div>
                {r.school_notification_message}
              </div>
            )}
            {r.school_notification_proof_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={r.school_notification_proof_url} target="_blank" rel="noreferrer">
                  <Upload className="h-4 w-4 mr-2" /> Ver comprovação
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Etapa 5 — Confirmar execução real (após o dia da aula) */}
      {!cancelled && finalized && (isCoord || isRhStrict) && (
        <Card className="border-blue-200">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-blue-50 text-blue-900 border-blue-200">Etapa 5</Badge>
              <div className="text-sm font-semibold">Confirmar execução da substituição</div>
            </div>
            <div className="text-xs text-muted-foreground">
              Confirme que o professor substituto realmente ministrou a aula no dia {new Date(r.absence_date + 'T00:00').toLocaleDateString('pt-BR')}. Isso libera as etapas de relatório e pagamento.
            </div>
            <div className="flex justify-end">
              <Button onClick={handleConfirmExecution} disabled={confirmExec.isPending}>
                <PlayCircle className="h-4 w-4 mr-2" /> Confirmar execução
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Etapa 6 — Relatório assinado (após execução) */}
      {!cancelled && isExecConfirmed && !isReportReady && (
        <Card className="border-cyan-200">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-cyan-50 text-cyan-900 border-cyan-200">Etapa 6</Badge>
              <div className="text-sm font-semibold">Anexar relatório assinado</div>
            </div>
            <div className="text-xs text-muted-foreground">
              Gere a declaração e anexe o relatório assinado pelo substituto/escola na aba <strong>Documentos</strong>. Status atual: <code className="bg-muted px-1 rounded">{r.status}</code>.
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => onGoToDocuments?.()} disabled={!onGoToDocuments}>
                <FileText className="h-4 w-4 mr-2" /> Ir para Documentos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Etapa 7 — R.H. valida e encaminha ao Financeiro */}
      {!cancelled && isRhStrict && ['signed_report_uploaded','pending_rh_validation'].includes(r.status) && (
        <Card className="border-emerald-200">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-900 border-emerald-200">Etapa 7</Badge>
              <div className="text-sm font-semibold">Validar documentação e encaminhar ao Financeiro</div>
            </div>
            <div className="text-xs text-muted-foreground">
              Revise o relatório assinado e demais documentos na aba <strong>Documentos</strong>. Ao encaminhar, o Financeiro poderá processar o pagamento.
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={handleReturnForCorrection} disabled={returnFix.isPending}>
                <RotateCcw className="h-4 w-4 mr-2" /> Devolver para correção
              </Button>
              <Button onClick={handleApproveFinancial} disabled={approveFin.isPending}>
                <Send className="h-4 w-4 mr-2" /> Encaminhar ao Financeiro
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Etapa 7 — visão somente leitura para coord/sem permissão */}
      {!cancelled && !isRhStrict && ['signed_report_uploaded','pending_rh_validation'].includes(r.status) && (
        <Card>
          <CardContent className="p-4 text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            Aguardando R.H. validar a documentação e encaminhar ao Financeiro.
          </CardContent>
        </Card>
      )}

      {/* Etapa 8 — Status financeiro (informativo) */}
      {!cancelled && isApprovedFin && (
        <Card className={isPaid ? 'border-green-300 bg-green-50/40' : 'border-emerald-200'}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={isPaid ? 'bg-green-100 text-green-900 border-green-200' : 'bg-emerald-50 text-emerald-900 border-emerald-200'}>
                Etapa 8 {isPaid ? '✓' : ''}
              </Badge>
              <div className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {isPaid
                  ? 'Pagamento concluído'
                  : r.status === 'payment_pending'
                    ? 'Pagamento agendado'
                    : 'Encaminhada ao Financeiro'}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {isPaid
                ? 'Fluxo encerrado. Substituição totalmente concluída.'
                : 'O Financeiro está processando o pagamento. Acompanhe pelo painel restrito.'}
            </div>
            {hasFinancialAccess && (
              <div className="flex justify-end">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/presenca-professores/substituicao/financeiro">
                    <DollarSign className="h-4 w-4 mr-2" /> Abrir Financeiro
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Nota informativa quando concluído */}
      {!cancelled && finalized && !isPostExec && !isCoord && !isRhStrict && (
        <Card>
          <CardContent className="p-4 text-xs text-muted-foreground">
            O fluxo operacional está concluído. As etapas 5 a 8 (execução, relatório, validação e pagamento) seguem com a coordenação, R.H. e Financeiro.
          </CardContent>
        </Card>
      )}
    </div>

    <ApprovePaymentDialog open={approveOpen} onOpenChange={setApproveOpen} requestId={r.id} organizationId={r.organization_id} />
    <ReturnForCorrectionDialog open={returnOpen} onOpenChange={setReturnOpen} requestId={r.id} organizationId={r.organization_id} />
    <ReasonDialog
      open={returnRhOpen} onOpenChange={setReturnRhOpen}
      title="Devolver ao R.H." label="Motivo da devolução ao R.H. *"
      confirmLabel="Devolver" isPending={coordReturnToRh.isPending}
      onConfirm={async (reason) => {
        await coordReturnToRh.mutateAsync({ id: r.id, reason });
        toast({ title: 'Devolvida ao R.H.' });
      }}
    />
    </>
  );
}


function Step({ done, active, label, meta }: { done: boolean; active?: boolean; label: string; meta?: string }) {
  const cls = done
    ? 'bg-green-100 text-green-900 border-green-200'
    : active
      ? 'bg-blue-100 text-blue-900 border-blue-200'
      : 'bg-muted text-muted-foreground border-border';
  return (
    <li className={`px-2.5 py-1.5 rounded border ${cls}`}>
      <div className="font-medium">{label}</div>
      {meta && <div className="text-[10px] opacity-80">{meta}</div>}
    </li>
  );
}
