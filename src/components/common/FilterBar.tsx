import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterBarProps {
  children: ReactNode;
  onClear?: () => void;
  hasActiveFilters?: boolean;
  className?: string;
  title?: string;
}

export function FilterBar({
  children,
  onClear,
  hasActiveFilters,
  className,
  title = 'Filtros',
}: FilterBarProps) {
  return (
    <Card className={cn('p-3 sm:p-4 border-border/60', className)}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
          <Filter className="h-4 w-4 text-primary" />
          {title}
        </div>
        {onClear && hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5 mr-1" /> Limpar
          </Button>
        )}
      </div>
      <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {children}
      </div>
    </Card>
  );
}
