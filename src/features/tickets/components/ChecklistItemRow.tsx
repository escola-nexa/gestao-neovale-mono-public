import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GripVertical, Clock, UserPlus, MoreHorizontal, Trash2, AlertTriangle, X, Search, Check } from 'lucide-react';
import { format, isBefore, isToday, startOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { ChecklistItem } from '../hooks/useTicketChecklists';
import type { EligibleAssignee } from '../hooks/useEligibleAssignees';

interface ChecklistItemRowProps {
  item: ChecklistItem;
  assignees: EligibleAssignee[];
  onToggle: (isDone: boolean) => void;
  onUpdate: (patch: { content?: string; due_date?: string | null; assignee_id?: string | null }) => void;
  onRemove: () => void;
}

const initials = (name?: string) =>
  name?.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

const roleLabel = (role?: string) => {
  if (role === 'admin') return 'Admin';
  if (role === 'coordenador') return 'Coordenador';
  if (role === 'rh') return 'RH';
  return role || '';
};

/**
 * Linha de item de checklist no estilo Trello:
 * - Drag handle, checkbox, conteúdo
 * - Ações no hover: relógio (data, hoje+), atribuir (admin/coord/RH), menu (excluir)
 * - Chip de data abaixo: vermelho se atrasado e não concluído, âmbar se hoje
 * - Avatar do responsável quando atribuído
 */
export function ChecklistItemRow({ item, assignees, onToggle, onUpdate, onRemove }: ChecklistItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const [dateOpen, setDateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.content);

  const startEdit = () => {
    setDraft(item.content);
    setEditing(true);
  };
  const cancelEdit = () => {
    setEditing(false);
    setDraft(item.content);
  };
  const saveEdit = () => {
    const v = draft.trim();
    if (!v || v === item.content) {
      cancelEdit();
      return;
    }
    onUpdate({ content: v });
    setEditing(false);
  };

  const due = item.due_date ? new Date(item.due_date) : null;
  const today = startOfDay(new Date());
  const isOverdue = !!due && !item.is_done && isBefore(startOfDay(due), today);
  const isDueToday = !!due && isToday(due);

  const assignee = assignees.find(a => a.user_id === item.assignee_id);
  const filtered = search.trim()
    ? assignees.filter(a => a.full_name.toLowerCase().includes(search.trim().toLowerCase()))
    : assignees;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-1 group hover:bg-muted/40 rounded p-1"
    >
      {!editing && (
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing mt-1"
          aria-label="Reordenar item"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}

      {!editing && (
        <Checkbox
          checked={item.is_done}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(!item.is_done);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            // Aceita apenas Espaço como toggle por teclado; bloqueia Enter para
            // evitar checagem acidental quando foco entra no checkbox após
            // re-render (ex.: logo após adicionar um item).
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          className="mt-1"
        />
      )}

      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-2">
            <Textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Editar item"
              className="min-h-[60px] text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  cancelEdit();
                }
              }}
            />
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" onClick={saveEdit} disabled={!draft.trim()}>
                Salvar
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <span
            role="button"
            tabIndex={0}
            onClick={startEdit}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); startEdit(); } }}
            className={cn(
              'block text-sm break-words cursor-text rounded px-1 -mx-1',
              item.is_done && 'line-through text-muted-foreground',
            )}
            title="Clique para editar"
          >
            {item.content}
          </span>
        )}

        {!editing && (item.created_by_name || item.created_at) && (
          <p className="text-[10px] text-muted-foreground mt-0.5 px-1">
            Adicionado{item.created_by_name ? ` por ${item.created_by_name}` : ''}
            {item.created_at ? ` • ${format(parseISO(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}` : ''}
          </p>
        )}

        {!editing && (due || assignee) && (
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {due && (
              <button
                type="button"
                onClick={() => setDateOpen(true)}
                className={cn(
                  'inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border',
                  isOverdue && 'bg-destructive/15 text-destructive border-destructive/30',
                  !isOverdue && isDueToday && 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
                  !isOverdue && !isDueToday && 'bg-muted text-muted-foreground border-border',
                )}
                title={isOverdue ? 'Atrasado' : isDueToday ? 'Vence hoje' : 'Data de entrega'}
              >
                {isOverdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                {format(due, "dd 'de' MMM", { locale: ptBR })}
              </button>
            )}
            {assignee && (
              <button
                type="button"
                onClick={() => setAssignOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] px-1 py-0.5 rounded hover:bg-muted"
                title={`${assignee.full_name} • ${roleLabel(assignee.role)}`}
              >
                <span className="h-4 w-4 rounded-full bg-primary/10 text-primary text-[8px] font-bold flex items-center justify-center">
                  {initials(assignee.full_name)}
                </span>
                <span className="truncate max-w-[120px]">{assignee.full_name.split(' ')[0]}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {!editing && (
      <div className="flex items-center gap-0.5">
        {/* Data */}
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Definir data de entrega">
              <Clock className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={due || undefined}
              onSelect={(d) => {
                onUpdate({ due_date: d ? d.toISOString() : null });
                setDateOpen(false);
              }}
              disabled={(d) => isBefore(startOfDay(d), today)}
              initialFocus
              locale={ptBR}
            />
            {due && (
              <div className="border-t p-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => { onUpdate({ due_date: null }); setDateOpen(false); }}
                >
                  <X className="h-3 w-3 mr-1" /> Remover data
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Atribuir */}
        <Popover open={assignOpen} onOpenChange={setAssignOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Atribuir responsável">
              <UserPlus className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] p-0" align="end">
            <div className="px-3 py-2 border-b">
              <p className="text-sm font-semibold">Atribuir item</p>
              <p className="text-[11px] text-muted-foreground">Admins, coordenadores ou RH</p>
            </div>
            <div className="p-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="h-8 pl-7 text-sm"
                  autoFocus
                />
              </div>
            </div>
            <ScrollArea className="h-[260px]">
              <div className="p-1">
                {filtered.length === 0 && (
                  <p className="px-3 py-6 text-center text-xs text-muted-foreground">Nenhum usuário encontrado</p>
                )}
                {filtered.map((a) => {
                  const selected = item.assignee_id === a.user_id;
                  return (
                    <button
                      key={a.user_id}
                      type="button"
                      onClick={() => {
                        onUpdate({ assignee_id: selected ? null : a.user_id });
                        setAssignOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-muted/60 transition-colors',
                        selected && 'bg-primary/5',
                      )}
                    >
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                        {initials(a.full_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">{roleLabel(a.role)}</p>
                      </div>
                      {selected && (
                        <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
            {item.assignee_id && (
              <div className="border-t p-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => { onUpdate({ assignee_id: null }); setAssignOpen(false); }}
                >
                  <X className="h-3 w-3 mr-1" /> Remover atribuição
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Mais ações">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRemove} className="text-destructive focus:text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      )}
    </div>
  );
}
