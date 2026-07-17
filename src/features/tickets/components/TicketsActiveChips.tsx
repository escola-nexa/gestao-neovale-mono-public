import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { TicketFilters } from '../hooks/useTicketFilters';

interface Props {
  filters: TicketFilters;
  update: (patch: Partial<TicketFilters>) => void;
  clearAll: () => void;
  schoolsMap: Record<string, string>;
  statusLabels: Record<string, string>;
  priorityLabels: Record<string, string>;
  labelsCatalog?: Array<{ id: string; name: string; color: string }>;
}

const responsibleLabels: Record<string, string> = {
  nexa: 'Resp. Neovale',
  escola: 'Resp. Escola',
  externo: 'Origem externa',
};

const typeLabels: Record<string, string> = {
  escola: 'Tipo: Escola',
  interno: 'Tipo: Interno',
};

const dueFilterLabels: Record<string, string> = {
  overdue: 'Atrasados',
  dueSoon: 'Vencem em ≤2d',
};

const kpiLabels: Record<string, string> = {
  open: 'KPI: Em aberto',
  risk: 'KPI: SLA em risco',
  overdue: 'KPI: Atrasados >72h',
  resolved: 'KPI: Resolvidos (7d)',
};

export function TicketsActiveChips({ filters, update, clearAll, schoolsMap, statusLabels, priorityLabels, labelsCatalog = [] }: Props) {
  const chips: { label: string; clear: () => void; color?: string }[] = [];

  if (filters.kpi && filters.kpi !== 'all') chips.push({ label: kpiLabels[filters.kpi] || filters.kpi, clear: () => update({ kpi: 'all' }) });
  if (filters.status !== 'all') chips.push({ label: statusLabels[filters.status] || filters.status, clear: () => update({ status: 'all' }) });
  if (filters.priority !== 'all') chips.push({ label: `Prioridade: ${priorityLabels[filters.priority] || filters.priority}`, clear: () => update({ priority: 'all' }) });
  if (filters.type !== 'all') chips.push({ label: typeLabels[filters.type], clear: () => update({ type: 'all' }) });
  if (filters.schoolId !== 'all') chips.push({ label: `Escola: ${schoolsMap[filters.schoolId] || '...'}`, clear: () => update({ schoolId: 'all' }) });
  if (filters.responsible !== 'all') chips.push({ label: responsibleLabels[filters.responsible] || filters.responsible, clear: () => update({ responsible: 'all' }) });
  if (filters.media) chips.push({ label: 'Com mídia', clear: () => update({ media: false }) });
  if (filters.dueFilter !== 'all') chips.push({ label: dueFilterLabels[filters.dueFilter], clear: () => update({ dueFilter: 'all' }) });
  filters.labels.forEach(id => {
    const l = labelsCatalog.find(x => x.id === id);
    chips.push({
      label: l?.name || 'Etiqueta',
      color: l?.color,
      clear: () => update({ labels: filters.labels.filter(x => x !== id) }),
    });
  });

  if (chips.length === 0) return null;

  return (
    <div className="flex items-center flex-wrap gap-2">
      {chips.map((c, i) => (
        <Badge
          key={i}
          variant="secondary"
          className="gap-1 pl-2.5 pr-1 py-1"
          style={c.color ? { backgroundColor: `${c.color}22`, color: c.color, borderColor: `${c.color}55` } : undefined}
        >
          {c.label}
          <button
            onClick={c.clear}
            className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5 transition-colors"
            aria-label={`Remover filtro ${c.label}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAll}>
        Limpar tudo
      </Button>
    </div>
  );
}
