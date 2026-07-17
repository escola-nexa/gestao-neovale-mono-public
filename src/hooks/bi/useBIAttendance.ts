import { useQuery } from '@tanstack/react-query';
import { biApi as supabase } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { BIFilters } from '@/components/bi/GlobalFilterBar';

export interface AttendanceMetrics {
  total_expected_classes: number;
  total_with_attendance: number;
  total_without_attendance: number;
  attendance_rate: number;
}

export function useBIAttendance(filters: BIFilters) {
  const { organizationId } = useOrganization();

  const metricsQuery = useQuery({
    queryKey: ['bi-attendance-metrics', organizationId, filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_bi_attendance_metrics', {
        p_org_id: organizationId!,
        p_school_id: filters.schoolId || null,
      });
      if (error) throw error;
      return (data as unknown as AttendanceMetrics[])?.[0] || null;
    },
    enabled: !!organizationId,
    staleTime: 60000,
  });

  return { metricsQuery };
}
