import { Loader2, CheckCircle2, AlertTriangle, CalendarCheck, ExternalLink } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export type MaterializeResult = {
  classes_upserted?: number;
  slots_upserted?: number;
  models_upserted?: number;
  aulas_ignoradas?: number;
  occurrences_created?: number;
  planning_created?: number;
  planning_deficit?: number;
  planning_breakdown?: Array<{
    professor_id: string;
    professor_nome: string;
    target: number;
    created: number;
    skipped_reason: string | null;
  }>;
  bindings_upserted?: number;
  bindings_deactivated?: number;
  notifications_sent?: number;
  motivos?: Array<{ indication_id?: string; reason?: string; [k: string]: any }>;
  ano_letivo?: string;
  materialized_at?: string;
};

export type PrePlanStatus =
  | { state: 'idle' }
  | { state: 'pending'; total: number }
  | { state: 'done'; created: number; skipped: number; ok: number; fail: number; total: number }
  | { state: 'error'; message: string };

function formatMotivoReason(m: { reason?: string; [k: string]: any }) {
  const reason = String(m.reason ?? JSON.stringify(m));
  const lower = reason.toLowerCase();
  if (lower.includes('duplicate key') && lower.includes('uniq_wtm_class_slot')) {
    return 'Aula duplicada ignorada — já existe aula ativa para esta turma, disciplina, dia e tempo.';
  }
  return reason;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alreadyMaterialized: boolean;
  schoolName: string;
  result: MaterializeResult | null;
  prePlan: PrePlanStatus;
  onViewGrade?: () => void;
}

