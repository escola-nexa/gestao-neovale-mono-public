import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { AlertCircle, AlertTriangle, ShieldAlert, Users } from 'lucide-react';
import { KpiCard } from '@/components/bi/KpiCard';
import { AlertCard } from '@/components/bi/AlertCard';
import { AnalyticTable, AnalyticColumn } from '@/components/bi/AnalyticTable';
import { ScoreBadge } from '@/components/bi/ScoreBadge';
import { GlobalFilterBar, BIFilters } from '@/components/bi/GlobalFilterBar';
import { useBIRisks } from '@/hooks/bi/useBIRisks';
import { useBIExecutive, TeacherBISummary } from '@/hooks/bi/useBIExecutive';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function BIRisksPage() {
  const [filters, setFilters] = useState<BIFilters>({});
  const { risksQuery } = useBIRisks(filters);
  const { kpisQuery } = useBIExecutive(filters);
  const navigate = useNavigate();
  const allTeachers = risksQuery.data || [];
  const kpis = kpisQuery.data;
  const loading = risksQuery.isLoading;

  const criticalTeachers = allTeachers.filter(t => t.compliance_score < 60);
  const attentionTeachers = allTeachers.filter(t => t.compliance_score >= 60 && t.compliance_score < 75);
  const withPlanningDelay = allTeachers.filter(t => t.planning_score < 50);
  const withAttendancePending = allTeachers.filter(t => t.attendance_score < 50);
  const withGradesPending = allTeachers.filter(t => t.grades_score < 50);

  const columns: AnalyticColumn<TeacherBISummary>[] = [
    { key: 'name', header: 'Professor', render: (r) => <span className="font-medium truncate block max-w-[140px]">{r.teacher_name}</span> },
    { key: 'school', header: 'Escola', render: (r) => <span className="text-xs truncate block max-w-[120px]">{r.school_names?.join(', ') || '—'}</span> },
    { key: 'risk', header: 'Risco', render: (r) => (
      <span className={`text-xs font-bold ${r.risk_score > 40 ? 'text-red-600' : r.risk_score > 25 ? 'text-yellow-600' : 'text-green-600'}`}>
        {r.risk_score.toFixed(0)}%
      </span>
    ), className: 'text-center' },
    { key: 'compliance', header: 'Conform.', render: (r) => <ScoreBadge score={r.compliance_score} size="sm" />, className: 'text-center' },
    { key: 'planning', header: 'Planej.', render: (r) => <ScoreBadge score={r.planning_score} size="sm" />, className: 'text-center' },
    { key: 'attendance', header: 'Freq.', render: (r) => <ScoreBadge score={r.attendance_score} size="sm" />, className: 'text-center' },
    { key: 'grades', header: 'Notas', render: (r) => <ScoreBadge score={r.grades_score} size="sm" />, className: 'text-center' },
    { key: 'action', header: '', render: (r) => (
      <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate(`/bi/professores/${r.teacher_id}`)}>Analisar</Button>
    ) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'B.I.', href: '/bi' }, { label: 'Riscos e Alertas' }]}
        title="Riscos e Alertas"
        description="Monitoramento preventivo e ação rápida"
      />

      <GlobalFilterBar filters={filters} onChange={setFilters} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard title="Alertas Críticos" value={criticalTeachers.length} icon={AlertCircle} variant="danger" loading={loading} />
        <KpiCard title="Em Atenção" value={attentionTeachers.length} icon={AlertTriangle} variant="warning" loading={loading} />
        <KpiCard title="Risco Médio" value={kpis ? `${kpis.avg_risk_score?.toFixed(0)}%` : '—'} icon={ShieldAlert} variant="info" loading={loading} />
        <KpiCard title="Total Prof." value={allTeachers.length} icon={Users} loading={loading} />
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {withPlanningDelay.length > 0 && (
          <AlertCard severity="critical" title="Planej. Atrasados" description={`${withPlanningDelay.length} professor(es) com score abaixo de 50%`} count={withPlanningDelay.length} />
        )}
        {withAttendancePending.length > 0 && (
          <AlertCard severity="warning" title="Freq. Não Lançada" description={`${withAttendancePending.length} professor(es) com score abaixo de 50%`} count={withAttendancePending.length} />
        )}
        {withGradesPending.length > 0 && (
          <AlertCard severity="warning" title="Notas Pendentes" description={`${withGradesPending.length} professor(es) com score abaixo de 50%`} count={withGradesPending.length} />
        )}
        {criticalTeachers.length === 0 && attentionTeachers.length === 0 && (
          <AlertCard severity="info" title="Sem Alertas" description="Não há professores em situação crítica ou de atenção" />
        )}
      </div>

      {/* Table */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Professores por Risco (maior primeiro)</h2>
        <AnalyticTable columns={columns} data={allTeachers.slice(0, 50)} loading={loading} emptyMessage="Nenhum professor com risco identificado" />
      </div>
    </div>
  );
}
