import { useQuery } from '@tanstack/react-query';
import { biApi as supabase } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { BIFilters } from '@/components/bi/GlobalFilterBar';

export interface CityBISummary {
  city_name: string;
  total_schools: number;
  total_teachers: number;
  compliance_avg: number;
  risk_avg: number;
  learning_avg: number;
  total_pending: number;
  critical_teachers: number;
}

export function useBICities(filters: BIFilters) {
  const { organizationId } = useOrganization();

  const citiesQuery = useQuery({
    queryKey: ['bi-cities', organizationId, filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_city_bi_summary', {
        p_org_id: organizationId!,
        p_bimester_number: filters.bimester ? parseInt(filters.bimester) : null,
      });
      if (error) throw error;
      return (data as unknown as CityBISummary[]) || [];
    },
    enabled: !!organizationId,
    staleTime: 60000,
  });

  return { citiesQuery };
}
