import { supabase } from '@/integrations/supabase/client';

/**
 * Retorna escolas da organização que possuem ao menos 1 curso vinculado
 * (entrada em `course_schools`). Usa inner join PostgREST para filtrar.
 *
 * Use somente em filtros UI para perfis admin/coord/RH. Branches de professor
 * já listam escolas via `professor_school_courses` (que implicitamente garante
 * curso vinculado àquele professor).
 */
export async function fetchSchoolsWithCourses<T = any>(opts: {
  /** Org id (opcional — RLS já restringe à org do usuário). */
  organizationId?: string;
  /** Colunas de schools a retornar. Default: 'id, nome'. */
  select?: string;
  /** Filtrar somente status='ativo'. Default: true. */
  onlyActive?: boolean;
}): Promise<T[]> {
  const { organizationId, select = 'id, nome', onlyActive = true } = opts;
  
  if (import.meta.env.VITE_API_PROVIDER === 'nestjs') {
    const { nestApi } = await import('@/lib/api-adapter');
    const { data } = await nestApi.get('/schools');
    let filtered = data || [];
    if (onlyActive) filtered = filtered.filter((s: any) => s.status === 'ativo');
    return filtered.map((s: any) => ({ id: s.id, nome: s.nome, ...s })) as T[];
  }

  let q = supabase
    .from('schools')
    .select(`${select}`)
    .order('nome');
  if (organizationId) q = q.eq('organization_id', organizationId);
  if (onlyActive) q = q.eq('status', 'ativo');
  const { data, error } = await q;
  if (error) throw error;
  // Strip nested key para manter o shape igual ao consumido hoje.
  return ((data as any[]) || []).map(({ course_schools: _cs, ...rest }) => rest) as T[];
}
