import { Play, FileText, Image as ImageIcon, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCoverColor, getCoverIcon } from '@/features/biblioteca/coverPresets';
import { CONTENT_TYPE_LABELS, formatDuration } from '../constants';
import { cn } from '@/lib/utils';
import type { HelpTutorial } from '../types';

const typeIcon: Record<string, any> = {
  video_upload: Play, video_link: Play, pdf: FileText, image: ImageIcon, link: LinkIcon,
};

interface Props {
  tutorial: HelpTutorial;
  watched?: boolean;
  inProgress?: boolean;
}

export function TutorialCard({ tutorial, watched, inProgress }: Props) {
  const color = getCoverColor(tutorial.cover_color);
  const Icon = getCoverIcon(tutorial.cover_icon);
  const TypeIcon = typeIcon[tutorial.content_type] ?? Play;
  const typeLabel = CONTENT_TYPE_LABELS[tutorial.content_type] ?? 'Conteúdo';

  return (
    <Link
      to={`/ajuda/watch/${tutorial.id}`}
      className="group relative shrink-0 w-64 sm:w-72 rounded-xl overflow-hidden bg-[#1B1E2C] border border-white/5 hover:border-[#FFDA45]/60 transition-all hover:scale-[1.04] hover:z-10 shadow-lg hover:shadow-2xl"
    >
      {/* Capa */}
      <div className={cn('relative aspect-video flex items-center justify-center', color.bg)}>
        <Icon className={cn('h-16 w-16 transition-transform group-hover:scale-110', color.fg)} />

        {/* Badge tipo */}
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/50 backdrop-blur-sm px-2 py-0.5 text-[11px] font-medium text-white">
          <TypeIcon className="h-3 w-3" /> {typeLabel}
        </span>

        {/* Duração */}
        {tutorial.duration_seconds ? (
          <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-mono text-white">
            {formatDuration(tutorial.duration_seconds)}
          </span>
        ) : null}

        {/* Watched */}
        {watched && (
          <CheckCircle2 className="absolute top-2 right-2 h-5 w-5 text-emerald-400 drop-shadow" />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
          <div className="rounded-full bg-[#FFDA45] text-[#1B1E2C] p-3 shadow-xl">
            <Play className="h-5 w-5 fill-current" />
          </div>
        </div>

        {/* Progress bar */}
        {inProgress && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            <div className="h-full bg-[#FFDA45]" style={{ width: '45%' }} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-[#FFDA45]/80 font-semibold truncate">
          {tutorial.feature_name}
        </p>
        <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">{tutorial.title}</h3>
        {tutorial.description && (
          <p className="text-xs text-white/60 line-clamp-2">{tutorial.description}</p>
        )}
      </div>
    </Link>
  );
}