function Kpi({ label, value, hint, tone = 'default' }: { label: string; value: number | string; hint?: string; tone?: 'default' | 'warning' | 'success' }) {
  const toneClass =
    tone === 'warning' ? 'text-amber-700'
    : tone === 'success' ? 'text-emerald-700'
    : 'text-[#1B1E2C]';
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${toneClass}`} style={{ fontFamily: 'Sora, system-ui, sans-serif' }}>
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-[11px] leading-snug text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}

export function GradeResultDialog({
  open, onOpenChange, alreadyMaterialized, schoolName, result, prePlan, onViewGrade,
}: Props) {
  if (!result) return null;
  const title = alreadyMaterialized ? 'Grade horária atualizada' : 'Grade horária gerada';
  const motivos = Array.isArray(result.motivos) ? result.motivos : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1B1E2C]" style={{ fontFamily: 'Sora, system-ui, sans-serif' }}>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#FFDA45]">
              <CheckCircle2 className="h-5 w-5 text-[#1B1E2C]" />
            </span>
            {title}
          </DialogTitle>
          <DialogDescription>
            {schoolName}{result.ano_letivo ? ` · Ano letivo ${result.ano_letivo}` : ''}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-5">
            {/* Resumo */}
            <div>
              <div className="mb-2 text-sm font-semibold text-[#1B1E2C]">Resumo</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Kpi label="Turmas" value={result.classes_upserted ?? 0} hint="Turmas criadas ou reaproveitadas no ano letivo." />
                <Kpi label="Horários" value={result.slots_upserted ?? 0} hint="Blocos de horário (dia × intervalo) usados na grade da escola." />
                <Kpi label="Aulas (CLASS)" value={result.models_upserted ?? 0} hint="Aulas semanais alocadas: turma × disciplina × professor × horário." />
                <Kpi label="Planejamentos (PL)" value={result.planning_created ?? 0} hint="Horas de planejamento (HTPC) reservadas — 1 a cada 3 aulas por professor." />
                <Kpi label="Ocorrências anuais" value={result.occurrences_created ?? 0} tone="success" hint="Aulas geradas em datas reais do calendário letivo a partir da grade semanal." />
                <Kpi label="Vínculos Prof×Curso" value={result.bindings_upserted ?? 0} hint="Vínculos ativos professor↔curso↔escola após a geração." />
                {(result.bindings_deactivated ?? 0) > 0 && (
                  <Kpi label="Vínculos desativados" value={result.bindings_deactivated ?? 0} tone="warning" hint="Vínculos antigos que deixaram de ter aulas e foram desativados automaticamente." />
                )}
                {(result.notifications_sent ?? 0) > 0 && (
                  <Kpi label="Notificações" value={result.notifications_sent ?? 0} hint="Avisos enviados aos professores sobre suas novas aulas." />
                )}
                {(result.aulas_ignoradas ?? 0) > 0 && (
                  <Kpi label="Aulas ignoradas" value={result.aulas_ignoradas ?? 0} tone="warning" hint="Indicações que não puderam virar aula (ver detalhes nos Avisos)." />
                )}
              </div>
            </div>

            {/* Avisos */}
            {((result.planning_deficit ?? 0) > 0 || motivos.length > 0) && (
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <AlertTriangle className="h-4 w-4" /> Avisos
                </div>
                <div className="space-y-2">
                  {(result.planning_deficit ?? 0) > 0 && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      {result.planning_deficit} planejamento(s) (PL 1/3 CH) não puderam ser alocados — não havia horário livre.
                    </div>
                  )}
                  {motivos.length > 0 && (
                    <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                      <div className="mb-1 font-medium">Motivos/avisos das indicações ignoradas</div>
                      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                        {motivos.slice(0, 20).map((m, i) => (
                          <li key={i}>{formatMotivoReason(m)}</li>
                        ))}
                        {motivos.length > 20 && <li>… e mais {motivos.length - 20}</li>}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Quebra de PL por professor (auditoria) */}
            {Array.isArray(result.planning_breakdown) && result.planning_breakdown.length > 0 && (
              <div>
                <div className="mb-2 text-sm font-semibold text-[#1B1E2C]">Planejamentos (PL) por professor</div>
                <div className="rounded-md border bg-card divide-y text-sm">
                  {result.planning_breakdown.map((p) => (
                    <div key={p.professor_id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="font-medium text-[#1B1E2C] truncate">{p.professor_nome}</span>
                      <span className="flex items-center gap-2 shrink-0 tabular-nums text-xs">
                        <Badge variant={p.created >= p.target ? 'default' : 'secondary'} className={p.created >= p.target ? 'bg-emerald-600 hover:bg-emerald-600' : ''}>
                          {p.created} / {p.target} PL
                        </Badge>
                        {p.skipped_reason && (
                          <span className="text-amber-700">{p.skipped_reason}</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Pré-planejamentos */}
            <div>
              <div className="mb-2 text-sm font-semibold text-[#1B1E2C]">Pré-planejamentos pedagógicos</div>
              <div className="rounded-md border bg-card px-3 py-2 text-sm">
                {prePlan.state === 'idle' && (
                  <span className="text-muted-foreground">Nenhum pré-planejamento disparado.</span>
                )}
                {prePlan.state === 'pending' && (
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando pré-planejamentos… ({prePlan.total} curso×bimestre)
                  </span>
                )}
                {prePlan.state === 'done' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-emerald-600 hover:bg-emerald-600">{prePlan.created} criados</Badge>
                    <Badge variant="secondary">{prePlan.ok}/{prePlan.total} processados</Badge>
                    {prePlan.skipped > 0 && <Badge variant="outline">{prePlan.skipped} já existentes</Badge>}
                    {prePlan.fail > 0 && (
                      <Badge variant="destructive">{prePlan.fail} falhas</Badge>
                    )}
                  </div>
                )}
                {prePlan.state === 'error' && (
                  <span className="text-destructive">Falha: {prePlan.message}</span>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          {onViewGrade && (
            <Button variant="outline" onClick={onViewGrade}>
              <ExternalLink className="mr-2 h-4 w-4" /> Ver Grade Horária
            </Button>
          )}
          {(() => {
            const processing = prePlan.state === 'pending';
            return (
              <Button
                onClick={() => onOpenChange(false)}
                disabled={processing}
                className="bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45]/90 disabled:opacity-70 disabled:cursor-not-allowed"
                title={processing ? 'Aguarde a geração dos pré-planejamentos…' : undefined}
              >
                <CalendarCheck className={`mr-2 h-4 w-4 ${processing ? 'animate-spin' : ''}`} />
                {processing ? 'Processando…' : 'Concluir'}
              </Button>
            );
          })()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
