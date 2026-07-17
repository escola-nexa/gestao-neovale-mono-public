import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RTooltip, LineChart, Line, Cell, LabelList,
} from 'recharts';
import {
  Building2, Trophy, TrendingUp, AlertTriangle, Link2Off, Clock, ArrowUpDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NeovaleStatCard } from '@/components/ui/NeovaleStatCard';
import { KANBAN_COLUMNS, KanbanCard, KanbanColumn } from '../../hooks/useProfessorsKanban';

type RiskLevel = 'high' | 'medium' | 'low';

export interface SchoolAggregateLite {
  schoolName: string;
  total: number;
  byColumn: Record<KanbanColumn, number>;
  completed: number;
  expired: number;
  noLink: number;
  pctCompleted: number;
  avgPct: number;
  risk: RiskLevel;
}

interface Props {
  aggregates: SchoolAggregateLite[];
  cards: KanbanCard[];
  onSchoolClick?: (schoolName: string) => void;
  onMissingDocClick?: (docValue: string, docLabel: string) => void;
}

// HSL design tokens
const COL_COLORS: Record<KanbanColumn, string> = {
  awaiting_link: 'hsl(38 92% 50%)',  // amber
  link_sent:     'hsl(199 89% 48%)', // sky
  in_progress:   'hsl(262 83% 58%)', // violet
  completed:     'hsl(160 84% 39%)', // emerald
};
const RISK_COLOR: Record<RiskLevel, string> = {
  high:   'hsl(0 84% 60%)',
  medium: 'hsl(38 92% 50%)',
  low:    'hsl(160 84% 39%)',
};

