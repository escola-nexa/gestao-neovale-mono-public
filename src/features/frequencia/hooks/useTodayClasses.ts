import { useState, useEffect } from 'react';
import { useProfessorId } from '@/hooks/useProfessorId';
import { useOrganization } from '@/hooks/useOrganization';
import { frequenciaApi } from '../api';

export interface TodayClassSubject {
  subjectId: string;
  subjectName: string;
  attendanceDone: boolean;
  attendanceSummary?: {
    totalStudents: number;
    absences: number;
    excused: number;
  };
}

export interface TodayClassEntry {
  /** Chave do grupo (school_time_slot_id ou fallback). */
  slotKey: string;
  classGroupId: string;
  classGroupName: string;
  schoolName: string;
  courseName: string;
  startTime: string;
  endTime: string;
  /** Disciplinas que dividem o mesmo slot (UC). */
  subjects: TodayClassSubject[];
  /** Resumo do bloco. */
  doneCount: number;
  totalCount: number;
}

const WEEKDAY_MAP: Record<number, string> = {
  0: 'DOMINGO', 1: 'SEGUNDA', 2: 'TERCA', 3: 'QUARTA',
  4: 'QUINTA', 5: 'SEXTA', 6: 'SABADO',
};

export function useTodayClasses() {
  const { professorId, isProfessor } = useProfessorId();
  const { organizationId } = useOrganization();
  const [todayClasses, setTodayClasses] = useState<TodayClassEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isProfessor || !professorId || !organizationId) {
      setTodayClasses([]);
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      const today = new Date();
      const weekday = WEEKDAY_MAP[today.getDay()];
      const todayStr = today.toISOString().split('T')[0];

      const { models, records } = await frequenciaApi.getTodayClasses(professorId, weekday, todayStr);

      if (!models || models.length === 0) {
        setTodayClasses([]);
        setIsLoading(false);
        return;
      }

      const doneKeys = new Set<string>();
      const summaryMap = new Map<string, { total: number; absences: number; excused: number }>();
      records?.forEach((r: any) => {
        const k = `${r.class_group_id}-${r.subject_id}-${r.start_time}`;
        doneKeys.add(k);
        if (!summaryMap.has(k)) summaryMap.set(k, { total: 0, absences: 0, excused: 0 });
        const s = summaryMap.get(k)!;
        s.total++;
        if (r.status === 'F') s.absences++;
        if (r.status === 'A') s.excused++;
      });

      // Agrupa por slot (school_time_slot_id ou fallback) — espelha admin/coord.
      const groups = new Map<string, TodayClassEntry>();
      const subjectSeen = new Set<string>(); // dedup (slot, subject)

      (models as any[]).forEach((m) => {
        if (!m.class_groups || !m.subjects) return;
        const slotKey = m.school_time_slot_id
          ? `s:${m.school_time_slot_id}`
          : `t:${m.school_id}|${m.start_time}|${m.end_time}|${m.class_group_id}`;

        const subjKey = `${slotKey}|${m.subject_id}`;
        if (subjectSeen.has(subjKey)) return;
        subjectSeen.add(subjKey);

        const doneKey = `${m.class_group_id}-${m.subject_id}-${m.start_time}`;
        const isDone = doneKeys.has(doneKey);
        const summary = summaryMap.get(doneKey);

        const subjectEntry: TodayClassSubject = {
          subjectId: m.subjects.id,
          subjectName: m.subjects.nome,
          attendanceDone: isDone,
          attendanceSummary: isDone && summary
            ? { totalStudents: summary.total, absences: summary.absences, excused: summary.excused }
            : undefined,
        };

        const existing = groups.get(slotKey);
        if (existing) {
          existing.subjects.push(subjectEntry);
          existing.totalCount += 1;
          if (isDone) existing.doneCount += 1;
          return;
        }
        groups.set(slotKey, {
          slotKey,
          classGroupId: m.class_groups.id,
          classGroupName: m.class_groups.nome,
          schoolName: m.schools?.nome || '',
          courseName: m.courses?.nome || '',
          startTime: m.start_time,
          endTime: m.end_time,
          subjects: [subjectEntry],
          doneCount: isDone ? 1 : 0,
          totalCount: 1,
        });
      });

      const entries = Array.from(groups.values()).sort((a, b) =>
        a.startTime.localeCompare(b.startTime),
      );
      setTodayClasses(entries);
      setIsLoading(false);
    };

    load();
  }, [professorId, isProfessor, organizationId]);

  return { todayClasses, isLoading, isProfessor };
}
