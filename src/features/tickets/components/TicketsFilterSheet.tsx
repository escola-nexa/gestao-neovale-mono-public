import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { TicketFilters } from '../hooks/useTicketFilters';

interface Props {
  filters: TicketFilters;
  update: (patch: Partial<TicketFilters>) => void;
  toggleLabel?: (labelId: string) => void;
  clearAll: () => void;
  activeCount: number;
  schools: { id: string; nome: string }[];
  showSchoolAndResponsible: boolean;
  statusLabels: Record<string, string>;
  priorityLabels: Record<string, string>;
  labelsCatalog?: Array<{ id: string; name: string; color: string }>;
}

export function TicketsFilterSheet({ filters, update, toggleLabel, clearAll, activeCount, schools, showSchoolAndResponsible, statusLabels, priorityLabels, labelsCatalog = [] }: Props) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-10 gap-2 relative">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {activeCount > 0 && (
            <Badge variant="default" className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">{activeCount}</Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtros avançados</SheetTitle>
          <SheetDescription>Refine sua busca por status, prioridade e escola.</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-6">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={filters.status} onValueChange={v => update({ status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Select value={filters.priority} onValueChange={v => update({ priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as prioridades</SelectItem>
                {Object.entries(priorityLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={filters.type} onValueChange={v => update({ type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="escola">Escola</SelectItem>
                <SelectItem value="interno">Interno</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showSchoolAndResponsible && (
            <>
              <div className="space-y-2">
                <Label>Escola</Label>
                <Select value={filters.schoolId} onValueChange={v => update({ schoolId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as escolas</SelectItem>
                    {schools.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select value={filters.responsible} onValueChange={v => update({ responsible: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="nexa">Resp. Neovale</SelectItem>
                    <SelectItem value="escola">Resp. Escola</SelectItem>
                    <SelectItem value="externo">Origem externa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm">Apenas com mídia</Label>
              <p className="text-xs text-muted-foreground">Tickets que possuem anexos</p>
            </div>
            <Switch checked={filters.media} onCheckedChange={v => update({ media: v })} />
          </div>

          <div className="space-y-2">
            <Label>Vencimento</Label>
            <Select value={filters.dueFilter} onValueChange={v => update({ dueFilter: v as TicketFilters['dueFilter'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer prazo</SelectItem>
                <SelectItem value="overdue">Atrasados</SelectItem>
                <SelectItem value="dueSoon">Vencem em até 2 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {labelsCatalog.length > 0 && (
            <div className="space-y-2">
              <Label>Etiquetas</Label>
              <div className="flex flex-wrap gap-1.5">
                {labelsCatalog.map(l => {
                  const active = filters.labels.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => toggleLabel?.(l.id)}
                      className="text-xs font-medium px-2 py-1 rounded transition-all border"
                      style={{
                        backgroundColor: active ? l.color : `${l.color}22`,
                        color: active ? '#fff' : l.color,
                        borderColor: active ? l.color : `${l.color}55`,
                      }}
                    >
                      {l.name}
                    </button>
                  );
                })}
              </div>
              {filters.labels.length > 0 && (
                <button
                  type="button"
                  onClick={() => update({ labels: [] })}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Limpar etiquetas
                </button>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Agrupar por</Label>
            <Select value={filters.groupBy} onValueChange={v => update({ groupBy: v as TicketFilters['groupBy'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem agrupamento</SelectItem>
                <SelectItem value="school">Escola</SelectItem>
                <SelectItem value="priority">Prioridade</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="responsible">Responsável</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={clearAll} className="flex-1">Limpar filtros</Button>
          <SheetClose asChild>
            <Button className="flex-1">Aplicar</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
