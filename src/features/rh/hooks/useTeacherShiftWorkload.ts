import { useQuery } from '@tanstack/react-query';
import { hrApi } from '../api';
import { useOrganization } from '@/hooks/useOrganization';

export type Shift = 'MANHA' | 'TARDE' | 'NOITE';

export interface ShiftSchoolEntry {
  schoolName: string;
  hours: number;
  hasAnp: boolean;
}

export interface ShiftBucket {
  schools: ShiftSchoolEntry[];
  total: number;
}

export type TeacherWorkload = Record<Shift, ShiftBucket>;

const EMPTY_BUCKET: ShiftBucket = { schools: [], total: 0 };
export const EMPTY_WORKLOAD: TeacherWorkload = {
  MANHA: EMPTY_BUCKET,
  TARDE: EMPTY_BUCKET,
  NOITE: EMPTY_BUCKET,
};

/**
 * Fonte: professor_school_courses (mesma usada em /professores → diálogo "Vínculos").
 * Cada vínculo ATIVO traz workload_morning_hours / afternoon / night já preenchidos
 * pelo cadastro do professor. Somamos por (professor × escola × turno).
 */
export function useTeacherShiftWorkload(professorIds: string[]) {
  const { organizationId } = useOrganization();
  const sortedIds = [...new Set(professorIds)].sort();
  const key = sortedIds.join(',');

  return useQuery({
    queryKey: ['rh-shift-workload', organizationId, key],
    enabled: !!organizationId && sortedIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const data = await hrApi.getTeacherShiftWorkload(organizationId!, sortedIds);

      const map = new Map<string, TeacherWorkload>();
      const ensure = (pid: string): TeacherWorkload => {
        let w = map.get(pid);
        if (!w) {
          w = {
            MANHA: { schools: [], total: 0 },
            TARDE: { schools: [], total: 0 },
            NOITE: { schools: [], total: 0 },
          };
          map.set(pid, w);
        }
        return w;
      };

      const addBucket = (pid: string, shift: Shift, schoolName: string, hours: number) => {
        if (hours <= 0) return;
        const bucket = ensure(pid)[shift];
        const existing = bucket.schools.find(s => s.schoolName === schoolName);
        if (existing) existing.hours += hours;
        else bucket.schools.push({ schoolName, hours, hasAnp: false });
        bucket.total += hours;
      };

      (data || []).forEach((row: any) => {
        const pid = row.professor_id as string;
        const schoolName = row.schools?.nome ?? '—';
        addBucket(pid, 'MANHA', schoolName, Number(row.workload_morning_hours) || 0);
        addBucket(pid, 'TARDE', schoolName, Number(row.workload_afternoon_hours) || 0);
        addBucket(pid, 'NOITE', schoolName, Number(row.workload_night_hours) || 0);
      });

      // dedup escolas por turno (mesma escola pode ter vários cursos vinculados)
      // e ordena por horas desc
      map.forEach(w => {
        (['MANHA', 'TARDE', 'NOITE'] as Shift[]).forEach(s => {
          w[s].schools.sort((a, b) => b.hours - a.hours);
        });
      });

      return map;
    },
  });
}

export function formatHours(h: number): string {
  if (h <= 0) return '0h';
  // Aceita decimais (ex.: 1.5h) — formata sem zeros à direita.
  const rounded = Math.round(h * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}h` : `${rounded.toFixed(1)}h`;
}
