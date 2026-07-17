import { useQuery } from '@tanstack/react-query';
import { biApi as supabase } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { BIFilters } from '@/components/bi/GlobalFilterBar';
import { useBIExecutive, TeacherBISummary } from './useBIExecutive';
import { useBISchools, SchoolBISummary } from './useBISchools';

export interface RiskPrediction {
  target_type: 'teacher' | 'school' | 'student';
  target_id: string;
  target_name: string;
  detail: string;
  current_compliance: number;
  current_risk: number;
  predicted_risk: number;
  risk_band: 'low' | 'moderate' | 'high';
  primary_factors: string[];
  factor_weights: number[];
  intervention_priority: 'imediata' | 'curto_prazo' | 'monitorar';
}

export interface StudentRiskPrediction {
  student_id: string;
  student_name: string;
  school_id: string;
  school_name: string;
  class_group_id: string;
  class_group_name: string;
  course_name: string;
  total_classes: number;
  total_absences: number;
  absence_rate: number;
  subjects_below_average: number;
  weak_subject_names: string[];
  risk_level: 'CRITICO' | 'ATENCAO' | 'ADEQUADO';
  risk_factors: string[];
}

function computeTeacherPredictedRisk(t: TeacherBISummary): { risk: number; factors: string[]; weights: number[] } {
  const factors: string[] = [];
  const weights: number[] = [];

  if (t.planning_score < 30) { factors.push('Planejamento severamente atrasado'); weights.push(25); }
  else if (t.planning_score < 50) { factors.push('Planejamento atrasado'); weights.push(15); }
  else if (t.planning_score < 70) { factors.push('Planejamento com pendências'); weights.push(8); }

  if (t.attendance_score < 30) { factors.push('Frequência crítica — não lançada'); weights.push(20); }
  else if (t.attendance_score < 50) { factors.push('Frequência com pendências significativas'); weights.push(12); }
  else if (t.attendance_score < 70) { factors.push('Frequência parcialmente pendente'); weights.push(5); }

  if (t.grades_score < 30) { factors.push('Notas severamente pendentes'); weights.push(18); }
  else if (t.grades_score < 50) { factors.push('Notas pendentes'); weights.push(10); }

  if (t.total_open_orientations > 3) { factors.push('Orientações recorrentes em aberto'); weights.push(15); }
  else if (t.total_open_orientations > 1) { factors.push('Orientações pendentes'); weights.push(8); }

  const weakDimensions = [
    t.planning_score < 50, t.attendance_score < 50, t.grades_score < 50, t.orientation_score < 50,
  ].filter(Boolean).length;
  if (weakDimensions >= 3) { factors.push('Múltiplas dimensões comprometidas'); weights.push(10); }

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  return { risk: Math.min(100, t.risk_score + totalWeight), factors, weights };
}

function predictRisks(teachers: TeacherBISummary[], schools: SchoolBISummary[]): RiskPrediction[] {
  const predictions: RiskPrediction[] = [];

  teachers.forEach(t => {
    const { risk: predictedRisk, factors, weights } = computeTeacherPredictedRisk(t);
    if (factors.length > 0) {
      predictions.push({
        target_type: 'teacher',
        target_id: t.teacher_id,
        target_name: t.teacher_name,
        detail: t.school_names?.[0] || '',
        current_compliance: t.compliance_score,
        current_risk: t.risk_score,
        predicted_risk: predictedRisk,
        risk_band: predictedRisk >= 70 ? 'high' : predictedRisk >= 40 ? 'moderate' : 'low',
        primary_factors: factors,
        factor_weights: weights,
        intervention_priority: predictedRisk >= 70 ? 'imediata' : predictedRisk >= 50 ? 'curto_prazo' : 'monitorar',
      });
    }
  });

  schools.forEach(s => {
    const factors: string[] = [];
    const weights: number[] = [];
    if (s.compliance_avg < 50) { factors.push('Conformidade crítica'); weights.push(20); }
    else if (s.compliance_avg < 65) { factors.push('Conformidade baixa'); weights.push(10); }
    if (s.risk_avg > 60) { factors.push('Risco elevado generalizado'); weights.push(15); }
    if (s.pending_plannings > 20) { factors.push('Volume alto de planejamentos pendentes'); weights.push(12); }
    if (s.pending_attendance > 15) { factors.push('Frequência não regularizada'); weights.push(10); }

    if (factors.length > 0) {
      const predictedRisk = Math.min(100, s.risk_avg + weights.reduce((a, b) => a + b, 0));
      predictions.push({
        target_type: 'school',
        target_id: s.school_id,
        target_name: s.school_name,
        detail: s.city_name,
        current_compliance: s.compliance_avg,
        current_risk: s.risk_avg,
        predicted_risk: predictedRisk,
        risk_band: predictedRisk >= 70 ? 'high' : predictedRisk >= 40 ? 'moderate' : 'low',
        primary_factors: factors,
        factor_weights: weights,
        intervention_priority: predictedRisk >= 70 ? 'imediata' : predictedRisk >= 50 ? 'curto_prazo' : 'monitorar',
      });
    }
  });

  return predictions.sort((a, b) => b.predicted_risk - a.predicted_risk);
}

export function useBIPredictions(filters: BIFilters) {
  const { organizationId } = useOrganization();
  const { teachersQuery } = useBIExecutive(filters, 0, 1000);
  const { schoolsQuery } = useBISchools(filters);

  const predictionsQuery = useQuery({
    queryKey: ['bi-predictions', teachersQuery.data, schoolsQuery.data],
    queryFn: () => predictRisks(teachersQuery.data || [], schoolsQuery.data || []),
    enabled: !!teachersQuery.data,
    staleTime: 60000,
  });

  // Student-level risk predictions from the new RPC
  const studentRisksQuery = useQuery({
    queryKey: ['bi-student-risks', organizationId, filters.schoolId, filters.bimester],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_student_risk_predictions', {
        p_org_id: organizationId!,
        p_school_id: filters.schoolId || null,
        p_bimester_number: filters.bimester ? parseInt(filters.bimester) : null,
      });
      if (error) throw error;
      return (data as unknown as StudentRiskPrediction[]) || [];
    },
    enabled: !!organizationId,
    staleTime: 120000,
  });

  return { predictionsQuery, studentRisksQuery };
}
