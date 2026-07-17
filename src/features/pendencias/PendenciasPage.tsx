import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Filter, ListChecks, Search, ShieldAlert, XCircle, Eye, BookOpen } from 'lucide-react';
import FeatureGuideCard from '@/components/FeatureGuideCard';
import { NeovaleStatCard } from '@/components/ui/NeovaleStatCard';
import { PageHeader } from '@/components/PageHeader';
import { usePendencias, PendencyPriority, PendencyModule } from './hooks/usePendencias';
import { cn } from '@/lib/utils';

const priorityConfig: Record<PendencyPriority, { label: string; color: string; icon: React.ReactNode }> = {
  critica: { label: 'Crítica', color: 'bg-destructive text-destructive-foreground', icon: <ShieldAlert className="h-3.5 w-3.5" /> },
  alta: { label: 'Alta', color: 'bg-destructive/80 text-destructive-foreground', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  media: { label: 'Média', color: 'bg-accent text-accent-foreground', icon: <Clock className="h-3.5 w-3.5" /> },
  baixa: { label: 'Baixa', color: 'bg-muted text-muted-foreground', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
};

const moduleLabels: Record<PendencyModule, string> = {
  planejamento: 'Planejamento',
  orientacoes: 'Orientações',
  frequencia: 'Frequência',
  notas: 'Notas',
};

export default function PendenciasPage() {
  const { pendencies, kpis, loading, filters, setFilters, schools, professors, isProfessor } = usePendencias();
  const [showFilters, setShowFilters] = useState(false);

  const kpiCards: Array<{ label: string; value: number; icon: any; tone: 'neutral' | 'danger' | 'warning' | 'info' }> = [
    { label: 'Total', value: kpis.total, icon: ListChecks, tone: 'neutral' },
    { label: 'Críticas', value: kpis.critical, icon: ShieldAlert, tone: 'danger' },
    { label: 'Em atraso', value: kpis.overdue, icon: XCircle, tone: 'danger' },
    { label: 'Hoje', value: kpis.today, icon: Clock, tone: 'warning' },
  ];

  return (
    <div className="space-y-5">
      <FeatureGuideCard title="Como usar a Central de Pendências" steps={[
        { icon: ListChecks, title: 'Visão geral', description: 'Veja tudo que precisa da sua atenção reunido em um só lugar.', color: 'blue' },
        { icon: ShieldAlert, title: 'Prioridades', description: 'Itens são classificados por prioridade: crítica, alta, média e baixa.', color: 'red' },
        { icon: ArrowRight, title: 'Ação direta', description: 'Clique no botão de ação para ir direto ao item que precisa resolver.', color: 'green' },
        { icon: Filter, title: 'Filtrar pendências', description: 'Filtre por módulo, prioridade, escola ou professor.', color: 'purple' },
      ]} />
      <PageHeader
        breadcrumbs={[{ label: 'Início' }, { label: 'Pendências' }]}
        title="Central de Pendências"
        description="Tudo que precisa da sua atenção em um só lugar"
        icon={ListChecks}
        variant="hero"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiCards.map((k, i) => (
          <NeovaleStatCard
            key={k.label}
            label={k.label}
            value={k.value}
            icon={k.icon}
            tone={k.tone}
            loading={loading}
            index={i}
          />
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar pendência..."
                className="pl-9"
                value={filters.search || ''}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-1" /> Filtros
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t">
              <Select value={filters.module || 'all'} onValueChange={v => setFilters(f => ({ ...f, module: v === 'all' ? undefined : v as PendencyModule }))}>
                <SelectTrigger><SelectValue placeholder="Módulo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os módulos</SelectItem>
                  <SelectItem value="planejamento">Planejamento</SelectItem>
                  <SelectItem value="orientacoes">Orientações</SelectItem>
                  <SelectItem value="frequencia">Frequência</SelectItem>
                  <SelectItem value="notas">Notas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.priority || 'all'} onValueChange={v => setFilters(f => ({ ...f, priority: v === 'all' ? undefined : v as PendencyPriority }))}>
                <SelectTrigger><SelectValue placeholder="Prioridade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as prioridades</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.schoolId || 'all'} onValueChange={v => setFilters(f => ({ ...f, schoolId: v === 'all' ? undefined : v }))}>
                <SelectTrigger><SelectValue placeholder="Escola" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as escolas</SelectItem>
                  {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>

              {!isProfessor && (
                <Select value={filters.professorId || 'all'} onValueChange={v => setFilters(f => ({ ...f, professorId: v === 'all' ? undefined : v }))}>
                  <SelectTrigger><SelectValue placeholder="Professor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os professores</SelectItem>
                    {professors.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Críticas', fn: () => setFilters(f => ({ ...f, priority: f.priority === 'critica' ? undefined : 'critica' as PendencyPriority })), active: filters.priority === 'critica', variant: 'destructive' as const },
          { label: 'Planejamento', fn: () => setFilters(f => ({ ...f, module: f.module === 'planejamento' ? undefined : 'planejamento' as PendencyModule })), active: filters.module === 'planejamento' },
          { label: 'Orientações', fn: () => setFilters(f => ({ ...f, module: f.module === 'orientacoes' ? undefined : 'orientacoes' as PendencyModule })), active: filters.module === 'orientacoes' },
          { label: 'Frequência', fn: () => setFilters(f => ({ ...f, module: f.module === 'frequencia' ? undefined : 'frequencia' as PendencyModule })), active: filters.module === 'frequencia' },
          { label: 'Limpar filtros', fn: () => setFilters({}), active: false },
        ].map(qf => (
          <Button
            key={qf.label}
            variant={qf.active ? (qf.variant || 'default') : 'outline'}
            size="sm"
            onClick={qf.fn}
            className="text-xs h-7"
          >
            {qf.label}
          </Button>
        ))}
      </div>

      {/* Pendencies List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            Pendências ({pendencies.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : pendencies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 className="h-12 w-12 text-primary mb-3" />
              <p className="text-lg font-semibold text-foreground">Tudo em dia!</p>
              <p className="text-sm text-muted-foreground mt-1">Nenhuma pendência encontrada com os filtros selecionados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Prioridade</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="hidden md:table-cell">Módulo</TableHead>
                    <TableHead className="hidden lg:table-cell">Escola</TableHead>
                    <TableHead className="hidden lg:table-cell">Turma / Disciplina</TableHead>
                    {!isProfessor && <TableHead className="hidden xl:table-cell">Professor</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-[120px]">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendencies.map(p => {
                    const pc = priorityConfig[p.priority];
                    return (
                      <TableRow key={p.id} className={cn(p.priority === 'critica' && 'bg-destructive/5')}>
                        <TableCell>
                          <Badge className={cn("text-[10px] gap-1", pc.color)}>
                            {pc.icon} {pc.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium text-foreground">{p.type}</p>
                            <p className="text-xs text-muted-foreground">{p.description}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className="text-[10px]">{moduleLabels[p.module]}</Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{p.schoolName || '—'}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                          {[p.classGroupName, p.subjectName].filter(Boolean).join(' / ') || '—'}
                        </TableCell>
                        {!isProfessor && (
                          <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">{p.professorName || '—'}</TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">{p.status}</span>
                            {p.daysOverdue && p.daysOverdue > 0 && (
                              <Badge variant="destructive" className="text-[9px] px-1.5 py-0">{p.daysOverdue}d atraso</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="ghost" className="text-xs h-7 gap-1 text-primary hover:text-primary">
                            <Link to={p.actionUrl}>
                              {p.actionLabel} <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
