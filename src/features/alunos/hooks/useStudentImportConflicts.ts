import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { alunosApi } from '@/features/alunos/api';
import { useOrganization } from '@/hooks/useOrganization';

export interface ImportConflictRow {
  batch_id: string;
  row_number: number;
  attempted_name: string | null;
  attempted_matricula: string | null;
  error_message: string | null;
  attempted_at: string;
  existing_student_id: string | null;
  existing_name: string | null;
  existing_matricula: string | null;
  existing_cpf: string | null;
  existing_status: string | null;
  existing_schools: { id: string; nome: string }[];
}

export function useStudentImportConflicts() {
  const { organizationId } = useOrganization();
  return useQuery({
    queryKey: ['student-import-conflicts', organizationId],
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let rows: ImportConflictRow[] = [];
      if (import.meta.env.VITE_API_PROVIDER === 'nestjs') {
        const { nestApi } = await import('@/lib/api-adapter');
        const { data } = await nestApi.get('/students/import-conflicts');
        rows = (data || []) as ImportConflictRow[];
      } else {
        const { data, error } = await (supabase as any).rpc('get_student_import_conflicts', {
          p_org_id: organizationId as string,
        });
        if (error) throw error;
        rows = (data || []) as ImportConflictRow[];
      }
      return rows;
    },
  });
}
