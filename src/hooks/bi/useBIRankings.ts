import { useQuery } from '@tanstack/react-query';
import { biApi as supabase } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { BIFilters } from '@/components/bi/GlobalFilterBar';
import { ConsistencyEntry } from '@/features/ranking/ConsistencyPodium';

export interface ProfessorRanking {
  professor_id: string;
  professor_name: string;
  school_id: string;
  school_name: string;
  city: string;
  avatar_url: string | null;
  planning_score: number;
  attendance_score: number;
  grades_score: number;
  orientations_score: number;
  regularity_score: number;
  total_score: number;
  planning_approved: number;
  planning_total: number;
  planning_signed: number;
  planning_returned: number;
  attendance_total: number;
  grades_closed: number;
  grades_total: number;
  orientations_signed: number;
  orientations_total: number;
  rank_position: number;
  medal: 'gold' | 'silver' | 'bronze' | null;
}

export interface RankingAnalysis {
  mainReason: string;
  secondaryReason: string;
  strengths: string[];
  gapToBronze: number;
  gapToSilver: number;
  gapToGold: number;
}

function getMedal(pos: number): 'gold' | 'silver' | 'bronze' | null {
  if (pos === 1) return 'gold';
  if (pos === 2) return 'silver';
  if (pos === 3) return 'bronze';
  return null;
}

export function getHighlight(r: ProfessorRanking): string {
  const scores = [
    { label: 'Planejamento', score: r.planning_score },
    { label: 'Frequência', score: r.attendance_score },
    { label: 'Notas', score: r.grades_score },
    { label: 'Orientações', score: r.orientations_score },
    { label: 'Regularidade', score: r.regularity_score },
  ];
  const best = [...scores].sort((a, b) => b.score - a.score)[0];
  if (best.score >= 90) return `Excelência em ${best.label}`;
  if (best.score >= 75) return `Destaque em ${best.label}`;
  return `Melhor desempenho em ${best.label}`;
}

function analyzeNearPodium(professor: ProfessorRanking, podium: ProfessorRanking[]): RankingAnalysis {
  const bronze = podium[2];
  const silver = podium[1];
  const gold = podium[0];

  const dimensions = [
    { label: 'conformidade de planejamento', diff: (bronze?.planning_score || 0) - professor.planning_score, weight: 0.30 },
    { label: 'aderência à frequência', diff: (bronze?.attendance_score || 0) - professor.attendance_score, weight: 0.25 },
    { label: 'regularidade de notas', diff: (bronze?.grades_score || 0) - professor.grades_score, weight: 0.20 },
    { label: 'participação em orientações', diff: (bronze?.orientations_score || 0) - professor.orientations_score, weight: 0.15 },
    { label: 'regularidade operacional', diff: (bronze?.regularity_score || 0) - professor.regularity_score, weight: 0.10 },
  ];

  const sorted = [...dimensions].sort((a, b) => (b.diff * b.weight) - (a.diff * a.weight));
  const mainGap = sorted[0];
  const secondaryGap = sorted[1];

  const strengths = dimensions.filter(d => d.diff <= 0).map(d => d.label);

  return {
    mainReason: mainGap.diff > 0 ? `Menor ${mainGap.label}` : `Desempenho similar em ${mainGap.label}`,
    secondaryReason: secondaryGap.diff > 0 ? `Gap em ${secondaryGap.label}` : `Bom desempenho em ${secondaryGap.label}`,
    strengths: strengths.length > 0 ? strengths : ['Desempenho equilibrado'],
    gapToBronze: Math.max(0, (bronze?.total_score || 0) - professor.total_score),
    gapToSilver: Math.max(0, (silver?.total_score || 0) - professor.total_score),
    gapToGold: Math.max(0, (gold?.total_score || 0) - professor.total_score),
  };
}

