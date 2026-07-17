import { CalendarDays, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { longWeekdayLabel, weekdayFromDateString } from '../hooks/useProfessorWeeklyGrid';
import type { Weekday } from '@/types/academic';

export interface AbsenceDateEntry {
  uid: string;
  date: string; // YYYY-MM-DD
}

interface Props {
  dates: AbsenceDateEntry[];
  activeUid: string | null;
  onSetActive: (uid: string) => void;
  onChangeDate: (uid: string, date: string) => void;
  onAdd: () => void;
  onRemove: (uid: string) => void;
  countsByUid: Record<string, number>;
  availableWeekdays: Set<Weekday>;
  /** Decide quais datas o calendário aceita (default: tudo). */
  isDateAllowed?: (d: Date) => boolean;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function fromISO(s: string): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

export function AbsenceDatesPanel({
  dates, activeUid, onSetActive, onChangeDate, onAdd, onRemove,
  countsByUid, isDateAllowed,
}: Props) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold uppercase tracking-wide">Datas da ausência</div>
          <Badge variant="secondary">{dates.length}</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={onAdd} className="h-8">
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
        </Button>
      </div>

      <div className="p-3 space-y-2 max-h-[520px] overflow-y-auto">
        {dates.map((d) => {
          const wdLabel = longWeekdayLabel(d.date);
          const isActive = d.uid === activeUid;
          const count = countsByUid[d.uid] || 0;
          const selectedDate = fromISO(d.date);

          return (
            <button
              type="button"
              key={d.uid}
              onClick={() => onSetActive(d.uid)}
              className={cn(
                'w-full text-left rounded-lg border p-3 transition-colors',
                isActive ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'hover:bg-muted/40'
              )}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          'mt-1 w-full justify-start font-normal h-9',
                          !selectedDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarDays className="h-3.5 w-3.5 mr-2" />
                        {selectedDate
                          ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR })
                          : 'Escolher data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0"
                      align="start"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && onChangeDate(d.uid, toISO(date))}
                        disabled={isDateAllowed ? (date) => !isDateAllowed(date) : undefined}
                        locale={ptBR}
                        weekStartsOn={0}
                        initialFocus
                        className={cn('p-3 pointer-events-auto')}
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {wdLabel && (
                      <Badge variant="outline" className="text-[10px]">{wdLabel}</Badge>
                    )}
                    {count > 0 && (
                      <Badge className="text-[10px]">
                        {count} {count === 1 ? 'aula' : 'aulas'}
                      </Badge>
                    )}
                  </div>
                </div>
                {dates.length > 1 && (
                  <Button
                    variant="ghost" size="icon"
                    onClick={(e) => { e.stopPropagation(); onRemove(d.uid); }}
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    aria-label="Remover data"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Suprime warning de import não usado (mantido p/ compat caso outros componentes ainda usem)
void weekdayFromDateString;
