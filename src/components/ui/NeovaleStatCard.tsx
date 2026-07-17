import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type NeovaleTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface NeovaleStatCardProps {
  label: string;
  value: ReactNode;
  description?: string;
  icon?: LucideIcon;
  tone?: NeovaleTone;
  trend?: { value: number; label: string };
  onClick?: () => void;
  active?: boolean;
  loading?: boolean;
  compact?: boolean;
  index?: number;
  className?: string;
}

const toneIconColor: Record<NeovaleTone, { idle: string; hover: string }> = {
  neutral: { idle: 'text-primary', hover: 'group-hover:text-primary-foreground' },
  info: { idle: 'text-blue-600', hover: 'group-hover:text-primary-foreground' },
  success: { idle: 'text-emerald-600', hover: 'group-hover:text-primary-foreground' },
  warning: { idle: 'text-amber-600', hover: 'group-hover:text-primary-foreground' },
  danger: { idle: 'text-red-600', hover: 'group-hover:text-primary-foreground' },
};

export function NeovaleStatCard({
  label,
  value,
  description,
  icon: Icon,
  tone = 'neutral',
  trend,
  onClick,
  active = false,
  loading = false,
  compact = false,
  index = 0,
  className,
}: NeovaleStatCardProps) {
  if (loading) {
    return (
      <Card className={cn(compact ? 'p-3' : 'p-4', 'min-h-[88px]', className)}>
        <CardContent className="p-0 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className={cn(compact ? 'h-6' : 'h-8', 'w-16')} />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  const tones = toneIconColor[tone];
  const interactive = !!onClick;

  return (
    <div
      className={cn(
        'relative group animate-fade-in overflow-visible',
        interactive && 'cursor-pointer',
        className,
      )}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
    >
      <Card
        className={cn(
          'relative overflow-hidden border-border/60 transition-all duration-300',
          interactive && 'hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-0.5',
          active && 'ring-1 ring-primary/40 shadow-lg shadow-primary/10',
        )}
      >
        {/* Barra superior dourada editorial */}
        <div
          className={cn(
            'absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary via-[hsl(45_92%_49%)] to-primary transition-opacity duration-300',
            active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        />
        {/* Marca diagonal sutil */}
        <div
          className="absolute -top-6 -right-6 w-16 h-16 bg-primary/5 group-hover:bg-primary/10 transition-colors duration-300 pointer-events-none"
          style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }}
          aria-hidden
        />

        <CardHeader
          className={cn(
            'flex flex-row items-center justify-between pb-1 relative',
            compact ? 'p-3' : 'p-4 sm:p-5 pb-2',
          )}
        >
          <CardTitle
            className={cn(
              'font-bold uppercase tracking-[0.15em] text-muted-foreground',
              compact ? 'text-[10px]' : 'text-[10px] sm:text-[11px]',
            )}
          >
            {label}
          </CardTitle>
          {Icon && (
            <div
              className={cn(
                'rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center transition-all duration-300',
                'group-hover:from-primary group-hover:to-[hsl(45_92%_49%)] group-hover:border-primary',
                compact ? 'h-8 w-8' : 'h-9 w-9 sm:h-10 sm:w-10',
              )}
            >
              <Icon
                className={cn(
                  compact ? 'h-4 w-4' : 'h-4 w-4 sm:h-[18px] sm:w-[18px]',
                  tones.idle,
                  tones.hover,
                  'transition-colors duration-300',
                )}
              />
            </div>
          )}
        </CardHeader>

        <CardContent className={cn('pt-0 relative', compact ? 'p-3 pt-0' : 'p-4 pt-0 sm:p-5 sm:pt-0')}>
          <div
            className={cn(
              'font-bold tracking-tight text-foreground leading-tight break-words',
              compact ? 'text-xl' : 'text-2xl sm:text-3xl',
            )}
          >
            {value}
          </div>
          {description && (
            <p className={cn('text-muted-foreground mt-1 font-medium leading-tight', compact ? 'text-[10px]' : 'text-[11px]')}>
              {description}
            </p>
          )}
          {trend && (
            <p className={cn('mt-1 font-medium', compact ? 'text-[10px]' : 'text-[11px]', trend.value >= 0 ? 'text-emerald-600' : 'text-red-600')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
