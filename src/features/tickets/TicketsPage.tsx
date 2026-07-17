import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiAdapter } from '@/lib/api-adapter';
import { ticketsApi } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { isManagerRole } from '@/lib/roles';
import { useProfessorId } from '@/hooks/useProfessorId';
import { useKanbanLists } from './hooks/useKanbanData';
import { useTicketFilters, type TicketView } from './hooks/useTicketFilters';
import { useTicketActivity } from './hooks/useTicketActivity';
import { useTicketsRealtime } from './hooks/useTicketsRealtime';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Search, Ticket, LayoutList, Kanban as KanbanIcon, ChevronDown, ChevronRight, Keyboard, Filter, Clock, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { differenceInHours, subDays, differenceInDays } from 'date-fns';
import { KanbanBoard } from './components/KanbanBoard';
import { TicketsKpiBar } from './components/TicketsKpiBar';
import { TicketsFilterSheet } from './components/TicketsFilterSheet';
import { TicketsActiveChips } from './components/TicketsActiveChips';
import { TicketListItem } from './components/TicketListItem';
import { TicketBulkActionBar } from './components/TicketBulkActionBar';
import { useTicketLabels, useTicketsLabelsMap } from './hooks/useTicketLabels';

const statusLabels: Record<string, string> = {
  aberto: 'Aberto',
  em_atendimento: 'Em Atendimento',
  aguardando_escola: 'Aguardando Escola',
  resolvido: 'Resolvido',
  cancelado: 'Cancelado',
};

const statusColors: Record<string, string> = {
  aberto: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  em_atendimento: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  aguardando_escola: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  resolvido: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelado: 'bg-muted text-muted-foreground',
};

const priorityLabels: Record<string, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica',
};

