import { useState } from 'react';
import { TrendingUp, TrendingDown, Activity, Target } from 'lucide-react';
import { KpiCard } from '@/components/bi/KpiCard';
import { ChartCard } from '@/components/bi/ChartCard';
import { TrendSummaryCard } from '@/components/bi/TrendSummaryCard';
import { AnalyticTable, AnalyticColumn } from '@/components/bi/AnalyticTable';
import { GlobalFilterBar, BIFilters } from '@/components/bi/GlobalFilterBar';
import { useBITrends, TrendProjection } from '@/hooks/bi/useBITrends';
import { MethodologyDrawer } from '@/components/bi/MethodologyDrawer';
import { PageHeader } from '@/components/PageHeader';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, AreaChart, Area } from 'recharts';

export default function BITrendsPage() {
  const [filters, setFilters] = useState<BIFilters>({});
  const { trendsQuery, kpisQuery } = useBITrends(filters);
  const trends = trendsQuery.data;
  const kpis = kpisQuery.data;
  const loading = trendsQuery.isLoading;

  const columns: AnalyticColumn<TrendProjection>[] = [
    { key: 'label', header: 'Indicador', render: (r) => <span className="font-medium text-sm">{r.label}</span> },
    { key: 'current', header: 'Atual', render: (r) => <span className="text-sm">{r.current.toFixed(0)}</span>, className: 'text-center' },
    { key: 'projected', header: 'Projeção', render: (r) => <span className="text-sm font-semibold">{r.projected.toFixed(0)}</span>, className: 'text-center' },
    { key: 'direction', header: 'Direção', render: (r) => (
      <span className={`text-xs font-bold ${r.direction === 'up' ? 'text-emerald-600' : r.direction === 'down' ? 'text-red-600' : 'text-muted-foreground'}`}>
        {r.direction === 'up' ? '↑ Subindo' : r.direction === 'down' ? '↓ Caindo' : '→ Estável'}
      </span>
    ), className: 'text-center' },
    { key: 'confidence', header: 'Confiança', render: (r) => <span className="text-xs text-muted-foreground">{r.confidence}</span>, className: 'text-center' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'B.I.', href: '/bi' }, { label: 'Tendências e Projeções' }]}
        title="Tendências e Projeções"
        description="Evolução e direção dos indicadores para gestão antecipada"
        icon={TrendingUp}
        actions={<MethodologyDrawer />}
      />

      <GlobalFilterBar filters={filters} onChange={setFilters} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Conformidade Atual" value={kpis ? `${kpis.avg_compliance_score?.toFixed(0)}%` : '—'} icon={TrendingUp} variant="info" loading={loading} />
        <KpiCard title="Risco Atual" value={kpis ? `${kpis.avg_risk_score?.toFixed(0)}%` : '—'} icon={TrendingDown} variant={kpis && kpis.avg_risk_score > 40 ? 'danger' : 'success'} loading={loading} />
        <KpiCard title="Prof. Críticos" value={kpis?.teachers_critical ?? '—'} icon={Activity} variant="danger" loading={loading} />
        <KpiCard title="Pendências" value={kpis?.total_pending ?? '—'} icon={Target} loading={loading} />
      </div>

      {/* Projection Cards */}
      {trends?.projections && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {trends.projections.map(p => (
            <TrendSummaryCard
              key={p.label}
              label={p.label}
              current={p.current}
              projected={p.projected}
              direction={p.direction}
              format={p.label.includes('Pendência') || p.label.includes('Crítico') ? 'number' : 'percent'}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Tendência de Conformidade e Risco" loading={loading}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trends?.trendData || []} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Line type="monotone" dataKey="compliance" name="Conformidade" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="risk" name="Risco" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Projeção de Aprendizagem" loading={loading}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trends?.trendData || []} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="learning" name="Aprendizagem" stroke="#10b981" fill="#10b98133" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Detalhamento de Projeções</h2>
        <AnalyticTable columns={columns} data={trends?.projections || []} loading={loading} />
      </div>
    </div>
  );
}
