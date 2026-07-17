import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, ArrowRight, UserMinus2, UserPlus2, Move, ExternalLink, ShieldX } from 'lucide-react';
import {
  ConflictItem,
  ConflictAction,
  WEEKDAY_LABEL_PT,
  TURNO_LABEL,
} from '../../lib/conflictTypes';

export type ConflictModalContext = 'external' | 'conferir' | 'admin';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: ConflictItem[];
  context: ConflictModalContext;
  onApplyAction?: (action: ConflictAction, conflict: ConflictItem) => void;
  onDismiss?: () => void;
  /** Texto opcional de cabeçalho (ex.: "Resolva antes de finalizar"). */
  hint?: string;
}

const ACTION_ICON: Record<ConflictAction['type'], typeof UserMinus2> = {
  'change-teacher': UserPlus2,
  'set-no-indication': UserMinus2,
  'move-slot': Move,
  'open-grade': ExternalLink,
  'reject-indication': ShieldX,
};

export function ScheduleConflictModal({
  open,
  onOpenChange,
  conflicts,
  context,
  onApplyAction,
  onDismiss,
  hint,
}: Props) {
  const total = conflicts.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl p-0 overflow-hidden border-rose-300"
        aria-describedby={undefined}
      >
        {/* Header */}
        <DialogHeader className="bg-[#1B1E2C] text-white px-5 py-4 space-y-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/15 ring-2 ring-rose-400/40">
              <AlertTriangle className="h-5 w-5 text-rose-300" />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#FFDA45] font-bold">
                Conflito de horário
              </div>
              <DialogTitle className="text-xl text-white font-bold">
                {total} conflito{total === 1 ? '' : 's'} detectado{total === 1 ? '' : 's'}
              </DialogTitle>
            </div>
          </div>
          <p className="text-[12.5px] text-white/75 leading-snug">
            O mesmo professor não pode estar em duas turmas — ou em duas escolas — no mesmo dia
            e horário. Resolva os conflitos abaixo para poder prosseguir.
            {hint ? <> <span className="text-[#FFDA45] font-semibold">{hint}</span></> : null}
          </p>
        </DialogHeader>

        {/* Conflicts list */}
        <ScrollArea className="max-h-[58vh]">
          <div className="px-5 py-4 space-y-3 bg-[#FAFBFD]">
            {conflicts.map((c) => (
              <ConflictRow
                key={c.key}
                conflict={c}
                context={context}
                onApplyAction={(a) => onApplyAction?.(a, c)}
              />
            ))}
            {total === 0 && (
              <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                Nenhum conflito ativo no momento.
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="px-5 py-3 bg-white border-t border-[#1B1E2C]/10 flex flex-row sm:justify-between gap-2">
          <span className="text-[11px] text-[#1B1E2C]/55 self-center">
            Aulas ANP (não presenciais) são ignoradas na verificação de conflito.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onDismiss?.();
              onOpenChange(false);
            }}
            className="border-[#1B1E2C]/20"
          >
            Resolver depois
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConflictRow({
  conflict,
  context,
  onApplyAction,
}: {
  conflict: ConflictItem;
  context: ConflictModalContext;
  onApplyAction: (a: ConflictAction) => void;
}) {
  const dayLabel = WEEKDAY_LABEL_PT[conflict.weekday] ?? conflict.weekday;

  const isCrossSchool = conflict.kind === 'cross-school'
    || conflict.sides.some((s) => s.isExternalSchool);
  const isCrossTurno = conflict.sameTurno === false;

  return (
    <div className="rounded-lg border border-rose-200 bg-white p-3 sm:p-4 space-y-3 shadow-sm">
      {/* Cabeçalho do conflito */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border border-rose-300 font-bold">
          {dayLabel}
        </Badge>
        <Badge className="bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45] font-mono font-bold">
          {conflict.overlapStart}–{conflict.overlapEnd}
        </Badge>
        {isCrossTurno && (
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 text-[10px] uppercase tracking-wider">
            Cross-turno
          </Badge>
        )}
        {isCrossSchool && (
          <Badge variant="outline" className="border-indigo-300 bg-indigo-50 text-indigo-800 text-[10px] uppercase tracking-wider">
            Outra escola
          </Badge>
        )}
        <span className="text-[12px] font-semibold text-[#1B1E2C] ml-auto">
          {conflict.teacherName}
          {conflict.teacherPhoneMasked && (
            <span className="ml-2 text-[#1B1E2C]/55 font-mono font-normal">
              {conflict.teacherPhoneMasked}
            </span>
          )}
        </span>
      </div>

      {/* Sides */}
      <div className="grid sm:grid-cols-2 gap-2">
        {conflict.sides.map((side, i) => (
          <div
            key={`${conflict.key}-side-${i}`}
            className={`rounded-md border px-3 py-2 text-[12px] ${
              side.isExternalSchool
                ? 'border-indigo-200 bg-indigo-50'
                : 'border-[#1B1E2C]/10 bg-[#FAFBFD]'
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider text-[#1B1E2C]/55 font-bold">
              {side.isExternalSchool ? 'Já alocado em' : 'Alocação'}
            </div>
            <div className="font-semibold text-[#1B1E2C]">
              {side.className || '(sem turma)'}
            </div>
            <div className="text-[#1B1E2C]/65 text-[11.5px] leading-snug">
              {side.subjectName ? <>{side.subjectName} · </> : null}
              {side.schoolName ? <>{side.schoolName} · </> : null}
              {side.turno ? <>{TURNO_LABEL[side.turno]}</> : null}
            </div>
          </div>
        ))}
      </div>

      {/* Why */}
      <div className="text-[11.5px] text-rose-800 bg-rose-50 border border-rose-200 rounded-md px-3 py-2 leading-snug">
        <strong>Por que é problema:</strong> o professor não pode estar simultaneamente
        nas duas alocações acima. {isCrossSchool
          ? 'A outra escola já tem aula confirmada nesse horário; você precisa indicar outro professor ou alinhar a liberação com o R.H.'
          : 'Escolha um professor diferente para uma das turmas, ou libere o horário.'}
      </div>

      {/* Suggestions */}
      {conflict.suggestions.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-[#1B1E2C]/55 font-bold">
            Sugestões para corrigir
          </div>
          <div className="flex flex-wrap gap-2">
            {conflict.suggestions.map((s, i) => {
              const Icon = ACTION_ICON[s.action.type] ?? ArrowRight;
              const variant =
                s.variant === 'primary' ? 'default' : s.variant === 'danger' ? 'destructive' : 'outline';
              return (
                <Button
                  key={`${conflict.key}-sug-${i}`}
                  size="sm"
                  variant={variant as any}
                  className={
                    s.variant === 'primary'
                      ? 'bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45]/90 font-bold'
                      : ''
                  }
                  title={s.description}
                  onClick={() => onApplyAction(s.action)}
                >
                  <Icon className="h-3.5 w-3.5 mr-1.5" />
                  {s.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
