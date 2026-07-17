import { useQuery } from '@tanstack/react-query';
import { biApi as supabase } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { BIFilters } from '@/components/bi/GlobalFilterBar';

export interface GradesLearningRow {
  teacher_id: string;
  teacher_name: string;
  school_name: string;
  city_name: string;
  subject_name: string;
  class_group_name: string;
  bimester: number;
  grade_avg: number;
  students_above_avg_pct: number;
  students_at_risk_pct: number;
  missing_grades_count: number;
  total_students: number;
}

export function useBIGradesLearning(filters: BIFilters) {
  const { organizationId } = useOrganization();

  const dataQuery = useQuery({
    queryKey: ['bi-grades-learning', organizationId, filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_bi_grades_learning', {
        p_org_id: organizationId!,
        p_school_id: filters.schoolId || null,
        p_bimester_number: filters.bimester ? parseInt(filters.bimester) : null,
      });
      if (error) throw error;
      return (data as unknown as GradesLearningRow[]) || [];
    },
    enabled: !!organizationId,
    staleTime: 60000,
  });

  return { dataQuery };
}
