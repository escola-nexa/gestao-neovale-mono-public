import { useQuery } from '@tanstack/react-query';
import { biApi as supabase } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { BIFilters } from '@/components/bi/GlobalFilterBar';

export interface TeacherBISummary {
  teacher_id: string;
  teacher_name: string;
  school_ids: string[];
  school_names: string[];
  city_names: string[];
  total_expected_plannings: number;
  total_submitted_plannings: number;
  total_approved_plannings: number;
  total_signed_plannings: number;
  total_draft_plannings: number;
  total_returned_plannings: number;
  total_expected_attendance: number;
  total_recorded_attendance: number;
  total_expected_grades: number;
  total_completed_grades: number;
  total_orientations: number;
  total_open_orientations: number;
  planning_score: number;
  attendance_score: number;
  grades_score: number;
  orientation_score: number;
  compliance_score: number;
  risk_score: number;
  total_count: number;
}

export interface BISummaryKPIs {
  total_active_teachers: number;
  teachers_full_compliance: number;
  teachers_with_planning_delay: number;
  teachers_with_attendance_pending: number;
  teachers_with_grades_pending: number;
  teachers_with_open_orientations: number;
  avg_compliance_score: number;
  avg_risk_score: number;
  teachers_attention: number;
  teachers_critical: number;
  total_pending: number;
}

export function useBIExecutive(filters: BIFilters, page = 0, pageSize = 50) {
  const { organizationId } = useOrganization();

  const kpisQuery = useQuery({
    queryKey: ['bi-kpis', organizationId, filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_bi_summary_kpis', {
        p_org_id: organizationId!,
        p_school_id: filters.schoolId || null,
        p_bimester_number: filters.bimester ? parseInt(filters.bimester) : null,
      });
      if (error) throw error;
      return (data as unknown as BISummaryKPIs[])?.[0] || null;
    },
    enabled: !!organizationId,
    staleTime: 60000,
  });

  const teachersQuery = useQuery({
    queryKey: ['bi-teachers', organizationId, filters, page, pageSize],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_teacher_bi_summary', {
        p_org_id: organizationId!,
        p_school_id: filters.schoolId || null,
        p_course_id: filters.courseId || null,
        p_bimester_number: filters.bimester ? parseInt(filters.bimester) : null,
        p_limit: pageSize,
        p_offset: page * pageSize,
      });
      if (error) throw error;
      return (data as unknown as TeacherBISummary[]) || [];
    },
    enabled: !!organizationId,
    staleTime: 60000,
  });

  return { kpisQuery, teachersQuery };
}
