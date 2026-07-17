import { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, UserPlus, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TicketMembersStack } from './TicketMembersStack';

export interface MemberOption {
  id: string;
  name: string;
  role?: string;
}

interface TicketMembersPopoverProps {
  label: string;
  helper?: string;
  members: MemberOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  primaryId?: string | null;
  onPrimaryChange?: (id: string | null) => void;
  multi?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
  align?: 'start' | 'center' | 'end';
}

const roleLabel = (role?: string) => {
  if (!role) return null;
  if (role === 'admin') return 'Admin';
  if (role === 'coordenador') return 'Coordenador';
  if (role === 'rh') return 'RH';
  if (role === 'professor') return 'Professor';
  return role;
};

const initials = (name: string) =>
  name?.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

export function TicketMembersPopover({
  label,
  helper,
  members,
  selectedIds,
  onChange,
  primaryId = null,
  onPrimaryChange,
  multi = true,
  emptyLabel = 'Adicionar membros',
  disabled = false,
  align = 'start',
}: TicketMembersPopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(m => m.name?.toLowerCase().includes(q));
  }, [members, search]);

  const selected = members.filter(m => selectedIds.includes(m.id));

  const toggle = (id: string) => {
    if (disabled) return;
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
    if (!onPrimaryChange || disabled) return;
    if (primaryId === id) {
      onPrimaryChange(null);
    } else {
      onPrimaryChange(id);
      if (!selectedIds.includes(id)) onChange([...selectedIds, id]);
    }
  };

  const stackMembers = selected.map(m => ({ id: m.id, name: m.name, isPrimary: m.id === primaryId }));

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {selected.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {selected.length} {selected.length === 1 ? 'selecionado' : 'selecionados'}
          </span>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'group w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-lg border border-input bg-background text-left transition-all',
              'hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              disabled && 'opacity-60 cursor-not-allowed',
            )}
          >
            {selected.length > 0 ? (
              <>
                <TicketMembersStack members={stackMembers} size="sm" max={5} />
                <span className="flex-1 text-xs text-muted-foreground truncate">
                  {selected.map(s => s.name.split(' ')[0]).slice(0, 3).join(', ')}
                  {selected.length > 3 ? `, +${selected.length - 3}` : ''}
                </span>
              </>
            ) : (
              <>
                <div className="h-6 w-6 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
                  <UserPlus className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="flex-1 text-xs text-muted-foreground">{emptyLabel}</span>
              </>
            )}
            <span className="text-xs text-muted-foreground group-hover:text-primary">+</span>
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-[320px] p-0" align={align}>
          <div className="px-3 py-2.5 border-b">
            <p className="text-sm font-semibold text-foreground">{label}</p>
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
                    disabled={disabled}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-left transition-colors',
                      'hover:bg-muted/60',
                      isSelected && 'bg-primary/5',
                    )}
                  >
                    <div className={cn(
                      'h-7 w-7 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0',
                      isPrimary && 'ring-2 ring-[hsl(48_100%_64%)]',
                    )}>
                      {initials(m.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                      {m.role && (
                        <p className="text-[10px] text-muted-foreground">{roleLabel(m.role)}</p>
                      )}
                    </div>
                    {onPrimaryChange && isSelected && (
                      <button
                        type="button"
                        onClick={(e) => togglePrimary(m.id, e)}
                        className={cn(
                          'h-6 w-6 rounded-md flex items-center justify-center transition-colors shrink-0',
                          isPrimary
                            ? 'bg-[hsl(48_100%_64%)] text-[hsl(225_18%_14%)]'
                            : 'text-muted-foreground hover:text-[hsl(48_100%_50%)] hover:bg-muted',
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
            <div className="border-t px-2 py-1.5 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground pl-1">
                {onPrimaryChange ? '★ define o principal' : ''}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => { onChange([]); onPrimaryChange?.(null); }}
              >
                <X className="h-3 w-3 mr-1" /> Limpar
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {selected.map(m => (
            <Badge
              key={m.id}
              variant="secondary"
              className={cn(
                'text-[11px] flex items-center gap-1 pr-1 pl-2 py-0.5',
                m.id === primaryId && 'bg-[hsl(48_100%_64%)]/20 border border-[hsl(48_100%_64%)]/60 text-foreground',
              )}
            >
              {m.id === primaryId && <Star className="h-3 w-3 fill-[hsl(48_100%_50%)] text-[hsl(48_100%_50%)]" />}
              <span>{m.name}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => toggle(m.id)}
                  className="ml-0.5 hover:text-destructive rounded-sm"
                  aria-label={`Remover ${m.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
