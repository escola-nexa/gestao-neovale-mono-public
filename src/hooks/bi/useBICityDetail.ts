import { useQuery } from '@tanstack/react-query';
import { biApi as supabase } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { SchoolBISummary } from './useBISchools';

export function useBICityDetail(cityName: string | undefined) {
  const { organizationId } = useOrganization();

  const schoolsQuery = useQuery({
    queryKey: ['bi-city-detail-schools', organizationId, cityName],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_school_bi_summary', {
        p_org_id: organizationId!,
      });
      if (error) throw error;
      const all = (data as unknown as SchoolBISummary[]) || [];
      return all.filter(s => s.city_name === cityName);
    },
    enabled: !!organizationId && !!cityName,
    staleTime: 60000,
  });

  return { schoolsQuery };
}
