import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { CalendarCheck2, CalendarX2, Percent, Clock } from 'lucide-react';
import { KpiCard } from '@/components/bi/KpiCard';
import { ChartCard } from '@/components/bi/ChartCard';
import { GlobalFilterBar, BIFilters } from '@/components/bi/GlobalFilterBar';
import { AnalyticTable, AnalyticColumn } from '@/components/bi/AnalyticTable';
import { ScoreBadge } from '@/components/bi/ScoreBadge';
import { useBIAttendance } from '@/hooks/bi/useBIAttendance';
import { useBIExecutive, TeacherBISummary } from '@/hooks/bi/useBIExecutive';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function BIAttendancePage() {
  const [filters, setFilters] = useState<BIFilters>({});
  const { metricsQuery } = useBIAttendance(filters);
  const { teachersQuery } = useBIExecutive(filters, 0, 200);
  const m = metricsQuery.data;
  const teachers = teachersQuery.data || [];
  const loading = metricsQuery.isLoading;

  const truncName = (name: string, max = 18) => name.length > max ? name.slice(0, max) + '…' : name;

  const teacherAttendance = [...teachers]
    .sort((a, b) => a.attendance_score - b.attendance_score)
    .slice(0, 15)
    .map(t => ({ name: truncName(t.teacher_name), score: t.attendance_score }));

  const columns: AnalyticColumn<TeacherBISummary>[] = [
    { key: 'name', header: 'Professor', render: (r) => <span className="font-medium text-sm truncate block max-w-[140px]">{r.teacher_name}</span> },
    { key: 'school', header: 'Escola', render: (r) => <span className="text-xs truncate block max-w-[120px]">{r.school_names?.join(', ') || '—'}</span> },
    { key: 'expected', header: 'Prev.', render: (r) => <span className="text-sm">{r.total_expected_attendance}</span>, className: 'text-center' },
    { key: 'recorded', header: 'Lanç.', render: (r) => <span className="text-sm">{r.total_recorded_attendance}</span>, className: 'text-center' },
    { key: 'pending', header: 'Pend.', render: (r) => {
      const pending = Math.max(0, r.total_expected_attendance - r.total_recorded_attendance);
      return <span className={`text-sm font-semibold ${pending > 0 ? 'text-red-600' : 'text-green-600'}`}>{pending}</span>;
    }, className: 'text-center' },
    { key: 'score', header: 'Score', render: (r) => <ScoreBadge score={r.attendance_score} size="sm" />, className: 'text-center' },
  ];

  const pendingTeachers = [...teachers]
    .filter(t => t.total_expected_attendance > t.total_recorded_attendance)
    .sort((a, b) => (b.total_expected_attendance - b.total_recorded_attendance) - (a.total_expected_attendance - a.total_recorded_attendance));

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'B.I.', href: '/bi' }, { label: 'Frequência e Execução' }]}
        title="Frequência e Execução de Aulas"
        description="Aderência operacional no registro de presença"
      />

      <GlobalFilterBar filters={filters} onChange={setFilters} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard title="Aulas Previstas" value={m?.total_expected_classes ?? '—'} icon={CalendarCheck2} loading={loading} />
        <KpiCard title="Com Frequência" value={m?.total_with_attendance ?? '—'} icon={CalendarCheck2} variant="success" loading={loading} />
        <KpiCard title="Sem Frequência" value={m?.total_without_attendance ?? '—'} icon={CalendarX2} variant="danger" loading={loading} />
        <KpiCard title="Taxa Lançamento" value={m ? `${m.attendance_rate?.toFixed(0)}%` : '—'} icon={Percent} variant="info" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Professores com Menor Aderência" loading={teachersQuery.isLoading}>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={teacherAttendance} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" domain={[0, 100]} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Bar dataKey="score" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Pendências por Professor</h3>
          <AnalyticTable columns={columns} data={pendingTeachers.slice(0, 20)} loading={teachersQuery.isLoading} emptyMessage="Nenhuma pendência encontrada" />
        </div>
      </div>
    </div>
  );
}
