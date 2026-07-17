import { useQuery } from '@tanstack/react-query';
import { biApi as supabase } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { fetchAllPaginated } from '@/lib/supabasePagination';
import {
  REQUIRED_DOC_DEFS,
  getRequiredDocsForGender,
} from '@/features/professores/utils/requiredDocs';

// Re-export para compatibilidade com imports existentes.
export { REQUIRED_DOC_DEFS };

export type ProfessorStatusFilter = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'all';

export interface ProfessorDocStatus {
  professor_id: string;
  full_name: string;
  registration_code: string | null;
  gender: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
  school_names: string[];
  required_total: number;
  required_uploaded: number;
  missing: { value: string; label: string }[];
  completion_pct: number;
  is_complete: boolean;
}

export function useBIProfessorDocuments(options: { statusFilter?: ProfessorStatusFilter } = {}) {
  const { organizationId } = useOrganization();
  const statusFilter = options.statusFilter ?? 'ACTIVE';

  return useQuery({
    queryKey: ['bi-professor-documents', organizationId, statusFilter],
    queryFn: async (): Promise<ProfessorDocStatus[]> => {
      if (!organizationId) return [];

      // 1) Professores da organização (paginado para suportar > 1000 registros)
      const professors = await fetchAllPaginated<{
        id: string; full_name: string; registration_code: string | null; status: string;
      }>((from, to) => {
        let q = supabase
          .from('professors')
          .select('id, full_name, registration_code, status')
          .eq('organization_id', organizationId)
          .is('deleted_at', null)
          .order('full_name', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to);
        if (statusFilter !== 'all') q = q.eq('status', statusFilter);
        return q as any;
      });
      if (professors.length === 0) return [];
      const profIdSet = new Set(professors.map(p => p.id));

      // 2) Dados pessoais (gênero) — busca por organização e pagina.
      //    PostgREST tem teto server-side de ~1000 linhas; precisamos de
      //    .range() em loop para garantir leitura completa.
      const docsData = await fetchAllPaginated<{ professor_id: string; gender: string | null }>(
        (from, to) => supabase
          .from('professor_documents' as any)
          .select('professor_id, gender')
          .eq('organization_id', organizationId)
          .order('professor_id', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to) as any,
      );
      const genderMap = new Map<string, string | null>();
      docsData.forEach(d => { if (profIdSet.has(d.professor_id)) genderMap.set(d.professor_id, d.gender || null); });

      // 3) Arquivos enviados — paginado por organização.
      const filesData = await fetchAllPaginated<{ professor_id: string; category: string }>(
        (from, to) => supabase
          .from('professor_document_files' as any)
          .select('professor_id, category')
          .eq('organization_id', organizationId)
          .order('professor_id', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to) as any,
      );
      const filesByProf = new Map<string, Set<string>>();
      filesData.forEach(f => {
        if (!profIdSet.has(f.professor_id)) return;
        if (!filesByProf.has(f.professor_id)) filesByProf.set(f.professor_id, new Set());
        filesByProf.get(f.professor_id)!.add(f.category);
      });

      // 4) Vínculos com escolas — paginado.
      const bindings = await fetchAllPaginated<{ professor_id: string; schools: { nome: string } | null }>(
        (from, to) => supabase
          .from('professor_school_courses')
          .select('professor_id, schools(nome)')
          .eq('status', 'ACTIVE')
          .order('professor_id', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to) as any,
      );
      const schoolsByProf = new Map<string, Set<string>>();
      bindings.forEach(b => {
        if (!profIdSet.has(b.professor_id)) return;
        const nome = b.schools?.nome;
        if (!nome) return;
        if (!schoolsByProf.has(b.professor_id)) schoolsByProf.set(b.professor_id, new Set());
        schoolsByProf.get(b.professor_id)!.add(nome);
      });

      // 5) Computar status documental usando regra centralizada.
      return professors.map(p => {
        const gender = genderMap.get(p.id) || null;
        const required = getRequiredDocsForGender(gender);
        const uploadedSet = filesByProf.get(p.id) || new Set();
        const missing = required.filter(d => !uploadedSet.has(d.value)).map(d => ({ value: d.value, label: d.label }));
        const requiredTotal = required.length;
        const requiredUploaded = requiredTotal - missing.length;
        const completionPct = requiredTotal > 0 ? Math.round((requiredUploaded / requiredTotal) * 100) : 0;
        return {
          professor_id: p.id,
          full_name: p.full_name,
          registration_code: p.registration_code,
          status: p.status as 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE',
          gender,
          school_names: Array.from(schoolsByProf.get(p.id) || []),
          required_total: requiredTotal,
          required_uploaded: requiredUploaded,
          missing,
          completion_pct: completionPct,
          is_complete: missing.length === 0,
        };
      });
    },
    enabled: !!organizationId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
