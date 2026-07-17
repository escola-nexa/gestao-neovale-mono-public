import { useEffect, useState } from 'react';
import { StickyNote, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { gradeHorariaApi } from '../api';
import type { WeeklyModelWithRelations } from '../hooks/useWeeklySchedule';

interface PlanningObservationButtonProps {
  model: Pick<WeeklyModelWithRelations, 'id' | 'schedule_type' | 'observation' | 'subject_name' | 'professor_name'>;
  /** Optional callback so parents can refresh local state */
  onSaved?: (observation: string | null) => void;
  variant?: 'icon' | 'menu-item';
  className?: string;
  /** When true (default), shows a small dot when observation is present */
  showIndicator?: boolean;
}

/**
 * Botão de observação para horários PLANNING.
 * Salva em `weekly_teaching_models.observation` e propaga para as ocorrências
 * já geradas (`annual_class_occurrences.observation`).
 */
export function PlanningObservationButton({
  model,
  onSaved,
  variant = 'icon',
  className,
  showIndicator = true,
}: PlanningObservationButtonProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(model.observation ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValue(model.observation ?? '');
  }, [open, model.observation]);

  if (model.schedule_type !== 'PLANNING') return null;

  const hasObs = !!(model.observation && model.observation.trim());

  const handleSave = async () => {
    setSaving(true);
    const trimmed = value.trim() ? value.trim() : null;
    try {
      await gradeHorariaApi.updateWeeklyModelObservation(model.id, trimmed);

      toast.success('Observação salva');
      onSaved?.(trimmed);
      setOpen(false);
    } catch (err: any) {
      console.error('updateObservation error', err);
      toast.error(err?.message || 'Erro ao salvar observação');
    } finally {
      setSaving(false);
    }
  };

  const trigger =
    variant === 'menu-item' ? (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground',
          className,
        )}
      >
        <StickyNote className="mr-2 h-4 w-4" />
        Observação{hasObs ? ' ✓' : ''}
      </button>
    ) : (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('h-6 w-6 relative', className)}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
            aria-label="Observação do planejamento"
          >
            <StickyNote className="h-3.5 w-3.5" />
            {showIndicator && hasObs && (
              <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {hasObs ? 'Observação cadastrada — clique para editar' : 'Adicionar observação'}
        </TooltipContent>
      </Tooltip>
    );

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={(v) => !saving && setOpen(v)}>
        <DialogContent className="max-w-lg" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Observação do Planejamento
            </DialogTitle>
            <DialogDescription>
              {model.professor_name ? `${model.professor_name} · ` : ''}
              {model.subject_name || 'Planejamento'}
              <br />
              <span className="text-xs">
                A observação acompanha todas as ocorrências geradas deste planejamento (todos os semestres).
              </span>
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ex.: reservar 1 aula por bimestre para revisão diagnóstica..."
            rows={6}
            disabled={saving}
            autoFocus
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
