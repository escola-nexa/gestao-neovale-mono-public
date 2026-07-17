import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
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

interface AddClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  schoolName?: string;
  /** Professor selecionado no filtro da página (pré-seleção). */
  initialProfessorId: string | null;
  /** Dia da semana clicado (pré-seleção). */
  initialWeekday: Weekday;
  /** Slots de horário ativos da escola (todos os dias). */
  schoolSlots: SchoolTimeSlot[];
  onSaved: () => void;
}

interface Opt { id: string; nome: string }

export function AddClassDialog({
  open,
  onOpenChange,
  schoolId,
  schoolName,
  initialProfessorId,
  initialWeekday,
  schoolSlots,
  onSaved,
}: AddClassDialogProps) {
  const { organization } = useOrganization();

  const [courseId, setCourseId] = useState<string>('');
  const [classGroupId, setClassGroupId] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [professorId, setProfessorId] = useState<string>('');
  const [weekday, setWeekday] = useState<Weekday>(initialWeekday);
  const [slotKey, setSlotKey] = useState<string>('');
  const [classMode, setClassMode] = useState<'PRESENCIAL' | 'ANP'>('PRESENCIAL');
  const [reprocess, setReprocess] = useState(true);
  const [saving, setSaving] = useState(false);

  const [courses, setCourses] = useState<Opt[]>([]);
  const [classGroups, setClassGroups] = useState<Opt[]>([]);
  const [subjects, setSubjects] = useState<Opt[]>([]);
  const [professorsList, setProfessorsList] = useState<{ id: string; full_name: string }[]>([]);

  // Reset & load courses ao abrir
  useEffect(() => {
    if (!open || !organization?.id) return;
    setCourseId('');
    setClassGroupId('');
    setSubjectId('');
    setProfessorId('');
    setWeekday(initialWeekday);
    setSlotKey('');
    setClassMode('PRESENCIAL');
    setReprocess(true);

    (async () => {
      const { data } = await supabase
        .from('course_schools')
        .select('course_id, courses:course_id(id, nome, status)')
        .eq('school_id', schoolId);
      const list = (data || [])
        .map((r: any) => r.courses)
        .filter((c: any) => c && c.status !== 'inativo')
        .map((c: any) => ({ id: c.id, nome: c.nome }))
        .sort((a: Opt, b: Opt) => a.nome.localeCompare(b.nome));
      setCourses(list);
    })();
  }, [open, organization?.id, schoolId, initialWeekday]);

  // Carrega turmas / disciplinas / professores elegíveis ao mudar curso
  useEffect(() => {
    if (!open || !organization?.id || !courseId) {
      setClassGroups([]);
      setSubjects([]);
      setProfessorsList([]);
      return;
    }
    let cancel = false;
    (async () => {
      const [{ data: cg }, { data: sb }, { data: bindings }] = await Promise.all([
        supabase
          .from('class_groups')
          .select('id, nome')
          .eq('organization_id', organization.id)
          .eq('school_id', schoolId)
          .eq('course_id', courseId)
          .eq('status', 'ativo')
          .order('nome'),
        supabase
          .from('subjects')
          .select('id, nome')
          .eq('organization_id', organization.id)
          .eq('course_id', courseId)
          .order('nome'),
        supabase
          .from('professor_school_courses')
          .select('professor_id')
          .eq('organization_id', organization.id)
          .eq('school_id', schoolId)
          .eq('course_id', courseId)
          .eq('status', 'ACTIVE'),
      ]);
      if (cancel) return;
      setClassGroups((cg || []) as Opt[]);
      setSubjects((sb || []) as Opt[]);

      const ids = [...new Set((bindings || []).map((b: any) => b.professor_id))];
      if (!ids.length) { setProfessorsList([]); return; }
      const { data: profs } = await supabase
        .from('professors')
        .select('id, full_name')
        .in('id', ids)
        .is('deleted_at', null)
        .order('full_name');
      if (cancel) return;
      const list = profs || [];
      setProfessorsList(list);
      // Pré-seleciona professor do filtro, se elegível
      if (initialProfessorId && list.some(p => p.id === initialProfessorId)) {
        setProfessorId(initialProfessorId);
      }
    })();
    return () => { cancel = true; };
  }, [open, organization?.id, schoolId, courseId, initialProfessorId]);

  // Une horários distintos da escola (qualquer dia da semana) — preferindo
  // o slot do dia selecionado quando existir, para preservar
  // school_time_slot_id; senão, exibe o "template" de outro dia.
  const slotsForDay = useMemo(() => {
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
  }, [schoolSlots, weekday]);

  const canSave = !!(courseId && classGroupId && subjectId && professorId && slotKey);

  const handleSave = async () => {
    if (!organization?.id || !canSave) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    const [newStart, newEnd] = slotKey.split('|');
    const slot = slotsForDay.find(s => s.start_time === newStart && s.end_time === newEnd);

    setSaving(true);
    try {
      // 1) Conflito (pular se ANP). Considera compatibilidade de semestre:
      //    FIRST↔FIRST/ANNUAL, SECOND↔SECOND/ANNUAL, ANNUAL↔qualquer.
      if (classMode !== 'ANP') {
        // Carrega o semestre da disciplina selecionada
        const { data: mySubj } = await supabase
          .from('subjects')
          .select('semester')
          .eq('id', subjectId)
          .maybeSingle();
        const mySem = ((mySubj?.semester as string) || 'ANNUAL').toUpperCase();
        const { data: others } = await supabase
          .from('weekly_teaching_models')
          .select('id, weekday, start_time, end_time, class_mode, schools:school_id(nome), subjects:subject_id(nome, semester), schedule_type')
          .eq('professor_id', professorId)
          .eq('status', 'ACTIVE')
          .eq('weekday', weekday);
        const semestersOverlap = (a: string | null | undefined, b: string) => {
          const aa = (a || 'ANNUAL').toUpperCase();
          const bb = (b || 'ANNUAL').toUpperCase();
          if (aa === 'ANNUAL' || bb === 'ANNUAL') return true;
          return aa === bb;
        };
        const overlap = (others || []).find((m: any) =>
          (m.class_mode || 'PRESENCIAL') === 'PRESENCIAL'
          && m.start_time < newEnd
          && m.end_time > newStart
          && semestersOverlap(m.subjects?.semester, mySem)
        );
        if (overlap) {
          const o: any = overlap;
          toast.error(
            `Conflito: ${o.schools?.nome || 'outra escola'} ${o.start_time.slice(0, 5)}–${o.end_time.slice(0, 5)} (${o.subjects?.nome || o.schedule_type})`
          );
          setSaving(false);
          return;
        }
      }

      // 2) Insert
      const insertPayload: Record<string, any> = {
        organization_id: organization.id,
        professor_id: professorId,
        school_id: schoolId,
        course_id: courseId,
        class_group_id: classGroupId,
        subject_id: subjectId,
        weekday,
        start_time: newStart,
        end_time: newEnd,
        schedule_type: 'CLASS',
        class_mode: classMode,
        status: 'ACTIVE',
      };
      if (slot?.id) insertPayload.school_time_slot_id = slot.id;

      const { data: inserted, error: insErr } = await supabase
        .from('weekly_teaching_models')
        .insert(insertPayload as any)
        .select('id')
        .single();
      if (insErr) throw insErr;
      const newModelId = inserted?.id;

      // 3) Reprocessar somente esta aula
      let occCount = 0;
      let preplanInfo = '';
      if (reprocess && newModelId) {
        const year = new Date().getFullYear();
        const { data: rpcResult, error: rpcErr } = await gradeHorariaApi.client.rpc(
          'generate_annual_occurrences',
          { p_model_id: newModelId, p_start_date: `${year}-01-01`, p_end_date: `${year}-12-31` },
        );
        if (rpcErr) {
          console.error('generate_annual_occurrences error:', rpcErr);
          toast.warning('Aula criada, mas falhou ao gerar ocorrências');
        } else {
          occCount = (rpcResult as number) || 0;
        }

        // Pré-planejamentos (professor × disciplina × turma)
        try {
          const { data: sb } = await supabase
            .from('subjects')
            .select('semester')
            .eq('id', subjectId)
            .maybeSingle();
          const sem = (sb?.semester as string) || 'ANNUAL';
          const bimesters = sem === 'FIRST' ? [1, 2] : sem === 'SECOND' ? [3, 4] : [1, 2, 3, 4];
          const results = await Promise.allSettled(
            bimesters.map(b =>
              supabase.functions.invoke('generate-pre-plannings', {
                body: {
                  organization_id: organization.id,
                  course_id: courseId,
                  school_id: schoolId,
                  class_group_ids: [classGroupId],
                  bimester_number: b,
                  reference_year: year,
                  selected_items: [{ professor_id: professorId, subject_id: subjectId }],
                },
              }).then(r => { if (r.error) throw r.error; return r.data as any; })
            )
          );
          let created = 0, skipped = 0, fail = 0;
          results.forEach(r => {
            if (r.status === 'fulfilled') {
              created += r.value?.created ?? 0;
              skipped += r.value?.skipped ?? 0;
            } else { fail++; console.error('[pre-plan]', r.reason); }
          });
          preplanInfo = ` · ${created} pré-planejamento(s)${skipped ? ` / ${skipped} já existentes` : ''}${fail ? ` / ${fail} falha(s)` : ''}`;
        } catch (e) {
          console.error('[pre-plan] erro:', e);
        }
      }

      toast.success(`Aula criada${reprocess ? ` · ${occCount} ocorrência(s)${preplanInfo}` : ''}`);
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      console.error('Add class error:', e);
      toast.error(e?.message || 'Erro ao criar aula');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Adicionar aula
          </DialogTitle>
          <DialogDescription>
            Nova aula na grade{schoolName ? ` · ${schoolName}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Curso *</Label>
            <SearchableSelect
              value={courseId}
              onValueChange={(v) => { setCourseId(v); setClassGroupId(''); setSubjectId(''); setProfessorId(''); }}
              placeholder={courses.length ? 'Selecione o curso…' : 'Nenhum curso vinculado à escola'}
              searchPlaceholder="Buscar curso…"
              disabled={!courses.length}
              options={courses.map(c => ({ value: c.id, label: c.nome }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Turma *</Label>
              <SearchableSelect
                value={classGroupId}
                onValueChange={setClassGroupId}
                placeholder={classGroups.length ? 'Selecione…' : 'Selecione o curso'}
                disabled={!classGroups.length}
                options={classGroups.map(c => ({ value: c.id, label: c.nome }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Disciplina *</Label>
              <SearchableSelect
                value={subjectId}
                onValueChange={setSubjectId}
                placeholder={subjects.length ? 'Selecione…' : 'Selecione o curso'}
                searchPlaceholder="Buscar disciplina…"
                disabled={!subjects.length}
                options={subjects.map(s => ({ value: s.id, label: s.nome }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Professor *</Label>
            <SearchableSelect
              value={professorId}
              onValueChange={setProfessorId}
              placeholder={professorsList.length ? 'Buscar professor…' : 'Nenhum professor vinculado à escola/curso'}
              searchPlaceholder="Buscar professor…"
              disabled={!professorsList.length}
              options={professorsList.map(p => ({ value: p.id, label: p.full_name }))}
            />
            <p className="text-[11px] text-muted-foreground">
              Lista apenas professores ativos com vínculo nesta escola e curso.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Dia da semana *</Label>
              <SearchableSelect
                value={weekday}
                onValueChange={(v) => { setWeekday(v as Weekday); setSlotKey(''); }}
                options={WEEKDAYS.map(w => ({ value: w, label: WEEKDAY_LABEL[w] }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Horário *</Label>
              <SearchableSelect
                value={slotKey}
                onValueChange={setSlotKey}
                placeholder={slotsForDay.length ? 'Selecione…' : 'Nenhum horário cadastrado'}
                disabled={!slotsForDay.length}
                options={slotsForDay.map(s => ({
                  value: `${s.start_time}|${s.end_time}`,
                  label: `${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)} (${s.slot_label})${(s as any)._isTemplate ? ' · outro dia' : ''}`,
                }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Modalidade</Label>
            <SearchableSelect
              value={classMode}
              onValueChange={(v) => setClassMode(v as 'PRESENCIAL' | 'ANP')}
              options={[
                { value: 'PRESENCIAL', label: 'Presencial' },
                { value: 'ANP', label: 'ANP (atividade não presencial)' },
              ]}
            />
            {classMode === 'ANP' && (
              <p className="text-[11px] text-muted-foreground">
                Aulas ANP não geram conflito de horário (regra do sistema).
              </p>
            )}
          </div>

          <Alert>
            <RefreshCw className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="reprocess-add-class"
                  checked={reprocess}
                  onCheckedChange={(v) => setReprocess(Boolean(v))}
                />
                <label htmlFor="reprocess-add-class" className="text-sm leading-snug cursor-pointer">
                  Gerar <strong>ocorrências anuais</strong> e <strong>pré-planejamentos</strong> automaticamente para esta nova aula.
                </label>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !canSave}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar aula
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
