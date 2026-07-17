import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { alunosApi } from '@/features/alunos/api';
import { useOrganization } from '@/hooks/useOrganization';

export interface StudentDuplicateRow {
  tipo: 'matricula' | 'cpf';
  valor_normalizado: string;
  group_count: number;
  student_id: string;
  nome_completo: string;
  codigo_matricula: string;
  cpf: string | null;
  status: string;
  created_at: string;
  schools: { id: string; nome: string }[];
}

export interface DuplicateGroup {
  tipo: 'matricula' | 'cpf';
  valor: string;
  alunos: StudentDuplicateRow[];
}

export function useStudentDuplicates() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['student-duplicates', organizationId],
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let rows: StudentDuplicateRow[] = [];
      if (import.meta.env.VITE_API_PROVIDER === 'nestjs') {
        const { nestApi } = await import('@/lib/api-adapter');
        const { data } = await nestApi.get('/students/duplicates');
        rows = (data || []) as StudentDuplicateRow[];
      } else {
        const { data, error } = await (supabase as any).rpc('get_student_duplicates', {
          p_org_id: organizationId as string,
        });
        if (error) throw error;
        rows = (data || []) as StudentDuplicateRow[];
      }

      const grouped = new Map<string, DuplicateGroup>();
      for (const r of rows) {
        const key = `${r.tipo}:${r.valor_normalizado}`;
        if (!grouped.has(key)) {
          grouped.set(key, { tipo: r.tipo, valor: r.valor_normalizado, alunos: [] });
        }
        grouped.get(key)!.alunos.push(r);
      }
      const groups = Array.from(grouped.values());
      return {
        rows,
        groups,
        matriculaGroups: groups.filter(g => g.tipo === 'matricula'),
        cpfGroups: groups.filter(g => g.tipo === 'cpf'),
        affectedStudents: new Set(rows.map(r => r.student_id)),
      };
    },
  });
}

/** Variante por escola: conta quantos alunos com matrícula ativa nesta escola estão em algum grupo de duplicidade. */
export function useSchoolDuplicateCount(schoolId?: string) {
  const { data } = useStudentDuplicates();
  if (!data || !schoolId) return 0;
  let count = 0;
  for (const id of data.affectedStudents) {
    const inSchool = data.rows.find(
      r => r.student_id === id && r.schools.some(s => s.id === schoolId),
    );
    if (inSchool) count++;
  }
  return count;
}
