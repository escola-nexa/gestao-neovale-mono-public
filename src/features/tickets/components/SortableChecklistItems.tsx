import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { ChecklistItemRow } from './ChecklistItemRow';
import type { ChecklistItem } from '../hooks/useTicketChecklists';
import type { EligibleAssignee } from '../hooks/useEligibleAssignees';

interface Props {
  checklistId: string;
  items: ChecklistItem[];
  assignees: EligibleAssignee[];
  onToggle: (id: string, isDone: boolean) => void;
  onUpdate: (id: string, patch: { due_date?: string | null; assignee_id?: string | null }) => void;
  onRemove: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

export function SortableChecklistItems({
  items,
  assignees,
  onToggle,
  onUpdate,
  onRemove,
  onReorder,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(items, oldIndex, newIndex).map(i => i.id);
    onReorder(reordered);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1 ml-1">
          {items.map(it => (
            <ChecklistItemRow
              key={it.id}
              item={it}
              assignees={assignees}
              onToggle={(v) => onToggle(it.id, v)}
              onUpdate={(patch) => onUpdate(it.id, patch)}
              onRemove={() => onRemove(it.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
