import { useQuery } from '@tanstack/react-query';
import { biApi as supabase } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { BIFilters } from '@/components/bi/GlobalFilterBar';
import { useBIExecutive, TeacherBISummary } from './useBIExecutive';
import { useBISchools, SchoolBISummary } from './useBISchools';

export interface BIRecommendation {
  id: string;
  priority: 'alta' | 'media' | 'baixa';
  category: string;
  target_type: 'teacher' | 'school' | 'system';
  target_name: string;
  target_id?: string;
  action: string;
  reason: string;
  impact: string;
  impact_score: number;
  recommended_deadline: string;
  recommended_owner: string;
}

interface DBRecommendation {
  rec_priority: string;
  rec_category: string;
  target_type: string;
  target_id: string;
  target_name: string;
  action_text: string;
  reason_text: string;
  impact_text: string;
  impact_score: number;
  deadline_days: number;
}

function getDeadline(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `Até ${d.toLocaleDateString('pt-BR')} (${days} dias)`;
}

function generateClientRecommendations(teachers: TeacherBISummary[], schools: SchoolBISummary[]): BIRecommendation[] {
  const recs: BIRecommendation[] = [];
  let idx = 0;

  // Critical teachers
  teachers
    .filter(t => t.compliance_score < 60)
    .sort((a, b) => a.compliance_score - b.compliance_score)
    .slice(0, 5)
    .forEach(t => {
      const weakest = [
        { dim: 'Planejamento', score: t.planning_score },
        { dim: 'Frequência', score: t.attendance_score },
        { dim: 'Notas', score: t.grades_score },
      ].sort((a, b) => a.score - b.score)[0];

      recs.push({
        id: `rec-${idx++}`,
        priority: 'alta',
        category: 'Intervenção Pedagógica',
        target_type: 'teacher',
        target_name: t.teacher_name,
        target_id: t.teacher_id,
        action: `Agendar orientação prioritária com ${t.teacher_name} — foco em ${weakest.dim}`,
        reason: `Conformidade em ${t.compliance_score.toFixed(0)}%, dimensão mais fraca: ${weakest.dim} (${weakest.score.toFixed(0)}%)`,
        impact: 'Evitar agravamento e regularizar pendências críticas',
        impact_score: Math.round(100 - t.compliance_score),
        recommended_deadline: getDeadline(7),
        recommended_owner: `Coordenador da escola ${t.school_names?.[0] || ''}`,
      });
    });

  // Attendance regularization
  teachers
    .filter(t => t.attendance_score < 40 && t.compliance_score >= 60)
    .sort((a, b) => a.attendance_score - b.attendance_score)
    .slice(0, 3)
    .forEach(t => {
      const missing = t.total_expected_attendance - t.total_recorded_attendance;
      recs.push({
        id: `rec-${idx++}`,
        priority: 'media',
        category: 'Regularização de Frequência',
        target_type: 'teacher',
        target_name: t.teacher_name,
        target_id: t.teacher_id,
        action: `Regularizar ${missing} lançamento(s) de frequência pendente(s)`,
        reason: `Score de frequência em ${t.attendance_score.toFixed(0)}%`,
        impact: 'Garantir acompanhamento de presença dos alunos',
        impact_score: Math.round((40 - t.attendance_score) * 1.2),
        recommended_deadline: getDeadline(15),
        recommended_owner: `${t.teacher_name} com supervisão do coordenador`,
      });
    });

  // Grade closure
  teachers
    .filter(t => t.grades_score < 40 && t.total_expected_grades > 0)
    .slice(0, 3)
    .forEach(t => {
      const missing = t.total_expected_grades - t.total_completed_grades;
      recs.push({
        id: `rec-${idx++}`,
        priority: t.grades_score < 20 ? 'alta' : 'media',
        category: 'Fechamento de Notas',
        target_type: 'teacher',
        target_name: t.teacher_name,
        target_id: t.teacher_id,
        action: `Fechar ${missing} configuração(ões) de nota pendente(s)`,
        reason: `Score de notas em ${t.grades_score.toFixed(0)}%`,
        impact: 'Viabilizar boletins e relatórios acadêmicos',
        impact_score: Math.round((40 - t.grades_score) * 1.5),
        recommended_deadline: getDeadline(t.grades_score < 20 ? 7 : 15),
        recommended_owner: `${t.teacher_name} (professor)`,
      });
    });

  // School-level
  schools
    .filter(s => s.compliance_avg < 65)
    .sort((a, b) => a.compliance_avg - b.compliance_avg)
    .slice(0, 3)
    .forEach(s => {
      recs.push({
        id: `rec-${idx++}`,
        priority: s.compliance_avg < 50 ? 'alta' : 'media',
        category: 'Apoio à Escola',
        target_type: 'school',
        target_name: s.school_name,
        target_id: s.school_id,
        action: `Realizar força-tarefa de regularização na escola ${s.school_name}`,
        reason: `Conformidade média em ${s.compliance_avg.toFixed(0)}% com ${s.pending_plannings} planejamentos pendentes`,
        impact: 'Elevar performance geral da unidade',
        impact_score: Math.round(100 - s.compliance_avg),
        recommended_deadline: getDeadline(s.compliance_avg < 50 ? 7 : 15),
        recommended_owner: `Coordenador da escola ${s.school_name}`,
      });
    });

  return recs.sort((a, b) => {
    const p = { alta: 0, media: 1, baixa: 2 };
    return p[a.priority] - p[b.priority] || b.impact_score - a.impact_score;
  });
}

