import { useState } from 'react';
import { ShieldAlert, AlertTriangle, Users, Target, GraduationCap } from 'lucide-react';
import { KpiCard } from '@/components/bi/KpiCard';
import { ChartCard } from '@/components/bi/ChartCard';
import { PredictionBadge } from '@/components/bi/PredictionBadge';
import { ScoreBadge } from '@/components/bi/ScoreBadge';
import { AnalyticTable, AnalyticColumn } from '@/components/bi/AnalyticTable';
import { GlobalFilterBar, BIFilters } from '@/components/bi/GlobalFilterBar';
import { useBIPredictions, RiskPrediction, StudentRiskPrediction } from '@/hooks/bi/useBIPredictions';
import { MethodologyDrawer } from '@/components/bi/MethodologyDrawer';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function BIPredictionRiskPage() {
  const [filters, setFilters] = useState<BIFilters>({});
  const { predictionsQuery, studentRisksQuery } = useBIPredictions(filters);
  const predictions = predictionsQuery.data || [];
  const studentRisks = studentRisksQuery.data || [];
  const loading = predictionsQuery.isLoading;
  const navigate = useNavigate();

  const teacherPreds = predictions.filter(p => p.target_type === 'teacher');
  const schoolPreds = predictions.filter(p => p.target_type === 'school');
  const highRisk = predictions.filter(p => p.risk_band === 'high');
  const moderateRisk = predictions.filter(p => p.risk_band === 'moderate');
  const criticalStudents = studentRisks.filter(s => s.risk_level === 'CRITICO');

  const truncName = (name: string, max = 16) => name.length > max ? name.slice(0, max) + '…' : name;
  const topTeacherRisk = teacherPreds.slice(0, 10).map(t => ({ name: truncName(t.target_name.split(' ').slice(0, 2).join(' ')), value: t.predicted_risk }));
  const topSchoolRisk = schoolPreds.slice(0, 10).map(s => ({ name: truncName(s.target_name), value: s.predicted_risk }));

  const columns: AnalyticColumn<RiskPrediction>[] = [
    { key: 'type', header: 'Tipo', render: (r) => <span className="text-xs">{r.target_type === 'teacher' ? 'Prof.' : 'Escola'}</span> },
    { key: 'name', header: 'Nome', render: (r) => <span className="font-medium text-sm truncate block max-w-[130px]">{r.target_name}</span> },
    { key: 'compliance', header: 'Conform.', render: (r) => <ScoreBadge score={r.current_compliance} size="sm" />, className: 'text-center' },
    { key: 'current_risk', header: 'Risco Atual', render: (r) => <span className="text-xs font-bold">{r.current_risk.toFixed(0)}%</span>, className: 'text-center' },
    { key: 'predicted', header: 'Previsto', render: (r) => <span className="text-xs font-bold">{r.predicted_risk.toFixed(0)}%</span>, className: 'text-center' },
    { key: 'band', header: 'Faixa', render: (r) => <PredictionBadge riskBand={r.risk_band} size="sm" />, className: 'text-center' },
    { key: 'factors', header: 'Fatores', render: (r) => <span className="text-xs text-muted-foreground line-clamp-1">{r.primary_factors.join(', ')}</span> },
    { key: 'action', header: '', render: (r) => r.target_type === 'teacher' ? (
      <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate(`/bi/professores/${r.target_id}`)}>Ver</Button>
    ) : null },
  ];

  const studentColumns: AnalyticColumn<StudentRiskPrediction>[] = [
    { key: 'risk', header: 'Risco', render: (r) => (
      <Badge variant={r.risk_level === 'CRITICO' ? 'destructive' : 'secondary'} className="text-[10px]">
        {r.risk_level === 'CRITICO' ? 'Crítico' : 'Atenção'}
      </Badge>
    ), className: 'w-20' },
    { key: 'name', header: 'Aluno', render: (r) => <span className="font-medium text-sm truncate block max-w-[160px]">{r.student_name}</span> },
    { key: 'school', header: 'Escola', render: (r) => <span className="text-xs text-muted-foreground truncate block max-w-[120px]">{r.school_name}</span> },
    { key: 'class', header: 'Turma', render: (r) => <span className="text-xs">{r.class_group_name}</span> },
    { key: 'absence', header: 'Faltas', render: (r) => (
      <span className={`text-xs font-bold ${r.absence_rate > 0.2 ? 'text-destructive' : 'text-foreground'}`}>
        {(r.absence_rate * 100).toFixed(0)}% ({r.total_absences}/{r.total_classes})
      </span>
    ), className: 'text-center' },
    { key: 'subjects', header: 'Disc. Abaixo', render: (r) => (
      <span className="text-xs">
        {r.subjects_below_average > 0 ? `${r.subjects_below_average} disc.` : '—'}
      </span>
    ), className: 'text-center' },
    { key: 'weak', header: 'Disciplinas Fracas', render: (r) => (
      <span className="text-xs text-muted-foreground line-clamp-1">
        {r.weak_subject_names?.length > 0 ? r.weak_subject_names.join(', ') : '—'}
      </span>
    ) },
    { key: 'factors', header: 'Fatores', render: (r) => (
      <span className="text-xs text-muted-foreground">{r.risk_factors?.join('; ')}</span>
    ) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'B.I.', href: '/bi' }, { label: 'Previsão de Risco' }]}
        title="Previsão de Risco Pedagógico"
        description="Antecipação de criticidades com base em padrões históricos e comportamentais"
        icon={ShieldAlert}
        actions={<MethodologyDrawer />}
      />

      <GlobalFilterBar filters={filters} onChange={setFilters} />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KpiCard title="Alto Risco" value={highRisk.length} icon={ShieldAlert} variant="danger" loading={loading} />
        <KpiCard title="Risco Moderado" value={moderateRisk.length} icon={AlertTriangle} variant="warning" loading={loading} />
        <KpiCard title="Prof. Analisados" value={teacherPreds.length} icon={Users} loading={loading} />
        <KpiCard title="Escolas Analiz." value={schoolPreds.length} icon={Target} loading={loading} />
        <KpiCard title="Alunos em Risco" value={criticalStudents.length} icon={GraduationCap} variant="danger" loading={studentRisksQuery.isLoading} />
      </div>

      <Tabs defaultValue="teachers" className="w-full">
        <TabsList>
          <TabsTrigger value="teachers">Professores & Escolas</TabsTrigger>
          <TabsTrigger value="students">
            Alunos em Risco
            {criticalStudents.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-[10px] h-4 min-w-4 px-1">{criticalStudents.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teachers" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Professores com Maior Risco" loading={loading}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topTeacherRisk} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(0)}%`} />
                  <Bar dataKey="value" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Escolas com Maior Agravamento" loading={loading}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topSchoolRisk} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(0)}%`} />
                  <Bar dataKey="value" fill="hsl(var(--accent-foreground))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Tabela de Previsão de Risco</h2>
            <AnalyticTable columns={columns} data={predictions} loading={loading} emptyMessage="Nenhuma previsão de risco gerada" />
          </div>
        </TabsContent>

        <TabsContent value="students" className="space-y-4 mt-4">
          <ChartCard
            title="Alunos com Risco Pedagógico"
            subtitle="Alunos com >20% de faltas ou notas abaixo da média em 2+ disciplinas"
          >
            <AnalyticTable
              columns={studentColumns}
              data={studentRisks}
              loading={studentRisksQuery.isLoading}
              emptyMessage="Nenhum aluno em risco identificado para os filtros aplicados"
            />
          </ChartCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
