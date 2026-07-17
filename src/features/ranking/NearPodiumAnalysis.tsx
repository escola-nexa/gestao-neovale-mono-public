import { AlertTriangle, TrendingUp, Target, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ProfessorRanking, RankingAnalysis } from '@/hooks/bi/useBIRankings';

interface NearPodiumAnalysisProps {
  data: { professor: ProfessorRanking; analysis: RankingAnalysis; highlight: string }[];
  onSelectProfessor?: (p: ProfessorRanking) => void;
}

export function NearPodiumAnalysis({ data, onSelectProfessor }: NearPodiumAnalysisProps) {
  if (data.length === 0) return null;

  return (
    <Card className="border-amber-200/50 bg-gradient-to-br from-amber-50/30 to-background">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <Target className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground">Quase no Pódio</CardTitle>
            <p className="text-xs text-muted-foreground">Professores que ficaram próximos da medalha</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map(({ professor: p, analysis, highlight }) => (
          <Card key={p.professor_id} className="bg-card/80 hover:shadow-md transition-all">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={p.avatar_url || undefined} />
                  <AvatarFallback className="text-xs font-bold bg-muted">
                    {p.professor_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-foreground truncate">{p.professor_name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.school_name} • {p.city}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="secondary" className="text-xs font-bold">{p.rank_position}º</Badge>
                      <span className="text-sm font-bold text-foreground">{p.total_score.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Gap to podium */}
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-amber-600 font-semibold flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {analysis.gapToBronze.toFixed(1)} pts para o Bronze
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{analysis.gapToSilver.toFixed(1)} pts para Prata</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{analysis.gapToGold.toFixed(1)} pts para Ouro</span>
                  </div>

                  {/* Score breakdown mini */}
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { label: 'Plan.', score: p.planning_score },
                      { label: 'Freq.', score: p.attendance_score },
                      { label: 'Notas', score: p.grades_score },
                      { label: 'Orient.', score: p.orientations_score },
                      { label: 'Regul.', score: p.regularity_score },
                    ].map(d => (
                      <div key={d.label} className="text-center">
                        <p className="text-[9px] text-muted-foreground">{d.label}</p>
                        <Progress value={d.score} className="h-1.5 mt-0.5" />
                        <p className="text-[9px] font-semibold text-foreground">{d.score.toFixed(0)}%</p>
                      </div>
                    ))}
                  </div>

                  {/* Analysis */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <Badge variant="outline" className="text-[10px] gap-1 border-red-200 text-red-600 bg-red-50">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      {analysis.mainReason}
                    </Badge>
                    {analysis.strengths.slice(0, 2).map(s => (
                      <Badge key={s} variant="outline" className="text-[10px] gap-1 border-green-200 text-green-600 bg-green-50">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Destaque: {s}
                      </Badge>
                    ))}
                  </div>

                  {/* Recommendation */}
                  <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                    <Zap className="h-3 w-3 text-amber-500" />
                    Foco em {analysis.mainReason.toLowerCase()} pode elevar a posição no ranking.
                  </p>

                  <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => onSelectProfessor?.(p)}>
                    Ver detalhes <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