export function MacroIndicators({ aggregates, cards, onSchoolClick, onMissingDocClick }: Props) {
  const [pctSortDir, setPctSortDir] = useState<'asc' | 'desc'>('asc');

  const kpis = useMemo(() => {
    const totalProf = aggregates.reduce((s, a) => s + a.total, 0);
    const totalCompl = aggregates.reduce((s, a) => s + a.completed, 0);
    const avg = aggregates.length
      ? Math.round(aggregates.reduce((s, a) => s + a.avgPct, 0) / aggregates.length)
      : 0;
    return {
      schools: aggregates.length,
      conclusionRate: totalProf > 0 ? Math.round((totalCompl / totalProf) * 100) : 0,
      avgPct: avg,
      highRisk: aggregates.filter(a => a.risk === 'high').length,
      noLink: aggregates.reduce((s, a) => s + a.noLink, 0),
      expired: aggregates.reduce((s, a) => s + a.expired, 0),
    };
  }, [aggregates]);

  // % conclusão por escola - Top 15
  const pctData = useMemo(() => {
    const arr = aggregates.slice().sort((a, b) =>
      pctSortDir === 'asc' ? a.pctCompleted - b.pctCompleted : b.pctCompleted - a.pctCompleted
    );
    return arr.slice(0, 15).map(a => ({
      name: a.schoolName.length > 36 ? a.schoolName.slice(0, 34) + '…' : a.schoolName,
      fullName: a.schoolName,
      pct: a.pctCompleted,
      total: a.total,
      completed: a.completed,
      risk: a.risk,
    }));
  }, [aggregates, pctSortDir]);

  // Distribuição empilhada Top 10 por nº de professores
  const stackData = useMemo(() => {
    const top = aggregates.slice().sort((a, b) => b.total - a.total).slice(0, 10);
    return top.map(a => ({
      name: a.schoolName.length > 24 ? a.schoolName.slice(0, 22) + '…' : a.schoolName,
      fullName: a.schoolName,
      awaiting_link: a.byColumn.awaiting_link,
      link_sent: a.byColumn.link_sent,
      in_progress: a.byColumn.in_progress,
      completed: a.byColumn.completed,
    }));
  }, [aggregates]);

  // Top documentos faltantes
  const missingData = useMemo(() => {
    const map = new Map<string, { value: string; label: string; count: number }>();
    cards.forEach(c => (c.missing || []).forEach(m => {
      const cur = map.get(m.value);
      if (cur) cur.count += 1;
      else map.set(m.value, { value: m.value, label: m.label, count: 1 });
    }));
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 8).map(m => ({
      ...m,
      shortLabel: m.label.length > 28 ? m.label.slice(0, 26) + '…' : m.label,
    }));
  }, [cards]);

  // Funil de progresso
  const funnelData = useMemo(() => {
    return KANBAN_COLUMNS.map(col => ({
      name: col.title.length > 22 ? col.title.slice(0, 20) + '…' : col.title,
      fullName: col.title,
      value: cards.filter(c => c.effective_column === col.id).length,
      color: COL_COLORS[col.id],
    }));
  }, [cards]);

  return (
    <div className="space-y-3">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <NeovaleStatCard label="Escolas" value={kpis.schools} icon={Building2} tone="info" />
        <NeovaleStatCard label="Taxa de conclusão" value={`${kpis.conclusionRate}%`} icon={Trophy} tone="success" />
        <NeovaleStatCard label="Média de preenchimento" value={`${kpis.avgPct}%`} icon={TrendingUp} tone="neutral" />
        <NeovaleStatCard label="Escolas em risco alto" value={kpis.highRisk} icon={AlertTriangle} tone="danger" />
        <NeovaleStatCard label="Profs. sem link" value={kpis.noLink} icon={Link2Off} tone="warning" />
        <NeovaleStatCard label="Links expirados" value={kpis.expired} icon={Clock} tone="warning" />
      </div>

      {/* Linha 1: % por escola + Funil */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-semibold">% de conclusão por escola</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Top 15 — clique numa barra para abrir o detalhe da escola
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 h-8"
              onClick={() => setPctSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            >
              <ArrowUpDown className="h-3 w-3" />
              {pctSortDir === 'asc' ? 'Piores primeiro' : 'Melhores primeiro'}
            </Button>
          </CardHeader>
          <CardContent>
            {pctData.length === 0 ? (
              <div className="h-[360px] flex items-center justify-center text-sm text-muted-foreground">
                Sem dados para exibir.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(360, pctData.length * 26)}>
                <BarChart data={pctData} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 8 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis type="category" dataKey="name" width={200} stroke="hsl(var(--muted-foreground))" fontSize={11} interval={0} />
                  <RTooltip
                    cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                    contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number, _n, p: any) => [`${v}% (${p.payload.completed}/${p.payload.total})`, 'Conclusão']}
                    labelFormatter={(_l, p: any) => p?.[0]?.payload?.fullName ?? ''}
                  />
                  <Bar dataKey="pct" radius={[0, 4, 4, 0]} cursor="pointer"
                    onClick={(d: any) => onSchoolClick?.(d.fullName)}>
                    {pctData.map((d, i) => <Cell key={i} fill={RISK_COLOR[d.risk]} />)}
                    <LabelList dataKey="pct" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Funil de progresso</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Qtd. de professores em cada etapa</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={funnelData} margin={{ top: 16, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} interval={0} />
                <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <RTooltip
                  contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [v, 'Professores']}
                  labelFormatter={(_l, p: any) => p?.[0]?.payload?.fullName ?? ''}
                />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2}
                  dot={{ r: 5, strokeWidth: 2 }} activeDot={{ r: 7 }}>
                  <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Linha 2: Stacked + Documentos faltantes */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Distribuição de status por escola</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Top 10 escolas com mais professores</p>
          </CardHeader>
          <CardContent>
            {stackData.length === 0 ? (
              <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">Sem dados.</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={stackData} margin={{ top: 8, right: 8, bottom: 60, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} interval={0} angle={-25} textAnchor="end" height={70} />
                  <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <RTooltip
                    contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(_l, p: any) => p?.[0]?.payload?.fullName ?? ''}
                  />
                  {KANBAN_COLUMNS.map(col => (
                    <Bar
                      key={col.id}
                      dataKey={col.id}
                      stackId="a"
                      name={col.title}
                      fill={COL_COLORS[col.id]}
                      cursor="pointer"
                      onClick={(d: any) => onSchoolClick?.(d.fullName)}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
              {KANBAN_COLUMNS.map(col => (
                <div key={col.id} className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: COL_COLORS[col.id] }} />
                  <span className="text-muted-foreground">{col.title}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Documentos mais faltantes</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Top 8 — clique para ver os professores que estão devendo
            </p>
          </CardHeader>
          <CardContent>
            {missingData.length === 0 ? (
              <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
                Nenhum documento pendente.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={missingData} margin={{ top: 12, right: 8, bottom: 60, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="shortLabel" stroke="hsl(var(--muted-foreground))" fontSize={10} interval={0} angle={-25} textAnchor="end" height={70} />
                  <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <RTooltip
                    contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [v, 'Professores faltando']}
                    labelFormatter={(_l, p: any) => p?.[0]?.payload?.label ?? ''}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} cursor="pointer"
                    onClick={(d: any) => onMissingDocClick?.(d.value, d.label)}>
                    <LabelList dataKey="count" position="top" style={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
