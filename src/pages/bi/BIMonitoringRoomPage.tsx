import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { MonitorCog, ShieldAlert, AlertTriangle, TrendingUp, Users, School, MapPinned, ClipboardList } from 'lucide-react';
import { KpiCard } from '@/components/bi/KpiCard';
import { ChartCard } from '@/components/bi/ChartCard';
import { InsightCard } from '@/components/bi/InsightCard';
import { ScoreBadge } from '@/components/bi/ScoreBadge';
import { AnalyticTable, AnalyticColumn } from '@/components/bi/AnalyticTable';
import { GlobalFilterBar, BIFilters } from '@/components/bi/GlobalFilterBar';
import { useBIMonitoring } from '@/hooks/bi/useBIMonitoring';
import { TeacherBISummary } from '@/hooks/bi/useBIExecutive';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function BIMonitoringRoomPage() {
  const [filters, setFilters] = useState<BIFilters>({});
  const { kpisQuery, teachersQuery, schoolsQuery, citiesQuery, insightsQuery, evolutionQuery } = useBIMonitoring(filters);
  const navigate = useNavigate();
  const kpis = kpisQuery.data;
  const teachers = teachersQuery.data || [];
  const schools = schoolsQuery.data || [];
  const cities = citiesQuery.data || [];
  const insights = insightsQuery.data || [];
  const evolution = evolutionQuery?.data || [];
  const loading = kpisQuery.isLoading;

  const criticalTeachers = teachers.filter(t => t.compliance_score < 60).slice(0, 5);
  const criticalSchools = schools.filter(s => s.compliance_avg < 65).slice(0, 5);

  const teacherColumns: AnalyticColumn<TeacherBISummary>[] = [
    { key: 'name', header: 'Professor', render: (r) => <span className="font-medium text-sm truncate block max-w-[150px]">{r.teacher_name}</span> },
    { key: 'school', header: 'Escola', render: (r) => <span className="text-xs truncate block max-w-[120px]">{r.school_names?.[0] || '—'}</span> },
    { key: 'compliance', header: 'Conform.', render: (r) => <ScoreBadge score={r.compliance_score} size="sm" />, className: 'text-center' },
    { key: 'risk', header: 'Risco', render: (r) => (
      <span className={`text-xs font-bold ${r.risk_score > 40 ? 'text-red-600' : 'text-emerald-600'}`}>{r.risk_score.toFixed(0)}%</span>
    ), className: 'text-center' },
    { key: 'action', header: '', render: (r) => (
      <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate(`/bi/professores/${r.teacher_id}`)}>Analisar</Button>
    ) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'B.I.', href: '/bi' }, { label: 'Monitoramento Executivo' }]}
        title="Sala de Monitoramento Executivo"
        description="Painel central de decisão com dados em tempo real"
      />

      <GlobalFilterBar filters={filters} onChange={setFilters} />

      {/* Executive KPI Strip - 2 rows instead of 7 cols */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <KpiCard title="Conformidade" value={kpis ? `${kpis.avg_compliance_score?.toFixed(0)}%` : '—'} icon={TrendingUp} variant="info" loading={loading} />
        <KpiCard title="Risco Médio" value={kpis ? `${kpis.avg_risk_score?.toFixed(0)}%` : '—'} icon={ShieldAlert} variant={kpis && kpis.avg_risk_score > 40 ? 'danger' : 'success'} loading={loading} />
        <KpiCard title="Prof. Críticos" value={kpis?.teachers_critical ?? '—'} icon={AlertTriangle} variant="danger" loading={loading} />
        <KpiCard title="Em Atenção" value={kpis?.teachers_attention ?? '—'} icon={Users} variant="warning" loading={loading} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KpiCard title="Escolas" value={schools.length} icon={School} loading={loading} />
        <KpiCard title="Cidades" value={cities.length} icon={MapPinned} loading={loading} />
        <KpiCard title="Pendências" value={kpis?.total_pending ?? '—'} icon={ClipboardList} loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Evolution Chart */}
        <ChartCard title="Evolução Global do Período" loading={evolutionQuery?.isLoading || loading}>
          {evolution.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={evolution} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Line type="monotone" dataKey="compliance" name="Conformidade" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="risk" name="Risco" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
              Dados históricos insuficientes para exibir evolução. Os dados serão acumulados ao longo dos bimestres.
            </div>
          )}
        </ChartCard>

        {/* Insights Panel */}
        <ChartCard title="Alertas e Insights Recentes" loading={insightsQuery.isLoading}>
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {insights.slice(0, 5).map(i => (
              <InsightCard key={i.id} category={i.category} severity={i.severity} title={i.title} description={i.description} targetName={i.target_name} />
            ))}
            {insights.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum alerta no momento</p>}
          </div>
        </ChartCard>
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Critical Teachers */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Professores Críticos</h2>
          <AnalyticTable columns={teacherColumns} data={criticalTeachers} loading={loading} emptyMessage="Nenhum professor em situação crítica" />
        </div>

        {/* Critical Schools */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Escolas em Alerta</h2>
          {criticalSchools.length > 0 ? (
            <div className="space-y-2">
              {criticalSchools.map(s => (
                <div key={s.school_id} className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-card hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/bi/escolas-bi/${s.school_id}`)}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.school_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.city_name} • {s.total_teachers} professores</p>
                  </div>
                  <ScoreBadge score={s.compliance_avg} size="sm" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma escola em alerta</p>
          )}
        </div>
      </div>
    </div>
  );
}
