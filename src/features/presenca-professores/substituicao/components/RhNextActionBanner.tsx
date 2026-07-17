import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, Clock, FileCheck2, XCircle, CheckCircle2,
  Paperclip, Ticket, History, User, FileDown, ShieldCheck, Banknote, Upload, PlayCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useBranding } from '@/hooks/useBranding';
import { TSRRequest, useTSRRhTake } from '../hooks/useTeacherSubstitution';
import { generateSubstitutionReportPdf } from '../utils/substitutionReportPdf';
import { useHasFinancialAccess } from './FinancialAccessGuard';

type Tone = 'amber' | 'blue' | 'purple' | 'green' | 'rose' | 'slate';

const TONE: Record<Tone, { bg: string; border: string; icon: string; chip: string }> = {
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-300',  icon: 'bg-amber-500 text-white',  chip: 'bg-amber-100 text-amber-900 border-amber-200' },
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-300',   icon: 'bg-blue-600 text-white',   chip: 'bg-blue-100 text-blue-900 border-blue-200' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-300', icon: 'bg-purple-600 text-white', chip: 'bg-purple-100 text-purple-900 border-purple-200' },
  green:  { bg: 'bg-green-50',  border: 'border-green-300',  icon: 'bg-green-600 text-white',  chip: 'bg-green-100 text-green-900 border-green-200' },
  rose:   { bg: 'bg-rose-50',   border: 'border-rose-300',   icon: 'bg-rose-600 text-white',   chip: 'bg-rose-100 text-rose-900 border-rose-200' },
  slate:  { bg: 'bg-slate-50',  border: 'border-slate-300',  icon: 'bg-slate-600 text-white',  chip: 'bg-slate-100 text-slate-900 border-slate-200' },
};

interface Props {
  request: TSRRequest;
  isRhStrict: boolean;
  onGoToDocuments: () => void;
  onGoToHistory: () => void;
}

