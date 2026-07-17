import { useQuery } from '@tanstack/react-query';
import { biApi as supabase } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { BIFilters } from '@/components/bi/GlobalFilterBar';
import { TeacherBISummary } from './useBIExecutive';

export function useBIRisks(filters: BIFilters) {
  const { organizationId } = useOrganization();

  const risksQuery = useQuery({
    queryKey: ['bi-risks', organizationId, filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_teacher_bi_summary', {
        p_org_id: organizationId!,
        p_school_id: filters.schoolId || null,
        p_course_id: filters.courseId || null,
        p_bimester_number: filters.bimester ? parseInt(filters.bimester) : null,
        p_limit: 1000,
        p_offset: 0,
      });
      if (error) throw error;
      const all = (data as unknown as TeacherBISummary[]) || [];
      // Sort by risk (highest first)
      return all.sort((a, b) => b.risk_score - a.risk_score);
    },
    enabled: !!organizationId,
    staleTime: 60000,
  });

  return { risksQuery };
}
