import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useNavigate } from 'react-router-dom';
import { MapPinned, School, Users, TrendingUp } from 'lucide-react';
import { KpiCard } from '@/components/bi/KpiCard';
import { ChartCard } from '@/components/bi/ChartCard';
import { AnalyticTable, AnalyticColumn } from '@/components/bi/AnalyticTable';
import { ScoreBadge } from '@/components/bi/ScoreBadge';
import { GlobalFilterBar, BIFilters } from '@/components/bi/GlobalFilterBar';
import { useBICities, CityBISummary } from '@/hooks/bi/useBICities';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function BICitiesPage() {
  const [filters, setFilters] = useState<BIFilters>({});
  const navigate = useNavigate();
  const { citiesQuery } = useBICities(filters);
  const cities = citiesQuery.data || [];
  const loading = citiesQuery.isLoading;

  const totalCities = cities.length;
  const totalSchools = cities.reduce((s, c) => s + c.total_schools, 0);
  const totalTeachers = cities.reduce((s, c) => s + c.total_teachers, 0);
  const avgCompliance = totalCities > 0 ? cities.reduce((s, c) => s + c.compliance_avg, 0) / totalCities : 0;

  const truncName = (name: string, max = 18) => name.length > max ? name.slice(0, max) + '…' : name;

  const chartData = [...cities]
    .sort((a, b) => b.compliance_avg - a.compliance_avg)
    .map(c => ({ name: truncName(c.city_name), compliance: c.compliance_avg, risk: c.risk_avg }));

  const columns: AnalyticColumn<CityBISummary>[] = [
    { key: 'city', header: 'Cidade', render: (r) => <span className="font-medium text-sm">{r.city_name}</span> },
    { key: 'schools', header: 'Escolas', render: (r) => <span className="text-sm">{r.total_schools}</span>, className: 'text-center' },
    { key: 'teachers', header: 'Profs', render: (r) => <span className="text-sm">{r.total_teachers}</span>, className: 'text-center' },
    { key: 'compliance', header: 'Conform.', render: (r) => <ScoreBadge score={r.compliance_avg} size="sm" />, className: 'text-center' },
    { key: 'risk', header: 'Risco', render: (r) => (
      <span className={`text-xs font-bold ${r.risk_avg > 40 ? 'text-red-600' : r.risk_avg > 25 ? 'text-yellow-600' : 'text-green-600'}`}>
        {r.risk_avg.toFixed(0)}%
      </span>
    ), className: 'text-center' },
    { key: 'pending', header: 'Pend.', render: (r) => <span className={`text-xs ${r.total_pending > 0 ? 'text-yellow-600 font-semibold' : 'text-muted-foreground'}`}>{r.total_pending}</span>, className: 'text-center' },
    { key: 'critical', header: 'Crít.', render: (r) => <span className={`text-xs ${r.critical_teachers > 0 ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>{r.critical_teachers}</span>, className: 'text-center' },
    { key: 'action', header: '', render: (r) => (
      <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate(`/bi/cidades/${encodeURIComponent(r.city_name)}`)}>Detalhar</Button>
    ) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'B.I.', href: '/bi' }, { label: 'Análise por Cidade' }]}
        title="Análise por Cidade"
        description="Visão territorial e comparativa"
      />

      <GlobalFilterBar filters={filters} onChange={setFilters} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard title="Total Cidades" value={totalCities} icon={MapPinned} loading={loading} />
        <KpiCard title="Total Escolas" value={totalSchools} icon={School} loading={loading} />
        <KpiCard title="Total Professores" value={totalTeachers} icon={Users} loading={loading} />
        <KpiCard title="Conform. Média" value={`${avgCompliance.toFixed(0)}%`} icon={TrendingUp} variant="info" loading={loading} />
      </div>

      <ChartCard title="Conformidade por Cidade" loading={loading}>
        <ResponsiveContainer width="100%" height={Math.max(200, Math.min(chartData.length * 40, 500))}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" domain={[0, 100]} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
            <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
            <Bar dataKey="compliance" fill="#06b6d4" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Tabela Consolidada por Cidade</h2>
        <AnalyticTable columns={columns} data={cities} loading={loading} emptyMessage="Nenhuma cidade encontrada" />
      </div>
    </div>
  );
}
