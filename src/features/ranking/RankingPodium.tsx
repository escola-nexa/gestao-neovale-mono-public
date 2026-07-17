import { Trophy, Medal, Award, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ProfessorRanking } from '@/hooks/bi/useBIRankings';

interface RankingPodiumProps {
  podium: ProfessorRanking[];
  onSelect?: (professor: ProfessorRanking) => void;
  getHighlight: (r: ProfessorRanking) => string;
}

const MEDAL_CONFIG = {
  gold: { icon: Trophy, color: '#FFD700', bg: 'from-amber-100 to-yellow-50', border: 'border-amber-300', ring: 'ring-amber-200', label: '🥇 Ouro', glow: 'shadow-amber-200/50' },
  silver: { icon: Medal, color: '#C0C0C0', bg: 'from-gray-100 to-slate-50', border: 'border-gray-300', ring: 'ring-gray-200', label: '🥈 Prata', glow: 'shadow-gray-200/50' },
  bronze: { icon: Award, color: '#CD7F32', bg: 'from-orange-100 to-amber-50', border: 'border-orange-300', ring: 'ring-orange-200', label: '🥉 Bronze', glow: 'shadow-orange-200/50' },
};

const PODIUM_ORDER = [1, 0, 2]; // Silver, Gold, Bronze -> display Gold center

export function RankingPodium({ podium, onSelect, getHighlight }: RankingPodiumProps) {
  if (podium.length < 3) return null;

  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4 items-end">
      {PODIUM_ORDER.map((idx) => {
        const prof = podium[idx];
        if (!prof) return null;
        const medal = MEDAL_CONFIG[prof.medal!];
        const Icon = medal.icon;
        const isGold = idx === 0;
        const heightClass = isGold ? 'min-h-[260px]' : idx === 1 ? 'min-h-[230px]' : 'min-h-[210px]';

        return (
          <Card
            key={prof.professor_id}
            className={cn(
              'relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02]',
              `bg-gradient-to-b ${medal.bg} ${medal.border}`,
              isGold && `ring-2 ${medal.ring} shadow-xl ${medal.glow}`,
              !isGold && 'shadow-md',
              heightClass
            )}
            onClick={() => onSelect?.(prof)}
          >
            {/* Pedestal effect */}
            <div className={cn(
              'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/5 to-transparent',
              isGold ? 'h-16' : 'h-12'
            )} />

            <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center h-full justify-between relative z-10">
              {/* Medal icon */}
              <div className="relative">
                <div
                  className={cn('h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center mb-2', isGold && 'animate-pulse')}
                  style={{ backgroundColor: `${medal.color}20`, boxShadow: `0 0 20px ${medal.color}30` }}
                >
                  <Icon className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: medal.color }} />
                </div>
                <span className="absolute -top-1 -right-1 text-lg">{idx === 0 ? '👑' : ''}</span>
              </div>

              {/* Position */}
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{prof.rank_position}º lugar</p>
              <span className="text-[10px] font-semibold" style={{ color: medal.color }}>{medal.label}</span>

              {/* Avatar */}
              <Avatar className={cn('h-12 w-12 sm:h-14 sm:w-14 my-2 ring-2', medal.ring)}>
                <AvatarImage src={prof.avatar_url || undefined} />
                <AvatarFallback className="text-sm font-bold bg-muted">
                  {prof.professor_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Name & info */}
              <div className="space-y-0.5 min-w-0 w-full">
                <p className="font-bold text-xs sm:text-sm text-foreground leading-tight line-clamp-2">{prof.professor_name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{prof.school_name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{prof.city}</p>
              </div>

              {/* Score */}
              <div className="mt-2 space-y-1">
                <div
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold"
                  style={{ backgroundColor: `${medal.color}20`, color: medal.color === '#C0C0C0' ? '#666' : medal.color }}
                >
                  <Star className="h-3 w-3" />
                  {prof.total_score.toFixed(1)}%
                </div>
                <p className="text-[9px] text-muted-foreground italic leading-tight">{getHighlight(prof)}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
