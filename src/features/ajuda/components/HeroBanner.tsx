import { Play, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCoverColor, getCoverIcon } from '@/features/biblioteca/coverPresets';
import { getCategoryMeta } from '../constants';
import { cn } from '@/lib/utils';
import type { HelpTutorial } from '../types';

interface Props {
  tutorial: HelpTutorial;
}

export function HeroBanner({ tutorial }: Props) {
  const color = getCoverColor(tutorial.cover_color);
  const Icon = getCoverIcon(tutorial.cover_icon);
  const meta = getCategoryMeta(tutorial.category);

  return (
    <div className="relative overflow-hidden rounded-2xl mx-4 sm:mx-8 mt-4 border border-white/5 shadow-2xl">
      <div className={cn('relative aspect-[21/9] md:aspect-[21/7] flex items-center', color.bg)}>
        {/* Decorative giant icon */}
        <Icon className={cn('absolute -right-12 -top-12 h-[420px] w-[420px] opacity-20 rotate-12', color.fg)} />

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />

        <div className="relative z-10 p-6 sm:p-12 max-w-2xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFDA45] text-[#1B1E2C] px-3 py-1 text-xs font-bold uppercase tracking-wider">
              <meta.icon className="h-3.5 w-3.5" /> {meta.label}
            </span>
            <span className="text-white/70 text-xs uppercase tracking-wider">Destaque</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold text-white leading-tight drop-shadow-lg">
            {tutorial.title}
          </h1>

          {tutorial.description && (
            <p className="text-white/80 text-sm sm:text-base max-w-lg line-clamp-3">
              {tutorial.description}
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to={`/ajuda/watch/${tutorial.id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-[#FFDA45] text-[#1B1E2C] px-6 py-3 font-bold shadow-lg hover:bg-[#FFDA45]/90 transition-colors"
            >
              <Play className="h-5 w-5 fill-current" /> Assistir agora
            </Link>
            <Link
              to={`/ajuda/watch/${tutorial.id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 backdrop-blur text-white border border-white/20 px-6 py-3 font-medium hover:bg-white/20 transition-colors"
            >
              <Info className="h-5 w-5" /> Mais informações
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
