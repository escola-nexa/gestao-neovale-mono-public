import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Star, Search, Check, X, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MemberOption {
  id: string;
  name: string;
  role?: string;
}

interface Props {
  label: string;
  helper?: string;
  members: MemberOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  primaryId?: string | null;
  onPrimaryChange?: (id: string | null) => void;
  multi?: boolean;
  emptyLabel?: string;
}

const initials = (name: string) =>
  name?.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

const roleLabel = (role?: string) => {
  if (!role) return null;
  const map: Record<string, string> = { admin: 'Admin', coordenador: 'Coordenador', rh: 'RH', professor: 'Professor' };
  return map[role] || role;
};

// Cor estável a partir do nome (estilo Trello)
const colorFor = (id: string) => {
  const palette = [
    'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-lime-500',
    'bg-emerald-500', 'bg-teal-500', 'bg-sky-500', 'bg-blue-500',
    'bg-indigo-500', 'bg-violet-500', 'bg-fuchsia-500', 'bg-pink-500',
  ];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
};

export function TicketMembersBlock({
  label,
  helper,
  members,
  selectedIds,
  onChange,
  primaryId = null,
  onPrimaryChange,
  multi = true,
  emptyLabel = 'Adicionar membros',
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = members.filter(m => selectedIds.includes(m.id));
  const filtered = members.filter(m =>
    !search.trim() || m.name?.toLowerCase().includes(search.trim().toLowerCase())
  );

  const toggle = (id: string) => {
    if (multi) {
      if (selectedIds.includes(id)) {
        onChange(selectedIds.filter(x => x !== id));
        if (primaryId === id) onPrimaryChange?.(null);
      } else {
        onChange([...selectedIds, id]);
      }
    } else {
      onChange(selectedIds.includes(id) ? [] : [id]);
    }
  };

  const togglePrimary = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onPrimaryChange) return;
    if (primaryId === id) onPrimaryChange(null);
    else {
      onPrimaryChange(id);
      if (!selectedIds.includes(id)) onChange([...selectedIds, id]);
    }
  };

  // Ordena: principal primeiro
  const ordered = [...selected].sort((a, b) =>
    (a.id === primaryId ? -1 : 0) - (b.id === primaryId ? -1 : 0)
  );

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
        </div>
        {selected.length > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {selected.length}
          </span>
        )}
      </div>

      {helper && (
        <p className="text-[10px] text-muted-foreground -mt-1">{helper}</p>
      )}

      <TooltipProvider delayDuration={150}>
        <div className="flex flex-wrap items-center gap-1.5">
          {ordered.map(m => (
            <Tooltip key={m.id}>
              <TooltipTrigger asChild>
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => toggle(m.id)}
                    className={cn(
                      'h-9 w-9 rounded-full text-white text-[12px] font-bold flex items-center justify-center shadow-sm ring-2 ring-background transition-transform hover:scale-105',
                      colorFor(m.id),
                      m.id === primaryId && 'ring-[hsl(48_100%_64%)]',
                    )}
                  >
                    {initials(m.name)}
                  </button>
                  {m.id === primaryId && (
                    <Star className="absolute -top-1 -right-1 h-3.5 w-3.5 fill-[hsl(48_100%_50%)] text-[hsl(48_100%_50%)] drop-shadow" />
                  )}
                  {onPrimaryChange && (
                    <button
                      type="button"
                      onClick={(e) => togglePrimary(m.id, e)}
                      className={cn(
                        'absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-background border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity',
                        m.id === primaryId && 'opacity-100',
                      )}
                      title={m.id === primaryId ? 'Remover principal' : 'Definir como principal'}
                    >
                      <Star className={cn('h-2.5 w-2.5', m.id === primaryId ? 'fill-[hsl(48_100%_50%)] text-[hsl(48_100%_50%)]' : 'text-muted-foreground')} />
                    </button>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <div className="text-xs font-medium">{m.name}</div>
                {m.role && <div className="text-[10px] text-muted-foreground">{roleLabel(m.role)}</div>}
                {m.id === primaryId && <div className="text-[10px] text-[hsl(48_100%_50%)]">★ Responsável principal</div>}
              </TooltipContent>
            </Tooltip>
          ))}

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="h-9 w-9 rounded-full border-2 border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 flex items-center justify-center transition-all"
                title={emptyLabel}
              >
                <Plus className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <div className="px-3 py-2.5 border-b">
                <p className="text-sm font-semibold">{label}</p>
                {helper && <p className="text-[11px] text-muted-foreground mt-0.5">{helper}</p>}
              </div>
              <div className="px-2 pt-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar membros..."
                    className="h-8 pl-7 text-sm"
                    autoFocus
                  />
                </div>
              </div>
              <ScrollArea className="max-h-[260px] mt-1">
                <div className="p-1">
                  {filtered.length === 0 && (
                    <p className="px-3 py-6 text-center text-xs text-muted-foreground">Nenhum membro encontrado</p>
                  )}
                  {filtered.map(m => {
                    const isSelected = selectedIds.includes(m.id);
                    const isPrimary = primaryId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggle(m.id)}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-left hover:bg-muted/60',
                          isSelected && 'bg-primary/5',
                        )}
                      >
                        <div className={cn(
                          'h-8 w-8 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0',
                          colorFor(m.id),
                          isPrimary && 'ring-2 ring-[hsl(48_100%_64%)]',
                        )}>
                          {initials(m.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.name}</p>
                          {m.role && <p className="text-[10px] text-muted-foreground">{roleLabel(m.role)}</p>}
                        </div>
                        {onPrimaryChange && isSelected && (
                          <button
                            type="button"
                            onClick={(e) => togglePrimary(m.id, e)}
                            className={cn(
                              'h-6 w-6 rounded-md flex items-center justify-center shrink-0',
                              isPrimary ? 'bg-[hsl(48_100%_64%)] text-[hsl(225_18%_14%)]' : 'text-muted-foreground hover:bg-muted',
                            )}
                            title={isPrimary ? 'Remover principal' : 'Definir como principal'}
                          >
                            <Star className={cn('h-3.5 w-3.5', isPrimary && 'fill-current')} />
                          </button>
                        )}
                        {isSelected && (
                          <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
              {selected.length > 0 && (
                <div className="border-t px-3 py-1.5 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {onPrimaryChange ? '★ define o responsável principal' : ''}
                  </span>
                  <button
                    type="button"
                    className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1"
                    onClick={() => { onChange([]); onPrimaryChange?.(null); }}
                  >
                    <X className="h-3 w-3" /> Limpar
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </TooltipProvider>

      {selected.length === 0 && (
        <p className="text-[11px] text-muted-foreground italic">{emptyLabel}</p>
      )}
    </div>
  );
}
