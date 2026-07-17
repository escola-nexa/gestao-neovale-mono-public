import { useState, useEffect, useCallback, useMemo } from 'react';

import { useOrganization } from './useOrganization';
import { calendarioApi } from '@/features/calendario/api';

export type SubjectSemester = 'FIRST' | 'SECOND' | 'ANNUAL';

export const SEMESTER_LABELS: Record<SubjectSemester, string> = {
  FIRST: '1º Semestre',
  SECOND: '2º Semestre',
  ANNUAL: 'Anual',
};

export const SEMESTER_OPTIONS: { value: SubjectSemester; label: string }[] = [
  { value: 'FIRST', label: '1º Semestre' },
  { value: 'SECOND', label: '2º Semestre' },
  { value: 'ANNUAL', label: 'Anual' },
];

interface SemesterDateRange {
  startDate: string;
  endDate: string;
}

export interface BimesterInfo {
  number: number;
  startDate: string;
  endDate: string;
}

interface UseSemesterReturn {
  currentSemester: SubjectSemester | null;
  semesterDateRanges: Record<SubjectSemester, SemesterDateRange | null>;
  bimesters: BimesterInfo[];
  currentBimester: number | null;
  getBimesterForDate: (date: Date) => number | null;
  isLoading: boolean;
  isDateInSemester: (date: Date, semester: SubjectSemester) => boolean;
  getSemesterLabel: (semester: SubjectSemester) => string;
  refetch: () => Promise<void>;
}

export function useSemester(): UseSemesterReturn {
  const { organization } = useOrganization();
  const [currentSemester, setCurrentSemester] = useState<SubjectSemester | null>(null);
  const [bimesters, setBimesters] = useState<BimesterInfo[]>([]);
  const [semesterDateRanges, setSemesterDateRanges] = useState<Record<SubjectSemester, SemesterDateRange | null>>({
    FIRST: null,
    SECOND: null,
    ANNUAL: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchSemesterData = useCallback(async () => {
    if (!organization?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Get active calendar
      const calendar = await calendarioApi.getActiveCalendarBasic(organization.id);

      if (!calendar) {
        setCurrentSemester('FIRST');
        setIsLoading(false);
        return;
      }

      // Get all bimesters
      const bimesters = await calendarioApi.getBimestersForCalendar(calendar.id);

      if (!bimesters || bimesters.length === 0) {
        setBimesters([]);
        setCurrentSemester('FIRST');
        setIsLoading(false);
        return;
      }

      setBimesters(
        bimesters.map((b) => ({ number: b.number, startDate: b.start_date, endDate: b.end_date })),
      );

      // Calculate semester ranges
      const firstSemesterBimesters = bimesters.filter(b => b.number === 1 || b.number === 2);
      const secondSemesterBimesters = bimesters.filter(b => b.number === 3 || b.number === 4);

      const ranges: Record<SubjectSemester, SemesterDateRange | null> = {
        FIRST: firstSemesterBimesters.length > 0
          ? {
              startDate: firstSemesterBimesters.reduce((min, b) => 
                b.start_date < min ? b.start_date : min, firstSemesterBimesters[0].start_date),
              endDate: firstSemesterBimesters.reduce((max, b) => 
                b.end_date > max ? b.end_date : max, firstSemesterBimesters[0].end_date),
            }
          : null,
        SECOND: secondSemesterBimesters.length > 0
          ? {
              startDate: secondSemesterBimesters.reduce((min, b) => 
                b.start_date < min ? b.start_date : min, secondSemesterBimesters[0].start_date),
              endDate: secondSemesterBimesters.reduce((max, b) => 
                b.end_date > max ? b.end_date : max, secondSemesterBimesters[0].end_date),
            }
          : null,
        ANNUAL: bimesters.length > 0
          ? {
              startDate: bimesters.reduce((min, b) => 
                b.start_date < min ? b.start_date : min, bimesters[0].start_date),
              endDate: bimesters.reduce((max, b) => 
                b.end_date > max ? b.end_date : max, bimesters[0].end_date),
            }
          : null,
      };

      setSemesterDateRanges(ranges);

      // Determine current semester
      const today = new Date().toISOString().split('T')[0];
      
      if (ranges.SECOND && today >= ranges.SECOND.startDate) {
        setCurrentSemester('SECOND');
      } else {
        setCurrentSemester('FIRST');
      }

    } catch (error) {
      console.error('Error fetching semester data:', error);
      setCurrentSemester('FIRST');
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchSemesterData();
  }, [fetchSemesterData]);

  const isDateInSemester = useCallback((date: Date, semester: SubjectSemester): boolean => {
    const range = semesterDateRanges[semester];
    if (!range) return false;

    const dateStr = date.toISOString().split('T')[0];
    return dateStr >= range.startDate && dateStr <= range.endDate;
  }, [semesterDateRanges]);

  const getSemesterLabel = useCallback((semester: SubjectSemester): string => {
    return SEMESTER_LABELS[semester];
  }, []);

  const getBimesterForDate = useCallback((date: Date): number | null => {
    const dateStr = date.toISOString().split('T')[0];
    const b = bimesters.find((x) => dateStr >= x.startDate && dateStr <= x.endDate);
    return b?.number ?? null;
  }, [bimesters]);

  const currentBimester = useMemo(() => getBimesterForDate(new Date()), [getBimesterForDate]);

  return {
    currentSemester,
    semesterDateRanges,
    bimesters,
    currentBimester,
    getBimesterForDate,
    isLoading,
    isDateInSemester,
    getSemesterLabel,
    refetch: fetchSemesterData,
  };
}
