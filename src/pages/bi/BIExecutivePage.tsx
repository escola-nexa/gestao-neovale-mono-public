import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useNavigate } from 'react-router-dom';
import { Users, CheckCircle, AlertTriangle, Clock, MessageSquare, BarChart3, TrendingUp, ShieldAlert } from 'lucide-react';
import { KpiCard } from '@/components/bi/KpiCard';
import { ChartCard } from '@/components/bi/ChartCard';
import { ScoreBadge, getScoreBand } from '@/components/bi/ScoreBadge';
import { AnalyticTable, AnalyticColumn } from '@/components/bi/AnalyticTable';
import { GlobalFilterBar, BIFilters } from '@/components/bi/GlobalFilterBar';
import { MethodologyDrawer } from '@/components/bi/MethodologyDrawer';
import { useBIExecutive, TeacherBISummary } from '@/hooks/bi/useBIExecutive';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const BAND_COLORS = ['#22c55e', '#3b82f6', '#eab308', '#ef4444'];

export default function BIExecutivePage() {
  const [filters, setFilters] = useState<BIFilters>({});
  const [page, setPage] = useState(0);
  const navigate = useNavigate();
  const { kpisQuery, teachersQuery } = useBIExecutive(filters, page, 50);
  const kpis = kpisQuery.data;
  const teachers = teachersQuery.data || [];
  const loading = kpisQuery.isLoading || teachersQuery.isLoading;
  const totalCount = teachers[0]?.total_count || 0;

  const bandDist = [
    { name: 'Excelente', value: teachers.filter(t => t.compliance_score >= 90).length, color: '#22c55e' },
    { name: 'Adequado', value: teachers.filter(t => t.compliance_score >= 75 && t.compliance_score < 90).length, color: '#3b82f6' },
    { name: 'Atenção', value: teachers.filter(t => t.compliance_score >= 60 && t.compliance_score < 75).length, color: '#eab308' },
    { name: 'Crítico', value: teachers.filter(t => t.compliance_score < 60).length, color: '#ef4444' },
  ];

  const topCompliance = [...teachers].sort((a, b) => b.compliance_score - a.compliance_score).slice(0, 10);
  const topPending = [...teachers].sort((a, b) => a.compliance_score - b.compliance_score).slice(0, 10);

  // Truncate name for chart
  const truncName = (name: string, max = 18) => name.length > max ? name.slice(0, max) + '…' : name;

  const columns: AnalyticColumn<TeacherBISummary>[] = [
    { key: 'name', header: 'Professor', render: (r) => <span className="font-medium truncate block max-w-[140px]">{r.teacher_name}</span> },
    { key: 'school', header: 'Escola(s)', render: (r) => <span className="text-xs truncate block max-w-[120px]">{r.school_names?.join(', ') || '—'}</span> },
    { key: 'city', header: 'Cidade', render: (r) => <span className="text-xs truncate block max-w-[100px]">{[...new Set(r.city_names || [])].join(', ') || '—'}</span> },
    { key: 'planning', header: 'Planej.', render: (r) => <ScoreBadge score={r.planning_score} size="sm" />, className: 'text-center' },
    { key: 'attendance', header: 'Freq.', render: (r) => <ScoreBadge score={r.attendance_score} size="sm" />, className: 'text-center' },
    { key: 'grades', header: 'Notas', render: (r) => <ScoreBadge score={r.grades_score} size="sm" />, className: 'text-center' },
    { key: 'compliance', header: 'Conform.', render: (r) => <ScoreBadge score={r.compliance_score} size="sm" showLabel />, className: 'text-center' },
    { key: 'risk', header: 'Risco', render: (r) => (
      <span className={`text-xs font-bold ${r.risk_score > 40 ? 'text-red-600' : r.risk_score > 25 ? 'text-yellow-600' : 'text-green-600'}`}>
        {r.risk_score.toFixed(0)}%
      </span>
    ), className: 'text-center' },
    { key: 'action', header: '', render: (r) => (
      <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate(`/bi/professores/${r.teacher_id}`)}>Ver</Button>
    ) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'B.I.', href: '/bi' }, { label: 'Visão Executiva' }]}
        title="Visão Executiva de Professores"
        actions={<MethodologyDrawer />}
      />

      <GlobalFilterBar filters={filters} onChange={setFilters} />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard title="Prof. Ativos" value={kpis?.total_active_teachers ?? '—'} icon={Users} loading={loading} />
        <KpiCard title="100% Conform." value={kpis?.teachers_full_compliance ?? '—'} icon={CheckCircle} variant="success" loading={loading} />
        <KpiCard title="Conform. Média" value={kpis ? `${kpis.avg_compliance_score?.toFixed(0)}%` : '—'} icon={TrendingUp} variant="info" loading={loading} />
        <KpiCard title="Risco Médio" value={kpis ? `${kpis.avg_risk_score?.toFixed(0)}%` : '—'} icon={ShieldAlert} variant={kpis && kpis.avg_risk_score > 40 ? 'danger' : 'success'} loading={loading} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard title="Atraso Planej." value={kpis?.teachers_with_planning_delay ?? '—'} icon={Clock} variant="warning" loading={loading} />
        <KpiCard title="Pend. Freq." value={kpis?.teachers_with_attendance_pending ?? '—'} icon={AlertTriangle} variant="warning" loading={loading} />
        <KpiCard title="Pend. Notas" value={kpis?.teachers_with_grades_pending ?? '—'} icon={BarChart3} variant="warning" loading={loading} />
        <KpiCard title="Orient. Abertas" value={kpis?.teachers_with_open_orientations ?? '—'} icon={MessageSquare} variant="info" loading={loading} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Top 10 Maior Conformidade" loading={loading}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topCompliance.map(t => ({ ...t, teacher_name: truncName(t.teacher_name) }))} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" domain={[0, 100]} />
              <YAxis type="category" dataKey="teacher_name" tick={{ fontSize: 10 }} width={110} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Bar dataKey="compliance_score" fill="hsl(263, 84%, 58%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribuição por Faixa" loading={loading}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={bandDist} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={80} label={false}>
                {bandDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v: number, name: string) => [`${v}`, name]} />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                formatter={(value: string) => {
                  const item = bandDist.find(d => d.name === value);
                  return `${value}: ${item?.value ?? 0}`;
                }}
                wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top 10 Mais Pendências" className="lg:col-span-2" loading={loading}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topPending.map(t => ({ ...t, teacher_name: truncName(t.teacher_name) }))} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" domain={[0, 100]} />
              <YAxis type="category" dataKey="teacher_name" tick={{ fontSize: 10 }} width={110} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Bar dataKey="risk_score" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Analytic Table */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Tabela Analítica por Professor</h2>
        <AnalyticTable columns={columns} data={teachers} loading={loading} emptyMessage="Nenhum professor encontrado para os filtros aplicados" />
        {totalCount > 50 && (
          <div className="flex justify-center gap-2 mt-4">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <span className="text-sm text-muted-foreground self-center">Página {page + 1} de {Math.ceil(totalCount / 50)}</span>
            <Button variant="outline" size="sm" disabled={(page + 1) * 50 >= totalCount} onClick={() => setPage(p => p + 1)}>Próxima</Button>
          </div>
        )}
      </div>
    </div>
  );
}
