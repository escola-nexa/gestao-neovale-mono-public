import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TutorialCard } from './TutorialCard';
import { getCategoryMeta } from '../constants';
import type { HelpTutorial, HelpCategory } from '../types';

interface Props {
  category: HelpCategory;
  tutorials: HelpTutorial[];
  watchedIds: Set<string>;
  inProgressIds: Set<string>;
  customTitle?: string;
  customIcon?: any;
}

export function CategoryRail({ category, tutorials, watchedIds, inProgressIds, customTitle, customIcon }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const meta = getCategoryMeta(category);
  const Icon = customIcon ?? meta.icon;

  if (tutorials.length === 0) return null;

  const scroll = (dir: 'left' | 'right') => {
    scroller.current?.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' });
  };

  return (
    <section className="space-y-3 group/rail">
      <div className="flex items-center gap-3 px-4 sm:px-8">
        <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${meta.gradient} flex items-center justify-center shadow-md`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          {customTitle ?? meta.label}
        </h2>
        <span className="text-xs text-white/40 font-mono">
          {tutorials.length} {tutorials.length === 1 ? 'aula' : 'aulas'}
        </span>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => scroll('left')}
          className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover/rail:opacity-100 transition-opacity hover:bg-[#FFDA45] hover:text-[#1B1E2C]"
          aria-label="Anterior"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div
          ref={scroller}
          className="flex gap-4 overflow-x-auto px-4 sm:px-8 pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-white/10 scroll-smooth"
          style={{ scrollbarWidth: 'thin' }}
        >
          {tutorials.map((t) => (
            <div key={t.id} className="snap-start">
              <TutorialCard tutorial={t} watched={watchedIds.has(t.id)} inProgress={inProgressIds.has(t.id)} />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scroll('right')}
          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover/rail:opacity-100 transition-opacity hover:bg-[#FFDA45] hover:text-[#1B1E2C]"
          aria-label="Próximo"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </section>
  );
}
