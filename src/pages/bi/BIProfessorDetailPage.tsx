import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, User, School, BookOpen, Calendar, BarChart3, MessageSquare, ShieldCheck } from 'lucide-react';
import { KpiCard } from '@/components/bi/KpiCard';
import { ChartCard } from '@/components/bi/ChartCard';
import { ScoreBadge, getScoreBand } from '@/components/bi/ScoreBadge';
import { AnalyticTable, AnalyticColumn } from '@/components/bi/AnalyticTable';
import { useBIProfessorDetail } from '@/hooks/bi/useBIProfessorDetail';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

export default function BIProfessorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { detailQuery, bindingsQuery, planningsQuery } = useBIProfessorDetail(id);
  const teacher = detailQuery.data;
  const bindings = bindingsQuery.data || [];
  const plannings = planningsQuery.data || [];
  const loading = detailQuery.isLoading;

  const radarData = teacher ? [
    { dimension: 'Planejamento', value: teacher.planning_score },
    { dimension: 'Frequência', value: teacher.attendance_score },
    { dimension: 'Notas', value: teacher.grades_score },
    { dimension: 'Orientações', value: teacher.orientation_score },
    { dimension: 'Regularidade', value: 85 },
  ] : [];

  const planningColumns: AnalyticColumn<any>[] = [
    { key: 'status', header: 'Status', render: (r) => (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
        r.status === 'DRAFT' ? 'bg-muted text-muted-foreground' :
        r.status === 'ENVIADO' ? 'bg-blue-100 text-blue-700' :
        ['ASSINADO', 'CONCLUIDO', 'APPROVED'].includes(r.status) ? 'bg-green-100 text-green-700' :
        ['DEVOLVIDO', 'REJECTED'].includes(r.status) ? 'bg-red-100 text-red-700' :
        'bg-yellow-100 text-yellow-700'
      }`}>
        {r.status}
      </span>
    ) },
    { key: 'subject', header: 'Disciplina', render: (r) => <span className="text-sm">{r.subjects?.nome || '—'}</span> },
    { key: 'school', header: 'Escola', render: (r) => <span className="text-xs">{r.schools?.nome || '—'}</span> },
    { key: 'bimester', header: 'Bim.', render: (r) => <span className="text-sm">{r.bimester_number || '—'}</span>, className: 'text-center' },
    { key: 'date', header: 'Data', render: (r) => <span className="text-xs">{new Date(r.created_at).toLocaleDateString('pt-BR')}</span> },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/bi/visao-executiva')} className="gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
        <p className="text-muted-foreground text-center py-12">Professor não encontrado ou sem dados disponíveis.</p>
      </div>
    );
  }

  const band = getScoreBand(teacher.compliance_score);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'B.I.', href: '/bi' },
          { label: 'Visão Executiva', href: '/bi/visao-executiva' },
          { label: teacher.teacher_name },
        ]}
        title={teacher.teacher_name}
        description={teacher.school_names?.join(' • ') || 'Sem escola vinculada'}
        icon={User}
        backTo="/bi/visao-executiva"
      />

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">{teacher.school_names?.join(' • ') || 'Sem escola vinculada'}</p>
              <p className="text-xs text-muted-foreground">{[...new Set(teacher.city_names || [])].join(', ')}</p>
            </div>
            <div className="text-right">
              <ScoreBadge score={teacher.compliance_score} size="lg" showLabel />
              <p className="text-xs text-muted-foreground mt-1">Índice de conformidade</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard title="Conformidade" value={`${teacher.compliance_score.toFixed(0)}%`} icon={ShieldCheck} variant={teacher.compliance_score >= 75 ? 'success' : teacher.compliance_score >= 60 ? 'warning' : 'danger'} />
        <KpiCard title="Planejamento" value={`${teacher.planning_score.toFixed(0)}%`} icon={BarChart3} variant={teacher.planning_score >= 75 ? 'success' : 'warning'} />
        <KpiCard title="Frequência" value={`${teacher.attendance_score.toFixed(0)}%`} icon={Calendar} variant={teacher.attendance_score >= 75 ? 'success' : 'warning'} />
        <KpiCard title="Notas" value={`${teacher.grades_score.toFixed(0)}%`} icon={BarChart3} variant={teacher.grades_score >= 75 ? 'success' : 'warning'} />
        <KpiCard title="Orientações" value={`${teacher.total_open_orientations} abertas`} icon={MessageSquare} variant={teacher.total_open_orientations > 0 ? 'warning' : 'success'} />
        <KpiCard title="Risco" value={`${teacher.risk_score.toFixed(0)}%`} icon={ShieldCheck} variant={teacher.risk_score > 40 ? 'danger' : 'success'} />
      </div>

      {/* Radar + Bindings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Radar de Performance">
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar dataKey="value" stroke="hsl(263, 84%, 58%)" fill="hsl(263, 84%, 58%)" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Vínculos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            {bindings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Nenhum vínculo ativo encontrado.</p>
            ) : (
              <div className="space-y-2">
                {bindings.map((b: any) => (
                  <div key={b.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <School className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{b.schools?.nome}</p>
                      <p className="text-xs text-muted-foreground">{b.courses?.nome}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Plannings History */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Histórico de Planejamentos</h2>
        <AnalyticTable columns={planningColumns} data={plannings} emptyMessage="Nenhum planejamento encontrado" />
      </div>
    </div>
  );
}