export function useBIRecommendations(filters: BIFilters) {
  const { organizationId } = useOrganization();
  const { teachersQuery } = useBIExecutive(filters, 0, 1000);
  const { schoolsQuery } = useBISchools(filters);

  // Server-side recommendations from the new RPC
  const serverRecsQuery = useQuery({
    queryKey: ['bi-server-recommendations', organizationId, filters.schoolId, filters.bimester],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_bi_action_recommendations', {
        p_org_id: organizationId!,
        p_school_id: filters.schoolId || null,
        p_bimester_number: filters.bimester ? parseInt(filters.bimester) : null,
      });
      if (error) throw error;
      const rows = (data as unknown as DBRecommendation[]) || [];
      return rows.map((r, i): BIRecommendation => ({
        id: `srv-${i}`,
        priority: r.rec_priority as 'alta' | 'media' | 'baixa',
        category: r.rec_category,
        target_type: r.target_type as 'teacher' | 'school' | 'system',
        target_name: r.target_name,
        target_id: r.target_id,
        action: r.action_text,
        reason: r.reason_text,
        impact: r.impact_text,
        impact_score: r.impact_score,
        recommended_deadline: getDeadline(r.deadline_days),
        recommended_owner: r.target_type === 'teacher' ? 'Coordenador pedagógico' : 'Administrador',
      }));
    },
    enabled: !!organizationId,
    staleTime: 120000,
  });

  // Client-side recommendations as fallback
  const clientRecsQuery = useQuery({
    queryKey: ['bi-client-recommendations', teachersQuery.data, schoolsQuery.data],
    queryFn: () => generateClientRecommendations(teachersQuery.data || [], schoolsQuery.data || []),
    enabled: !!teachersQuery.data,
    staleTime: 60000,
  });

  // Merge: server recs take priority, add unique client recs
  const recommendationsQuery = useQuery({
    queryKey: ['bi-recommendations-merged', serverRecsQuery.data, clientRecsQuery.data],
    queryFn: () => {
      const serverRecs = serverRecsQuery.data || [];
      const clientRecs = clientRecsQuery.data || [];
      
      if (serverRecs.length > 0) {
        // Merge: server recs + client recs that don't overlap
        const serverTargets = new Set(serverRecs.map(r => `${r.target_type}-${r.target_id}-${r.category}`));
        const uniqueClient = clientRecs.filter(r => !serverTargets.has(`${r.target_type}-${r.target_id}-${r.category}`));
        return [...serverRecs, ...uniqueClient].sort((a, b) => {
          const p = { alta: 0, media: 1, baixa: 2 };
          return p[a.priority] - p[b.priority] || b.impact_score - a.impact_score;
        });
      }
      return clientRecs;
    },
    enabled: !!serverRecsQuery.data || !!clientRecsQuery.data,
    staleTime: 60000,
  });

  return { recommendationsQuery, serverRecsQuery };
}
