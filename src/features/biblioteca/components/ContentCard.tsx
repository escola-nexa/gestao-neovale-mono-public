import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Pencil, Trash2, Eye, FileText, Image as ImageIcon, Video, Youtube, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCoverColor, getCoverIcon } from '../coverPresets';
import { ContentViewerDialog } from './ContentViewerDialog';
import type { LibraryContentType, LibraryContentWithRefs } from '../types';

interface Props {
  item: LibraryContentWithRefs;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const TYPE_META: Record<LibraryContentType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  pdf: { label: 'PDF', icon: FileText },
  image: { label: 'Imagem', icon: ImageIcon },
  video: { label: 'Vídeo', icon: Video },
  video_link: { label: 'Vídeo (link)', icon: Youtube },
  link: { label: 'Link', icon: LinkIcon },
};

export function ContentCard({ item, canEdit, onEdit, onDelete }: Props) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const color = getCoverColor(item.cover_color);
  const Icon = getCoverIcon(item.cover_icon);
  const trackLabel = item.formative_track?.name ?? 'Categoria Livre';
  const type = (item.content_type ?? 'link') as LibraryContentType;
  const TypeIcon = TYPE_META[type]?.icon ?? LinkIcon;
  const typeLabel = TYPE_META[type]?.label ?? 'Link';
  const isFile = type === 'pdf' || type === 'image' || type === 'video';

  const hasContent = (isFile && item.storage_path) || (!isFile && item.content_url);

  return (
    <Card className="overflow-hidden flex flex-col group hover:shadow-lg transition-shadow">
      <div className={cn('relative h-36 flex items-center justify-center', color.bg)}>
        <Icon className={cn('h-16 w-16', color.fg)} />
        <Badge variant="secondary" className="absolute top-2 left-2 bg-background/90 backdrop-blur text-[10px] gap-1">
          <TypeIcon className="h-3 w-3" /> {typeLabel}
        </Badge>
        {canEdit && !item.published_at && (
          <Badge className="absolute bottom-2 left-2 bg-amber-400 text-amber-950 hover:bg-amber-400 text-[10px] font-extrabold uppercase tracking-wider">
            Rascunho
          </Badge>
        )}
        {canEdit && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="secondary" className="h-8 w-8 bg-background/90 backdrop-blur">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col gap-2">
        <h3 className="font-bold text-base leading-tight break-words" title={item.title}>{item.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{item.description}</p>

        <div className="flex flex-wrap gap-1 mt-2">
          {item.category && (
            <Badge variant="default" className="text-[10px]">{item.category.name}</Badge>
          )}
          <Badge variant="outline" className="text-[10px]">{trackLabel}</Badge>
          {item.course && <Badge variant="secondary" className="text-[10px]">{item.course.name}</Badge>}
          {item.subject && <Badge variant="secondary" className="text-[10px]">{item.subject.name}</Badge>}
        </div>

        {hasContent && (
          <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => setViewerOpen(true)}>
            <Eye className="mr-2 h-3.5 w-3.5" />
            Abrir conteúdo
          </Button>
        )}
      </div>

      <ContentViewerDialog open={viewerOpen} onOpenChange={setViewerOpen} item={item} />
    </Card>
  );
}
