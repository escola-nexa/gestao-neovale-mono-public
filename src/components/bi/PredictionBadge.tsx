import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PredictionBadgeProps {
  riskBand: 'low' | 'moderate' | 'high';
  value?: number;
  size?: 'sm' | 'md';
}

const bandConfig = {
  low: { label: 'Baixo Risco', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  moderate: { label: 'Risco Moderado', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  high: { label: 'Alto Risco', className: 'bg-red-100 text-red-700 border-red-200' },
};

export function PredictionBadge({ riskBand, value, size = 'md' }: PredictionBadgeProps) {
  const config = bandConfig[riskBand];
  return (
    <Badge variant="outline" className={cn('font-semibold', config.className, size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs')}>
      {config.label}{value !== undefined ? ` (${value.toFixed(0)}%)` : ''}
    </Badge>
  );
}
