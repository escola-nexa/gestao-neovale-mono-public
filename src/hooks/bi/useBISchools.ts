import { useQuery } from '@tanstack/react-query';
import { biApi as supabase } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { BIFilters } from '@/components/bi/GlobalFilterBar';

export interface SchoolBISummary {
  school_id: string;
  school_name: string;
  city_name: string;
  total_teachers: number;
  compliance_avg: number;
  risk_avg: number;
  learning_avg: number;
  pending_plannings: number;
  pending_attendance: number;
  pending_grades: number;
  open_orientations: number;
}

export function useBISchools(filters: BIFilters) {
  const { organizationId } = useOrganization();

  const schoolsQuery = useQuery({
    queryKey: ['bi-schools', organizationId, filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_school_bi_summary', {
        p_org_id: organizationId!,
        p_bimester_number: filters.bimester ? parseInt(filters.bimester) : null,
      });
      if (error) throw error;
      return (data as unknown as SchoolBISummary[]) || [];
    },
    enabled: !!organizationId,
    staleTime: 60000,
  });

  return { schoolsQuery };
}
