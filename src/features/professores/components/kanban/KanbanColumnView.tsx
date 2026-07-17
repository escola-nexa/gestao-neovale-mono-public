import { useDroppable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ProfessorKanbanCard } from './ProfessorKanbanCard';
import type { KanbanCard, KanbanColumn } from '../../hooks/useProfessorsKanban';

interface Props {
  id: KanbanColumn;
  title: string;
  description: string;
  accent: string;
  cards: KanbanCard[];
  onEdit: (card: KanbanCard) => void;
  onClearManual: (card: KanbanCard) => void;
  onGenerateLink: (card: KanbanCard) => void;
}

export function KanbanColumnView({ id, title, description, accent, cards, onEdit, onClearManual, onGenerateLink }: Props) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-lg border bg-muted/30 min-h-[420px]',
        accent,
        'border-l-4',
        isOver && 'ring-2 ring-primary/40 bg-muted/60'
      )}
    >
      <div className="p-3 border-b bg-background/60 rounded-t-lg">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight">{title}</h3>
          <Badge variant="secondary">{cards.length}</Badge>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
        {cards.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground italic">
            Nenhum card aqui
          </div>
        ) : cards.map(card => (
          <ProfessorKanbanCard
            key={card.professor_id}
            card={card}
            onEdit={() => onEdit(card)}
            onClearManual={() => onClearManual(card)}
            onGenerateLink={() => onGenerateLink(card)}
          />
        ))}
      </div>
    </div>
  );
}
