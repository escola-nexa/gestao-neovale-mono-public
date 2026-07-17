import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { KpiCard } from '@/components/bi/KpiCard';
import { ChartCard } from '@/components/bi/ChartCard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Wallet,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Receipt,
  HandCoins,
  CalendarClock,
  Filter,
} from 'lucide-react';
import { useFinancialDashboard, FinancialDashboardFilters } from './dashboard/useFinancialDashboard';
import {
  useFinancialCostCenters,
  useFinancialProjects,
  useSchoolsLite,
} from './cadastros/useFinancialRegisters';
import { useAuth } from '@/contexts/AuthContext';
import { FINANCEIRO_HUB_ITEMS, FIN_HUB_ICON } from './hubItems';

function brl(n?: number | null) {
  return (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function monthLabel(ym: string) {
  // ym: 'YYYY-MM'
  const [y, m] = ym.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
}

function defaultRange(): { start: string; end: string } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

export default function FinanceiroHubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'admin';

  const [filters, setFilters] = useState<FinancialDashboardFilters>(() => {
    const r = defaultRange();
    return { start: r.start, end: r.end, schoolId: null, costCenterId: null, projectId: null };
  });

  const { data, isLoading, error } = useFinancialDashboard(filters);
  const { data: schools = [] } = useSchoolsLite();
  const { data: costCenters = [] } = useFinancialCostCenters();
  const { data: projects = [] } = useFinancialProjects();

  const denied = (data as any)?.error === 'permission_denied';

  const hubItems = useMemo(
    () => FINANCEIRO_HUB_ITEMS.filter((i) => !i.adminOnly || isAdmin),
    [isAdmin],
  );

  const flow = data?.flow_by_month ?? [];
  const chartData = flow.map((f) => ({
    month: monthLabel(f.month),
    Saídas: Number(f.expense),
    Entradas: Number(f.income),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FIN_HUB_ICON}
        title="Financeiro"
        description="Visão geral do módulo Financeiro global da organização."
      />

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label className="text-xs">Início</Label>
            <Input
              type="date"
              value={filters.start ?? ''}
              onChange={(e) => setFilters({ ...filters, start: e.target.value || null })}
            />
          </div>
          <div>
            <Label className="text-xs">Fim</Label>
            <Input
              type="date"
              value={filters.end ?? ''}
              onChange={(e) => setFilters({ ...filters, end: e.target.value || null })}
            />
          </div>
          <div>
            <Label className="text-xs">Escola</Label>
            <SearchableSelect
              value={filters.schoolId ?? ''}
              onValueChange={(v) => setFilters({ ...filters, schoolId: v || null })}
              options={[
                { value: '', label: 'Todas as escolas' },
                ...schools.map((s: any) => ({ value: s.id, label: s.name })),
              ]}
              placeholder="Todas as escolas"
            />
          </div>
          <div>
            <Label className="text-xs">Centro de custo</Label>
            <SearchableSelect
              value={filters.costCenterId ?? ''}
              onValueChange={(v) => setFilters({ ...filters, costCenterId: v || null })}
              options={[
                { value: '', label: 'Todos' },
                ...costCenters.map((c) => ({ value: c.id, label: c.name })),
              ]}
              placeholder="Todos"
            />
          </div>
          <div>
            <Label className="text-xs">Projeto</Label>
            <SearchableSelect
              value={filters.projectId ?? ''}
              onValueChange={(v) => setFilters({ ...filters, projectId: v || null })}
              options={[
                { value: '', label: 'Todos' },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
              placeholder="Todos"
            />
          </div>
        </CardContent>
      </Card>

      {denied && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Sem permissão</AlertTitle>
          <AlertDescription>
            Você não tem permissão para visualizar os indicadores financeiros.
          </AlertDescription>
        </Alert>
      )}

      {!denied && (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Total a pagar"
              value={brl(data?.kpis.total_a_pagar)}
              subtitle={`${data?.substitutions.pending_count ?? 0} obrigação(ões)`}
              icon={Receipt}
              variant="warning"
              loading={isLoading}
            />
            <KpiCard
              title="Vencido"
              value={brl(data?.kpis.vencido)}
              subtitle={`${data?.substitutions.overdue_count ?? 0} vencido(s)`}
              icon={AlertTriangle}
              variant="danger"
              loading={isLoading}
            />
            <KpiCard
              title="A receber"
              value={brl(data?.kpis.a_receber)}
              subtitle="Fase futura"
              icon={HandCoins}
              variant="info"
              loading={isLoading}
            />
            <KpiCard
              title="Saldo projetado"
              value={brl(data?.kpis.saldo_projetado)}
              subtitle={`Saldo em contas: ${brl(data?.kpis.saldo_contas)}`}
              icon={PiggyBank}
              variant="success"
              loading={isLoading}
            />
          </div>

          {/* Alertas */}
          {(data?.alerts?.length ?? 0) > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {data!.alerts.map((a, i) => (
                <Alert
                  key={i}
                  variant={a.severity === 'high' ? 'destructive' : 'default'}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{a.title}</AlertTitle>
                  <AlertDescription>
                    {a.message}
                    {a.amount ? ` — ${brl(a.amount)}` : ''}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Gráfico + próximos vencimentos */}
          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard
              title="Entradas e Saídas (mensal)"
              subtitle="Soma de pagamentos concluídos por mês"
              className="lg:col-span-2"
              loading={isLoading}
            >
              {chartData.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
                  Sem dados no período selecionado.
                </div>
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickFormatter={(v) => brl(v)}
                        width={90}
                      />
                      <Tooltip
                        formatter={(v: any) => brl(Number(v))}
                        contentStyle={{
                          background: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 8,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="Entradas"
                        stroke="hsl(var(--primary))"
                        fill="url(#gIn)"
                      />
                      <Area
                        type="monotone"
                        dataKey="Saídas"
                        stroke="hsl(var(--destructive))"
                        fill="url(#gOut)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard
              title="Próximos vencimentos"
              subtitle="30 dias à frente"
              loading={isLoading}
            >
              {(data?.upcoming?.length ?? 0) === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum vencimento próximo.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Venc.</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data!.upcoming.map((u) => {
                      const due = new Date(u.due_at);
                      const overdue = due < new Date();
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="text-sm">
                            <div className="font-medium line-clamp-1">{u.title}</div>
                            <div className="text-xs text-muted-foreground">Substituição</div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {due.toLocaleDateString('pt-BR')}
                            {overdue && (
                              <Badge variant="destructive" className="ml-1">
                                vencido
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {brl(u.amount)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </ChartCard>
          </div>

          {/* Distribuições — placeholders até existirem AP/AR */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Despesas por categoria"
              subtitle="Disponível após o módulo de Contas a Pagar"
              loading={isLoading}
            >
              <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
                Sem dados ainda.
              </div>
            </ChartCard>
            <ChartCard
              title="Despesas por centro de custo"
              subtitle="Disponível após o módulo de Contas a Pagar"
              loading={isLoading}
            >
              <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
                Sem dados ainda.
              </div>
            </ChartCard>
          </div>
        </>
      )}

      {/* Hub de navegação */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">Áreas</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hubItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.url}
                role="button"
                tabIndex={0}
                onClick={() => navigate(item.url)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(item.url);
                  }
                }}
                className="cursor-pointer transition hover:border-primary/60 hover:shadow-md"
              >
                <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{item.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar indicadores</AlertTitle>
          <AlertDescription>{(error as any)?.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
