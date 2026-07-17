import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sun, Sunset, Moon, Clock, CheckCircle2, AlertTriangle, School as SchoolIcon } from 'lucide-react';
import { professoresApi } from '@/features/professores/api';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  professorId: string | null;
  professorName: string;
  schoolId: string | null;
  schoolName: string;
  onSaved?: () => void;
}

const parseHrs = (v: string): number => {
  const n = parseFloat((v || '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export function EditBindingWorkloadDialog({
  open,
  onOpenChange,
  professorId,
  professorName,
  schoolId,
  schoolName,
  onSaved,
}: Props) {
  const [morning, setMorning] = useState<string>('');
  const [afternoon, setAfternoon] = useState<string>('');
  const [night, setNight] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bindingIds, setBindingIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !professorId || !schoolId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('professor_school_courses')
        .select('id, workload_morning_hours, workload_afternoon_hours, workload_night_hours, workload_filled_at')
        .eq('professor_id', professorId)
        .eq('school_id', schoolId)
        .eq('status', 'ACTIVE');
      if (cancelled) return;
      if (error) {
        toast.error('Erro ao carregar vínculo');
        setLoading(false);
        return;
      }
      const rows = data || [];
      setBindingIds(rows.map((r) => r.id));
      // Se NENHUM vínculo teve a CH confirmada (workload_filled_at IS NULL),
      // tratamos os valores existentes como legado/dummy e iniciamos os campos vazios
      // para forçar o usuário a inserir a carga horária real.
      const anyConfirmed = rows.some((r: any) => r.workload_filled_at != null);
      if (!anyConfirmed) {
        setMorning('');
        setAfternoon('');
        setNight('');
      } else {
        // Pega o MAX existente por turno (mesmo critério do relatório)
        const m = Math.max(0, ...rows.map((r: any) => Number(r.workload_morning_hours) || 0));
        const a = Math.max(0, ...rows.map((r: any) => Number(r.workload_afternoon_hours) || 0));
        const n = Math.max(0, ...rows.map((r: any) => Number(r.workload_night_hours) || 0));
        setMorning(m > 0 ? String(m) : '');
        setAfternoon(a > 0 ? String(a) : '');
        setNight(n > 0 ? String(n) : '');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, professorId, schoolId]);

  const morningH = parseHrs(morning);
  const afternoonH = parseHrs(afternoon);
  const nightH = parseHrs(night);
  const total = morningH + afternoonH + nightH;
  const valid = total > 0;
  const filledShifts = [morningH, afternoonH, nightH].filter((h) => h > 0).length;

  const handleSave = async () => {
    if (!valid || !professorId || !schoolId || bindingIds.length === 0) {
      toast.error('Informe a carga horária em ao menos um turno');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('professor_school_courses')
        .update({
          workload_morning_hours: morningH,
          workload_afternoon_hours: afternoonH,
          workload_night_hours: nightH,
          workload_filled_at: new Date().toISOString(),
        })
        .in('id', bindingIds);
      if (error) throw error;
      toast.success('Carga horária atualizada');
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar carga horária');
    } finally {
      setSaving(false);
    }
  };

  const shiftCard = (opts: {
    id: string;
    label: string;
    icon: React.ReactNode;
    accent: string;
    value: string;
    hours: number;
    onChange: (v: string) => void;
  }) => {
    const filled = opts.hours > 0;
    return (
      <div
        className={[
          'relative rounded-lg border-2 p-3 transition-all',
          filled
            ? `${opts.accent} shadow-sm`
            : 'border-dashed border-amber-400/70 bg-amber-50/40 dark:bg-amber-950/10 hover:border-amber-500',
        ].join(' ')}
      >
        {filled && <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-emerald-600" />}
        <Label htmlFor={opts.id} className="text-xs font-semibold flex items-center gap-1.5 mb-1.5">
          {opts.icon}
          {opts.label}
        </Label>
        <div className="relative">
          <Input
            id={opts.id}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            placeholder="0"
            value={opts.value}
            onChange={(e) => opts.onChange(e.target.value)}
            className={[
              'pr-12 text-base font-semibold h-10',
              filled ? 'border-emerald-400 focus-visible:ring-emerald-400' : '',
            ].join(' ')}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            h/sem
          </span>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Inserir carga horária
          </DialogTitle>
          <DialogDescription>
            Defina a carga horária semanal por turno do professor nesta escola. Esta tela
            <strong> não permite desvincular</strong> — apenas atualizar as horas.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
          <div className="text-xs text-muted-foreground">Professor</div>
          <div className="font-semibold text-sm">{professorName}</div>
          <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <SchoolIcon className="h-3.5 w-3.5" /> Escola
          </div>
          <div className="font-semibold text-sm">{schoolName}</div>
          {bindingIds.length > 1 && (
            <p className="text-[11px] text-muted-foreground pt-1">
              Esta escola possui {bindingIds.length} vínculos (vários cursos). A carga horária será
              aplicada a todos eles.
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando...
          </div>
        ) : (
          <div
            className={[
              'space-y-3 rounded-xl border-2 p-4 transition-all',
              valid
                ? 'border-emerald-400/60 bg-emerald-50/40 dark:bg-emerald-950/10'
                : 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/20 ring-2 ring-amber-300/40',
            ].join(' ')}
          >
            <div className="flex items-start gap-3">
              <div
                className={[
                  'flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0',
                  valid ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-amber-950 animate-pulse',
                ].join(' ')}
              >
                {valid ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="text-base font-bold">Carga horária semanal por turno</Label>
                  <Badge variant="destructive" className="text-[10px] h-5">
                    OBRIGATÓRIO
                  </Badge>
                </div>
                <p
                  className={[
                    'text-xs mt-1 font-medium',
                    valid
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-amber-800 dark:text-amber-200',
                  ].join(' ')}
                >
                  {valid
                    ? `✓ ${filledShifts} turno${filledShifts > 1 ? 's' : ''} preenchido${filledShifts > 1 ? 's' : ''}.`
                    : '⚠ Preencha as horas em pelo menos UM turno para continuar.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {shiftCard({
                id: 'edit-wl-m',
                label: 'Matutino',
                icon: <Sun className="h-4 w-4 text-amber-500" />,
                accent: 'border-amber-400 bg-amber-50/80 dark:bg-amber-950/20',
                value: morning,
                hours: morningH,
                onChange: setMorning,
              })}
              {shiftCard({
                id: 'edit-wl-a',
                label: 'Vespertino',
                icon: <Sunset className="h-4 w-4 text-orange-500" />,
                accent: 'border-orange-400 bg-orange-50/80 dark:bg-orange-950/20',
                value: afternoon,
                hours: afternoonH,
                onChange: setAfternoon,
              })}
              {shiftCard({
                id: 'edit-wl-n',
                label: 'Noturno',
                icon: <Moon className="h-4 w-4 text-indigo-500" />,
                accent: 'border-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/20',
                value: night,
                hours: nightH,
                onChange: setNight,
              })}
            </div>

            <div
              className={[
                'flex items-center justify-between rounded-lg px-3 py-2.5 border',
                valid
                  ? 'bg-emerald-100/70 dark:bg-emerald-950/30 border-emerald-300'
                  : 'bg-white/60 dark:bg-background/40 border-amber-200',
              ].join(' ')}
            >
              <span className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Total semanal nesta escola
              </span>
              <span
                className={[
                  'text-lg font-bold tabular-nums',
                  valid ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground',
                ].join(' ')}
              >
                {total.toFixed(1)} <span className="text-xs font-medium">h/sem</span>
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!valid || saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar carga horária
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
