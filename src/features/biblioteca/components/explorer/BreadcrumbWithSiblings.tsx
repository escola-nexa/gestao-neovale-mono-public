import { ChevronRight, ArrowLeft, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CrumbNode {
  label: string;
  /** Mantido por compatibilidade — não é mais usado para abrir menu de troca. */
  siblings?: { id: string; label: string }[];
  currentId?: string;
  onSelect?: (id: string) => void;
  /** Clique direto no chip (navega para esse nível). */
  onClick?: () => void;
}

interface Props {
  nodes: CrumbNode[];
}

/** Volta ao nó anterior (penúltimo da trilha). */
function getBackAction(nodes: CrumbNode[]): (() => void) | undefined {
  if (nodes.length < 2) return undefined;
  const prev = nodes[nodes.length - 2];
  if (prev.onClick) return prev.onClick;
  if (prev.onSelect && prev.currentId) {
    const id = prev.currentId;
    return () => prev.onSelect!(id);
  }
  return undefined;
}

export function BreadcrumbWithSiblings({ nodes }: Props) {
  if (!nodes.length) return null;
  const back = getBackAction(nodes);

  return (
    <nav className="flex flex-wrap items-center gap-1.5" aria-label="Trilha de navegação">
      {back && (
        <>
          <button
            type="button"
            onClick={back}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider',
              'bg-[#1B1E2C] text-white border border-[#1B1E2C]',
              'hover:bg-[#2a2e40] hover:-translate-y-0.5 active:translate-y-0',
              'transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            )}
            aria-label="Voltar para o nível anterior"
            title="Voltar"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </button>
          <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        </>
      )}

      {nodes.map((n, i) => {
        const isLast = i === nodes.length - 1;
        const isFirst = i === 0;
        const isClickable = !isLast && !!n.onClick;

        const chip = (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold',
              'transition-all whitespace-normal break-words text-left max-w-[280px]',
              isLast
                ? 'bg-primary text-[#1B1E2C] shadow-sm'
                : isClickable
                  ? 'bg-background text-foreground border border-border hover:border-primary hover:bg-primary/10 hover:-translate-y-0.5 hover:shadow-sm cursor-pointer'
                  : 'bg-muted text-muted-foreground',
            )}
          >
            {isFirst && <Home className="h-3 w-3 shrink-0 opacity-70" />}
            <span className="break-words">{n.label}</span>
          </span>
        );

        return (
          <span key={i} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />}
            {isClickable ? (
              <button
                type="button"
                onClick={n.onClick}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
                title={`Ir para ${n.label}`}
              >
                {chip}
              </button>
            ) : (
              chip
            )}
          </span>
        );
      })}
    </nav>
  );
}
