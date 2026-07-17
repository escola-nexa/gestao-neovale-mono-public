import { FileText, Image as ImageIcon, Video, Youtube, Link as LinkIcon, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { BauhausCard } from '@/components/ui/bauhaus-card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { LibraryContentType, LibraryContentWithRefs } from '../../types';

const TYPE_LABEL: Record<LibraryContentType, string> = {
  pdf: 'PDF',
  image: 'Imagem',
  video: 'Vídeo',
  video_link: 'Vídeo',
  link: 'Link',
};
// (mantém ícones disponíveis caso seja útil futuramente)
void [FileText, ImageIcon, Video, Youtube, LinkIcon];

interface Props {
  item: LibraryContentWithRefs;
  canEdit: boolean;
  onOpen: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function LooseContentBauhausTile({ item, canEdit, onOpen, onEdit, onDelete }: Props) {
  const type = (item.content_type ?? 'link') as LibraryContentType;
  const isPublished = !!item.published_at;
  const progress = isPublished ? 100 : 0;
  const progressValue = isPublished ? 'Publicado' : 'Rascunho';

  const handleShare = () => {
    try {
      const url = `${window.location.origin}${window.location.pathname}#content=${item.id}`;
      navigator.clipboard.writeText(url);
      toast.success('Link copiado', { description: item.title });
    } catch {
      toast.error('Não foi possível copiar o link');
    }
  };

  return (
    <div className="snap-start shrink-0 w-[280px] sm:w-[320px] relative">
      {/* Menu admin (overlay) — só renderiza se pode editar */}
      {canEdit && (
        <div className="absolute top-3 right-3 z-20" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Mais opções"
                className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-white/10 hover:bg-[#FFDA45]/25 text-[#FFDA45]"
              >
                <span className="block h-1 w-1 rounded-full bg-current shadow-[0_-4px_0_currentColor,0_4px_0_currentColor]" />
              </button>
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

      <BauhausCard
        id={item.id}
        topInscription={TYPE_LABEL[type] ?? 'Conteúdo'}
        mainText={item.title}
        subMainText={item.subject?.name ?? 'Sem disciplina'}
        progressBarInscription="Publicação"
        progress={progress}
        progressValue={progressValue}
        filledButtonInscription="Abrir"
        outlinedButtonInscription="Compartilhar"
        onFilledButtonClick={() => onOpen()}
        onOutlinedButtonClick={() => handleShare()}
        onCardClick={() => onOpen()}
        showMoreOptions={false}
      />
    </div>
  );
}
