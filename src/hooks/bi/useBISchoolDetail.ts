import { useQuery } from '@tanstack/react-query';
import { biApi as supabase } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { TeacherBISummary } from './useBIExecutive';

export function useBISchoolDetail(schoolId: string | undefined) {
  const { organizationId } = useOrganization();

  const schoolQuery = useQuery({
    queryKey: ['bi-school-detail-info', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, nome, cidade, codigo, diretor, email, telefone')
        .eq('id', schoolId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
    staleTime: 60000,
  });

  const teachersQuery = useQuery({
    queryKey: ['bi-school-detail-teachers', organizationId, schoolId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_teacher_bi_summary', {
        p_org_id: organizationId!,
        p_school_id: schoolId!,
        p_limit: 200,
        p_offset: 0,
      });
      if (error) throw error;
      return (data as unknown as TeacherBISummary[]) || [];
    },
    enabled: !!organizationId && !!schoolId,
    staleTime: 60000,
  });

  return { schoolQuery, teachersQuery };
}
