import { useCallback, useEffect, useState } from 'react';
import { gradeHorariaApi } from '../api';
import type { SubjectSemester } from '@/hooks/useSemester';

export interface ModalityRow {
  subject_id: string;
  subject_nome: string;
  subject_codigo: string;
  subject_semester: SubjectSemester;
  carga_horaria_semanal: number;
  modality_id: string | null;
  semester: SubjectSemester;
  ch_presencial: number;
  ch_anp: number;
}

export function useClassModalityConfig(classGroupId: string | null) {
  const [rows, setRows] = useState<ModalityRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!classGroupId) {
      setRows([]);
      return;
    }
    setIsLoading(true);
    try {
      const data = await gradeHorariaApi.getClassModalityConfig(classGroupId);
      setRows(data as ModalityRow[]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [classGroupId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  /**
   * Returns the configured ch_presencial / ch_anp for a subject in a specific semester.
   * If no config exists, defaults to all hours presential.
   */
  const getConfig = useCallback(
    (subjectId: string, semester: SubjectSemester) => {
      const row = rows.find(
        (r) =>
          r.subject_id === subjectId &&
          (r.subject_semester === 'ANNUAL'
            ? r.semester === 'ANNUAL'
            : r.semester === semester),
      );
      if (!row) return null;
      return {
        ch_total: row.carga_horaria_semanal,
        ch_presencial: row.ch_presencial,
        ch_anp: row.ch_anp,
      };
    },
    [rows],
  );

  return { rows, isLoading, refetch: fetch, getConfig };
}
