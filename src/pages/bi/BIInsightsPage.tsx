import { useState } from 'react';
import { Lightbulb, AlertCircle, TrendingUp, Wrench, BarChart3 } from 'lucide-react';
import { KpiCard } from '@/components/bi/KpiCard';
import { InsightCard } from '@/components/bi/InsightCard';
import { ChartCard } from '@/components/bi/ChartCard';
import { AnalyticTable, AnalyticColumn } from '@/components/bi/AnalyticTable';
import { GlobalFilterBar, BIFilters } from '@/components/bi/GlobalFilterBar';
import { useBIInsights, BIInsight } from '@/hooks/bi/useBIInsights';
import { PageHeader } from '@/components/PageHeader';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function BIInsightsPage() {
  const [filters, setFilters] = useState<BIFilters>({});
  const { insightsQuery } = useBIInsights(filters);
  const insights = insightsQuery.data || [];
  const loading = insightsQuery.isLoading;

  const critical = insights.filter(i => i.severity === 'critical');
  const opportunities = insights.filter(i => i.category === 'opportunity');
  const operational = insights.filter(i => i.category === 'operational');

  const chartData = [
    { name: 'Risco', value: insights.filter(i => i.category === 'risk').length },
    { name: 'Oportunidade', value: insights.filter(i => i.category === 'opportunity').length },
    { name: 'Tendência', value: insights.filter(i => i.category === 'trend').length },
    { name: 'Operacional', value: insights.filter(i => i.category === 'operational').length },
  ];

  const columns: AnalyticColumn<BIInsight>[] = [
    { key: 'severity', header: 'Nível', render: (r) => (
      <span className={`text-xs font-bold ${r.severity === 'critical' ? 'text-red-600' : r.severity === 'warning' ? 'text-amber-600' : r.severity === 'success' ? 'text-emerald-600' : 'text-blue-600'}`}>
        {r.severity === 'critical' ? 'Crítico' : r.severity === 'warning' ? 'Atenção' : r.severity === 'success' ? 'Positivo' : 'Info'}
      </span>
    ), className: 'w-20' },
    { key: 'category', header: 'Categoria', render: (r) => <span className="text-xs capitalize">{r.category === 'risk' ? 'Risco' : r.category === 'opportunity' ? 'Oportunidade' : r.category === 'trend' ? 'Tendência' : 'Operacional'}</span> },
    { key: 'title', header: 'Insight', render: (r) => <span className="text-sm font-medium">{r.title}</span> },
    { key: 'target', header: 'Alvo', render: (r) => <span className="text-xs text-muted-foreground">{r.target_name}</span> },
    { key: 'desc', header: 'Descrição', render: (r) => <span className="text-xs text-muted-foreground line-clamp-2">{r.description}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'B.I.', href: '/bi' }, { label: 'Insights Inteligentes' }]}
        title="Insights Inteligentes"
        description="Leituras automáticas e acionáveis sobre os dados do sistema"
        icon={Lightbulb}
      />

      <GlobalFilterBar filters={filters} onChange={setFilters} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Total de Insights" value={insights.length} icon={Lightbulb} loading={loading} />
        <KpiCard title="Críticos" value={critical.length} icon={AlertCircle} variant="danger" loading={loading} />
        <KpiCard title="Oportunidades" value={opportunities.length} icon={TrendingUp} variant="success" loading={loading} />
        <KpiCard title="Operacionais" value={operational.length} icon={Wrench} variant="warning" loading={loading} />
      </div>

      {/* Resumo Executivo */}
      {insights.length > 0 && (
        <ChartCard title="Resumo Executivo" subtitle="Principais descobertas do período">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.slice(0, 6).map(insight => (
              <InsightCard
                key={insight.id}
                category={insight.category}
                severity={insight.severity}
                title={insight.title}
                description={insight.description}
                targetName={insight.target_name}
              />
            ))}
          </div>
        </ChartCard>
      )}

      <ChartCard title="Insights por Categoria" loading={loading}>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Lista Detalhada de Insights</h2>
        <AnalyticTable columns={columns} data={insights} loading={loading} emptyMessage="Nenhum insight gerado para os filtros aplicados" />
      </div>
    </div>
  );
}
