import { gradeHorariaApi } from '../api';

export interface BimesterInfo {
  number: 1 | 2 | 3 | 4;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
}

export type SemesterKey = 'FIRST' | 'SECOND' | 'ANNUAL';

/**
 * Loads bimesters of the active academic calendar for the organization.
 */
export async function loadBimestersForOrg(organizationId: string): Promise<BimesterInfo[]> {
  const bims = await gradeHorariaApi.getBimestersForOrg(organizationId);
  return (bims || []) as BimesterInfo[];
}

/**
 * Returns the [start, end] date strings for a semester or single bimester
 * based on the loaded bimesters. Returns null if not resolvable.
 */
export function rangeForSelection(
  bimesters: BimesterInfo[],
  semester: SemesterKey | null,
  bimester: number | null,
): { start: string; end: string } | null {
  if (!bimesters.length) return null;

  if (bimester) {
    const b = bimesters.find(x => x.number === bimester);
    if (!b) return null;
    return { start: b.start_date, end: b.end_date };
  }

  if (semester === 'FIRST') {
    const b = bimesters.filter(x => x.number === 1 || x.number === 2);
    if (!b.length) return null;
    return {
      start: b.reduce((m, x) => (x.start_date < m ? x.start_date : m), b[0].start_date),
      end:   b.reduce((m, x) => (x.end_date   > m ? x.end_date   : m), b[0].end_date),
    };
  }

  if (semester === 'SECOND') {
    const b = bimesters.filter(x => x.number === 3 || x.number === 4);
    if (!b.length) return null;
    return {
      start: b.reduce((m, x) => (x.start_date < m ? x.start_date : m), b[0].start_date),
      end:   b.reduce((m, x) => (x.end_date   > m ? x.end_date   : m), b[0].end_date),
    };
  }

  if (semester === 'ANNUAL') {
    return {
      start: bimesters.reduce((m, x) => (x.start_date < m ? x.start_date : m), bimesters[0].start_date),
      end:   bimesters.reduce((m, x) => (x.end_date   > m ? x.end_date   : m), bimesters[0].end_date),
    };
  }

  return null;
}

/** Returns the current bimester number based on today's date, or null. */
export function detectCurrentBimester(bimesters: BimesterInfo[]): number | null {
  const today = new Date().toISOString().slice(0, 10);
  const found = bimesters.find(b => today >= b.start_date && today <= b.end_date);
  return found?.number ?? null;
}
