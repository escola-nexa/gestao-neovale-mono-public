import { useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import { Plus, MoreHorizontal, Palette, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useColumnAutomations } from '../hooks/useColumnAutomations';
import { useOrganization } from '@/hooks/useOrganization';

interface KanbanColumnProps {
  list: {
    id: string;
    name: string;
    color: string;
    mapped_status: string | null;
  };
  tickets: any[];
  onRename?: (name: string) => void;
  onColorChange?: (color: string) => void;
  onOpenCard?: (ticket: any) => void;
  labelMap?: Record<string, string[]>;
  progressMap?: Record<string, { total: number; done: number }>;
  labelsCatalog?: Array<{ id: string; name: string; color: string }>;
  enrichment?: import('../hooks/useTicketsEnrichment').TicketsEnrichment;
  activityMap?: Map<string, import('../hooks/useTicketActivity').TicketActivity>;
}

const PRESET_COLORS = [
  '#6B7280', '#EF4444', '#F59E0B', '#10B981',
  '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6',
];

export function KanbanColumn({ list, tickets, onRename, onColorChange, onOpenCard, labelMap, progressMap, labelsCatalog, enrichment, activityMap }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: list.id, data: { type: 'column', list } });
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(list.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const { organizationId } = useOrganization();
  const { config: automations, update: updateAutomations } = useColumnAutomations(organizationId, list.id);

  const sortableIds = tickets.map(t => t.id);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveName = () => {
    setIsEditing(false);
    const trimmed = editName.trim();
    if (trimmed && trimmed !== list.name) {
      onRename?.(trimmed);
    } else {
      setEditName(list.name);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[280px] w-[300px] max-h-full h-fit rounded-xl transition-all duration-200 ${
        isOver
          ? 'bg-primary/5 ring-2 ring-primary/30 shadow-lg'
          : 'bg-muted/40 shadow-sm'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="w-3 h-3 rounded-full shrink-0 ring-2 ring-background shadow-sm"
            style={{ backgroundColor: list.color }}
          />
          {isEditing ? (
            <input
              ref={inputRef}
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') { setEditName(list.name); setIsEditing(false); } }}
              className="text-sm font-semibold text-foreground bg-transparent border-b border-primary outline-none w-full"
            />
          ) : (
            <span
              className="text-sm font-semibold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
              onDoubleClick={() => setIsEditing(true)}
              title="Duplo-clique para editar"
            >
              {list.name}
            </span>
          )}
          <span className="text-[11px] text-muted-foreground bg-background/80 rounded-full px-2 py-0.5 min-w-[22px] text-center font-medium tabular-nums shrink-0 border">
            {tickets.length}
          </span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <button className="p-1 rounded hover:bg-background/80 text-muted-foreground hover:text-foreground transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="end">
              <button
                className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent transition-colors"
                onClick={() => setIsEditing(true)}
              >
                Renomear
              </button>
              <div className="px-2 py-1.5">
                <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
                  <Palette className="h-3 w-3" /> Cor da coluna
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                        c === list.color ? 'border-primary ring-1 ring-primary/30' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => onColorChange?.(c)}
                    />
                  ))}
                </div>
              </div>
              <Separator className="my-1" />
              <div className="px-2 py-1.5 space-y-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Automações
                </span>
                <label className="flex items-start justify-between gap-2 text-xs cursor-pointer">
                  <span className="flex-1">
                    <span className="block font-medium text-foreground">Auto-status ao entrar</span>
                    <span className="text-muted-foreground">Aplica o status mapeado ao soltar o card aqui</span>
                  </span>
                  <Switch checked={automations.autoStatusOnEnter} onCheckedChange={(v) => updateAutomations({ autoStatusOnEnter: v })} />
                </label>
                <label className="flex items-start justify-between gap-2 text-xs cursor-pointer">
                  <span className="flex-1">
                    <span className="block font-medium text-foreground">Concluir checklist ao resolver</span>
                    <span className="text-muted-foreground">Marca todos os itens como feitos</span>
                  </span>
                  <Switch checked={automations.completeChecklistsOnResolve} onCheckedChange={(v) => updateAutomations({ completeChecklistsOnResolve: v })} />
                </label>
                <label className="flex items-start justify-between gap-2 text-xs cursor-pointer">
                  <span className="flex-1">
                    <span className="block font-medium text-foreground">Avisar vencimento próximo</span>
                    <span className="text-muted-foreground">Notifica responsáveis ≤ 2 dias</span>
                  </span>
                  <Switch checked={automations.notifyDueSoon} onCheckedChange={(v) => updateAutomations({ notifyDueSoon: v })} />
                </label>

                <div className="pt-1">
                  <span className="block text-xs font-medium text-foreground mb-1">Efeito ao soltar ticket</span>
                  <span className="block text-[11px] text-muted-foreground mb-1.5">Animação de 3 segundos quando um card chega aqui</span>
                  <div className="grid grid-cols-2 gap-1">
                    {([
                      { v: 'none', label: 'Nenhum', icon: '🚫' },
                      { v: 'palmas', label: 'Palmas', icon: '👏' },
                      { v: 'fogos', label: 'Fogos', icon: '🎆' },
                      { v: 'relogio', label: 'Relógio', icon: '⏰' },
                    ] as const).map(opt => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => updateAutomations({ dropEffect: opt.v })}
                        className={`flex items-center gap-1.5 px-2 py-1.5 text-xs rounded border transition ${
                          automations.dropEffect === opt.v
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border hover:bg-accent text-muted-foreground'
                        }`}
                      >
                        <span className="text-base leading-none">{opt.icon}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Link
            to="/tickets/novo"
            className="p-1 rounded hover:bg-background/80 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Divider with list color */}
      <div className="h-[2px] mx-2 rounded-full opacity-60" style={{ backgroundColor: list.color }} />

      {/* Cards */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <div className="p-2 space-y-2 min-h-[80px] w-full">
            {tickets.length === 0 && (
              <div className="flex flex-col items-center text-center text-xs text-muted-foreground py-10 opacity-50">
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-current flex items-center justify-center mb-2">
                  <Plus className="h-4 w-4" />
                </div>
                Arraste tickets aqui
              </div>
            )}
            {tickets.map(ticket => (
              <KanbanCard
                key={ticket.id}
                ticket={ticket}
                onOpen={onOpenCard}
                labelMap={labelMap}
                progressMap={progressMap}
                labelsCatalog={labelsCatalog}
                enrichment={enrichment}
                activity={activityMap?.get(ticket.id)}
              />
            ))}
          </div>
        </SortableContext>
      </div>

    </div>
  );
}
