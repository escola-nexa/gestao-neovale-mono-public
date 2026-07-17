import { Trophy, Medal, Award, ArrowRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AnalyticTable, AnalyticColumn } from '@/components/bi/AnalyticTable';
import { ScoreBadge } from '@/components/bi/ScoreBadge';
import { ProfessorRanking } from '@/hooks/bi/useBIRankings';
import { cn } from '@/lib/utils';

interface RankingTableProps {
  data: ProfessorRanking[];
  loading?: boolean;
  onSelect?: (p: ProfessorRanking) => void;
}

const MedalIcon = ({ medal }: { medal: 'gold' | 'silver' | 'bronze' | null }) => {
  if (!medal) return null;
  const config = {
    gold: { Icon: Trophy, color: '#FFD700' },
    silver: { Icon: Medal, color: '#C0C0C0' },
    bronze: { Icon: Award, color: '#CD7F32' },
  };
  const { Icon, color } = config[medal];
  return <Icon className="h-4 w-4" style={{ color }} />;
};

export function RankingTable({ data, loading, onSelect }: RankingTableProps) {
  const columns: AnalyticColumn<ProfessorRanking>[] = [
    {
      key: 'rank',
      header: '#',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <span className={cn('text-sm font-bold', r.rank_position <= 3 ? 'text-amber-600' : 'text-muted-foreground')}>
            {r.rank_position}º
          </span>
          <MedalIcon medal={r.medal} />
        </div>
      ),
      className: 'w-16',
    },
    {
      key: 'professor',
      header: 'Professor',
      render: (r) => (
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={r.avatar_url || undefined} />
            <AvatarFallback className="text-[10px] font-bold bg-muted">
              {r.professor_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{r.professor_name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{r.school_name} • {r.city}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      render: (r) => <ScoreBadge score={r.total_score} size="sm" showLabel />,
      className: 'text-center',
    },
    {
      key: 'planning',
      header: 'Planej.',
      render: (r) => (
        <div className="w-16">
          <Progress value={r.planning_score} className="h-1.5" />
          <p className="text-[10px] text-center font-medium mt-0.5">{r.planning_score.toFixed(0)}%</p>
        </div>
      ),
      className: 'text-center hidden sm:table-cell',
    },
    {
      key: 'attendance',
      header: 'Freq.',
      render: (r) => (
        <div className="w-16">
          <Progress value={r.attendance_score} className="h-1.5" />
          <p className="text-[10px] text-center font-medium mt-0.5">{r.attendance_score.toFixed(0)}%</p>
        </div>
      ),
      className: 'text-center hidden sm:table-cell',
    },
    {
      key: 'grades',
      header: 'Notas',
      render: (r) => (
        <div className="w-16">
          <Progress value={r.grades_score} className="h-1.5" />
          <p className="text-[10px] text-center font-medium mt-0.5">{r.grades_score.toFixed(0)}%</p>
        </div>
      ),
      className: 'text-center hidden md:table-cell',
    },
    {
      key: 'orientations',
      header: 'Orient.',
      render: (r) => (
        <div className="w-16">
          <Progress value={r.orientations_score} className="h-1.5" />
          <p className="text-[10px] text-center font-medium mt-0.5">{r.orientations_score.toFixed(0)}%</p>
        </div>
      ),
      className: 'text-center hidden md:table-cell',
    },
    {
      key: 'action',
      header: '',
      render: (r) => (
        <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => onSelect?.(r)}>
          Detalhar <ArrowRight className="h-3 w-3" />
        </Button>
      ),
    },
  ];

  return (
    <AnalyticTable
      columns={columns}
      data={data}
      loading={loading}
      emptyMessage="Nenhum professor encontrado para o ranking"
    />
  );
}