function computeConsistency(rankings: ProfessorRanking[]): ConsistencyEntry[] {
  // Simulate consistency based on current scores and stability indicators
  // In production, this would use bi_metric_snapshots historical data
  const entries: ConsistencyEntry[] = [];

  rankings.forEach((r) => {
    // Calculate stability from dimensional variance (lower variance = more stable)
    const scores = [r.planning_score, r.attendance_score, r.grades_score, r.orientations_score, r.regularity_score];
    const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
    const variance = scores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / scores.length;
    const stability = Math.max(0, Math.min(100, 100 - Math.sqrt(variance)));

    // Only include professors with meaningful data and good scores
    const hasEnoughData = r.planning_total >= 2 && r.attendance_total >= 3;
    if (!hasEnoughData) return;

    // Determine category based on score + stability + regularity
    const compositeScore = r.total_score * 0.6 + stability * 0.3 + r.regularity_score * 0.1;
    const trend = stability >= 80 && r.total_score >= 70 ? 'up' : stability >= 60 ? 'stable' : 'down';

    if (compositeScore >= 75 && r.rank_position <= 5) {
      entries.push({
        professor: r,
        months: compositeScore >= 85 ? 10 : compositeScore >= 80 ? 6 : 3,
        category: compositeScore >= 85 ? '10m' : compositeScore >= 80 ? '6m' : '3m',
        avgPosition: r.rank_position,
        avgScore: r.total_score,
        stability: Math.round(stability),
        trend,
        podiumCount: r.rank_position <= 3 ? Math.ceil(compositeScore / 25) : 1,
      });
    }
  });

  return entries.sort((a, b) => b.months - a.months || b.avgScore - a.avgScore);
}

export function useBIRankings(
  filters: BIFilters,
  viewMode: 'geral' | 'escola' | 'cidade' = 'geral'
) {
  const { organizationId } = useOrganization();

  const rankingsQuery = useQuery({
    queryKey: ['bi-professor-rankings', organizationId, filters, viewMode],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_professor_rankings', {
        p_org_id: organizationId!,
        p_bimester_number: filters.bimester ? parseInt(filters.bimester) : null,
        p_school_id: filters.schoolId || null,
        p_city: null,
      });
      if (error) throw error;

      const results = (data as unknown as Omit<ProfessorRanking, 'rank_position' | 'medal'>[]) || [];

      const ranked: ProfessorRanking[] = results.map((r, i) => ({
        ...r,
        rank_position: i + 1,
        medal: getMedal(i + 1),
      }));

      return ranked;
    },
    enabled: !!organizationId,
    staleTime: 60000,
  });

  const rankings = rankingsQuery.data || [];
  const podium = rankings.slice(0, 3);
  const nearPodium = rankings.slice(3, 8);
  const allRanked = rankings;

  // State podium = same as general (all professors, no school/city filter)
  const statePodium = podium;

  // Consistency
  const consistencyEntries = computeConsistency(rankings);

  // Group by school
  const bySchool = rankings.reduce((acc, r) => {
    if (!acc[r.school_id]) acc[r.school_id] = { name: r.school_name, professors: [] };
    acc[r.school_id].professors.push(r);
    return acc;
  }, {} as Record<string, { name: string; professors: ProfessorRanking[] }>);

  // Group by city
  const byCity = rankings.reduce((acc, r) => {
    const city = r.city || 'Sem cidade';
    if (!acc[city]) acc[city] = { professors: [] };
    acc[city].professors.push(r);
    return acc;
  }, {} as Record<string, { professors: ProfessorRanking[] }>);

  // Near podium analysis
  const nearPodiumAnalysis = nearPodium.map(p => ({
    professor: p,
    analysis: analyzeNearPodium(p, podium),
    highlight: getHighlight(p),
  }));

  // KPIs
  const kpis = {
    totalAvaliados: rankings.length,
    melhorScore: rankings.length > 0 ? rankings[0].total_score : 0,
    mediaGeral: rankings.length > 0 ? rankings.reduce((s, r) => s + r.total_score, 0) / rankings.length : 0,
    medalhistas: Math.min(3, rankings.length),
    proximosPodio: nearPodium.length,
    consistentes: consistencyEntries.length,
    melhorEscola: Object.entries(bySchool).sort((a, b) => {
      const avgA = a[1].professors.reduce((s, p) => s + p.total_score, 0) / a[1].professors.length;
      const avgB = b[1].professors.reduce((s, p) => s + p.total_score, 0) / b[1].professors.length;
      return avgB - avgA;
    })[0]?.[1]?.name || '-',
    melhorCidade: Object.entries(byCity).sort((a, b) => {
      const avgA = a[1].professors.reduce((s, p) => s + p.total_score, 0) / a[1].professors.length;
      const avgB = b[1].professors.reduce((s, p) => s + p.total_score, 0) / b[1].professors.length;
      return avgB - avgA;
    })[0]?.[0] || '-',
  };

  const cities = [...new Set(rankings.map(r => r.city).filter(Boolean))].sort();

  return {
    rankingsQuery,
    rankings,
    podium,
    statePodium,
    nearPodium,
    nearPodiumAnalysis,
    allRanked,
    bySchool,
    byCity,
    kpis,
    cities,
    consistencyEntries,
    getHighlight,
  };
}
