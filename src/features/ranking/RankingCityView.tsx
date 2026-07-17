import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RankingPodium } from './RankingPodium';
import { RankingTable } from './RankingTable';
import { NearPodiumAnalysis } from './NearPodiumAnalysis';
import { ProfessorRanking } from '@/hooks/bi/useBIRankings';

interface RankingCityViewProps {
  byCity: Record<string, { professors: ProfessorRanking[] }>;
  cities: string[];
  loading?: boolean;
  onSelectProfessor?: (p: ProfessorRanking) => void;
  getHighlight: (r: ProfessorRanking) => string;
}

export function RankingCityView({ byCity, cities, loading, onSelectProfessor, getHighlight }: RankingCityViewProps) {
  const [selectedCity, setSelectedCity] = useState(cities[0] || '');
  const cityData = byCity[selectedCity];

  if (cities.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nenhuma cidade com dados de ranking.</p>;
  }

  const cityRankings = (cityData?.professors || []).map((p, i) => ({
    ...p,
    rank_position: i + 1,
    medal: (i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : null) as any,
  }));
  const podium = cityRankings.slice(0, 3);
  const nearPodium = cityRankings.slice(3, 8).map(p => ({
    professor: p,
    analysis: {
      mainReason: 'Score geral abaixo do pódio da cidade',
      secondaryReason: 'Ajustes pontuais necessários',
      strengths: ['Desempenho equilibrado'],
      gapToBronze: Math.max(0, (podium[2]?.total_score || 0) - p.total_score),
      gapToSilver: Math.max(0, (podium[1]?.total_score || 0) - p.total_score),
      gapToGold: Math.max(0, (podium[0]?.total_score || 0) - p.total_score),
    },
    highlight: getHighlight(p),
  }));

  // School distribution
  const schoolDistribution: Record<string, number> = {};
  cityRankings.forEach(p => {
    schoolDistribution[p.school_name] = (schoolDistribution[p.school_name] || 0) + 1;
  });

  const avgScore = cityRankings.length > 0
    ? cityRankings.reduce((s, p) => s + p.total_score, 0) / cityRankings.length
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Cidade:</span>
        </div>
        <Select value={selectedCity} onValueChange={setSelectedCity}>
          <SelectTrigger className="w-[250px] h-9 text-xs">
            <SelectValue placeholder="Selecione uma cidade" />
          </SelectTrigger>
          <SelectContent>
            {cities.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="text-xs">
          {cityRankings.length} professores • Média: {avgScore.toFixed(1)}%
        </Badge>
      </div>

      {/* School distribution */}
      {Object.keys(schoolDistribution).length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(schoolDistribution).sort((a, b) => b[1] - a[1]).map(([school, count]) => (
            <Badge key={school} variant="outline" className="text-[10px]">
              {school}: {count} prof.
            </Badge>
          ))}
        </div>
      )}

      {podium.length >= 3 && (
        <RankingPodium podium={podium} onSelect={onSelectProfessor} getHighlight={getHighlight} />
      )}

      <RankingTable data={cityRankings} loading={loading} onSelect={onSelectProfessor} />

      {nearPodium.length > 0 && (
        <NearPodiumAnalysis data={nearPodium} onSelectProfessor={onSelectProfessor} />
      )}
    </div>
  );
}
