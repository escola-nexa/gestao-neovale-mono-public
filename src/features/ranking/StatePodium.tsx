import { Trophy, Medal, Award, Star, Sparkles, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ProfessorRanking } from '@/hooks/bi/useBIRankings';

interface StatePodiumProps {
  podium: ProfessorRanking[];
  onSelect?: (professor: ProfessorRanking) => void;
  getHighlight: (r: ProfessorRanking) => string;
}

const MEDAL_CONFIG = {
  gold: { icon: Trophy, color: '#FFD700', label: '🥇 Ouro Estadual', gradient: 'from-amber-200 via-yellow-100 to-amber-50' },
  silver: { icon: Medal, color: '#B0B8C4', label: '🥈 Prata Estadual', gradient: 'from-slate-200 via-gray-100 to-slate-50' },
  bronze: { icon: Award, color: '#CD7F32', label: '🥉 Bronze Estadual', gradient: 'from-orange-200 via-amber-100 to-orange-50' },
};

const PODIUM_ORDER = [1, 0, 2];

export function StatePodium({ podium, onSelect, getHighlight }: StatePodiumProps) {
  if (podium.length < 3) return null;

  return (
    <div className="relative">
      {/* Premium header */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary/10 via-amber-100/50 to-primary/10 border border-primary/20">
          <Globe className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-primary uppercase tracking-widest">Pódio Estadual</span>
          <Sparkles className="h-4 w-4 text-amber-500" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-5 items-end">
        {PODIUM_ORDER.map((idx) => {
          const prof = podium[idx];
          if (!prof) return null;
          const medal = MEDAL_CONFIG[prof.medal!];
          const Icon = medal.icon;
          const isGold = idx === 0;
          const pedestalH = isGold ? 'min-h-[300px]' : idx === 1 ? 'min-h-[260px]' : 'min-h-[240px]';

          return (
            <Card
              key={prof.professor_id}
              className={cn(
                'relative overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.03]',
                `bg-gradient-to-b ${medal.gradient}`,
                isGold ? 'ring-2 ring-amber-300 shadow-2xl shadow-amber-300/40 border-amber-400' : 'shadow-lg border-border',
                pedestalH
              )}
              onClick={() => onSelect?.(prof)}
            >
              {/* Glow overlay for gold */}
              {isGold && (
                <div className="absolute inset-0 bg-gradient-to-t from-amber-300/10 via-transparent to-amber-100/20 pointer-events-none" />
              )}

              {/* Pedestal base */}
              <div className={cn(
                'absolute bottom-0 left-0 right-0 bg-gradient-to-t to-transparent',
                isGold ? 'from-amber-400/15 h-20' : 'from-black/5 h-14'
              )} />

              <CardContent className="p-3 sm:p-5 flex flex-col items-center text-center h-full justify-between relative z-10">
                {/* Medal icon with glow */}
                <div className="relative">
                  <div
                    className={cn(
                      'h-14 w-14 sm:h-16 sm:w-16 rounded-full flex items-center justify-center mb-1',
                      isGold && 'animate-pulse'
                    )}
                    style={{
                      backgroundColor: `${medal.color}25`,
                      boxShadow: isGold
                        ? `0 0 30px ${medal.color}40, 0 0 60px ${medal.color}15`
                        : `0 0 15px ${medal.color}20`,
                    }}
                  >
                    <Icon className={cn('h-7 w-7 sm:h-8 sm:w-8')} style={{ color: medal.color }} />
                  </div>
                  {isGold && <span className="absolute -top-2 -right-2 text-xl">👑</span>}
                </div>

                {/* Position & badge */}
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{prof.rank_position}º Lugar</p>
                  <Badge
                    className="text-[10px] font-bold border"
                    style={{ backgroundColor: `${medal.color}15`, color: medal.color === '#B0B8C4' ? '#555' : medal.color, borderColor: `${medal.color}50` }}
                  >
                    {medal.label}
                  </Badge>
                </div>

                {/* Avatar */}
                <Avatar className={cn(
                  'my-2 ring-2',
                  isGold ? 'h-16 w-16 ring-amber-300' : 'h-13 w-13 ring-muted'
                )}>
                  <AvatarImage src={prof.avatar_url || undefined} />
                  <AvatarFallback className={cn('font-bold bg-muted', isGold ? 'text-base' : 'text-sm')}>
                    {prof.professor_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="space-y-0.5 min-w-0 w-full">
                  <p className={cn('font-bold text-foreground leading-tight line-clamp-2', isGold ? 'text-sm' : 'text-xs')}>{prof.professor_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{prof.school_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{prof.city}</p>
                </div>

                {/* Score */}
                <div className="mt-2 space-y-1">
                  <div
                    className={cn('inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-bold', isGold ? 'text-sm' : 'text-xs')}
                    style={{
                      backgroundColor: `${medal.color}20`,
                      color: medal.color === '#B0B8C4' ? '#555' : medal.color,
                      boxShadow: isGold ? `0 2px 12px ${medal.color}30` : undefined,
                    }}
                  >
                    <Star className="h-3.5 w-3.5" />
                    {prof.total_score.toFixed(1)}%
                  </div>
                  <p className="text-[9px] text-muted-foreground italic leading-tight">{getHighlight(prof)}</p>
                </div>

                {/* Top Estadual seal */}
                <Badge variant="outline" className="text-[8px] mt-1 gap-0.5 border-primary/30 text-primary bg-primary/5">
                  <Globe className="h-2.5 w-2.5" /> Top Estadual
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