const priorityColors: Record<string, string> = {
  baixa: 'bg-muted text-muted-foreground',
  media: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  alta: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  critica: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const CLOSED = ['resolvido', 'cancelado'];

export default function TicketsPage() {
  const { organizationId, userRole } = useOrganization();
  const { user } = useAuth();
  const { professorId } = useProfessorId();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const defaultView: TicketView = userRole === 'professor' ? 'mine' : 'all';
  const { filters, update, toggleLabel, clearAdvanced, activeAdvancedCount, hasViewParam } = useTicketFilters(defaultView);

  const { lists: kanbanLists } = useKanbanLists(organizationId);
  useTicketsRealtime(organizationId);
  const { labels: labelsCatalog } = useTicketLabels(organizationId);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // Fixa o recorte desde o primeiro carregamento
  useEffect(() => {
    if (!hasViewParam && userRole) {
      update({ view: defaultView });
    }
  }, [hasViewParam, userRole, defaultView, update]);

  // Professor: get their schools
  const { data: professorSchools = [] } = useQuery({
    queryKey: ['professor-schools', professorId],
    queryFn: async () => {
      if (!professorId) return [];
      return ticketsApi.getProfessorSchools(professorId);
    },
    enabled: !!professorId && userRole === 'professor',
  });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets', organizationId, userRole, user?.id],
    queryFn: async () => {
      if (!organizationId) return [];
      return ticketsApi.getTickets(organizationId, userRole, user?.id);
    },
    enabled: !!organizationId && (userRole !== 'professor' || !!user?.id),
  });

  // Tickets onde o usuário foi adicionado via ticket_assignees
  const { data: assignedTicketIds = [] } = useQuery({
    queryKey: ['my-assignee-tickets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return ticketsApi.getAssignedTicketIds(user.id);
    },
    enabled: !!user?.id,
  });
  const assignedSet = useMemo(() => new Set(assignedTicketIds), [assignedTicketIds]);

  const { data: schools = [] } = useQuery({
    queryKey: ['schools-for-tickets', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      return ApiAdapter.escolas.getAll({ status: 'ativo' });
    },
    enabled: !!organizationId,
  });

  const schoolsMap = useMemo(() => {
    const m: Record<string, string> = {};
    schools.forEach((s: any) => { m[s.id] = s.nome; });
    return m;
  }, [schools]);

  const { data: ticketsWithMedia = [] } = useQuery({
    queryKey: ['tickets-with-media', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      return ticketsApi.getTicketsWithMedia(organizationId);
    },
    enabled: !!organizationId && filters.media,
  });

  // Activity (messages/attachments per ticket) for list view
  const ticketIds = useMemo(() => tickets.map((t: any) => t.id), [tickets]);
  const { data: activityMap } = useTicketActivity(filters.viewMode === 'list' ? ticketIds : []);
  const { data: labelsByTicket = {} } = useTicketsLabelsMap(ticketIds);

  // Apply view (tabs) — base filtering by role-based pre-set
  const viewFiltered = useMemo(() => {
    return tickets.filter((t: any) => {
      switch (filters.view) {
        case 'mine':
          // criados por mim ou eu sou o autor externo (no caso de externos não há user, então só created_by)
          return t.opened_by_id === user?.id;
        case 'assigned':
          return t.nexa_responsible_id === user?.id || t.school_responsible_id === user?.id || assignedSet.has(t.id);
        case 'unassigned':
          return !CLOSED.includes(t.status) && !t.nexa_responsible_id && !t.school_responsible_id;
        case 'critical': {
          const hours = differenceInHours(new Date(), new Date(t.updated_at || t.created_at));
          return !CLOSED.includes(t.status) && (
            t.priority === 'critica' ||
            (['critica', 'alta'].includes(t.priority) && hours >= 24)
          );
        }
        case 'all':
        default:
          return true;
      }
    });
  }, [tickets, filters.view, user?.id, assignedSet]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    const now = new Date();
    return {
      mine: tickets.filter((t: any) => t.opened_by_id === user?.id).length,
      assigned: tickets.filter((t: any) => t.nexa_responsible_id === user?.id || t.school_responsible_id === user?.id || assignedSet.has(t.id)).length,
      unassigned: tickets.filter((t: any) => !CLOSED.includes(t.status) && !t.nexa_responsible_id && !t.school_responsible_id).length,
      critical: tickets.filter((t: any) => {
        const h = differenceInHours(now, new Date(t.updated_at || t.created_at));
        return !CLOSED.includes(t.status) && (t.priority === 'critica' || (['critica', 'alta'].includes(t.priority) && h >= 24));
      }).length,
      all: tickets.length,
    };
  }, [tickets, user?.id, assignedSet]);

  // Apply advanced filters + KPI active filter (encoded in status/priority)
  const filtered = useMemo(() => {
    const PRIORITY_ORDER: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3 };
    const now = new Date();
    const list = viewFiltered.filter((t: any) => {
      // KPI recorte (toggle do topo) — Em aberto / SLA risco / Atrasados / Resolvidos
      if (filters.kpi && filters.kpi !== 'all') {
        const isClosed = CLOSED.includes(t.status);
        const hoursSince = differenceInHours(now, new Date(t.updated_at || t.created_at));
        if (filters.kpi === 'open' && isClosed) return false;
        if (filters.kpi === 'risk' && (isClosed || !['critica', 'alta'].includes(t.priority) || hoursSince < 24)) return false;
        if (filters.kpi === 'overdue' && (isClosed || hoursSince < 72)) return false;
        if (filters.kpi === 'resolved' && t.status !== 'resolvido') return false;
      }
      if (filters.status !== 'all' && t.status !== filters.status) return false;
      if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
      if (filters.schoolId !== 'all' && t.school_id !== filters.schoolId) return false;
      if (filters.type !== 'all' && t.type !== filters.type) return false;
      if (filters.media && !ticketsWithMedia.includes(t.id)) return false;
      if (filters.responsible === 'nexa' && !t.nexa_responsible_id) return false;
      if (filters.responsible === 'escola' && !t.school_responsible_id) return false;
      if (filters.responsible === 'externo' && !t.external_author_name) return false;
      if (filters.labels.length > 0) {
        const tLabels = labelsByTicket[t.id] || [];
        if (!filters.labels.some(id => tLabels.includes(id))) return false;
      }
      if (filters.dueFilter !== 'all') {
        if (!t.due_date) return false;
        const days = differenceInDays(new Date(t.due_date), new Date());
        if (filters.dueFilter === 'overdue' && days >= 0) return false;
        if (filters.dueFilter === 'dueSoon' && (days < 0 || days > 2)) return false;
      }
      if (filters.search) {
        const s = filters.search.toLowerCase();
        return (
          t.title?.toLowerCase().includes(s) ||
          t.external_author_name?.toLowerCase().includes(s) ||
          t.id?.toLowerCase().startsWith(s.replace(/^#/, ''))
        );
      }
      return true;
    });
    // Ordenação: resolvidos/cancelados sempre por último.
    // Abertos: por prioridade (crítica → baixa) e, dentro da prioridade, do mais antigo para o mais recente.
    return [...list].sort((a: any, b: any) => {
      const aClosed = CLOSED.includes(a.status) ? 1 : 0;
      const bClosed = CLOSED.includes(b.status) ? 1 : 0;
      if (aClosed !== bClosed) return aClosed - bClosed;
      if (aClosed === 1) {
        // entre fechados: mais recentes primeiro (atualização)
        return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
      }
      const pa = PRIORITY_ORDER[a.priority] ?? 99;
      const pb = PRIORITY_ORDER[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;
      // mais antigo primeiro
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [viewFiltered, filters, ticketsWithMedia, labelsByTicket]);

  // KPI active key derived from current filters
  const activeKpiKey = useMemo<'open' | 'risk' | 'overdue' | 'resolved' | null>(() => {
    if (filters.kpi && filters.kpi !== 'all') return filters.kpi;
    return null;
  }, [filters.kpi]);

  // KPI handlers — alternam o recorte; reclicar limpa
  const toggleKpi = (key: 'open' | 'risk' | 'overdue' | 'resolved') =>
    update({ kpi: filters.kpi === key ? 'all' : key });
  const onClickOpen = () => toggleKpi('open');
  const onClickInRisk = () => toggleKpi('risk');
  const onClickOverdue = () => toggleKpi('overdue');
  const onClickResolved = () => toggleKpi('resolved');

  // Grouped data for list view
  const grouped = useMemo(() => {
    if (filters.groupBy === 'none') return null;
    const map = new Map<string, any[]>();
    filtered.forEach((t: any) => {
      let key = '—';
      if (filters.groupBy === 'school') key = t.schools?.nome || (t.type === 'interno' ? 'Interno' : 'Sem escola');
      else if (filters.groupBy === 'priority') key = priorityLabels[t.priority] || '—';
      else if (filters.groupBy === 'status') key = statusLabels[t.status] || '—';
      else if (filters.groupBy === 'responsible') {
        if (t.nexa_responsible_id) key = 'Resp. Neovale';
        else if (t.school_responsible_id) key = 'Resp. Escola';
        else if (t.external_author_name) key = 'Origem externa';
        else key = 'Sem responsável';
      }
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered, filters.groupBy]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
        if (e.key === 'Escape' && target === searchInputRef.current) {
          update({ search: '' });
          searchInputRef.current?.blur();
        }
        return;
      }
      if (e.key === '/') { e.preventDefault(); searchInputRef.current?.focus(); }
      else if (e.key === 'k') {
        e.preventDefault();
        const qs = new URLSearchParams(window.location.search);
        qs.set('mode', 'kanban');
        navigate(`/tickets/kanban?${qs.toString()}`);
      }
      else if (e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        update({ dueFilter: filters.dueFilter === 'overdue' ? 'all' : 'overdue' });
      }
      else if (e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        update({ dueFilter: filters.dueFilter === 'dueSoon' ? 'all' : 'dueSoon' });
      }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a' && filters.viewMode === 'list' && filtered.length > 0) {
        e.preventDefault();
        setSelectedIds(new Set(filtered.map((t: any) => t.id)));
      }
      else if (e.key === 'Escape') {
        if (selectedIds.size > 0) setSelectedIds(new Set());
        else clearAdvanced();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filters.viewMode, filters.dueFilter, update, clearAdvanced, selectedIds.size, filtered]);

  // Limpa seleção ao mudar de aba ou recorte
  useEffect(() => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }, [filters.view, filters.search, filters.status, filters.priority, filters.type, filters.schoolId, filters.responsible, filters.media, filters.labels, filters.dueFilter, filters.kpi]);

  // Seleção com suporte a shift-click (range)
  const toggleSelect = (id: string, shiftKey: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (shiftKey && lastSelectedId && filtered.length > 0) {
        const ids = filtered.map((t: any) => t.id);
        const startIdx = ids.indexOf(lastSelectedId);
        const endIdx = ids.indexOf(id);
        if (startIdx !== -1 && endIdx !== -1) {
          const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
          const shouldAdd = !next.has(id);
          for (let i = from; i <= to; i++) {
            if (shouldAdd) next.add(ids[i]);
            else next.delete(ids[i]);
          }
          setLastSelectedId(id);
          return next;
        }
      }
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setLastSelectedId(id);
      return next;
    });
  };

  const selectedTickets = useMemo(
    () => filtered.filter((t: any) => selectedIds.has(t.id)),
    [filtered, selectedIds],
  );

  const showSchoolAndResponsible = isManagerRole(userRole);

  const tabs: { value: TicketView; label: string; count: number }[] = [
    { value: 'mine', label: 'Meus', count: tabCounts.mine },
    { value: 'assigned', label: 'Atribuídos a mim', count: tabCounts.assigned },
    { value: 'unassigned', label: 'Não atribuídos', count: tabCounts.unassigned },
    { value: 'critical', label: 'Críticos', count: tabCounts.critical },
    { value: 'all', label: 'Todos', count: tabCounts.all },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumbs={[{ label: 'Tickets' }]}
        title="Central de Tickets"
        description="Acompanhe e gerencie os chamados internos e das escolas"
        icon={Ticket}
        actions={
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Keyboard className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <div className="space-y-0.5">
                    <div className="font-semibold mb-1">Geral</div>
                    <div><kbd className="font-mono">/</kbd> focar busca</div>
                    <div><kbd className="font-mono">k</kbd> alternar lista/kanban</div>
                    <div><kbd className="font-mono">Shift+O</kbd> alternar atrasados</div>
                    <div><kbd className="font-mono">Shift+D</kbd> alternar vencem ≤2d</div>
                    <div><kbd className="font-mono">Ctrl/⌘+A</kbd> selecionar tudo (lista)</div>
                    <div><kbd className="font-mono">Esc</kbd> limpar seleção/filtros</div>
                    <div className="font-semibold mt-2 mb-1 pt-1 border-t">Card aberto</div>
                    <div><kbd className="font-mono">L</kbd> etiquetas · <kbd className="font-mono">D</kbd> datas</div>
                    <div><kbd className="font-mono">M</kbd> checklist · <kbd className="font-mono">C</kbd> resolver</div>
                    <div><kbd className="font-mono">Espaço</kbd> seguir/parar de seguir</div>
                    <div className="pt-1 border-t mt-1 text-muted-foreground">Shift+Click: selecionar intervalo</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="flex items-center border rounded-lg overflow-hidden">
              <Button
                variant={filters.viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none h-9 px-3"
                onClick={() => update({ viewMode: 'list' })}
              >
                <LayoutList className="h-4 w-4 mr-1.5" /> Lista
              </Button>
              <Button
                variant={filters.viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none h-9 px-3"
                onClick={() => {
                  const qs = new URLSearchParams(window.location.search);
                  qs.set('mode', 'kanban');
                  navigate(`/tickets/kanban?${qs.toString()}`);
                }}
              >
                <KanbanIcon className="h-4 w-4 mr-1.5" /> Kanban
              </Button>
            </div>
            <Link to="/tickets/novo">
              <Button><Plus className="h-4 w-4 mr-2" /> Novo Ticket</Button>
            </Link>
          </>
        }
      />

      {/* KPIs */}
      <TicketsKpiBar
        tickets={tickets}
        activeKey={activeKpiKey}
        onClickOpen={onClickOpen}
        onClickInRisk={onClickInRisk}
        onClickOverdue={onClickOverdue}
        onClickResolved={onClickResolved}
      />

      {/* Tabs de visão */}
      <Tabs value={filters.view} onValueChange={(v) => update({ view: v as TicketView })}>
        <TabsList className="h-auto p-1 flex flex-wrap gap-1 bg-muted/60">
          {tabs.map(t => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 px-3 py-1.5"
            >
              {t.label}
              <span className="text-[10px] tabular-nums opacity-70">{t.count}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search + filter button + chips */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                className="pl-9 pr-12"
                placeholder="Buscar por título, autor ou #ID..."
                value={filters.search}
                onChange={e => update({ search: e.target.value })}
              />
              <kbd className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 items-center justify-center rounded border bg-muted text-[10px] font-mono text-muted-foreground">
                /
              </kbd>
            </div>
            <Button
              variant={filters.dueFilter === 'overdue' ? 'default' : 'outline'}
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => update({ dueFilter: filters.dueFilter === 'overdue' ? 'all' : 'overdue' })}
              title="Atrasados (Shift+O)"
            >
              <AlertTriangle className="h-4 w-4" /> Atrasados
            </Button>
            <Button
              variant={filters.dueFilter === 'dueSoon' ? 'default' : 'outline'}
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => update({ dueFilter: filters.dueFilter === 'dueSoon' ? 'all' : 'dueSoon' })}
              title="Vencem em até 2 dias (Shift+D)"
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
          <TicketsActiveChips
            filters={filters}
            update={update}
            clearAll={clearAdvanced}
            schoolsMap={schoolsMap}
            statusLabels={statusLabels}
            priorityLabels={priorityLabels}
            labelsCatalog={labelsCatalog}
          />
        </CardContent>
      </Card>

      {/* Bulk action bar (aparece quando há seleção) */}
      {selectedIds.size > 0 && filters.viewMode === 'list' && (
        <TicketBulkActionBar
          selectedIds={Array.from(selectedIds)}
          selectedTickets={selectedTickets}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      {/* Resultado / contagem */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Exibindo <strong className="text-foreground">{filtered.length}</strong> de {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
          {filters.viewMode === 'list' && filtered.length > 0 && (
            <button
              onClick={() => {
                if (selectedIds.size === filtered.length) setSelectedIds(new Set());
                else setSelectedIds(new Set(filtered.map((t: any) => t.id)));
              }}
              className="ml-3 text-primary hover:underline font-medium"
            >
              {selectedIds.size === filtered.length ? 'Desmarcar todos' : 'Selecionar todos'}
            </button>
          )}
        </span>
        {filters.viewMode === 'list' && filters.groupBy !== 'none' && (
          <span>Agrupado por <strong className="text-foreground capitalize">{filters.groupBy}</strong></span>
        )}
      </div>

      {/* Content */}
      {filters.viewMode === 'kanban' ? (
        <>
          {(activeAdvancedCount > 0 || filters.view !== 'all' || filters.search) && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 border text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5 shrink-0 text-foreground/70" />
              <span>
                Kanban exibindo <strong className="text-foreground">{filtered.length}</strong> de {tickets.length} cards.
                As colunas mostram apenas os tickets que correspondem à aba e filtros ativos.
              </span>
            </div>
          )}
          <div className="bg-neovale-board relative rounded-lg p-3 -mx-1">
            <KanbanBoard lists={kanbanLists} tickets={filtered} />
          </div>
        </>
      ) : isLoading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Ticket className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">Nenhum ticket encontrado</p>
            <p className="text-sm">Ajuste os filtros ou crie um novo ticket.</p>
            {(activeAdvancedCount > 0 || filters.search) && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => { clearAdvanced(); update({ search: '' }); }}>
                Limpar filtros
              </Button>
            )}
          </CardContent>
        </Card>
      ) : grouped ? (
        <div className="space-y-4">
          {grouped.map(([groupName, items]) => {
            const collapsed = collapsedGroups[groupName];
            return (
              <div key={groupName} className="space-y-2">
                <button
                  onClick={() => setCollapsedGroups(p => ({ ...p, [groupName]: !p[groupName] }))}
                  className="w-full flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors px-1"
                >
                  {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span>{groupName}</span>
                  <span className="text-xs font-normal text-muted-foreground">({items.length})</span>
                  <div className="flex-1 border-t ml-2" />
                </button>
                {!collapsed && (
                  <div className="space-y-2.5">
                    {items.map(ticket => (
                      <TicketListItem
                        key={ticket.id}
                        ticket={ticket}
                        activity={activityMap?.get(ticket.id)}
                        statusLabels={statusLabels}
                        statusColors={statusColors}
                        priorityLabels={priorityLabels}
                        priorityColors={priorityColors}
                        selected={selectedIds.has(ticket.id)}
                        onToggleSelect={toggleSelect}
                        selectionActive={selectedIds.size > 0}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((ticket: any) => (
            <TicketListItem
              key={ticket.id}
              ticket={ticket}
              activity={activityMap?.get(ticket.id)}
              statusLabels={statusLabels}
              statusColors={statusColors}
              priorityLabels={priorityLabels}
              priorityColors={priorityColors}
              selected={selectedIds.has(ticket.id)}
              onToggleSelect={toggleSelect}
              selectionActive={selectedIds.size > 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
