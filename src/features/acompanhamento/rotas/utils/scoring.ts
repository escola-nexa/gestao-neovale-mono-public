/**
 * Score de eficiência da rota.
 * Critérios: km/escola, tempo ocioso, dias utilizados, custo estimado.
 */
export interface RouteMetrics {
  totalKm: number;
  totalTravelMinutes: number;
  totalVisitMinutes: number;
  schoolCount: number;
  daysUsed: number;
  estimatedCost: number;
}

export function efficiencyScore(m: RouteMetrics): { letter: string; score: number; breakdown: Record<string, number> } {
  if (!m.schoolCount) return { letter: "D", score: 0, breakdown: {} };

  const kmPerSchool = m.totalKm / m.schoolCount;        // menor é melhor; alvo <= 25km
  const ratio = m.totalVisitMinutes / Math.max(1, m.totalVisitMinutes + m.totalTravelMinutes); // alvo >= 0.55
  const schoolsPerDay = m.schoolCount / Math.max(1, m.daysUsed); // alvo >= 4
  const costPerSchool = m.estimatedCost / m.schoolCount; // menor melhor; alvo <= 80

  const norm = (v: number, ideal: number, worst: number) =>
    Math.max(0, Math.min(1, (worst - v) / (worst - ideal)));

  const s1 = norm(kmPerSchool, 10, 60) * 30;
  const s2 = ratio * 30;
  const s3 = norm(8, schoolsPerDay, 8) * 0 + Math.min(1, schoolsPerDay / 6) * 20;
  const s4 = norm(costPerSchool, 30, 200) * 20;

  const score = Math.round(s1 + s2 + s3 + s4);
  const letter =
    score >= 90 ? "A+" :
    score >= 80 ? "A" :
    score >= 65 ? "B" :
    score >= 50 ? "C" : "D";

  return { letter, score, breakdown: { kmPerSchool: s1, visitRatio: s2, schoolsPerDay: s3, costPerSchool: s4 } };
}
