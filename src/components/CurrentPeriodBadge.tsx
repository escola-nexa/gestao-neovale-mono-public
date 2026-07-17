import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSemester } from '@/hooks/useSemester';

interface CurrentPeriodBadgeProps {
  className?: string;
  /** Quando true, oculta o texto do intervalo de datas. */
  compact?: boolean;
}

function fmt(d?: string | null) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}`;
}

/**
 * Faixa "Semestre vigente · Bimestre vigente" para os hubs do professor.
 * Lê do calendário ativo via useSemester. Render é silencioso quando
 * ainda não há dados (evita flicker).
 */
export function CurrentPeriodBadge({ className, compact }: CurrentPeriodBadgeProps) {
  const { currentSemester, currentBimester, bimesters, isLoading } = useSemester();

  const semesterLabel = currentSemester === 'SECOND' ? '2º Semestre' : '1º Semestre';
  const current = useMemo(
    () => bimesters.find((b) => b.number === currentBimester) ?? null,
    [bimesters, currentBimester],
  );

  if (isLoading) return null;
  if (!currentBimester) return null;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-foreground',
        className,
      )}
      aria-label="Período letivo vigente"
    >
      <CalendarRange className="h-3.5 w-3.5 text-primary" />
      <span>{semesterLabel}</span>
      <span className="text-muted-foreground">·</span>
      <Badge variant="secondary" className="h-5 px-2 text-[11px] font-semibold">
        {currentBimester}º Bimestre
      </Badge>
      {!compact && current && (
        <span className="hidden sm:inline text-[11px] text-muted-foreground">
          {fmt(current.startDate)} – {fmt(current.endDate)}
        </span>
      )}
    </div>
  );
}

export default CurrentPeriodBadge;
