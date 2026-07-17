import { useQuery } from '@tanstack/react-query';
import { biApi as supabase } from './api';
import { BIFilters } from '@/components/bi/GlobalFilterBar';
import { useBIExecutive, TeacherBISummary } from './useBIExecutive';
import { useBISchools, SchoolBISummary } from './useBISchools';

export interface BIInsight {
  id: string;
  category: 'risk' | 'opportunity' | 'trend' | 'operational';
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  target_type: 'teacher' | 'school' | 'city' | 'system';
  target_name: string;
  metric_value?: number;
  metric_change?: number;
  basis: string;
}

function generateInsights(teachers: TeacherBISummary[], schools: SchoolBISummary[]): BIInsight[] {
  const insights: BIInsight[] = [];
  const total = teachers.length;
  if (total === 0) return insights;

  const avgCompliance = teachers.reduce((s, t) => s + t.compliance_score, 0) / total;
  const avgRisk = teachers.reduce((s, t) => s + t.risk_score, 0) / total;

  // Critical teachers
  const critical = teachers.filter(t => t.compliance_score < 60);
  if (critical.length > 0) {
    const pct = ((critical.length / total) * 100).toFixed(0);
    insights.push({
      id: 'critical-teachers',
      category: 'risk',
      severity: 'critical',
      title: `${critical.length} professor(es) em situação crítica (${pct}% do total)`,
      description: `Conformidade abaixo de 60% exige intervenção pedagógica imediata. Principais: ${critical.slice(0, 3).map(t => t.teacher_name).join(', ')}.`,
      target_type: 'system',
      target_name: 'Organização',
      metric_value: critical.length,
      basis: 'Cálculo baseado no Score de Conformidade (planejamento 30%, frequência 25%, notas 20%, orientações 15%, carga 10%)',
    });
  }

  // Excellent teachers
  const excellent = teachers.filter(t => t.compliance_score >= 90);
  if (excellent.length > 0) {
    insights.push({
      id: 'excellent-teachers',
      category: 'opportunity',
      severity: 'success',
      title: `${excellent.length} professor(es) com desempenho excelente (≥90%)`,
      description: `Estes profissionais podem servir como referência de boas práticas: ${excellent.slice(0, 3).map(t => t.teacher_name).join(', ')}.`,
      target_type: 'system',
      target_name: 'Organização',
      metric_value: excellent.length,
      basis: 'Conformidade ≥ 90% em todas as dimensões',
    });
  }

  // Planning dimension
  const planningIssues = teachers.filter(t => t.planning_score < 40);
  if (planningIssues.length > 0) {
    insights.push({
      id: 'planning-delay',
      category: 'operational',
      severity: planningIssues.length > total * 0.3 ? 'critical' : 'warning',
      title: `${planningIssues.length} professor(es) com planejamento severamente atrasado (<40%)`,
      description: `Planejamentos não enviados ou devolvidos. Risco de impacto no acompanhamento pedagógico.`,
      target_type: 'system',
      target_name: 'Planejamento',
      metric_value: planningIssues.length,
      basis: 'Score de planejamento < 40% (aprovados / esperados × 100)',
    });
  }

  // Attendance
  const attendanceIssues = teachers.filter(t => t.attendance_score < 50);
  if (attendanceIssues.length > 0) {
    insights.push({
      id: 'attendance-issues',
      category: 'operational',
      severity: 'warning',
      title: `${attendanceIssues.length} professor(es) com frequência pendente (<50%)`,
      description: `Lançamentos de frequência não realizados comprometem acompanhamento de presença dos alunos.`,
      target_type: 'system',
      target_name: 'Frequência',
      metric_value: attendanceIssues.length,
      basis: 'Score de frequência < 50% (registros realizados / aulas ocorridas)',
    });
  }

  // Multi-dimension risk (teachers weak in 3+ dimensions)
  const multiRisk = teachers.filter(t =>
    [t.planning_score < 50, t.attendance_score < 50, t.grades_score < 50, t.orientation_score < 50].filter(Boolean).length >= 3
  );
  if (multiRisk.length > 0) {
    insights.push({
      id: 'multi-dimension-risk',
      category: 'risk',
      severity: 'critical',
      title: `${multiRisk.length} professor(es) com risco em 3+ dimensões simultâneas`,
      description: `Estes professores apresentam falhas simultâneas em planejamento, frequência e notas: ${multiRisk.slice(0, 3).map(t => t.teacher_name).join(', ')}.`,
      target_type: 'system',
      target_name: 'Risco Multidimensional',
      metric_value: multiRisk.length,
      basis: 'Análise cruzada de planejamento, frequência, notas e orientações',
    });
  }

  // Top individual teacher risks
  teachers
    .filter(t => t.risk_score > 50)
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 3)
    .forEach(t => {
      const weakest = [
        { name: 'Planejamento', score: t.planning_score },
        { name: 'Frequência', score: t.attendance_score },
        { name: 'Notas', score: t.grades_score },
      ].sort((a, b) => a.score - b.score)[0];

      insights.push({
        id: `teacher-risk-${t.teacher_id}`,
        category: 'risk',
        severity: t.risk_score > 70 ? 'critical' : 'warning',
        title: `${t.teacher_name} — risco ${t.risk_score.toFixed(0)}%`,
        description: `Conformidade: ${t.compliance_score.toFixed(0)}% | Dimensão mais fraca: ${weakest.name} (${weakest.score.toFixed(0)}%). Escola: ${t.school_names?.[0] || 'N/A'}.`,
        target_type: 'teacher',
        target_name: t.teacher_name,
        metric_value: t.risk_score,
        basis: 'Score de risco = 100 - Score de Conformidade',
      });
    });

  // School insights
  if (schools.length > 0) {
    const worstSchool = [...schools].sort((a, b) => a.compliance_avg - b.compliance_avg)[0];
    const bestSchool = [...schools].sort((a, b) => b.compliance_avg - a.compliance_avg)[0];

    if (worstSchool && worstSchool.compliance_avg < 70) {
      insights.push({
        id: `school-worst-${worstSchool.school_id}`,
        category: 'risk',
        severity: worstSchool.compliance_avg < 50 ? 'critical' : 'warning',
        title: `"${worstSchool.school_name}" com menor conformidade (${worstSchool.compliance_avg.toFixed(0)}%)`,
        description: `${worstSchool.total_teachers} professores, ${worstSchool.pending_plannings} planejamentos pendentes. Cidade: ${worstSchool.city_name}.`,
        target_type: 'school',
        target_name: worstSchool.school_name,
        metric_value: worstSchool.compliance_avg,
        basis: 'Média de conformidade de todos os professores da escola',
      });
    }

    if (bestSchool && bestSchool.compliance_avg >= 85 && schools.length > 1) {
      insights.push({
        id: `school-best-${bestSchool.school_id}`,
        category: 'opportunity',
        severity: 'success',
        title: `"${bestSchool.school_name}" é referência com ${bestSchool.compliance_avg.toFixed(0)}% de conformidade`,
        description: `Escola com melhor desempenho pode compartilhar boas práticas com as demais unidades.`,
        target_type: 'school',
        target_name: bestSchool.school_name,
        metric_value: bestSchool.compliance_avg,
        basis: 'Ranking de conformidade entre escolas da organização',
      });
    }
  }

  // Compliance distribution insight
  const highCompliance = teachers.filter(t => t.compliance_score >= 75).length;
  const medCompliance = teachers.filter(t => t.compliance_score >= 60 && t.compliance_score < 75).length;
  const lowCompliance = teachers.filter(t => t.compliance_score < 60).length;
  insights.push({
    id: 'compliance-distribution',
    category: 'trend',
    severity: lowCompliance > total * 0.3 ? 'warning' : 'info',
    title: `Distribuição: ${highCompliance} adequados, ${medCompliance} em atenção, ${lowCompliance} críticos`,
    description: `Conformidade média geral: ${avgCompliance.toFixed(1)}% | Risco médio: ${avgRisk.toFixed(1)}%.`,
    target_type: 'system',
    target_name: 'Panorama Geral',
    metric_value: avgCompliance,
    basis: 'Distribuição de conformidade docente em faixas: ≥75%, 60-74%, <60%',
  });

  return insights;
}

export function useBIInsights(filters: BIFilters) {
  const { teachersQuery } = useBIExecutive(filters, 0, 1000);
  const { schoolsQuery } = useBISchools(filters);

  const insightsQuery = useQuery({
    queryKey: ['bi-insights', teachersQuery.data, schoolsQuery.data],
    queryFn: () => generateInsights(teachersQuery.data || [], schoolsQuery.data || []),
    enabled: !!teachersQuery.data,
    staleTime: 60000,
  });

  return { insightsQuery, teachersQuery };
}
