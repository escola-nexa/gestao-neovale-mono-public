import { useState } from 'react';
import { School, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RankingPodium } from './RankingPodium';
import { RankingTable } from './RankingTable';
import { NearPodiumAnalysis } from './NearPodiumAnalysis';
import { ProfessorRanking } from '@/hooks/bi/useBIRankings';

interface RankingSchoolViewProps {
  bySchool: Record<string, { name: string; professors: ProfessorRanking[] }>;
  loading?: boolean;
  onSelectProfessor?: (p: ProfessorRanking) => void;
  getHighlight: (r: ProfessorRanking) => string;
}

export function RankingSchoolView({ bySchool, loading, onSelectProfessor, getHighlight }: RankingSchoolViewProps) {
  const schoolIds = Object.keys(bySchool);
  const [selectedSchool, setSelectedSchool] = useState(schoolIds[0] || '');
  const school = bySchool[selectedSchool];

  if (schoolIds.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nenhuma escola com dados de ranking.</p>;
  }

  // Recalculate positions within school
  const schoolRankings = (school?.professors || []).map((p, i) => ({
    ...p,
    rank_position: i + 1,
    medal: (i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : null) as any,
  }));
  const podium = schoolRankings.slice(0, 3);
  const nearPodium = schoolRankings.slice(3, 8).map(p => ({
    professor: p,
    analysis: {
      mainReason: p.planning_score < (podium[2]?.planning_score || 0) ? 'Menor conformidade de planejamento' : 'Score geral abaixo',
      secondaryReason: 'Ajustes pontuais necessários',
      strengths: ['Desempenho equilibrado'],
      gapToBronze: Math.max(0, (podium[2]?.total_score || 0) - p.total_score),
      gapToSilver: Math.max(0, (podium[1]?.total_score || 0) - p.total_score),
      gapToGold: Math.max(0, (podium[0]?.total_score || 0) - p.total_score),
    },
    highlight: getHighlight(p),
  }));

  const avgScore = schoolRankings.length > 0
    ? schoolRankings.reduce((s, p) => s + p.total_score, 0) / schoolRankings.length
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <School className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Escola:</span>
        </div>
        <Select value={selectedSchool} onValueChange={setSelectedSchool}>
          <SelectTrigger className="w-[250px] h-9 text-xs">
            <SelectValue placeholder="Selecione uma escola" />
          </SelectTrigger>
          <SelectContent>
            {schoolIds.map(id => (
              <SelectItem key={id} value={id}>{bySchool[id].name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="text-xs">
          {schoolRankings.length} professores • Média: {avgScore.toFixed(1)}%
        </Badge>
      </div>

      {podium.length >= 3 && (
        <RankingPodium podium={podium} onSelect={onSelectProfessor} getHighlight={getHighlight} />
      )}

      <RankingTable data={schoolRankings} loading={loading} onSelect={onSelectProfessor} />

      {nearPodium.length > 0 && (
        <NearPodiumAnalysis data={nearPodium} onSelectProfessor={onSelectProfessor} />
      )}
    </div>
  );
}
