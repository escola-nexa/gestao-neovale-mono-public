import { Clock, TrendingUp, Shield, Sparkles, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ProfessorRanking } from '@/hooks/bi/useBIRankings';

export interface ConsistencyEntry {
  professor: ProfessorRanking;
  months: number;
  category: '3m' | '6m' | '10m';
  avgPosition: number;
  avgScore: number;
  stability: number; // 0-100
  trend: 'up' | 'stable' | 'down';
  podiumCount: number;
}

interface ConsistencyPodiumProps {
  entries: ConsistencyEntry[];
  onSelect?: (p: ProfessorRanking) => void;
}

const CATEGORY_CONFIG = {
  '3m': { label: '3 Meses', color: 'hsl(217, 91%, 60%)', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: Clock, badge: 'bg-blue-100 text-blue-700' },
  '6m': { label: '6 Meses', color: 'hsl(271, 91%, 65%)', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: Shield, badge: 'bg-purple-100 text-purple-700' },
  '10m': { label: '10 Meses', color: '#D4A017', bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', icon: Sparkles, badge: 'bg-amber-100 text-amber-700' },
};

const TREND_LABEL = { up: '↑ Crescente', stable: '→ Estável', down: '↓ Decrescente' };
const TREND_COLOR = { up: 'text-green-600', stable: 'text-blue-600', down: 'text-red-600' };

export function ConsistencyPodium({ entries, onSelect }: ConsistencyPodiumProps) {
  const grouped = {
    '10m': entries.filter(e => e.category === '10m'),
    '6m': entries.filter(e => e.category === '6m'),
    '3m': entries.filter(e => e.category === '3m'),
  };

  const hasAny = entries.length > 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-amber-50/50 to-purple-50/30">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground">Professores de Alta Consistência</CardTitle>
            <p className="text-xs text-muted-foreground">Reconhecimento por desempenho sustentado ao longo do tempo</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        {!hasAny && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Dados históricos insuficientes para calcular consistência. Os dados serão acumulados ao longo do tempo.
          </p>
        )}

        {(['10m', '6m', '3m'] as const).map(cat => {
          const config = CATEGORY_CONFIG[cat];
          const catEntries = grouped[cat];
          if (catEntries.length === 0) return null;
          const CatIcon = config.icon;

          return (
            <div key={cat} className="space-y-2">
              <div className="flex items-center gap-2">
                <CatIcon className={cn('h-4 w-4', config.text)} />
                <span className={cn('text-sm font-bold', config.text)}>Consistência {config.label}</span>
                <Badge className={cn('text-[10px]', config.badge)}>{catEntries.length} professor(es)</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {catEntries.slice(0, 6).map(entry => (
                  <Card
                    key={entry.professor.professor_id}
                    className={cn('cursor-pointer hover:shadow-md transition-all', config.border, config.bg)}
                    onClick={() => onSelect?.(entry.professor)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2.5">
                        <Avatar className="h-9 w-9 flex-shrink-0">
                          <AvatarImage src={entry.professor.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px] font-bold bg-muted">
                            {entry.professor.professor_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="font-semibold text-xs text-foreground truncate">{entry.professor.professor_name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{entry.professor.school_name} • {entry.professor.city}</p>

                          <div className="grid grid-cols-3 gap-1 mt-1.5">
                            <div className="text-center">
                              <p className="text-[9px] text-muted-foreground">Pos. Média</p>
                              <p className="text-xs font-bold text-foreground">{entry.avgPosition.toFixed(0)}º</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[9px] text-muted-foreground">Score Médio</p>
                              <p className="text-xs font-bold text-foreground">{entry.avgScore.toFixed(1)}%</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[9px] text-muted-foreground">Pódios</p>
                              <p className="text-xs font-bold text-foreground">{entry.podiumCount}x</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-muted-foreground">Estabilidade:</span>
                              <Progress value={entry.stability} className="h-1 w-12" />
                              <span className="text-[9px] font-semibold">{entry.stability}%</span>
                            </div>
                            <span className={cn('text-[9px] font-semibold', TREND_COLOR[entry.trend])}>
                              {TREND_LABEL[entry.trend]}
                            </span>
                          </div>

                          <Badge variant="outline" className={cn('text-[8px] gap-0.5 mt-0.5', config.border, config.text)}>
                            <Star className="h-2 w-2" /> Consistente {config.label}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
