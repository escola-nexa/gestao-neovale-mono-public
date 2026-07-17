import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, School, Users, TrendingUp, ShieldAlert, ClipboardList, CalendarCheck2, BarChart3, MessageSquare } from 'lucide-react';
import { KpiCard } from '@/components/bi/KpiCard';
import { ChartCard } from '@/components/bi/ChartCard';
import { ScoreBadge } from '@/components/bi/ScoreBadge';
import { AnalyticTable, AnalyticColumn } from '@/components/bi/AnalyticTable';
import { useBISchoolDetail } from '@/hooks/bi/useBISchoolDetail';
import { TeacherBISummary } from '@/hooks/bi/useBIExecutive';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

export default function BISchoolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { schoolQuery, teachersQuery } = useBISchoolDetail(id);
  const school = schoolQuery.data;
  const teachers = teachersQuery.data || [];
  const loading = schoolQuery.isLoading || teachersQuery.isLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  if (!school) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/bi/escolas-bi')} className="gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
        <p className="text-muted-foreground text-center py-12">Escola não encontrada.</p>
      </div>
    );
  }

  const totalTeachers = teachers.length;
  const avgCompliance = totalTeachers > 0 ? teachers.reduce((s, t) => s + t.compliance_score, 0) / totalTeachers : 0;
  const avgRisk = totalTeachers > 0 ? teachers.reduce((s, t) => s + t.risk_score, 0) / totalTeachers : 0;
  const criticalCount = teachers.filter(t => t.compliance_score < 60).length;
  const attentionCount = teachers.filter(t => t.compliance_score >= 60 && t.compliance_score < 75).length;

  const avgPlanning = totalTeachers > 0 ? teachers.reduce((s, t) => s + t.planning_score, 0) / totalTeachers : 0;
  const avgAttendance = totalTeachers > 0 ? teachers.reduce((s, t) => s + t.attendance_score, 0) / totalTeachers : 0;
  const avgGrades = totalTeachers > 0 ? teachers.reduce((s, t) => s + t.grades_score, 0) / totalTeachers : 0;
  const avgOrientation = totalTeachers > 0 ? teachers.reduce((s, t) => s + t.orientation_score, 0) / totalTeachers : 0;

  const radarData = [
    { dimension: 'Planejamento', value: avgPlanning },
    { dimension: 'Frequência', value: avgAttendance },
    { dimension: 'Notas', value: avgGrades },
    { dimension: 'Orientações', value: avgOrientation },
  ];

  const columns: AnalyticColumn<TeacherBISummary>[] = [
    { key: 'name', header: 'Professor', render: (r) => <span className="font-medium text-sm">{r.teacher_name}</span> },
    { key: 'planning', header: 'Planej.', render: (r) => <ScoreBadge score={r.planning_score} size="sm" />, className: 'text-center' },
    { key: 'attendance', header: 'Freq.', render: (r) => <ScoreBadge score={r.attendance_score} size="sm" />, className: 'text-center' },
    { key: 'grades', header: 'Notas', render: (r) => <ScoreBadge score={r.grades_score} size="sm" />, className: 'text-center' },
    { key: 'compliance', header: 'Conform.', render: (r) => <ScoreBadge score={r.compliance_score} size="md" showLabel />, className: 'text-center' },
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
        breadcrumbs={[
          { label: 'B.I.', href: '/bi' },
          { label: 'Escolas', href: '/bi/escolas-bi' },
          { label: school.nome },
        ]}
        title={school.nome}
        description={`${school.cidade} • ${school.codigo}${school.diretor ? ` • Diretor(a): ${school.diretor}` : ''}`}
        icon={School}
        backTo="/bi/escolas-bi"
      />

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-end">
            <div className="text-right">
              <ScoreBadge score={avgCompliance} size="lg" showLabel />
              <p className="text-xs text-muted-foreground mt-1">Conformidade da escola</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard title="Professores" value={totalTeachers} icon={Users} />
        <KpiCard title="Conformidade" value={`${avgCompliance.toFixed(0)}%`} icon={TrendingUp} variant="info" />
        <KpiCard title="Risco Médio" value={`${avgRisk.toFixed(0)}%`} icon={ShieldAlert} variant={avgRisk > 40 ? 'danger' : 'success'} />
        <KpiCard title="Em Atenção" value={attentionCount} icon={ClipboardList} variant="warning" />
        <KpiCard title="Críticos" value={criticalCount} icon={ShieldAlert} variant="danger" />
        <KpiCard title="Excelentes" value={teachers.filter(t => t.compliance_score >= 90).length} icon={TrendingUp} variant="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Radar de Performance da Escola">
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar dataKey="value" stroke="hsl(263, 84%, 58%)" fill="hsl(263, 84%, 58%)" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Resumo da Escola">
          <div className="space-y-3 py-2">
            {[
              { label: 'Planejamento', score: avgPlanning },
              { label: 'Frequência', score: avgAttendance },
              { label: 'Notas', score: avgGrades },
              { label: 'Orientações', score: avgOrientation },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-24">{item.label}</span>
                <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                  <div className={`h-full rounded-full ${item.score >= 75 ? 'bg-green-500' : item.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${item.score}%` }} />
                </div>
                <span className="text-xs font-medium w-12 text-right">{item.score.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Ranking de Professores</h2>
        <AnalyticTable columns={columns} data={[...teachers].sort((a, b) => b.compliance_score - a.compliance_score)} loading={loading} emptyMessage="Nenhum professor vinculado" />
      </div>
    </div>
  );
}