export function RhNextActionBanner({ request: r, isRhStrict, onGoToDocuments, onGoToHistory }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const take = useTSRRhTake();
  const { branding } = useBranding();
  const hasFinancialAccess = useHasFinancialAccess();
  const [pdfBusy, setPdfBusy] = useState(false);

  const hasAttachments = Array.isArray((r as any).absence_attachments) && (r as any).absence_attachments.length > 0;

  async function handleDownloadPdf() {
    try {
      setPdfBusy(true);
      await generateSubstitutionReportPdf({ request: r, includeFinancials: hasFinancialAccess, branding });
    } catch (e: any) {
      toast({ title: 'Falha ao gerar PDF', description: e?.message, variant: 'destructive' });
    } finally {
      setPdfBusy(false);
    }
  }

  function openTicket() {
    const params = new URLSearchParams({
      type: 'interno',
      assignRh: '1',
      title: `Substituição ${r.substitution_code} — acompanhamento`,
      description:
        `Acompanhamento de ${r.substitution_code}.\n\n` +
        `- Professor: ${r.substituted_professor_name}\n` +
        `- Data: ${new Date(r.absence_date + 'T00:00').toLocaleDateString('pt-BR')}\n` +
        `- Escola: ${r.school_name_snapshot || '—'}\n` +
        `- Curso/Turma: ${r.course_name_snapshot || '—'} / ${r.class_group_name_snapshot || '—'}\n` +
        `- Disciplina: ${r.subject_name_snapshot || '—'}\n` +
        `- Motivo: ${r.absence_reason}`,
      tsrId: r.id,
      tsrCode: r.substitution_code,
    });
    if (r.school_id) params.set('schoolId', r.school_id);
    navigate(`/tickets/novo?${params.toString()}`);
  }

  function scrollToAction() {
    const el = document.getElementById('rh-action-form');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('ring-2', 'ring-blue-400');
      setTimeout(() => el.classList.remove('ring-2', 'ring-blue-400'), 1600);
    }
  }

  async function handleTake() {
    try {
      await take.mutateAsync(r.id);
      toast({ title: 'Atendimento assumido' });
      setTimeout(scrollToAction, 250);
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falhou', variant: 'destructive' });
    }
  }

  // Decide tone + content
  let tone: Tone = 'slate';
  let Icon = Clock;
  let pill = '';
  let title = '';
  let subtitle = '';
  let primary: { label: string; onClick: () => void; icon: any; disabled?: boolean } | null = null;
  const secondary: { label: string; onClick: () => void; icon: any }[] = [];

  switch (r.status) {
    case 'request_created':
      tone = 'amber';
      Icon = UserPlus;
      pill = 'Sua vez — R.H.';
      title = isRhStrict ? 'Assumir o atendimento desta substituição' : 'Aguardando o R.H. assumir';
      subtitle = 'Após assumir, indique o professor substituto e devolva à coordenação.';
      if (isRhStrict) {
        primary = { label: 'Assumir agora', onClick: handleTake, icon: UserPlus, disabled: take.isPending };
      }
      break;

    case 'rh_in_progress':
      tone = 'blue';
      Icon = CheckCircle2;
      pill = 'Sua vez — R.H.';
      title = 'Confirmar substituto e devolver à coordenação';
      subtitle = 'Selecione professor cadastrado, do Banco de Talentos, ou cadastre manualmente. Ao confirmar, a solicitação volta para a coordenação.';
      if (isRhStrict) {
        primary = { label: 'Confirmar substituto', onClick: scrollToAction, icon: CheckCircle2 };
      }
      break;


    case 'returned_to_coordinator':
      tone = 'purple';
      Icon = Clock;
      pill = 'Coordenação';
      title = 'Aguardando coordenação informar a escola';
      subtitle = `Substituto indicado: ${r.substitute_professor_name || '—'}.`;
      break;

    case 'substitution_completed':
      tone = 'blue';
      Icon = PlayCircle;
      pill = 'Pós-finalização';
      title = 'Substituição finalizada — aguardando confirmação de execução';
      subtitle = 'Coordenação/RH precisa confirmar que a aula foi efetivamente ministrada para liberar a etapa de relatório.';
      primary = { label: 'Ver documentos', onClick: onGoToDocuments, icon: FileCheck2 };
      break;

    case 'in_execution':
      tone = 'blue';
      Icon = PlayCircle;
      pill = 'Em execução';
      title = 'Aguardando conclusão da execução';
      subtitle = 'Após a aula ocorrer, confirme execução para liberar o relatório.';
      primary = { label: 'Ver documentos', onClick: onGoToDocuments, icon: FileCheck2 };
      break;

    case 'execution_completed':
    case 'signed_report_pending':
      tone = 'blue';
      Icon = Upload;
      pill = 'Sua vez — R.H.';
      title = 'Anexar relatório assinado';
      subtitle = 'Gere a declaração, colete a assinatura e faça o upload do PDF assinado.';
      if (isRhStrict) {
        primary = { label: 'Anexar relatório', onClick: onGoToDocuments, icon: Upload };
      }
      break;

    case 'signed_report_uploaded':
    case 'pending_rh_validation':
      tone = 'purple';
      Icon = ShieldCheck;
      pill = 'Sua vez — R.H.';
      title = 'Validar relatório e encaminhar ao Financeiro';
      subtitle = 'Revise o documento assinado e aprove para pagamento.';
      if (isRhStrict) {
        primary = { label: 'Validar e encaminhar', onClick: onGoToDocuments, icon: ShieldCheck };
      }
      break;

    case 'approved_for_payment':
      tone = 'green';
      Icon = Banknote;
      pill = 'Financeiro';
      title = 'Encaminhada ao Financeiro';
      subtitle = 'Aguardando agendamento e confirmação do pagamento.';
      primary = { label: 'Ver documentos', onClick: onGoToDocuments, icon: FileCheck2 };
      break;

    case 'payment_pending':
      tone = 'green';
      Icon = Banknote;
      pill = 'Financeiro';
      title = 'Pagamento agendado';
      subtitle = 'Aguardando confirmação do pagamento pelo Financeiro.';
      break;

    case 'payment_completed':
      tone = 'green';
      Icon = FileCheck2;
      pill = 'Concluída';
      title = 'Pagamento concluído';
      subtitle = 'Fluxo de substituição encerrado integralmente.';
      primary = { label: 'Ver documentos', onClick: onGoToDocuments, icon: FileCheck2 };
      break;

    case 'cancelled':
      tone = 'rose';
      Icon = XCircle;
      pill = 'Cancelada';
      title = 'Substituição cancelada';
      subtitle = r.cancel_reason ? `Motivo: ${r.cancel_reason}` : 'Sem motivo registrado.';
      break;

    default:
      tone = 'slate';
      Icon = CheckCircle2;
      pill = (r.status as string).replace(/_/g, ' ');
      title = 'Acompanhamento';
      subtitle = 'Veja o fluxo operacional abaixo.';
  }

  // Atalhos comuns
  if (hasAttachments) secondary.push({ label: 'Ver atestado', onClick: onGoToDocuments, icon: Paperclip });
  secondary.push({ label: 'Abrir ticket', onClick: openTicket, icon: Ticket });
  if (r.substituted_professor_id) {
    secondary.push({
      label: 'Professor ausente',
      onClick: () => navigate(`/professores/${r.substituted_professor_id}`),
      icon: User,
    });
  }
  secondary.push({ label: 'Histórico', onClick: onGoToHistory, icon: History });
  if (r.status !== 'request_created' && r.status !== 'cancelled') {
    secondary.push({ label: pdfBusy ? 'Gerando…' : 'Baixar PDF', onClick: handleDownloadPdf, icon: FileDown });
  }

  const t = TONE[tone];

  return (
    <div className={`rounded-lg border-2 ${t.bg} ${t.border} p-4 md:p-5`}>
      <div className="flex items-start gap-4 flex-wrap md:flex-nowrap">
        <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${t.icon}`}>
          <Icon className="h-6 w-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={`${t.chip} font-semibold`}>{pill}</Badge>
            <Badge variant="outline" className="font-mono text-xs">{r.substitution_code}</Badge>
          </div>
          <div className="text-base md:text-lg font-semibold leading-snug">{title}</div>
          <div className="text-sm text-muted-foreground mt-0.5">{subtitle}</div>

          <div className="text-xs text-foreground/80 mt-2 flex flex-wrap gap-x-3 gap-y-1">
            <span><strong>{r.substituted_professor_name}</strong></span>
            <span>·</span>
            <span>{r.school_name_snapshot || '—'}</span>
            <span>·</span>
            <span>{r.subject_name_snapshot || r.class_group_name_snapshot || '—'}</span>
            <span>·</span>
            <span>{new Date(r.absence_date + 'T00:00').toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        {primary && (
          <Button size="lg" onClick={primary.onClick} disabled={primary.disabled} className="shrink-0">
            <primary.icon className="h-4 w-4 mr-2" />
            {primary.label}
          </Button>
        )}
      </div>

      {secondary.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-current/10">
          {secondary.map((s, i) => (
            <Button key={i} variant="outline" size="sm" onClick={s.onClick} className="bg-white/60">
              <s.icon className="h-3.5 w-3.5 mr-1.5" />
              {s.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
