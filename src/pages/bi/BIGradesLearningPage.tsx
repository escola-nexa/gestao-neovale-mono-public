import { useState } from 'react';
import { GraduationCap, Users, AlertTriangle, TrendingUp, BookOpen } from 'lucide-react';
import { KpiCard } from '@/components/bi/KpiCard';
import { ChartCard } from '@/components/bi/ChartCard';
import { AnalyticTable, AnalyticColumn } from '@/components/bi/AnalyticTable';
import { ScoreBadge } from '@/components/bi/ScoreBadge';
import { GlobalFilterBar, BIFilters } from '@/components/bi/GlobalFilterBar';
import { useBIGradesLearning, GradesLearningRow } from '@/hooks/bi/useBIGradesLearning';
import { PageHeader } from '@/components/PageHeader';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function BIGradesLearningPage() {
  const [filters, setFilters] = useState<BIFilters>({});
  const { dataQuery } = useBIGradesLearning(filters);
  const rows = dataQuery.data || [];
  const loading = dataQuery.isLoading;

  const totalRows = rows.length;
  const avgGrade = totalRows > 0 ? rows.reduce((s, r) => s + r.grade_avg, 0) / totalRows : 0;
  const avgAbove = totalRows > 0 ? rows.reduce((s, r) => s + r.students_above_avg_pct, 0) / totalRows : 0;
  const avgRisk = totalRows > 0 ? rows.reduce((s, r) => s + r.students_at_risk_pct, 0) / totalRows : 0;
  const totalMissing = rows.reduce((s, r) => s + r.missing_grades_count, 0);

  const teacherMap = new Map<string, { name: string; total: number; count: number }>();
  rows.forEach(r => {
    const existing = teacherMap.get(r.teacher_id) || { name: r.teacher_name, total: 0, count: 0 };
    existing.total += r.grade_avg;
    existing.count += 1;
    teacherMap.set(r.teacher_id, existing);
  });

  const truncName = (name: string, max = 18) => name.length > max ? name.slice(0, max) + '…' : name;

  const teacherAvgs = Array.from(teacherMap.entries())
    .map(([, v]) => ({ name: truncName(v.name), avg: v.count > 0 ? +(v.total / v.count).toFixed(2) : 0 }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 15);

  const columns: AnalyticColumn<GradesLearningRow>[] = [
    { key: 'teacher', header: 'Professor', render: (r) => <span className="font-medium text-sm truncate block max-w-[120px]">{r.teacher_name}</span> },
    { key: 'subject', header: 'Disciplina', render: (r) => <span className="text-xs truncate block max-w-[100px]">{r.subject_name}</span> },
    { key: 'class', header: 'Turma', render: (r) => <span className="text-xs">{r.class_group_name}</span> },
    { key: 'school', header: 'Escola', render: (r) => <span className="text-xs truncate block max-w-[100px]">{r.school_name}</span> },
    { key: 'bimester', header: 'Bim.', render: (r) => <span className="text-sm">{r.bimester}</span>, className: 'text-center' },
    { key: 'avg', header: 'Média', render: (r) => (
      <span className={`text-sm font-semibold ${r.grade_avg >= 6 ? 'text-green-600' : r.grade_avg > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
        {r.grade_avg > 0 ? r.grade_avg.toFixed(1) : '—'}
      </span>
    ), className: 'text-center' },
    { key: 'above', header: '≥6.0', render: (r) => <span className="text-xs text-green-600">{r.students_above_avg_pct.toFixed(0)}%</span>, className: 'text-center' },
    { key: 'risk', header: '<6.0', render: (r) => (
      <span className={`text-xs font-medium ${r.students_at_risk_pct > 30 ? 'text-red-600' : 'text-muted-foreground'}`}>
        {r.students_at_risk_pct.toFixed(0)}%
      </span>
    ), className: 'text-center' },
    { key: 'missing', header: 'Pend.', render: (r) => (
      <span className={`text-xs ${r.missing_grades_count > 0 ? 'text-yellow-600 font-semibold' : 'text-muted-foreground'}`}>
        {r.missing_grades_count}
      </span>
    ), className: 'text-center' },
  ];

  const distData = [
    { label: 'Excelente (≥8)', count: rows.filter(r => r.grade_avg >= 8).length, color: 'bg-green-500' },
    { label: 'Bom (6-8)', count: rows.filter(r => r.grade_avg >= 6 && r.grade_avg < 8).length, color: 'bg-blue-500' },
    { label: 'Risco (<6)', count: rows.filter(r => r.grade_avg > 0 && r.grade_avg < 6).length, color: 'bg-red-500' },
    { label: 'Sem nota', count: rows.filter(r => r.grade_avg === 0).length, color: 'bg-gray-400' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'B.I.', href: '/bi' }, { label: 'Notas e Aprendizagem' }]}
        title="Desempenho em Notas e Aprendizagem"
        description="Correlação entre atuação docente e resultado acadêmico"
        icon={GraduationCap}
      />

      <GlobalFilterBar filters={filters} onChange={setFilters} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard title="Média Geral" value={avgGrade > 0 ? avgGrade.toFixed(1) : '—'} icon={GraduationCap} variant={avgGrade >= 6 ? 'success' : 'warning'} loading={loading} />
        <KpiCard title="Acima da Média" value={`${avgAbove.toFixed(0)}%`} icon={TrendingUp} variant="success" loading={loading} />
        <KpiCard title="Em Risco (<6.0)" value={`${avgRisk.toFixed(0)}%`} icon={AlertTriangle} variant={avgRisk > 30 ? 'danger' : 'warning'} loading={loading} />
        <KpiCard title="Notas Pend." value={totalMissing} icon={BookOpen} variant={totalMissing > 0 ? 'warning' : 'success'} loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Média por Professor (Top 15)" loading={loading}>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={teacherAvgs} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" domain={[0, 10]} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
              <Tooltip formatter={(v: number) => v.toFixed(2)} />
              <Bar dataKey="avg" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribuição de Performance" loading={loading}>
          <div className="space-y-4 py-4">
            {distData.map(d => (
              <div key={d.label} className="flex items-center gap-3">
                <div className="w-24 text-xs text-muted-foreground text-right flex-shrink-0 truncate">{d.label}</div>
                <div className="flex-1 bg-muted rounded-full h-6 relative overflow-hidden">
                  <div className={`${d.color} h-full rounded-full transition-all`} style={{ width: `${totalRows > 0 ? (d.count / totalRows * 100) : 0}%` }} />
                </div>
                <span className="text-xs font-medium w-8 text-right flex-shrink-0">{d.count}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Tabela Cruzada de Desempenho</h2>
        <AnalyticTable columns={columns} data={rows} loading={loading} emptyMessage="Nenhum dado de notas encontrado" />
      </div>
    </div>
  );
}
