import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function getScoreBand(score: number) {
  if (score >= 90) return { label: 'Excelente', color: 'bg-green-100 text-green-700 border-green-300', dot: 'bg-green-500' };
  if (score >= 75) return { label: 'Adequado', color: 'bg-blue-100 text-blue-700 border-blue-300', dot: 'bg-blue-500' };
  if (score >= 60) return { label: 'Atenção', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', dot: 'bg-yellow-500' };
  return { label: 'Crítico', color: 'bg-red-100 text-red-700 border-red-300', dot: 'bg-red-500' };
}

export function ScoreBadge({ score, size = 'md', showLabel = false, className }: ScoreBadgeProps) {
  const band = getScoreBand(score);
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('inline-flex items-center gap-1.5 rounded-full border font-semibold', band.color, sizeClasses[size], className)}>
          <span className={cn('h-1.5 w-1.5 rounded-full', band.dot)} />
          {score.toFixed(0)}%
          {showLabel && <span className="font-normal">({band.label})</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{band.label}: {score.toFixed(1)}%</p>
      </TooltipContent>
    </Tooltip>
  );
}
