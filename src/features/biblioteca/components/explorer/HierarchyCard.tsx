import { type LucideIcon, ArrowUpRight, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  subtitle?: string;
  childrenCount: number;
  childrenLabel: string; // "cursos" | "disciplinas" | "aulas"
  icon: LucideIcon;
  /** seed para escolher cor estável (ex: id) */
  seed: string;
  onClick: () => void;
  /** Mostra badge "Novo" no canto. */
  isNew?: boolean;
  /** Se definido, exibe botão "Publicar" no card (admin/coord). */
  onManage?: () => void;
}

// 3 variantes editoriais: dark/yellow alternados pelo seed
const VARIANTS = [
  { bg: 'bg-[#1B1E2C]', text: 'text-white', accent: 'text-[#FFDA45]', ring: 'ring-white/10', hoverRing: 'hover:ring-[#FFDA45]/60', divider: 'bg-[#FFDA45]' },
  { bg: 'bg-[#FFDA45]', text: 'text-[#1B1E2C]', accent: 'text-[#1B1E2C]', ring: 'ring-[#1B1E2C]/15', hoverRing: 'hover:ring-[#1B1E2C]/60', divider: 'bg-[#1B1E2C]' },
  { bg: 'bg-[#0F1119]', text: 'text-white', accent: 'text-[#FFDA45]', ring: 'ring-[#FFDA45]/20', hoverRing: 'hover:ring-[#FFDA45]', divider: 'bg-[#FFDA45]' },
] as const;

function pickVariant(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return VARIANTS[hash % VARIANTS.length];
}

export function HierarchyCard({ title, subtitle, childrenCount, childrenLabel, icon: Icon, seed, onClick, isNew, onManage }: Props) {
  const v = pickVariant(seed);
  return (
    <div className="relative snap-start shrink-0 w-[220px] sm:w-[260px] md:w-[280px] lg:w-[300px] max-w-full">
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group/card w-full aspect-[16/10] relative rounded-2xl overflow-hidden text-left',
        'ring-1 transition-all duration-300',
        v.bg, v.text, v.ring, v.hoverRing,
        'hover:-translate-y-1 hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.45)]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFDA45]',
      )}
    >
      {isNew && (
        <span className="absolute top-3 left-3 z-10 inline-flex items-center px-2 py-0.5 rounded-md bg-primary text-[#1B1E2C] text-[10px] font-bold uppercase tracking-wider shadow">
          Novo
        </span>
      )}
      {/* numeral gigante de fundo (estilo editorial) */}
      <span
        className={cn(
          'absolute -right-2 -bottom-6 font-black tabular-nums leading-none select-none pointer-events-none',
          'text-[140px] opacity-[0.08] tracking-tighter',
          v.text,
        )}
        aria-hidden
      >
        {String(childrenCount).padStart(2, '0')}
      </span>

      {/* topo: ícone + eyebrow */}
      <div className="absolute top-4 left-5 right-5 flex items-start justify-between gap-3">
        <span className={cn('inline-flex items-center justify-center h-9 w-9 rounded-lg ring-1', v.accent, v.ring)}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className={cn('text-[10px] font-bold uppercase tracking-[0.18em] opacity-80')}>
          {String(childrenCount).padStart(2, '0')} · {childrenLabel}
        </span>
      </div>

      {/* divisor amarelo/dark */}
      <span className={cn('absolute left-5 bottom-[68px] h-[2px] w-8 transition-all duration-300 group-hover/card:w-16', v.divider)} aria-hidden />

      {/* base: título + cta */}
      <div className="absolute inset-x-0 bottom-0 px-5 pb-4 pt-3">
        <h3 className="font-bold leading-[1.15] text-[17px] sm:text-[18px] line-clamp-2 font-sora">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[11px] opacity-70 line-clamp-1 mt-1">{subtitle}</p>
        )}
        <div className={cn(
          'mt-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider',
          'opacity-60 group-hover/card:opacity-100 transition-opacity',
          v.accent,
        )}>
          Explorar <ArrowUpRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </button>
    {onManage && (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onManage(); }}
        className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1 rounded-md bg-amber-400 hover:bg-amber-300 text-amber-950 px-2 py-1 text-[10px] font-bold uppercase tracking-wider shadow ring-1 ring-amber-600/30"
        title="Publicar / despublicar conteúdos desta disciplina"
      >
        <Layers className="h-3 w-3" /> Publicar
      </button>
    )}
    </div>
  );
}
