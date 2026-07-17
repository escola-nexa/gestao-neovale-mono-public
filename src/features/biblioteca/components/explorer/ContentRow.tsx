import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, Rows3, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'carousel' | 'grid';

interface Props {
  title: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  emptyHint?: string;
  /** Chave única para persistir o modo desta seção. */
  storageKey?: string;
  /** Esconde o toggle de visualização (ex: linha de continuação). */
  hideViewToggle?: boolean;
  /** Quando definido, exibe um botão "Gerenciar" no cabeçalho da linha. */
  onManage?: () => void;
}

export function ContentRow({ title, count, icon: Icon, children, emptyHint, storageKey, hideViewToggle, onManage }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const lsKey = storageKey ? `neovale.biblioteca.view.${storageKey}` : null;
  const [mode, setMode] = useState<ViewMode>(() => {
    if (!lsKey) return 'carousel';
    try {
      const v = localStorage.getItem(lsKey);
      return v === 'grid' ? 'grid' : 'carousel';
    } catch { return 'carousel'; }
  });

  const setModePersist = (m: ViewMode) => {
    setMode(m);
    if (lsKey) { try { localStorage.setItem(lsKey, m); } catch { /* ignore */ } }
  };

  const update = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    if (mode !== 'carousel') return;
    const el = scrollerRef.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', update); ro.disconnect(); };
  }, [mode]);

  const scroll = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.85), behavior: 'smooth' });
  };

  return (
    <section className="group/row relative">
      <div className="flex items-center justify-between gap-3 mb-4 pb-2.5 border-b border-border/60 px-1">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary shrink-0">
              <Icon className="h-3.5 w-3.5" />
            </span>
          )}
          <h2 className="text-base sm:text-lg font-bold tracking-tight break-words font-sora">{title}</h2>
          {typeof count === 'number' && (
            <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-tight shrink-0">
              {String(count).padStart(2, '0')} {count === 1 ? 'item' : 'itens'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onManage && (
            <button
              type="button"
              onClick={onManage}
              title="Gerenciar publicação e ordem desta seção"
              className={cn(
                'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider',
                'bg-amber-400/15 text-amber-700 dark:text-amber-300 border border-amber-400/40',
                'hover:bg-amber-400/25 transition-colors',
              )}
            >
              <Layers className="h-3.5 w-3.5" /> Gerenciar
            </button>
          )}

          {!hideViewToggle && (
            <div className="hidden sm:inline-flex items-center rounded-lg bg-muted p-0.5">
              <button
                type="button"
                onClick={() => setModePersist('carousel')}
                aria-label="Visualizar em carrossel"
                className={cn(
                  'h-7 w-8 rounded-md flex items-center justify-center transition-colors',
                  mode === 'carousel' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Rows3 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setModePersist('grid')}
                aria-label="Visualizar em grade"
                className={cn(
                  'h-7 w-8 rounded-md flex items-center justify-center transition-colors',
                  mode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {mode === 'grid' ? (
        <div
          className={cn(
            'grid gap-3 sm:gap-4 px-1 w-full',
            // colunas fluidas: encaixam quantos couberem com largura mínima por breakpoint
            'grid-cols-[repeat(auto-fill,minmax(160px,1fr))]',
            'sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]',
            'md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]',
            'lg:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]',
            // remove tamanhos fixos dos filhos no modo grade
            '[&>*]:!w-full [&>*]:!max-w-full [&>*]:!shrink [&>*]:!min-w-0',
          )}
        >
          {children}
        </div>
      ) : (
        <div className="relative">
          {canLeft && (
            <button
              type="button" onClick={() => scroll(-1)} aria-label="Rolar para a esquerda"
              className={cn(
                'hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 h-12 w-10 items-center justify-center rounded-r-lg',
                'bg-background/80 backdrop-blur border border-l-0 shadow-md',
                'opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-background',
              )}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {canRight && (
            <button
              type="button" onClick={() => scroll(1)} aria-label="Rolar para a direita"
              className={cn(
                'hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 h-12 w-10 items-center justify-center rounded-l-lg',
                'bg-background/80 backdrop-blur border border-r-0 shadow-md',
                'opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-background',
              )}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          <div
            ref={scrollerRef}
            className={cn(
              'flex gap-3 sm:gap-4 overflow-x-auto pb-3 px-1',
              'snap-x snap-mandatory scroll-smooth',
              '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
            )}
          >
            {children}
            <div className="shrink-0 w-1" aria-hidden />
          </div>

          {emptyHint && (
            <p className="text-xs text-muted-foreground italic px-1">{emptyHint}</p>
          )}
        </div>
      )}
    </section>
  );
}
