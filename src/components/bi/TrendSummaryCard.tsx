import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendSummaryCardProps {
  label: string;
  current: number;
  projected: number;
  direction: 'up' | 'down' | 'stable';
  format?: 'percent' | 'number';
}

export function TrendSummaryCard({ label, current, projected, direction, format = 'percent' }: TrendSummaryCardProps) {
  const diff = projected - current;
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;
  const isPositive = (label.toLowerCase().includes('risco') || label.toLowerCase().includes('pendência')) ? direction === 'down' : direction === 'up';

  const fmt = (v: number) => format === 'percent' ? `${v.toFixed(0)}%` : v.toFixed(0);

  return (
    <Card className="min-h-[100px]">
      <CardContent className="p-4">
        <p className="text-[11px] text-muted-foreground font-medium mb-1 truncate leading-tight">{label}</p>
        <div className="flex items-end gap-2 flex-wrap">
          <span className="text-xl font-bold text-foreground leading-tight">{fmt(current)}</span>
          <div className={cn('flex items-center gap-0.5 text-xs font-semibold', isPositive ? 'text-emerald-600' : 'text-red-600')}>
            <Icon className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="whitespace-nowrap">{diff > 0 ? '+' : ''}{fmt(diff)}</span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Projeção: {fmt(projected)}</p>
      </CardContent>
    </Card>
  );
}
