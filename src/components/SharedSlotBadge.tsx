import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SharedSlotBadgeProps {
  others: string[] | undefined;
  className?: string;
}

/**
 * Mostra um chip "UC compartilhada" quando uma disciplina é lecionada
 * no mesmo horário de outras disciplinas para a mesma turma — comum
 * em Unidades Curriculares (UCP I, UCI II, etc.).
 *
 * Não funde registros: cada disciplina mantém seu planejamento, notas
 * e frequência próprios; o chip só explica visualmente por que aparecem
 * dois itens no mesmo dia/horário.
 */
export function SharedSlotBadge({ others, className }: SharedSlotBadgeProps) {
  if (!others || others.length === 0) return null;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'h-5 gap-1 border-sky-300 bg-sky-50 px-1.5 text-[10px] font-semibold text-sky-700',
              className,
            )}
          >
            <Layers className="h-3 w-3" />
            UC
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs font-semibold mb-1">Unidade Curricular compartilhada</p>
          <p className="text-[11px] text-muted-foreground mb-1">
            Compartilha o mesmo horário com:
          </p>
          <ul className="text-[11px] list-disc pl-4 space-y-0.5">
            {others.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default SharedSlotBadge;
