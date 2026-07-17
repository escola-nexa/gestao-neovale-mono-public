import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPinned, School, Users, TrendingUp, ShieldAlert } from 'lucide-react';
import { KpiCard } from '@/components/bi/KpiCard';
import { ChartCard } from '@/components/bi/ChartCard';
import { ScoreBadge } from '@/components/bi/ScoreBadge';
import { AnalyticTable, AnalyticColumn } from '@/components/bi/AnalyticTable';
import { useBICityDetail } from '@/hooks/bi/useBICityDetail';
import { SchoolBISummary } from '@/hooks/bi/useBISchools';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function BICityDetailPage() {
  const { cidade } = useParams<{ cidade: string }>();
  const cityName = cidade ? decodeURIComponent(cidade) : '';
  const navigate = useNavigate();
  const { schoolsQuery } = useBICityDetail(cityName || undefined);
  const schools = schoolsQuery.data || [];
  const loading = schoolsQuery.isLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      </div>
    );
  }

  if (!cityName) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/bi/cidades')} className="gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
        <p className="text-muted-foreground text-center py-12">Cidade não encontrada.</p>
      </div>
    );
  }

  const totalSchools = schools.length;
  const totalTeachers = schools.reduce((s, r) => s + r.total_teachers, 0);
  const avgCompliance = totalSchools > 0 ? schools.reduce((s, r) => s + r.compliance_avg, 0) / totalSchools : 0;
  const avgRisk = totalSchools > 0 ? schools.reduce((s, r) => s + r.risk_avg, 0) / totalSchools : 0;

  const chartData = [...schools].sort((a, b) => b.compliance_avg - a.compliance_avg);

  const columns: AnalyticColumn<SchoolBISummary>[] = [
    { key: 'school', header: 'Escola', render: (r) => <span className="font-medium text-sm">{r.school_name}</span> },
    { key: 'teachers', header: 'Profs', render: (r) => <span className="text-sm">{r.total_teachers}</span>, className: 'text-center' },
    { key: 'compliance', header: 'Conform.', render: (r) => <ScoreBadge score={r.compliance_avg} size="sm" />, className: 'text-center' },
    { key: 'risk', header: 'Risco', render: (r) => (
      <span className={`text-xs font-bold ${r.risk_avg > 40 ? 'text-red-600' : r.risk_avg > 25 ? 'text-yellow-600' : 'text-green-600'}`}>
        {r.risk_avg.toFixed(0)}%
      </span>
    ), className: 'text-center' },
    { key: 'pend', header: 'Pendências', render: (r) => <span className="text-xs">{r.pending_plannings + r.pending_attendance + r.pending_grades}</span>, className: 'text-center' },
    { key: 'action', header: '', render: (r) => (
      <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate(`/bi/escolas-bi/${r.school_id}`)}>Ver Escola</Button>
    ) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'B.I.', href: '/bi' }, { label: 'Cidades', href: '/bi/cidades' }, { label: cityName }]}
        title={cityName}
        description={`${totalSchools} escola(s) • ${totalTeachers} professor(es)`}
        icon={MapPinned}
        backTo="/bi/cidades"
      />

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Score consolidado</p>
            </div>
            <div className="text-right">
              <ScoreBadge score={avgCompliance} size="lg" showLabel />
              <p className="text-xs text-muted-foreground mt-1">Conformidade da cidade</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Escolas" value={totalSchools} icon={School} />
        <KpiCard title="Professores" value={totalTeachers} icon={Users} />
        <KpiCard title="Conformidade" value={`${avgCompliance.toFixed(0)}%`} icon={TrendingUp} variant="info" />
        <KpiCard title="Risco Médio" value={`${avgRisk.toFixed(0)}%`} icon={ShieldAlert} variant={avgRisk > 40 ? 'danger' : 'success'} />
      </div>

      <ChartCard title="Comparativo entre Escolas" loading={loading}>
        <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 50)}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 140, right: 20 }}>
            <XAxis type="number" domain={[0, 100]} />
            <YAxis type="category" dataKey="school_name" tick={{ fontSize: 11 }} width={140} />
            <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
            <Bar dataKey="compliance_avg" name="Conformidade" fill="#06b6d4" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Escolas da Cidade</h2>
        <AnalyticTable columns={columns} data={schools} loading={loading} emptyMessage="Nenhuma escola nesta cidade" />
      </div>
    </div>
  );
}
