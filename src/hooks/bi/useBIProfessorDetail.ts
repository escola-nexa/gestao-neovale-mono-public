import { useQuery } from '@tanstack/react-query';
import { biApi as supabase } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { TeacherBISummary } from './useBIExecutive';

export function useBIProfessorDetail(professorId: string | undefined) {
  const { organizationId } = useOrganization();

  const detailQuery = useQuery({
    queryKey: ['bi-professor-detail', organizationId, professorId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_teacher_bi_summary', {
        p_org_id: organizationId!,
        p_limit: 1000,
        p_offset: 0,
      });
      if (error) throw error;
      const all = (data as unknown as TeacherBISummary[]) || [];
      return all.find(t => t.teacher_id === professorId) || null;
    },
    enabled: !!organizationId && !!professorId,
    staleTime: 60000,
  });

  // Bindings
  const bindingsQuery = useQuery({
    queryKey: ['bi-professor-bindings', organizationId, professorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professor_school_courses')
        .select('id, school_id, course_id, schools(nome), courses(nome)')
        .eq('professor_id', professorId!)
        .eq('status', 'ACTIVE');
      if (error) throw error;
      return data || [];
    },
    enabled: !!professorId,
    staleTime: 60000,
  });

  // Plannings history
  const planningsQuery = useQuery({
    queryKey: ['bi-professor-plannings', organizationId, professorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_plannings')
        .select('id, status, bimester_number, created_at, subjects(nome), schools(nome), class_groups(nome)')
        .eq('professor_id', professorId!)
        .eq('organization_id', organizationId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && !!professorId,
    staleTime: 60000,
  });

  return { detailQuery, bindingsQuery, planningsQuery };
}
