import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useNavigate } from 'react-router-dom';
import { School, Users, ShieldAlert, TrendingUp } from 'lucide-react';
import { KpiCard } from '@/components/bi/KpiCard';
import { ChartCard } from '@/components/bi/ChartCard';
import { AnalyticTable, AnalyticColumn } from '@/components/bi/AnalyticTable';
import { ScoreBadge } from '@/components/bi/ScoreBadge';
import { GlobalFilterBar, BIFilters } from '@/components/bi/GlobalFilterBar';
import { useBISchools, SchoolBISummary } from '@/hooks/bi/useBISchools';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function BISchoolsPage() {
  const [filters, setFilters] = useState<BIFilters>({});
  const navigate = useNavigate();
  const { schoolsQuery } = useBISchools(filters);
  const schools = schoolsQuery.data || [];
  const loading = schoolsQuery.isLoading;

  const totalSchools = schools.length;
  const avgCompliance = totalSchools > 0 ? schools.reduce((s, r) => s + r.compliance_avg, 0) / totalSchools : 0;
  const avgRisk = totalSchools > 0 ? schools.reduce((s, r) => s + r.risk_avg, 0) / totalSchools : 0;
  const totalTeachers = schools.reduce((s, r) => s + r.total_teachers, 0);

  const truncName = (name: string, max = 20) => name.length > max ? name.slice(0, max) + '…' : name;

  const chartData = [...schools]
    .sort((a, b) => b.compliance_avg - a.compliance_avg)
    .slice(0, 15)
    .map(s => ({ name: truncName(s.school_name), compliance: s.compliance_avg, risk: s.risk_avg }));

  const columns: AnalyticColumn<SchoolBISummary>[] = [
    { key: 'school', header: 'Escola', render: (r) => <span className="font-medium text-sm truncate block max-w-[150px]">{r.school_name}</span> },
    { key: 'city', header: 'Cidade', render: (r) => <span className="text-xs truncate block max-w-[100px]">{r.city_name}</span> },
    { key: 'teachers', header: 'Profs', render: (r) => <span className="text-sm">{r.total_teachers}</span>, className: 'text-center' },
    { key: 'compliance', header: 'Conform.', render: (r) => <ScoreBadge score={r.compliance_avg} size="sm" />, className: 'text-center' },
    { key: 'risk', header: 'Risco', render: (r) => (
      <span className={`text-xs font-bold ${r.risk_avg > 40 ? 'text-red-600' : r.risk_avg > 25 ? 'text-yellow-600' : 'text-green-600'}`}>
        {r.risk_avg.toFixed(0)}%
      </span>
    ), className: 'text-center' },
    { key: 'pend_plan', header: 'Pend.P', render: (r) => <span className={`text-xs ${r.pending_plannings > 0 ? 'text-yellow-600 font-semibold' : 'text-muted-foreground'}`}>{r.pending_plannings}</span>, className: 'text-center' },
    { key: 'pend_att', header: 'Pend.F', render: (r) => <span className={`text-xs ${r.pending_attendance > 0 ? 'text-yellow-600 font-semibold' : 'text-muted-foreground'}`}>{r.pending_attendance}</span>, className: 'text-center' },
    { key: 'action', header: '', render: (r) => (
      <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate(`/bi/escolas-bi/${r.school_id}`)}>Detalhar</Button>
    ) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'B.I.', href: '/bi' }, { label: 'Análise por Escola' }]}
        title="Análise por Escola"
        description="Visão consolidada de performance por unidade escolar"
      />

      <GlobalFilterBar filters={filters} onChange={setFilters} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard title="Total Escolas" value={totalSchools} icon={School} loading={loading} />
        <KpiCard title="Professores" value={totalTeachers} icon={Users} loading={loading} />
        <KpiCard title="Conform. Média" value={`${avgCompliance.toFixed(0)}%`} icon={TrendingUp} variant="info" loading={loading} />
        <KpiCard title="Risco Médio" value={`${avgRisk.toFixed(0)}%`} icon={ShieldAlert} variant={avgRisk > 40 ? 'danger' : 'success'} loading={loading} />
      </div>

      <ChartCard title="Conformidade por Escola (Top 15)" loading={loading}>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" domain={[0, 100]} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={130} />
            <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
            <Bar dataKey="compliance" fill="hsl(263, 84%, 58%)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Tabela Consolidada por Escola</h2>
        <AnalyticTable columns={columns} data={schools} loading={loading} emptyMessage="Nenhuma escola encontrada" />
      </div>
    </div>
  );
}
