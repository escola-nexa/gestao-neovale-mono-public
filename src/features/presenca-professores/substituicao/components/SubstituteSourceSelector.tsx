import { GraduationCap, Users, UserPlus, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SubstituteSource = 'professor' | 'talent' | 'manual';

interface Props {
  value: SubstituteSource;
  onChange: (v: SubstituteSource) => void;
  cidades: string[];
}

const OPTIONS: { value: SubstituteSource; title: string; subtitle: string; icon: any }[] = [
  { value: 'professor', title: 'Buscar professor', subtitle: 'Base interna', icon: GraduationCap },
  { value: 'talent', title: 'Banco de Talentos', subtitle: 'Candidatos cadastrados', icon: Users },
  { value: 'manual', title: 'Cadastrar manualmente', subtitle: 'Adiciona ao Banco de Talentos', icon: UserPlus },
];

export function SubstituteSourceSelector({ value, onChange, cidades }: Props) {
  const cityLabel = cidades.length === 0
    ? 'da cidade da escola'
    : cidades.length === 1
      ? `de ${cidades[0]}`
      : `das cidades: ${cidades.join(', ')}`;

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-sky-900 dark:text-sky-200">
        Origem do substituto
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {OPTIONS.map(opt => {
          const Icon = opt.icon;
          const active = value === opt.value;
          return (
            <button
              type="button"
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={cn(
                'group relative flex items-start gap-3 rounded-lg border p-3 text-left transition-all',
                active
                  ? 'border-sky-500 bg-sky-100/70 dark:bg-sky-900/40 shadow-sm ring-2 ring-sky-300/60 dark:ring-sky-700/60'
                  : 'border-sky-200 bg-white/70 hover:bg-sky-50 dark:border-sky-900 dark:bg-background dark:hover:bg-sky-950/40',
              )}
              aria-pressed={active}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  active ? 'border-sky-600 bg-sky-600 dark:border-sky-400 dark:bg-sky-400' : 'border-muted-foreground/40',
                )}
                aria-hidden
              >
                {active && <span className="h-2 w-2 rounded-full bg-white dark:bg-sky-950" />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Icon className={cn('h-4 w-4', active ? 'text-sky-700 dark:text-sky-300' : 'text-muted-foreground')} />
                  <div className={cn('text-sm font-semibold', active ? 'text-sky-950 dark:text-sky-100' : 'text-foreground')}>
                    {opt.title}
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{opt.subtitle}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex items-start gap-2 rounded-md bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900 px-3 py-2">
        <Info className="h-3.5 w-3.5 mt-0.5 text-sky-700 dark:text-sky-300 shrink-0" />
        <p className="text-[11px] text-sky-900/90 dark:text-sky-200/90 leading-relaxed">
          <b>Buscar professor</b> lista apenas docentes da base interna <b>disponíveis</b> (sem conflito de horário) e {cityLabel}.
          <b> Banco de Talentos</b> lista <b>todos</b> os candidatos cadastrados — quem é {cityLabel} e já realizou substituições aparece priorizado no topo.
          <b> Cadastrar manualmente</b> cria automaticamente um registro no Banco de Talentos.
        </p>
      </div>
    </div>
  );
}
