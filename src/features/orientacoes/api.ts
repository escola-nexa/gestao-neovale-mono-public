import { supabase } from '@/integrations/supabase/client';
import { nestApi } from '@/lib/api-adapter';
const API_PROVIDER = import.meta.env.VITE_API_PROVIDER || 'supabase';

export const orientacoesApi = {
  getOrientations: async (professorId?: string) => {
    if (API_PROVIDER === 'nestjs') {
      const url = professorId ? `/orientations?professorId=${professorId}` : '/orientations';
      return (await nestApi.get(url)).data;
    }
    let query = supabase.from('orientations').select('*').is('deleted_at', null).order('created_at', { ascending: false });
    if (professorId) query = query.eq('professor_id', professorId);
    const { data } = await query;
    return data || [];
  },
  getProfessors: async () => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.get('/professors')).data;
    const { data } = await supabase.from('professors').select('id, full_name, user_id').eq('status', 'ACTIVE').is('deleted_at', null);
    return data || [];
  },
  getProfessorSchoolBindings: async (professorId: string) => {
    if (API_PROVIDER === 'nestjs') return (await nestApi.get(`/professors/${professorId}/schools`)).data;
    const { data } = await supabase.from('professor_school_courses').select('school_id, schools(id, nome)').eq('professor_id', professorId);
    return data || [];
  }
} as any;
