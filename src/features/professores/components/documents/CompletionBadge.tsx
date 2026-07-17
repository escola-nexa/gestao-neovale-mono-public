import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

interface Props {
  filled: number;
  total: number;
}

export function CompletionBadge({ filled, total }: Props) {
  const isComplete = total > 0 && filled >= total;
  if (isComplete) {
    return (
      <Badge variant="default" className="ml-auto gap-1">
        <Check className="h-3 w-3" /> OK
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="ml-auto text-xs">
      {filled}/{total}
    </Badge>
  );
}

export function countFilled(values: Array<unknown>): number {
  return values.filter(v => v !== null && v !== undefined && v !== '' && v !== false).length;
}
