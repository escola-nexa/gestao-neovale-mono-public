import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { gradeHorariaApi } from '@/features/grade-horaria/api';
import { useOrganization } from '@/hooks/useOrganization';
import { type Weekday } from '@/types/academic';
import type { SchoolTimeSlot } from '../hooks/useSchoolTimeSlots';

const WEEKDAYS: Weekday[] = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'];
const WEEKDAY_LABEL: Record<Weekday, string> = {
  SEGUNDA: 'Segunda',
  TERCA: 'Terça',
  QUARTA: 'Quarta',
  QUINTA: 'Quinta',
  SEXTA: 'Sexta',
};

export interface EditClassDialogClass {
  id: string;
  school_id: string;
  course_id: string;
  class_group_id: string | null;
  subject_id: string | null;
  professor_id: string;
  weekday: Weekday;
  start_time: string;
  end_time: string;
  subject_name?: string;
  subject_semester?: string | null;
  class_group_name?: string;
  class_mode?: 'PRESENCIAL' | 'ANP' | null;
}

interface EditClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  klass: EditClassDialogClass | null;
  schoolName?: string;
  /** All time-slots of the school (todos os dias) */
  schoolSlots: SchoolTimeSlot[];
  onSaved: () => void;
}

export function EditClassDialog({
  open,
  onOpenChange,
  klass,
  schoolName,
  schoolSlots,
  onSaved,
}: EditClassDialogProps) {
  const { organization } = useOrganization();
  const [weekday, setWeekday] = useState<Weekday>('SEGUNDA');
  const [slotKey, setSlotKey] = useState<string>(''); // `${start}|${end}`
  const [professorId, setProfessorId] = useState<string>('');
  const [reprocess, setReprocess] = useState(true);
  const [searchAllBase, setSearchAllBase] = useState(false);
  const [eligibleProfs, setEligibleProfs] = useState<{ id: string; full_name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  // Reset when opening
  useEffect(() => {
    if (!open || !klass) return;
    setWeekday(klass.weekday);
    setSlotKey(`${klass.start_time}|${klass.end_time}`);
    setProfessorId(klass.professor_id);
    setReprocess(true);
    setSearchAllBase(false);
  }, [open, klass?.id]);

  // Load professors — bound to school+course OR all active in org
  useEffect(() => {
    if (!open || !klass || !organization?.id) return;
    let cancel = false;
    (async () => {
      if (searchAllBase) {
        const { data } = await supabase
          .from('professors')
          .select('id, full_name')
          .eq('organization_id', organization.id)
          .eq('status', 'ACTIVE')
          .is('deleted_at', null)
          .order('full_name');
        if (!cancel) setEligibleProfs(data || []);
        return;
      }
      const { data: bindings } = await supabase
        .from('professor_school_courses')
        .select('professor_id')
        .eq('organization_id', organization.id)
        .eq('school_id', klass.school_id)
        .eq('course_id', klass.course_id)
        .eq('status', 'ACTIVE');
      const ids = [...new Set((bindings || []).map((b) => b.professor_id))];
      if (!ids.length) {
        if (!cancel) setEligibleProfs([]);
        return;
      }
      const { data } = await supabase
        .from('professors')
        .select('id, full_name')
        .in('id', ids)
        .eq('status', 'ACTIVE')
        .is('deleted_at', null)
        .order('full_name');
      if (!cancel) setEligibleProfs(data || []);
    })();
    return () => {
      cancel = true;
    };
  }, [open, klass?.id, organization?.id, searchAllBase]);

  // Clear selection if current professor not in the active list
  useEffect(() => {
    if (!eligibleProfs.length) return;
    if (professorId && !eligibleProfs.some((p) => p.id === professorId)) {
      setProfessorId('');
    }
  }, [eligibleProfs, professorId]);

  /**
   * Une horários distintos da escola (qualquer dia da semana), evitando que
   * o diretor fique limitado pelos tempos cadastrados só naquele dia. Se
   * existir o slot exato para o dia selecionado, ele é preferido (mantém o
   * school_time_slot_id correto); caso contrário, mostra como "(template)".
   */
  const slotsForDay = useMemo(() => {
    if (!klass) return [] as (SchoolTimeSlot & { _isTemplate?: boolean })[];
    const byKey = new Map<string, SchoolTimeSlot & { _isTemplate?: boolean }>();
    for (const s of schoolSlots) {
      const key = `${s.start_time}|${s.end_time}`;
      const existing = byKey.get(key);
      if (s.weekday === weekday) {
        byKey.set(key, { ...s, _isTemplate: false });
      } else if (!existing) {
        byKey.set(key, { ...s, _isTemplate: true });
      }
    }
    return Array.from(byKey.values()).sort((a, b) =>
      a.start_time.localeCompare(b.start_time),
    );
  }, [schoolSlots, weekday, klass]);

  const hasChanges = !!(
    klass &&
    (weekday !== klass.weekday ||
      slotKey !== `${klass.start_time}|${klass.end_time}` ||
      professorId !== klass.professor_id)
  );

  const handleSave = async () => {
    if (!klass || !organization?.id) return;
    if (!slotKey) {
      toast.error('Selecione um horário válido');
      return;
    }
    if (!professorId) {
      toast.error('Selecione um professor');
      return;
    }
    if (!hasChanges) {
      onOpenChange(false);
      return;
    }

    const [newStart, newEnd] = slotKey.split('|');
    const slot = slotsForDay.find(
      (s) => s.start_time === newStart && s.end_time === newEnd,
    );

    setSaving(true);
    try {
      // 1) Conflict check (skip when ANP — regra existente). Considera a
      //    compatibilidade de semestre: FIRST↔FIRST/ANNUAL, SECOND↔SECOND/
      //    ANNUAL, ANNUAL↔qualquer. Disciplinas de semestres opostos
      //    podem ocupar o mesmo slot (não acontecem ao mesmo tempo no ano).
      const isAnp = (klass.class_mode || 'PRESENCIAL') === 'ANP';
      if (!isAnp) {
        const { data: others } = await supabase
          .from('weekly_teaching_models')
          .select('id, weekday, start_time, end_time, class_mode, schools:school_id(nome), subjects:subject_id(nome, semester), schedule_type')
          .eq('professor_id', professorId)
          .eq('status', 'ACTIVE')
          .eq('weekday', weekday)
          .neq('id', klass.id);
        const mySem = (klass.subject_semester || 'ANNUAL') as string;
        const semestersOverlap = (a: string | null | undefined, b: string) => {
          const aa = (a || 'ANNUAL').toUpperCase();
          const bb = (b || 'ANNUAL').toUpperCase();
          if (aa === 'ANNUAL' || bb === 'ANNUAL') return true;
          return aa === bb;
        };
        const overlap = (others || []).find(
          (m: any) =>
            (m.class_mode || 'PRESENCIAL') === 'PRESENCIAL' &&
            m.start_time < newEnd &&
            m.end_time > newStart &&
            semestersOverlap(m.subjects?.semester, mySem),
        );
        if (overlap) {
          const other: any = overlap;
          toast.error(
            `Conflito: ${other.schools?.nome || 'outra escola'} ${other.start_time.slice(0, 5)}–${other.end_time.slice(0, 5)} (${other.subjects?.nome || other.schedule_type})`,
          );
          setSaving(false);
          return;
        }
      }

      // 2) Update model
      const updatePayload: Record<string, any> = {
        weekday,
        start_time: newStart,
        end_time: newEnd,
        professor_id: professorId,
      };
      if (slot?.id) updatePayload.school_time_slot_id = slot.id;

      const { error: updErr } = await supabase
        .from('weekly_teaching_models')
        .update(updatePayload)
        .eq('id', klass.id);
      if (updErr) throw updErr;

      // 3) Reprocess only this model
      let occCount = 0;
      let preplanInfo = '';
      if (reprocess) {
        await supabase
          .from('annual_class_occurrences')
          .delete()
          .eq('weekly_model_id', klass.id);

        const year = new Date().getFullYear();
        const { data: rpcResult, error: rpcErr } = await gradeHorariaApi.client.rpc(
          'generate_annual_occurrences',
          {
            p_model_id: klass.id,
            p_start_date: `${year}-01-01`,
            p_end_date: `${year}-12-31`,
          },
        );
        if (rpcErr) {
          console.error('generate_annual_occurrences error:', rpcErr);
          toast.warning('Aula atualizada, mas falhou ao regerar ocorrências');
        } else {
          occCount = (rpcResult as number) || 0;
        }

        // Pre-plannings — only for the changed (professor × subject)
        if (klass.subject_id && klass.class_group_id) {
          const sem = klass.subject_semester || 'ANNUAL';
          const bimesters =
            sem === 'FIRST' ? [1, 2] : sem === 'SECOND' ? [3, 4] : [1, 2, 3, 4];
          try {
            const results = await Promise.allSettled(
              bimesters.map((b) =>
                supabase.functions
                  .invoke('generate-pre-plannings', {
                    body: {
                      organization_id: organization.id,
                      course_id: klass.course_id,
                      school_id: klass.school_id,
                      class_group_ids: [klass.class_group_id],
                      bimester_number: b,
                      reference_year: year,
                      selected_items: [
                        { professor_id: professorId, subject_id: klass.subject_id },
                      ],
                    },
                  })
                  .then((r) => {
                    if (r.error) throw r.error;
                    return r.data as any;
                  }),
              ),
            );
            let created = 0,
              skipped = 0,
              fail = 0;
            results.forEach((r) => {
              if (r.status === 'fulfilled') {
                created += r.value?.created ?? 0;
                skipped += r.value?.skipped ?? 0;
              } else {
                fail++;
                console.error('[pre-plan]', r.reason);
              }
            });
            preplanInfo = ` · ${created} pré-planejamento(s)${skipped ? ` / ${skipped} já existentes` : ''}${fail ? ` / ${fail} falha(s)` : ''}`;
          } catch (e) {
            console.error('[pre-plan] erro:', e);
          }
        }
      }

      toast.success(
        `Aula atualizada${reprocess ? ` · ${occCount} ocorrência(s) regerada(s)${preplanInfo}` : ''}`,
      );
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      console.error('Edit class error:', e);
      toast.error(e?.message || 'Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  if (!klass) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Editar aula
          </DialogTitle>
          <DialogDescription>
            {klass.subject_name || 'Aula'}
            {klass.class_group_name ? ` · ${klass.class_group_name}` : ''}
            {schoolName ? ` · ${schoolName}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Dia da semana</Label>
              <SearchableSelect
                value={weekday}
                onValueChange={(v) => {
                  setWeekday(v as Weekday);
                  setSlotKey('');
                }}
                options={WEEKDAYS.map((w) => ({ value: w, label: WEEKDAY_LABEL[w] }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Horário</Label>
              <SearchableSelect
                value={slotKey}
                onValueChange={setSlotKey}
                placeholder={
                  slotsForDay.length ? 'Selecione…' : 'Nenhum horário cadastrado'
                }
                disabled={!slotsForDay.length}
                options={slotsForDay.map((s) => ({
                  value: `${s.start_time}|${s.end_time}`,
                  label: `${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)} (${s.slot_label})${(s as any)._isTemplate ? ' · outro dia' : ''}`,
                }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Professor</Label>
            <SearchableSelect
              value={professorId}
              onValueChange={setProfessorId}
              placeholder={
                eligibleProfs.length
                  ? 'Buscar professor…'
                  : searchAllBase
                    ? 'Nenhum professor ativo encontrado'
                    : 'Nenhum professor vinculado a esta escola/curso'
              }
              searchPlaceholder="Buscar professor…"
              disabled={!eligibleProfs.length}
              options={eligibleProfs.map((p) => ({ value: p.id, label: p.full_name }))}
            />
            <div className="flex items-start gap-2 pt-1">
              <Checkbox
                id="search-all-base"
                checked={searchAllBase}
                onCheckedChange={(v) => setSearchAllBase(Boolean(v))}
              />
              <label
                htmlFor="search-all-base"
                className="text-xs leading-snug cursor-pointer"
              >
                Buscar professores da base
              </label>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {searchAllBase
                ? 'Exibindo todos os professores ativos da base. Selecione com cuidado — o professor pode não ter vínculo com esta escola/curso.'
                : 'Lista apenas professores ativos com vínculo nesta escola e curso.'}
            </p>
          </div>

          <Alert>
            <RefreshCw className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="reprocess-class"
                  checked={reprocess}
                  onCheckedChange={(v) => setReprocess(Boolean(v))}
                />
                <label
                  htmlFor="reprocess-class"
                  className="text-sm leading-snug cursor-pointer"
                >
                  Reprocessar <strong>apenas esta aula</strong> — regera ocorrências
                  anuais e os pré-planejamentos do par (professor × disciplina).
                </label>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
