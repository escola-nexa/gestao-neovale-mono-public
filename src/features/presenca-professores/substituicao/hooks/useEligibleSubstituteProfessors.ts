import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { substitutionApi } from '../api';

export interface EligibleSubProfessor {
  id: string;
  full_name: string;
  cpf: string | null;
  registration_code: string | null;
  schools: string[];
  hasConflict: boolean;
  conflictDetail: string | null;
}

export interface SelectedSlot {
  weekday: string;
  start_time: string;
  end_time: string;
}

const norm = (s: string | null | undefined) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  aStart < bEnd && bStart < aEnd;

export function useEligibleSubstituteProfessors(params: {
  organizationId: string | null | undefined;
  excludeProfessorId: string | null | undefined;
  cidades: string[];
  selectedSlots: SelectedSlot[];
  enabled?: boolean;
}) {
  const { organizationId, excludeProfessorId, cidades, selectedSlots, enabled = true } = params;
  const cidadesKey = [...cidades].map(norm).sort().join('|');
  const slotsKey = selectedSlots.map(s => `${s.weekday}@${s.start_time}-${s.end_time}`).sort().join(',');

  return useQuery({
    enabled: enabled && !!organizationId && cidades.length > 0,
    queryKey: ['eligible_sub_profs', organizationId, excludeProfessorId, cidadesKey, slotsKey],
    queryFn: async (): Promise<EligibleSubProfessor[]> => {
      // 1) Vínculos ativos com as escolas das cidades-alvo
      const profs = await substitutionApi.getEligibleSubstituteProfessors(schoolId!, courseId!);

      // 3) Grade ativa dos candidatos (para conflito)
      const profIds = (profs || []).map((p: any) => p.id);
      let conflictByProf = new Map<string, string>();
      if (profIds.length > 0 && selectedSlots.length > 0) {
        const weekdays = Array.from(new Set(selectedSlots.map(s => s.weekday)));
        const { data: grid, error: e3 } = await supabase
          .from('weekly_teaching_models')
          .select('professor_id, weekday, start_time, end_time')
          .in('professor_id', profIds)
          .in('weekday', weekdays as any)
          .eq('status', 'ACTIVE')
          .eq('schedule_type', 'CLASS');
        if (e3) throw e3;
        (grid || []).forEach((r: any) => {
          if (conflictByProf.has(r.professor_id)) return;
          const conflict = selectedSlots.find(s =>
            s.weekday === r.weekday && overlaps(s.start_time, s.end_time, r.start_time, r.end_time)
          );
          if (conflict) {
            conflictByProf.set(
              r.professor_id,
              `${conflict.weekday} ${conflict.start_time}-${conflict.end_time}`,
            );
          }
        });
      }

      return (profs || []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        cpf: p.cpf,
        registration_code: p.registration_code,
        schools: Array.from(profIdToSchools.get(p.id) || []),
        hasConflict: conflictByProf.has(p.id),
        conflictDetail: conflictByProf.get(p.id) || null,
      })).sort((a, b) => a.full_name.localeCompare(b.full_name));
    },
  });
}
