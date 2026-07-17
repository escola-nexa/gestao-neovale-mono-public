import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { KanbanList, useReorderCard, useUpdateKanbanList, useCreateKanbanList } from '../hooks/useKanbanData';
import { toast } from 'sonner';
import { useTicketLabels, useTicketsLabelsMap } from '../hooks/useTicketLabels';
import { useChecklistProgress } from '../hooks/useTicketChecklists';
import { useTicketActivity } from '../hooks/useTicketActivity';
import { useTicketsEnrichment } from '../hooks/useTicketsEnrichment';
import { useOrganization } from '@/hooks/useOrganization';
import { TicketCardModal } from './TicketCardModal';
import { DropEffectOverlay, type DropEffect } from './DropEffectOverlay';
import { readColumnAutomations } from '../hooks/useColumnAutomations';

interface KanbanBoardProps {
  lists: KanbanList[];
  tickets: any[];
}

export function KanbanBoard({ lists, tickets }: KanbanBoardProps) {
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [activeEffect, setActiveEffect] = useState<Exclude<DropEffect, 'none'> | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const reorderCard = useReorderCard();
  const updateList = useUpdateKanbanList();
  const createList = useCreateKanbanList();
  const { organizationId } = useOrganization();
  const { labels: labelsCatalog } = useTicketLabels(organizationId);
  const ticketIds = useMemo(() => tickets.map(t => t.id), [tickets]);
  const { data: labelMap = {} } = useTicketsLabelsMap(ticketIds);
  const { data: progressMap = {} } = useChecklistProgress(ticketIds);
  const { data: activityMap } = useTicketActivity(ticketIds);
  const { data: enrichment } = useTicketsEnrichment(organizationId, tickets);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Filtros e busca já são aplicados na TicketsPage (tabs + chips + sheet)
  const filteredTickets = tickets;

  // Group tickets by kanban_list_id
  const ticketsByList = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    lists.forEach(l => { grouped[l.id] = []; });
    const defaultListId = lists.length > 0 ? lists[0].id : null;

    filteredTickets.forEach(t => {
      const listId = t.kanban_list_id || defaultListId;
      if (listId && grouped[listId]) {
        grouped[listId].push(t);
      } else if (defaultListId && grouped[defaultListId]) {
        grouped[defaultListId].push(t);
      }
    });

    Object.keys(grouped).forEach(k => {
      grouped[k].sort((a: any, b: any) => (a.kanban_position || 0) - (b.kanban_position || 0));
    });

    return grouped;
  }, [lists, filteredTickets]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const ticket = tickets.find(t => t.id === event.active.id);
    if (ticket) setActiveTicket(ticket);
  }, [tickets]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicket(null);
    if (!over) return;

    const ticketId = active.id as string;
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    let targetListId: string;
    const overData = over.data?.current;

    if (overData?.type === 'column') {
      targetListId = over.id as string;
    } else {
      const overTicket = tickets.find(t => t.id === over.id);
      targetListId = overTicket?.kanban_list_id || lists[0]?.id;
    }
    if (!targetListId) return;

    const targetTickets = ticketsByList[targetListId]?.filter(t => t.id !== ticketId) || [];

    let prevPosition: number | null = null;
    let nextPosition: number | null = null;

    if (overData?.type === 'column' || targetTickets.length === 0) {
      const lastTicket = targetTickets[targetTickets.length - 1];
      prevPosition = lastTicket?.kanban_position || null;
    } else {
      const overIndex = targetTickets.findIndex(t => t.id === over.id);
      if (overIndex > 0) prevPosition = targetTickets[overIndex - 1].kanban_position;
      nextPosition = targetTickets[overIndex]?.kanban_position || null;
    }

    const movedToNewColumn = ticket.kanban_list_id !== targetListId;
    reorderCard.mutate({ ticketId, newListId: targetListId, prevPosition, nextPosition }, {
      onSuccess: () => {
        if (movedToNewColumn) {
          const cfg = readColumnAutomations(organizationId, targetListId);
          if (cfg.dropEffect && cfg.dropEffect !== 'none') {
            setActiveEffect(cfg.dropEffect);
          }
        }
      },
      onError: () => toast.error('Erro ao mover ticket'),
    });
  }, [tickets, lists, ticketsByList, reorderCard, organizationId]);

  const handleRenameList = useCallback((listId: string, name: string) => {
    updateList.mutate({ listId, updates: { name } }, {
      onError: () => toast.error('Erro ao renomear coluna'),
    });
  }, [updateList]);

  const handleColorChange = useCallback((listId: string, color: string) => {
    updateList.mutate({ listId, updates: { color } }, {
      onError: () => toast.error('Erro ao alterar cor'),
    });
  }, [updateList]);

  const handleAddColumn = useCallback(() => {
    const name = newColumnName.trim();
    if (!name || !organizationId) return;
    createList.mutate(
      { organizationId, name },
      {
        onSuccess: () => {
          toast.success('Coluna criada');
          setNewColumnName('');
          setAddingColumn(false);
        },
        onError: () => toast.error('Erro ao criar coluna'),
      }
    );
  }, [createList, newColumnName, organizationId]);

  return (
    <div className="h-full flex flex-col">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 min-h-0 flex gap-3 overflow-x-auto overflow-y-hidden scroll-smooth items-stretch pb-2">
          {lists.map(list => (
            <KanbanColumn
              key={list.id}
              list={list}
              tickets={ticketsByList[list.id] || []}
              onRename={(name) => handleRenameList(list.id, name)}
              onColorChange={(color) => handleColorChange(list.id, color)}
              onOpenCard={(t) => setOpenCardId(t.id)}
              labelMap={labelMap}
              progressMap={progressMap}
              labelsCatalog={labelsCatalog}
              enrichment={enrichment}
              activityMap={activityMap}
            />
          ))}

          {/* Adicionar coluna (estilo Trello) */}
          <div className="shrink-0 w-[280px]">
            {addingColumn ? (
              <div className="bg-muted/50 rounded-lg p-2 space-y-2">
                <input
                  autoFocus
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddColumn();
                    if (e.key === 'Escape') { setAddingColumn(false); setNewColumnName(''); }
                  }}
                  placeholder="Nome da coluna…"
                  className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddColumn}
                    disabled={!newColumnName.trim() || createList.isPending}
                    className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    Adicionar
                  </button>
                  <button
                    onClick={() => { setAddingColumn(false); setNewColumnName(''); }}
                    className="px-2 py-1.5 text-sm rounded-md hover:bg-accent"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingColumn(true)}
                className="w-full h-10 rounded-lg bg-muted/40 hover:bg-muted text-sm text-muted-foreground hover:text-foreground transition flex items-center justify-center gap-2"
              >
                <span className="text-lg leading-none">+</span> Adicionar coluna
              </button>
            )}
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
          {activeTicket ? (
            <div className="w-[280px] rotate-[2deg]">
              <KanbanCard ticket={activeTicket} isDragging labelMap={labelMap} progressMap={progressMap} labelsCatalog={labelsCatalog} enrichment={enrichment} activity={activityMap?.get(activeTicket.id)} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TicketCardModal
        ticketId={openCardId}
        open={!!openCardId}
        onClose={() => setOpenCardId(null)}
      />

      {activeEffect && (
        <DropEffectOverlay effect={activeEffect} onDone={() => setActiveEffect(null)} />
      )}
    </div>
  );
}
