import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { substitutionApi } from '../api';
import type { Weekday } from '@/types/academic';

export interface ProfessorWeeklyClass {
  id: string;                 // weekly_teaching_models.id
  school_id: string;
  school_name: string;
  course_id: string;
  course_name: string;
  class_group_id: string;
  class_group_name: string;
  subject_id: string;
  subject_name: string;
  subject_semester: 'FIRST' | 'SECOND' | 'ANNUAL' | null;
  subject_status: string | null;
  weekday: Weekday;
  start_time: string;          // HH:MM
  end_time: string;            // HH:MM
  school_time_slot_id: string | null;
  slot_label: string;
  slot_number: number | null;
  /** Auto-fill da escola para o salvamento. */
  city: string | null;
  director: string | null;
  adjunct: string | null;
  coordinator: string | null;
}

/**
 * Carrega TODAS as aulas CLASS ativas (weekly_teaching_models) do professor,
 * já enriquecidas com nomes/horários/escola — fonte única para o seletor visual.
 */
export function useProfessorWeeklyGrid(professorId: string | null | undefined) {
  return useQuery({
    enabled: !!professorId,
    queryKey: ['professor_weekly_grid', professorId],
    queryFn: async (): Promise<ProfessorWeeklyClass[]> => {
      const { data, error } = await supabase
        .from('weekly_teaching_models')
        .select(`
          id, weekday, start_time, end_time, school_time_slot_id,
          school_id, course_id, class_group_id, subject_id,
          schools(id, nome, cidade, diretor, diretor_adjunto, coordenador_pedagogico),
          courses(id, nome),
          class_groups(id, nome),
          subjects(id, nome, status, semester),
          school_time_slots(id, slot_label, slot_number)
        `)
        .eq('professor_id', professorId!)
        .eq('status', 'ACTIVE')
        .eq('schedule_type', 'CLASS');
      if (error) throw error;
      return ((data || []) as any[]).map((r): ProfessorWeeklyClass => ({
        id: r.id,
        school_id: r.school_id,
        school_name: r.schools?.nome || '—',
        course_id: r.course_id,
        course_name: r.courses?.nome || '—',
        class_group_id: r.class_group_id,
        class_group_name: r.class_groups?.nome || '—',
        subject_id: r.subject_id,
        subject_name: r.subjects?.nome || '—',
        subject_semester: r.subjects?.semester ?? null,
        subject_status: r.subjects?.status ?? null,
        weekday: r.weekday,
        start_time: (r.start_time || '').slice(0, 5),
        end_time: (r.end_time || '').slice(0, 5),
        school_time_slot_id: r.school_time_slot_id,
        slot_label: r.school_time_slots?.slot_label
          || (r.school_time_slots?.slot_number != null ? `Tempo ${r.school_time_slots.slot_number}` : 'Horário'),
        slot_number: r.school_time_slots?.slot_number ?? null,
        city: r.schools?.cidade ?? null,
        director: r.schools?.diretor ?? null,
        adjunct: r.schools?.diretor_adjunto ?? null,
        coordinator: r.schools?.coordenador_pedagogico ?? null,
      }));
    },
  });
}

export const WEEKDAYS_PT: { db: Weekday; short: string; long: string; jsDay: number }[] = [
  { db: 'SEGUNDA', short: 'SEG', long: 'Segunda-feira', jsDay: 1 },
  { db: 'TERCA',   short: 'TER', long: 'Terça-feira',   jsDay: 2 },
  { db: 'QUARTA',  short: 'QUA', long: 'Quarta-feira',  jsDay: 3 },
  { db: 'QUINTA',  short: 'QUI', long: 'Quinta-feira',  jsDay: 4 },
  { db: 'SEXTA',   short: 'SEX', long: 'Sexta-feira',   jsDay: 5 },
];

export function weekdayFromDateString(dateStr: string): Weekday | null {
  if (!dateStr) return null;
  const js = new Date(dateStr + 'T00:00').getDay();
  return WEEKDAYS_PT.find(w => w.jsDay === js)?.db ?? null;
}

export function longWeekdayLabel(dateStr: string): string {
  if (!dateStr) return '';
  const js = new Date(dateStr + 'T00:00').getDay();
  return WEEKDAYS_PT.find(w => w.jsDay === js)?.long ?? '';
}
