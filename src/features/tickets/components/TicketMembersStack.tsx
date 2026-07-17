import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface StackMember {
  id: string;
  name: string;
  isPrimary?: boolean;
}

interface TicketMembersStackProps {
  members: StackMember[];
  max?: number;
  size?: 'sm' | 'md';
  className?: string;
}

const initials = (name: string) =>
  name?.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

export function TicketMembersStack({ members, max = 4, size = 'md', className }: TicketMembersStackProps) {
  const visible = members.slice(0, max);
  const overflow = members.length - visible.length;
  const sz = size === 'sm' ? 'h-6 w-6 text-[9px]' : 'h-8 w-8 text-[11px]';

  if (members.length === 0) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <div className={cn('flex items-center', className)}>
        {visible.map((m, i) => (
          <Tooltip key={m.id}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center ring-2 ring-background shrink-0',
                  sz,
                  i > 0 && '-ml-2',
                  m.isPrimary && 'ring-[hsl(48_100%_64%)] ring-2',
                )}
              >
                {initials(m.name)}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <span className="text-xs">{m.name}{m.isPrimary && ' • Principal'}</span>
            </TooltipContent>
          </Tooltip>
        ))}
        {overflow > 0 && (
          <div className={cn(
            'rounded-full bg-muted text-muted-foreground font-bold flex items-center justify-center ring-2 ring-background -ml-2 shrink-0',
            sz,
          )}>
            +{overflow}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
