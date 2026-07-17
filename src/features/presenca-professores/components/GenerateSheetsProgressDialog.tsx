import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw,
  PlusCircle, SkipForward, CalendarX, Lightbulb,
} from 'lucide-react';
import { substitutionApi } from '@/features/presenca-professores/substituicao/api';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

const STEPS = [
  'Identificando professores ativos com aulas no mês…',
  'Lendo Grade Horária e ocorrências do período…',
  'Verificando folhas já existentes (não serão sobrescritas)…',
  'Gerando folhas de presença pendentes…',
  'Recalculando carga horária, faltas e divergências…',
  'Finalizando e registrando auditoria…',
];

type BatchResult = {
  ok: boolean;
  created: number;
  updated: number;
  skipped: number;
  out_of_semester?: number;
  semester?: string | null;
  errors: Array<{ professor_id: string; error: string }>;
};

interface ErrorInfo {
  title: string;
  description: string;
  resolution: string;
}

function describeError(raw: string): ErrorInfo {
  const code = (raw || '').trim();
  if (code === 'no_active_schedule' || /no_active_schedule/i.test(code)) {
    return {
      title: 'Sem grade horária ativa',
      description: 'O professor não possui grade horária ACTIVE para este mês.',
      resolution: 'Vá em Grade Horária, verifique o vínculo Escola × Curso × Professor e ative/gere a grade para o período antes de gerar a folha.',
    };
  }
  if (/permission_denied/i.test(code)) {
    return {
      title: 'Permissão negada',
      description: 'Seu perfil não pode gerar folhas em lote.',
      resolution: 'Apenas Admin ou R.H. podem executar a geração em lote. Solicite o acesso ou peça para um Admin executar.',
    };
  }
  if (/closed|approved_by_rh/i.test(code)) {
    return {
      title: 'Folha já fechada/aprovada',
      description: 'A folha existente está fechada ou aprovada pelo R.H. e não pode ser sobrescrita.',
      resolution: 'Se realmente precisar regenerar, peça ao R.H. para reabrir a folha em "Detalhes da Folha".',
    };
  }
  if (/null value|not[- ]null|violates/i.test(code)) {
    return {
      title: 'Dados inconsistentes na Grade',
      description: 'Algum vínculo obrigatório (turma, disciplina, escola, professor) está ausente para este professor.',
      resolution: 'Abra a Grade Horária do professor e confirme que todos os slots têm turma, disciplina e horário válidos.',
    };
  }
  if (/timeout|deadlock|canceling statement/i.test(code)) {
    return {
      title: 'Tempo esgotado',
      description: 'O servidor demorou demais para processar este professor.',
      resolution: 'Tente novamente; se persistir, gere por escola (com filtro) ou individualmente.',
    };
  }
  return {
    title: 'Erro inesperado',
    description: code || 'Erro desconhecido retornado pelo servidor.',
    resolution: 'Tente novamente. Se o problema persistir, copie a mensagem técnica e contate o suporte.',
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number;
  schoolId: string | null;
  schoolName?: string | null;
  bimester?: number | null;
  confirmHint?: React.ReactNode;
}

export function GenerateSheetsProgressDialog({
  open, onOpenChange, year, month, schoolId, schoolName, bimester, confirmHint,
}: Props) {
  const { organizationId } = useOrganization();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [phase, setPhase] = useState<'confirm' | 'processing' | 'done'>('confirm');
  const [stepIdx, setStepIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [professorNames, setProfessorNames] = useState<Record<string, string>>({});

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setPhase('confirm');
      setStepIdx(0);
      setElapsed(0);
      setResult(null);
      setErrMsg(null);
      setProfessorNames({});
    }
  }, [open]);

  // Animate steps + elapsed timer while processing
  useEffect(() => {
    if (phase !== 'processing') return;
    const stepT = setInterval(() => {
      setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
    }, 1400);
    const sT = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { clearInterval(stepT); clearInterval(sT); };
  }, [phase]);

  // Look up professor names for any errors
  useEffect(() => {
    if (phase !== 'done' || !result || !result.errors?.length || !organizationId) return;
    const ids = Array.from(new Set(result.errors.map((e) => e.professor_id).filter(Boolean)));
    if (!ids.length) return;
    (async () => {
      const { data } = await supabase
        .from('professors')
        .select('id, nome_completo')
        .in('id', ids as string[]);
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => { map[p.id] = p.nome_completo; });
      setProfessorNames(map);
    })();
  }, [phase, result, organizationId]);

  async function runBatch() {
    if (!organizationId) return;
    setPhase('processing');
    setStepIdx(0);
    setElapsed(0);
    try {
      const { data, error } = await supabase.rpc(
        'generate_teacher_attendance_monthly_sheets_batch',
        {
          p_organization_id: organizationId,
          p_reference_year: year,
          p_reference_month: month,
          p_school_id: schoolId ?? null,
          p_professor_ids: null,
        },
      );
      if (error) throw error;
      const res = data as BatchResult;
      setResult(res);
      setPhase('done');
      qc.invalidateQueries({ queryKey: ['teacher-attendance-sheets'] });
      qc.invalidateQueries({ queryKey: ['teacher-attendance-kpis'] });
      const totalProcessed = (res.created || 0) + (res.updated || 0);
      toast({
        title: 'Geração concluída',
        description: `${totalProcessed} folha(s) processada(s) · ${res.skipped || 0} ignorada(s) · ${res.errors?.length || 0} erro(s).`,
      });
    } catch (e: any) {
      setErrMsg(e?.message || 'Falha desconhecida.');
      setPhase('done');
      toast({ title: 'Falha na geração', description: e?.message, variant: 'destructive' });
    }
  }

  const semLabel = result?.semester === 'FIRST' ? '1º semestre'
    : result?.semester === 'SECOND' ? '2º semestre' : null;

  const totalDone = (result?.created || 0) + (result?.updated || 0);
  const totalAll = totalDone + (result?.skipped || 0) + (result?.out_of_semester || 0) + (result?.errors?.length || 0);
  const errorsCount = result?.errors?.length || 0;

  const errors = useMemo(() => (result?.errors || []).map((e) => ({
    ...e,
    info: describeError(e.error),
    name: professorNames[e.professor_id] || `Professor ${e.professor_id.slice(0, 8)}…`,
  })), [result, professorNames]);

  function close() {
    if (phase === 'processing') return; // bloquear fechamento durante processamento
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); else onOpenChange(o); }}>
      <DialogContent
        className="max-w-2xl"
        onPointerDownOutside={(e) => { if (phase === 'processing') e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (phase === 'processing') e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle>
            {phase === 'confirm' && 'Gerar folhas do mês?'}
            {phase === 'processing' && 'Processando folhas…'}
            {phase === 'done' && (errMsg ? 'Falha na geração' : 'Geração concluída')}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-muted-foreground">
              {phase === 'confirm' && (
                <span>
                  Serão criadas/atualizadas as folhas de presença de{' '}
                  <strong>{MONTHS[month - 1]}/{year}</strong>
                  {bimester ? ` (${bimester}º bimestre)` : ''}{' '}
                  {schoolId ? <>para <strong>{schoolName || 'a escola selecionada'}</strong></> : 'de todos os professores ativos'}.
                </span>
              )}
              {phase === 'processing' && (
                <span>Mantenha esta janela aberta. Isso pode levar de alguns segundos a alguns minutos dependendo do volume.</span>
              )}
              {phase === 'done' && !errMsg && (
                <span>Resumo do processamento de <strong>{MONTHS[month - 1]}/{year}</strong>{semLabel ? ` · ${semLabel}` : ''}.</span>
              )}
              {phase === 'done' && errMsg && (
                <span>Não foi possível concluir a geração. Veja os detalhes abaixo.</span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        {phase === 'confirm' && (
          <div className="space-y-3 text-sm">
            {confirmHint}
            <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
              As aulas vêm da Grade Horária respeitando o semestre do mês (disciplinas anuais entram sempre).
              Folhas já fechadas ou aprovadas pelo R.H. não serão alteradas.
            </div>
          </div>
        )}

        {phase === 'processing' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-md border bg-amber-50/60 border-amber-200 p-3 text-sm text-amber-900">
              <Loader2 className="h-5 w-5 animate-spin" />
              <div className="flex-1">
                <div className="font-medium">{STEPS[stepIdx]}</div>
                <div className="text-xs text-amber-800/80">Decorrido: {elapsed}s</div>
              </div>
            </div>
            <Progress value={((stepIdx + 1) / STEPS.length) * 90} />
            <ul className="space-y-1.5 text-xs">
              {STEPS.map((s, i) => (
                <li key={s} className="flex items-center gap-2">
                  {i < stepIdx ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : i === stepIdx ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 ml-1" />
                  )}
                  <span className={i <= stepIdx ? 'text-foreground' : 'text-muted-foreground'}>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {phase === 'done' && !errMsg && result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatTile icon={<PlusCircle className="h-4 w-4" />} label="Criadas" value={result.created} tone="success" />
              <StatTile icon={<RefreshCw className="h-4 w-4" />} label="Atualizadas" value={result.updated} tone="info" />
              <StatTile icon={<SkipForward className="h-4 w-4" />} label="Ignoradas" value={result.skipped} tone="muted" />
              <StatTile
                icon={<CalendarX className="h-4 w-4" />}
                label="Fora do semestre"
                value={result.out_of_semester || 0}
                tone="warn"
              />
            </div>

            <div className="rounded-md border p-3 text-sm flex items-start gap-2 bg-muted/30">
              <Lightbulb className="h-4 w-4 mt-0.5 text-amber-600" />
              <div>
                <strong>{totalDone}</strong> folha(s) processada(s) de <strong>{totalAll}</strong> elegíveis.
                {result.skipped > 0 && <> Ignoradas: já existiam (regenere individualmente se necessário).</>}
                {(result.out_of_semester || 0) > 0 && <> "Fora do semestre" = sem grade ativa para o período.</>}
              </div>
            </div>

            {errorsCount > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-rose-700">
                  <AlertTriangle className="h-4 w-4" />
                  Erros ({errorsCount})
                </div>
                <ScrollArea className="max-h-[40vh] pr-2">
                  <ul className="space-y-2">
                    {errors.map((e, i) => (
                      <li key={i} className="rounded-md border border-rose-200 bg-rose-50/50 p-3 text-sm">
                        <div className="font-medium text-rose-950">{e.name}</div>
                        <div className="mt-1 text-xs text-rose-900">
                          <span className="font-semibold">{e.info.title}: </span>{e.info.description}
                        </div>
                        <div className="mt-2 flex items-start gap-1.5 rounded bg-white/60 border border-rose-200 p-2 text-xs text-rose-900">
                          <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span><strong>Como resolver: </strong>{e.info.resolution}</span>
                        </div>
                        <details className="mt-1.5 text-[11px] text-rose-800/80">
                          <summary className="cursor-pointer">Detalhes técnicos</summary>
                          <pre className="mt-1 whitespace-pre-wrap break-words font-mono">{e.error}</pre>
                        </details>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            ) : (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Nenhum erro encontrado. Tudo certo!
              </div>
            )}
          </div>
        )}

        {phase === 'done' && errMsg && (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm space-y-2">
            <div className="flex items-center gap-2 font-semibold text-rose-800">
              <AlertCircle className="h-4 w-4" />
              {describeError(errMsg).title}
            </div>
            <div className="text-rose-900">{describeError(errMsg).description}</div>
            <div className="flex items-start gap-1.5 rounded bg-white/60 border border-rose-200 p-2 text-xs text-rose-900">
              <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span><strong>Como resolver: </strong>{describeError(errMsg).resolution}</span>
            </div>
            <details className="text-[11px] text-rose-800/80">
              <summary className="cursor-pointer">Detalhes técnicos</summary>
              <pre className="mt-1 whitespace-pre-wrap break-words font-mono">{errMsg}</pre>
            </details>
          </div>
        )}

        <DialogFooter className="gap-2">
          {phase === 'confirm' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={runBatch}>Gerar agora</Button>
            </>
          )}
          {phase === 'processing' && (
            <Button variant="outline" disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processando…
            </Button>
          )}
          {phase === 'done' && (
            <>
              {!errMsg && errorsCount > 0 && (
                <Button variant="outline" onClick={runBatch}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente
                </Button>
              )}
              {errMsg && (
                <Button variant="outline" onClick={runBatch}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente
                </Button>
              )}
              <Button onClick={() => onOpenChange(false)}>Fechar</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatTile({
  icon, label, value, tone,
}: { icon: React.ReactNode; label: string; value: number; tone: 'success' | 'info' | 'warn' | 'muted' }) {
  const toneCls: Record<string, string> = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    info: 'border-blue-200 bg-blue-50 text-blue-900',
    warn: 'border-amber-200 bg-amber-50 text-amber-900',
    muted: 'border-muted bg-muted/40 text-foreground',
  };
  return (
    <div className={`rounded-md border p-3 ${toneCls[tone]}`}>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide opacity-80">
        {icon}{label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
