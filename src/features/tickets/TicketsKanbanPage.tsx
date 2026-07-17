import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Kanban as KanbanIcon, Search, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrganization } from '@/hooks/useOrganization';
import { isManagerRole } from '@/lib/roles';
import { KanbanBoard } from './components/KanbanBoard';
import { useKanbanLists } from './hooks/useKanbanData';
import { useTicketsRealtime } from './hooks/useTicketsRealtime';
import { useTicketFilters, type TicketView } from './hooks/useTicketFilters';
import { useFilteredTickets } from './hooks/useFilteredTickets';
import { TicketsActiveChips } from './components/TicketsActiveChips';
import { TicketsFilterSheet } from './components/TicketsFilterSheet';
import { useTicketLabels } from './hooks/useTicketLabels';
import { useQuery } from '@tanstack/react-query';
import { ticketApi } from '@/features/tickets/api';
import { useMemo, useRef } from 'react';

const statusLabels: Record<string, string> = {
  aberto: 'Aberto',
  em_atendimento: 'Em Atendimento',
  aguardando_escola: 'Aguardando Escola',
  resolvido: 'Resolvido',
  cancelado: 'Cancelado',
};
const priorityLabels: Record<string, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica',
};

/**
 * Tela dedicada e fullscreen do Kanban de Tickets.
 * Inclui TODOS os filtros da Central (abas, busca, Atrasados/≤2d, sheet avançado, chips),
 * sincronizados na URL via useTicketFilters — mesmos cards filtrados que a TicketsPage.
 */
export default function TicketsKanbanPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { organizationId, userRole } = useOrganization();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useTicketsRealtime(organizationId);
  const { lists: kanbanLists } = useKanbanLists(organizationId);

  const defaultView: TicketView = userRole === 'professor' ? 'mine' : 'all';
  const { filters, update, toggleLabel, clearAdvanced, activeAdvancedCount } = useTicketFilters(defaultView);
  const { filtered, isLoading, tabCounts } = useFilteredTickets(filters);
  const { labels: labelsCatalog } = useTicketLabels(organizationId);

  const { data: schools = [] } = useQuery({
    queryKey: ['schools-for-tickets', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from('schools')
        .select('id, nome')
        .eq('organization_id', organizationId)
        .eq('status', 'ativo')
        .order('nome');
      return data || [];
    },
    enabled: !!organizationId,
  });
  const schoolsMap = useMemo(() => {
    const m: Record<string, string> = {};
    schools.forEach((s: any) => { m[s.id] = s.nome; });
    return m;
  }, [schools]);

  const showSchoolAndResponsible = isManagerRole(userRole);

  const tabs: { value: TicketView; label: string; count: number }[] = [
    { value: 'mine', label: 'Meus', count: tabCounts.mine },
    { value: 'assigned', label: 'Atribuídos a mim', count: tabCounts.assigned },
    { value: 'unassigned', label: 'Não atribuídos', count: tabCounts.unassigned },
    { value: 'critical', label: 'Críticos', count: tabCounts.critical },
    { value: 'all', label: 'Todos', count: tabCounts.all },
  ];

  const handleBack = () => {
    const params = new URLSearchParams(location.search);
    params.set('mode', 'list');
    navigate(`/tickets?${params.toString()}`);
  };

  return (
    <div className="min-h-screen w-screen flex flex-col bg-background">
      {/* Topo: voltar + título + contador */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-2 min-w-0">
          <KanbanIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <h1 className="text-sm font-semibold truncate">Kanban de Tickets</h1>
        </div>
        <div className="ml-auto text-xs text-muted-foreground tabular-nums">
          {filtered.length} card{filtered.length !== 1 ? 's' : ''}
        </div>
      </header>

      {/* Barra de filtros completa */}
      <div className="shrink-0 border-b bg-muted/10 px-3 py-2 space-y-2">
        <Tabs value={filters.view} onValueChange={(v) => update({ view: v as TicketView })}>
          <TabsList className="h-auto p-1 flex flex-wrap gap-1 bg-muted/60">
            {tabs.map(t => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 px-3 py-1 text-xs"
              >
                {t.label}
                <span className="text-[10px] tabular-nums opacity-70">{t.count}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              className="pl-9 h-9"
              placeholder="Buscar por título, autor ou #ID..."
              value={filters.search}
              onChange={e => update({ search: e.target.value })}
            />
          </div>
          <Button
            variant={filters.dueFilter === 'overdue' ? 'default' : 'outline'}
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => update({ dueFilter: filters.dueFilter === 'overdue' ? 'all' : 'overdue' })}
          >
            <AlertTriangle className="h-4 w-4" /> Atrasados
          </Button>
          <Button
            variant={filters.dueFilter === 'dueSoon' ? 'default' : 'outline'}
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => update({ dueFilter: filters.dueFilter === 'dueSoon' ? 'all' : 'dueSoon' })}
          >
            <Clock className="h-4 w-4" /> ≤ 2d
          </Button>
          <TicketsFilterSheet
            filters={filters}
            update={update}
            toggleLabel={toggleLabel}
            clearAll={clearAdvanced}
            activeCount={activeAdvancedCount}
            schools={schools as any}
            showSchoolAndResponsible={showSchoolAndResponsible}
            statusLabels={statusLabels}
            priorityLabels={priorityLabels}
            labelsCatalog={labelsCatalog}
          />
        </div>

        {(activeAdvancedCount > 0 || filters.labels.length > 0 || filters.dueFilter !== 'all') && (
          <TicketsActiveChips
            filters={filters}
            update={update}
            clearAll={clearAdvanced}
            schoolsMap={schoolsMap}
            statusLabels={statusLabels}
            priorityLabels={priorityLabels}
            labelsCatalog={labelsCatalog}
          />
        )}
      </div>

      {/* Board */}
      <main className="flex-1 min-h-0 px-3 pt-3 bg-neovale-board relative">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="h-full">
            <KanbanBoard lists={kanbanLists} tickets={filtered} />
          </div>
        )}
      </main>
    </div>
  );
}
