import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { School, FilePen, Pencil, RotateCcw, Link2, ExternalLink, GripVertical, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { KanbanCard } from '../../hooks/useProfessorsKanban';
import { COLOR_CLASSES } from './CardEditDialog';

interface Props {
  card: KanbanCard;
  onEdit: () => void;
  onClearManual: () => void;
  onGenerateLink: () => void;
}

export function ProfessorKanbanCard({ card, onEdit, onClearManual, onGenerateLink }: Props) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.professor_id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const colorByCol: Record<string, string> = {
    awaiting_link: 'border-l-amber-500',
    link_sent: 'border-l-sky-500',
    in_progress: 'border-l-violet-500',
    completed: 'border-l-emerald-500',
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn('border-l-4 shadow-sm hover:shadow-md transition group', colorByCol[card.effective_column])}
    >
      <CardContent className="p-3 space-y-2.5">
        {/* Header: drag handle + nome + ações */}
        <div className="flex items-start gap-2">
          <button
            type="button"
            {...listeners}
            {...attributes}
            className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground touch-none mt-0.5"
            title="Arraste para mover"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <button
              type="button"
              className="font-semibold text-sm leading-tight text-left hover:underline break-words"
              onClick={() => navigate(`/professores/${card.professor_id}/documentos`)}
            >
              {card.full_name}
            </button>
            {card.registration_code && (
              <Badge variant="outline" className="text-[10px] py-0 mt-1 ml-0">{card.registration_code}</Badge>
            )}
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={onEdit} title="Editar card">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Escolas */}
        <div className="flex flex-wrap gap-1">
          {card.school_names.length === 0 ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground italic">
              <School className="h-3 w-3" /> Sem escola vinculada
            </span>
          ) : card.school_names.slice(0, 3).map(name => (
            <span key={name} className="inline-flex items-center gap-1 max-w-full rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium">
              <School className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
              <span className="truncate max-w-[140px]">{name}</span>
            </span>
          ))}
          {card.school_names.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{card.school_names.length - 3}</span>
          )}
        </div>

        {/* Etiquetas */}
        {card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.labels.map(l => (
              <span key={l.id} className={cn('px-2 py-0.5 rounded-full border text-[10px] font-medium', COLOR_CLASSES[l.color])}>
                {l.name}
              </span>
            ))}
          </div>
        )}

        {/* Progresso */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-muted-foreground inline-flex items-center gap-1">
              <FilePen className="h-3 w-3" />
              {card.required_uploaded}/{card.required_total} documentos
            </span>
            <span className="font-bold">{card.completion_pct}%</span>
          </div>
          <Progress value={card.completion_pct} className="h-1.5" />
        </div>

        {/* Status documental */}
        {card.is_complete ? (
          <div className="text-[10px] inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> Documentação completa
          </div>
        ) : card.missing.length > 0 && (
          <div className="text-[10px] text-destructive inline-flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> {card.missing.length} pendente{card.missing.length > 1 ? 's' : ''}
          </div>
        )}

        {/* Descrição */}
        {card.description && (
          <p className="text-[11px] text-muted-foreground bg-muted/40 rounded p-2 whitespace-pre-wrap line-clamp-3">
            {card.description}
          </p>
        )}

        {/* Footer ações */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            {card.manual_override ? (
              <>
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded font-medium',
                    card.manual_diverges
                      ? 'bg-destructive/15 text-destructive'
                      : 'bg-amber-100 text-amber-900'
                  )}
                  title={card.manual_diverges ? `Movido manualmente. A regra automática indicaria: ${card.auto_column}` : 'Movido manualmente'}
                >
                  {card.manual_diverges ? 'Manual ⚠' : 'Manual'}
                </span>
                <button onClick={onClearManual} className="inline-flex items-center gap-1 hover:underline">
                  <RotateCcw className="h-3 w-3" /> Auto
                </button>
              </>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Automático</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {card.link_status === 'expired' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-medium" title="O link gerado anteriormente expirou">
                Link expirado
              </span>
            )}
            {!card.has_link && (
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={onGenerateLink}>
                <Link2 className="h-3 w-3" /> {card.link_status === 'expired' ? 'Renovar' : 'Gerar link'}
              </Button>
            )}
            {card.has_link && (
              <span className="text-[10px] inline-flex items-center gap-1 text-sky-700 dark:text-sky-400" title={`Expira em ${new Date(card.link_expires_at!).toLocaleDateString('pt-BR')}`}>
                <ExternalLink className="h-3 w-3" /> Link ativo
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
