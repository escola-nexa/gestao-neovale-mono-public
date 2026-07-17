import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CheckSquare, Trash2 } from 'lucide-react';
import { useTicketChecklists } from '../../hooks/useTicketChecklists';
import { useEligibleAssignees } from '../../hooks/useEligibleAssignees';
import { SortableChecklistItems } from '../SortableChecklistItems';
import { AddChecklistItemForm } from '../AddChecklistItemForm';

interface Props {
  ticketId: string | null;
  organizationId: string | null | undefined;
  /** Mostra também o botão "+ Checklist" para criar novas listas. */
  canCreateChecklist?: boolean;
}

/**
 * Seção compartilhada de Checklists Trello-style — usada no modal Kanban,
 * na página de Edição e na página de Detalhe do ticket. Garante paridade total
 * entre as três visões.
 */
export function TicketChecklistsSection({ ticketId, organizationId, canCreateChecklist = true }: Props) {
  const {
    checklists, addChecklist, removeChecklist,
    addItem, toggleItem, updateItem, removeItem, reorderItems,
  } = useTicketChecklists(ticketId);
  const { data: assignees = [] } = useEligibleAssignees(organizationId);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  if (!ticketId) return null;

  return (
    <div className="space-y-5">
      {checklists.map(cl => {
        const done = cl.items.filter(i => i.is_done).length;
        const total = cl.items.length;
        const pct = total > 0 ? (done / total) * 100 : 0;
        return (
          <div key={cl.id}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <CheckSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold truncate min-w-0" title={cl.title}>
                    {cl.title || 'Sem título'}
                  </h3>
                  {(cl.created_by_name || cl.created_at) && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Criado{cl.created_by_name ? ` por ${cl.created_by_name}` : ''}
                      {cl.created_at ? ` em ${new Date(cl.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
                    </p>
                  )}
                </div>
              </div>
              <Button size="sm" variant="ghost" className="shrink-0" onClick={() => removeChecklist.mutate(cl.id)}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
              </Button>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-muted-foreground tabular-nums w-8">{Math.round(pct)}%</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${pct === 100 ? 'bg-green-500' : 'bg-primary'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <SortableChecklistItems
              checklistId={cl.id}
              items={cl.items}
              assignees={assignees}
              onToggle={(id, is_done) => toggleItem.mutate({ id, is_done })}
              onUpdate={(id, patch) => updateItem.mutate({ id, ...patch })}
              onRemove={(id) => removeItem.mutate(id)}
              onReorder={(orderedIds) => reorderItems.mutate({ checklistId: cl.id, orderedIds })}
            />
            <div className="mt-2 ml-7">
              <AddChecklistItemForm
                onAdd={(content) => {
                  const max = Math.max(0, ...cl.items.map(i => i.position));
                  addItem.mutate({
                    id: crypto.randomUUID(),
                    checklistId: cl.id,
                    content,
                    position: max + 1,
                  });
                }}
              />
            </div>
          </div>
        );
      })}

      {canCreateChecklist && (
        <Popover open={createOpen} onOpenChange={setCreateOpen}>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="sm">
              <CheckSquare className="h-4 w-4 mr-2" /> Adicionar checklist
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-3 space-y-2">
            <Input
              placeholder="Título do checklist"
              value={newChecklistTitle}
              onChange={e => setNewChecklistTitle(e.target.value)}
              className="h-8"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newChecklistTitle.trim()) {
                  addChecklist.mutate(newChecklistTitle.trim());
                  setNewChecklistTitle('');
                  setCreateOpen(false);
                }
              }}
            />
            <Button
              size="sm"
              className="w-full"
              disabled={!newChecklistTitle.trim()}
              onClick={() => {
                addChecklist.mutate(newChecklistTitle.trim());
                setNewChecklistTitle('');
                setCreateOpen(false);
              }}
            >
              Adicionar
            </Button>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
