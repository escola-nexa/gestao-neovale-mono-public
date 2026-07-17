import { Check, Clock, CalendarDays } from 'lucide-react';

export type Phase4Step = 1 | 2;

interface Phase4StepperProps {
  current: Phase4Step;
  /** Maior etapa que o diretor já visitou (libera clique para voltar). */
  reached: Phase4Step;
  onGo: (step: Phase4Step) => void;
}

const STEPS: { id: Phase4Step; label: string; icon: typeof Clock }[] = [
  { id: 1, label: 'Horários da escola', icon: Clock },
  { id: 2, label: 'Grade por turma', icon: CalendarDays },
];

export function Phase4Stepper({ current, reached, onGo }: Phase4StepperProps) {
  return (
    <div className="rounded-xl border border-[#FFDA45]/40 bg-white/95 backdrop-blur p-2 sm:p-2.5">
      <ol className="flex items-stretch gap-1 sm:gap-2">
        {STEPS.map((s, idx) => {
          const isCurrent = current === s.id;
          const isDone = current > s.id;
          const canGo = s.id <= reached;
          const Icon = isDone ? Check : s.icon;
          return (
            <li key={s.id} className="flex-1 flex items-center gap-1 sm:gap-2 min-w-0">
              <button
                type="button"
                disabled={!canGo}
                onClick={() => canGo && onGo(s.id)}
                className={[
                  'flex-1 min-w-0 flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border text-left transition',
                  isCurrent
                    ? 'bg-[#FFDA45] border-[#FFDA45] text-[#1B1E2C] shadow-sm'
                    : isDone
                      ? 'bg-[#1B1E2C] border-[#1B1E2C] text-white hover:bg-[#1B1E2C]/90'
                      : 'bg-white border-[#1B1E2C]/15 text-[#1B1E2C]/60',
                  canGo && !isCurrent ? 'cursor-pointer' : '',
                  !canGo ? 'cursor-not-allowed' : '',
                ].join(' ')}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span
                  className={[
                    'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold font-mono',
                    isCurrent
                      ? 'bg-[#1B1E2C] text-[#FFDA45]'
                      : isDone
                        ? 'bg-[#FFDA45] text-[#1B1E2C]'
                        : 'bg-[#1B1E2C]/10 text-[#1B1E2C]/55',
                  ].join(' ')}
                >
                  {isDone ? <Icon className="h-3.5 w-3.5" /> : s.id}
                </span>
                <span className="min-w-0 flex flex-col leading-tight">
                  <span className="text-[9px] uppercase tracking-[0.14em] font-bold opacity-70 hidden sm:inline">
                    Etapa {s.id}
                  </span>
                  <span className="text-xs sm:text-sm font-bold truncate">{s.label}</span>
                </span>
              </button>
              {idx < STEPS.length - 1 && (
                <span
                  className={`hidden sm:block h-px w-3 ${current > s.id ? 'bg-[#1B1E2C]' : 'bg-[#1B1E2C]/15'}`}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
