import { Play, FileText, Image as ImageIcon, Video, Youtube, Link as LinkIcon, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getCoverColor, getCoverIcon } from '../../coverPresets';
import type { LibraryContentType, LibraryContentWithRefs } from '../../types';

const TYPE_META: Record<LibraryContentType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  pdf: { label: 'PDF', icon: FileText },
  image: { label: 'Imagem', icon: ImageIcon },
  video: { label: 'Vídeo', icon: Video },
  video_link: { label: 'Vídeo', icon: Youtube },
  link: { label: 'Link', icon: LinkIcon },
};

interface Props {
  item: LibraryContentWithRefs;
  canEdit: boolean;
  onOpen: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Quando true, aplica halo fluorescente baseado na cor da capa. */
  glow?: boolean;
}

export function ContentTile({ item, canEdit, onOpen, onEdit, onDelete, glow }: Props) {
  const color = getCoverColor(item.cover_color);
  const Icon = getCoverIcon(item.cover_icon);
  const type = (item.content_type ?? 'link') as LibraryContentType;
  const TypeIcon = TYPE_META[type]?.icon ?? LinkIcon;
  const typeLabel = TYPE_META[type]?.label ?? 'Link';

  // Halo fluorescente: usa a cor da capa para criar contraste e brilho
  const glowStyle: React.CSSProperties | undefined = glow
    ? {
        boxShadow: `0 0 0 1px ${color.glow}66, 0 10px 30px -8px ${color.glow}80, 0 0 60px -10px ${color.glow}99`,
      }
    : undefined;

  return (
    <div className={cn('relative', glow && 'group/glow')}>
      {glow && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-2 rounded-[22px] blur-2xl opacity-50 group-hover/glow:opacity-90 transition-opacity duration-500"
          style={{ background: `radial-gradient(closest-side, ${color.glow}cc, transparent 70%)` }}
        />
      )}
      <div
        className={cn(
          'group/tile snap-start shrink-0 w-[240px] sm:w-[280px] relative rounded-2xl overflow-hidden cursor-pointer',
          'bg-[#1B1E2C] ring-1 ring-white/10 transition-all duration-300',
          'hover:-translate-y-1 hover:ring-[#FFDA45]/70 hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.55)]',
        )}
        style={glowStyle}
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      >
      {/* capa visual */}
      <div className={cn('relative aspect-[16/10] flex items-center justify-center overflow-hidden', color.bg)} aria-hidden>
        <Icon className={cn('h-14 w-14 opacity-90 transition-transform duration-500 group-hover/tile:scale-110', color.fg)} />

        {/* badge tipo */}
        <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-md bg-[#1B1E2C]/90 backdrop-blur px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white ring-1 ring-white/10">
          <TypeIcon className="h-3 w-3" /> {typeLabel}
        </span>

        {/* badge rascunho (visível apenas para quem pode editar) */}
        {canEdit && !item.published_at && (
          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-md bg-amber-400 text-amber-950 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shadow-md">
            Rascunho
          </span>
        )}

        {/* menu admin */}
        {canEdit && (
          <div
            className="absolute top-2 right-2 opacity-0 group-hover/tile:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="secondary" className="h-7 w-7 bg-[#1B1E2C]/90 hover:bg-[#1B1E2C] text-white backdrop-blur ring-1 ring-white/10">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* play hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/tile:opacity-100 transition-opacity pointer-events-none bg-black/30">
          <span className="h-12 w-12 rounded-full bg-[#FFDA45] text-[#1B1E2C] flex items-center justify-center shadow-xl">
            <Play className="h-5 w-5 ml-0.5 fill-current" />
          </span>
        </div>
      </div>

      {/* rodapé editorial: divisor amarelo + título */}
      <div className="px-3.5 pt-3 pb-3.5 text-white">
        <span className="block h-[2px] w-6 bg-[#FFDA45] mb-2 transition-all duration-300 group-hover/tile:w-12" aria-hidden />
        <h3 className="text-[13.5px] font-bold leading-[1.2] font-sora break-words" title={item.title}>{item.title}</h3>
        {item.subject?.name && (
          <p className="text-[11px] text-white/60 break-words mt-1" title={item.subject.name}>{item.subject.name}</p>
        )}
      </div>
      </div>
    </div>
  );
}
