import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Clock, Trash2, User, AlertCircle, CheckCircle2, Loader2, BookOpen, ClipboardList, Building2, Plus, CalendarClock, Move, X, Pencil } from 'lucide-react';
import { EditClassDialog, type EditClassDialogClass } from './components/EditClassDialog';
import { AddClassDialog } from './components/AddClassDialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { WEEKDAY_OPTIONS } from '@/types/academic';
import { PageHeader } from '@/components/PageHeader';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import { gradeHorariaApi } from '@/features/grade-horaria/api';
import { fetchSchoolsWithCourses } from '@/lib/schoolsWithCourses';
import { useOrganization } from '@/hooks/useOrganization';
import { type Weekday } from '@/types/academic';
import { useSchoolTimeSlots } from './hooks/useSchoolTimeSlots';
import { computeRequiredPlanning, PLANNING_RATIO_LABEL } from './utils/planningRule';
import { ScheduleConflictModal } from '@/features/rh/components/conflicts/ScheduleConflictModal';
import type { ConflictItem, ConflictSuggestion, WeekdayCode, TurnoCode } from '@/features/rh/lib/conflictTypes';
import { SubjectNameWithAnp } from '@/components/SubjectNameWithAnp';
import { loadPersistedFilters, persistFilters } from './utils/persistFilters';
import { useAnpSubjectMap } from '@/hooks/useAnpSubjectMap';
import { useConfirm as useConfirmHook } from '@/hooks/useConfirm';

const WEEKDAY_PT_TO_CODE: Record<string, WeekdayCode> = {
  SEGUNDA: 'MON', TERCA: 'TUE', QUARTA: 'WED', QUINTA: 'THU', SEXTA: 'FRI', SABADO: 'SAT',
};

const inferTurno = (hhmm: string): TurnoCode => {
  const h = parseInt((hhmm || '00:00').slice(0, 2), 10);
  if (h < 12) return 'manha';
  if (h < 18) return 'tarde';
  return 'noite';
};
const overlapRange = (aStart: string, aEnd: string, bStart: string, bEnd: string) => ({
  start: (aStart > bStart ? aStart : bStart).slice(0, 5),
  end: (aEnd < bEnd ? aEnd : bEnd).slice(0, 5),
});
const describeModel = (m: { schedule_type: string; subject_name?: string; class_group_name?: string }) => {
  if (m.schedule_type === 'PLANNING') return 'Horário de Planejamento';
  const subj = m.subject_name?.trim();
  const turma = m.class_group_name?.trim();
  if (subj && turma) return `Aula de ${subj} — ${turma}`;
  if (subj) return `Aula de ${subj}`;
  return 'Aula';
};

interface FilterOption { id: string; nome?: string; }
interface ProfessorOption { id: string; full_name: string; }
interface ScheduleModel {
  id: string;
  professor_id: string;
  school_id: string;
  course_id: string;
  class_group_id: string | null;
  subject_id: string | null;
  weekday: Weekday;
  start_time: string;
  end_time: string;
  schedule_type: string;
  school_name?: string;
  subject_name?: string;
  subject_semester?: string | null;
  class_group_name?: string;
  course_name?: string;
  class_mode?: 'PRESENCIAL' | 'ANP' | null;
}

const WEEKDAYS: Weekday[] = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'];
const WEEKDAY_SHORT: Record<Weekday, string> = {
  SEGUNDA: 'Seg', TERCA: 'Ter', QUARTA: 'Qua', QUINTA: 'Qui', SEXTA: 'Sex',
};
const WEEKDAY_LABEL: Record<Weekday, string> = {
  SEGUNDA: 'Segunda-feira', TERCA: 'Terça-feira', QUARTA: 'Quarta-feira', QUINTA: 'Quinta-feira', SEXTA: 'Sexta-feira',
};

export default function ProfessorPlanningSchedulePage({ embedded = false }: { embedded?: boolean }) {
  const confirmDialog = useConfirmHook();
  const navigate = useNavigate();
  const { organization } = useOrganization();

  type PlanejPersist = {
    selectedSchoolId: string | null;
    selectedProfessorId: string | null;
    filterSemester: string;
    filterCourseId: string;
    filterClassGroupId: string;
  };
  const PLANEJ_KEY = 'grade-horaria:planejamento';
  const persisted = loadPersistedFilters<PlanejPersist>(PLANEJ_KEY, {
    selectedSchoolId: null,
    selectedProfessorId: null,
    filterSemester: '__all__',
    filterCourseId: '__all__',
    filterClassGroupId: '__all__',
  });

  const [schools, setSchools] = useState<FilterOption[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(persisted.selectedSchoolId);
  const [professors, setProfessors] = useState<ProfessorOption[]>([]);
  const [selectedProfessorId, setSelectedProfessorId] = useState<string | null>(persisted.selectedProfessorId);

  // Filtros adicionais (afetam apenas a visualização das aulas)
  const [filterSemester, setFilterSemester] = useState<string>(persisted.filterSemester);
  const [filterCourseId, setFilterCourseId] = useState<string>(persisted.filterCourseId);
  const [filterClassGroupId, setFilterClassGroupId] = useState<string>(persisted.filterClassGroupId);

  // Persiste filtros sempre que mudarem
  useEffect(() => {
    persistFilters<PlanejPersist>(PLANEJ_KEY, {
      selectedSchoolId,
      selectedProfessorId,
      filterSemester,
      filterCourseId,
      filterClassGroupId,
    });
  }, [selectedSchoolId, selectedProfessorId, filterSemester, filterCourseId, filterClassGroupId]);

  const [allProfessorModels, setAllProfessorModels] = useState<ScheduleModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [conflictModal, setConflictModal] = useState<{ open: boolean; items: ConflictItem[]; hint?: string }>({ open: false, items: [] });

  const { slots: schoolTimeSlots, getSlotsByWeekday, createSlot, getNextSlotNumber, refetch: refetchSlots } = useSchoolTimeSlots(selectedSchoolId);
  const { data: anpMap } = useAnpSubjectMap();
  const [movingPlanningId, setMovingPlanningId] = useState<string | null>(null);
  const [draggingClassId, setDraggingClassId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<Weekday | null>(null);

  // Move uma aula (CLASS) ou planejamento (PLANNING) para outro dia da semana via drag-and-drop,
  // mantendo o mesmo horário (start_time/end_time). Origem fica livre.
  const handleDropClassOnDay = useCallback(async (modelId: string, targetDay: Weekday) => {
    setDraggingClassId(null);
    setDragOverDay(null);
    if (!organization?.id || !selectedProfessorId) return;
    const source = allProfessorModels.find(m => m.id === modelId);
    if (!source) return;
    if (source.weekday === targetDay) return;

    const isAnp = (source.class_mode || 'PRESENCIAL') === 'ANP';
    const isPlanning = source.schedule_type === 'PLANNING';
    // Conflito no destino — ignora a própria entrada (será atualizada). ANP nunca conflita.
    if (!isAnp) {
      const conflict = allProfessorModels.find(m =>
        m.id !== modelId &&
        m.weekday === targetDay &&
        (m.class_mode || 'PRESENCIAL') === 'PRESENCIAL' &&
        m.start_time < source.end_time && m.end_time > source.start_time,
      );
      if (conflict) {
        const profName = professors.find(p => p.id === selectedProfessorId)?.full_name ?? '—';
        const ov = overlapRange(source.start_time, source.end_time, conflict.start_time, conflict.end_time);
        // Sugere dias livres no mesmo horário do source
        const freeDays: Weekday[] = WEEKDAYS.filter((d) => {
          if (d === source.weekday || d === targetDay) return false;
          return !allProfessorModels.some(m =>
            m.id !== modelId && m.weekday === d &&
            (m.class_mode || 'PRESENCIAL') === 'PRESENCIAL' &&
            m.start_time < source.end_time && m.end_time > source.start_time,
          );
        });
        const suggestions: ConflictSuggestion[] = [];
        if (freeDays.length > 0) {
          suggestions.push({
            label: 'Ver dias livres no mesmo horário',
            description: `Dias sem conflito: ${freeDays.map(d => WEEKDAY_LABEL[d]).join(', ')}.`,
            variant: 'primary',
            action: { type: 'move-slot', slotId: modelId },
          });
        }
        if (conflict.schedule_type === 'PLANNING' && conflict.school_id === source.school_id) {
          suggestions.push({
            label: 'Excluir o planejamento conflitante',
            description: `Remove o Planejamento ${conflict.start_time.slice(0,5)}–${conflict.end_time.slice(0,5)} e libera o horário.`,
            variant: 'danger',
            action: { type: 'set-no-indication', slotId: conflict.id, classId: conflict.id },
          });
        }
        if (conflict.school_id !== source.school_id) {
          suggestions.push({
            label: 'Abrir grade da outra escola',
            description: `Conflito está em ${conflict.school_name}.`,
            variant: 'secondary',
            action: { type: 'open-grade', schoolId: conflict.school_id },
          });
        }
        setConflictModal({
          open: true,
          hint: 'Escolha outro dia ou cancele a movimentação.',
          items: [{
            key: `dnd-${modelId}-${targetDay}`,
            kind: 'admin-grid',
            teacherName: profName,
            weekday: WEEKDAY_PT_TO_CODE[String(targetDay)] ?? 'MON',
            overlapStart: ov.start,
            overlapEnd: ov.end,
            sameTurno: inferTurno(source.start_time) === inferTurno(conflict.start_time),
            sides: [
              {
                className: describeModel(source),
                schoolName: source.school_name,
                subjectName: source.subject_name,
                turno: inferTurno(source.start_time),
              },
              {
                className: describeModel(conflict),
                schoolName: conflict.school_name,
                subjectName: conflict.subject_name,
                turno: inferTurno(conflict.start_time),
                isExternalSchool: conflict.school_id !== source.school_id,
              },
            ],
            suggestions,
          }],
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      const targetSlot = getSlotsByWeekday(targetDay).find(
        s => s.start_time === source.start_time && s.end_time === source.end_time,
      );
      const updatePayload: Record<string, any> = { weekday: targetDay };
      if (targetSlot?.id) updatePayload.school_time_slot_id = targetSlot.id;

      const { error: updErr } = await supabase
        .from('weekly_teaching_models')
        .update(updatePayload)
        .eq('id', modelId);
      if (updErr) throw updErr;

      await gradeHorariaApi.client.from('annual_class_occurrences').delete().eq('weekly_model_id', modelId);
      const year = new Date().getFullYear();
      await gradeHorariaApi.client.rpc('generate_annual_occurrences', {
        p_model_id: modelId,
        p_start_date: `${year}-01-01`,
        p_end_date: `${year}-12-31`,
      });

      toast.success(`${isPlanning ? 'Planejamento movido' : 'Aula movida'} para ${WEEKDAY_LABEL[targetDay]} — horário de origem agora está livre`);
      await fetchData({ silent: true });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Erro ao mover');
    } finally {
      setIsSaving(false);
    }
  }, [organization?.id, selectedProfessorId, allProfessorModels, professors, getSlotsByWeekday]);
  const [newSlotForm, setNewSlotForm] = useState<{ weekday: Weekday; start: string; end: string }>({ weekday: 'SEGUNDA', start: '', end: '' });
  const [newSlotOpen, setNewSlotOpen] = useState(false);
  const [creatingSlot, setCreatingSlot] = useState(false);
  const [editingClass, setEditingClass] = useState<EditClassDialogClass | null>(null);
  const [addingClassWeekday, setAddingClassWeekday] = useState<Weekday | null>(null);

  // Load schools
  useEffect(() => {
    if (!organization?.id) return;
    fetchSchoolsWithCourses({ organizationId: organization.id })
      .then((data) => setSchools(data))
      .catch(() => setSchools([]));
  }, [organization?.id]);

  // Load professors linked to school
  useEffect(() => {
    if (!organization?.id || !selectedSchoolId) { setProfessors([]); return; }
    const load = async () => {
      const { data: bindings } = await supabase
        .from('professor_school_courses')
        .select('professor_id')
        .eq('organization_id', organization.id)
        .eq('school_id', selectedSchoolId)
        .eq('status', 'ACTIVE');
      const ids = [...new Set((bindings || []).map(b => b.professor_id))];
      if (ids.length === 0) { setProfessors([]); return; }
      const { data } = await supabase
        .from('professors')
        .select('id, full_name')
        .in('id', ids)
        .is('deleted_at', null)
        .order('full_name');
      setProfessors(data || []);
    };
    load();
  }, [organization?.id, selectedSchoolId]);

  // Load ALL models for this professor across ALL schools.
  // `silent=true` evita acionar o spinner em refetches de background (mutações
  // locais ou eventos Realtime), preservando filtros, scroll e percepção visual.
  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!organization?.id || !selectedProfessorId) {
      setAllProfessorModels([]);
      return;
    }
    const silent = opts?.silent === true;
    if (!silent) setIsLoading(true);
    try {
      const { data } = await supabase
        .from('weekly_teaching_models')
        .select('id, professor_id, school_id, course_id, class_group_id, subject_id, weekday, start_time, end_time, schedule_type, class_mode, schools:school_id(nome), subjects:subject_id(nome, semester), class_groups:class_group_id(nome), courses:course_id(nome)')
        .eq('professor_id', selectedProfessorId)
        .eq('status', 'ACTIVE')
        .order('weekday')
        .order('start_time');

      setAllProfessorModels((data || []).map((m: any) => ({
        ...m,
        school_name: m.schools?.nome || '',
        subject_name: m.subjects?.nome || '',
        subject_semester: m.subjects?.semester || null,
        class_group_name: m.class_groups?.nome || '',
        course_name: m.courses?.nome || '',
        class_mode: (m.class_mode as 'PRESENCIAL' | 'ANP' | null) ?? 'PRESENCIAL',
      })));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [organization?.id, selectedProfessorId]);

  // Carga inicial: spinner apenas na primeira carga ao trocar professor.
  useEffect(() => {
    setAllProfessorModels([]);
    fetchData();
  }, [fetchData]);

  // Realtime: outras telas (Grade Horária, Planilha, Horários da Escola) ou
  // ações do próprio usuário refletem aqui sem refresh perceptível.
  useEffect(() => {
    if (!organization?.id || !selectedProfessorId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleSilentRefetch = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { fetchData({ silent: true }); }, 250);
    };
    const channel = supabase
      .channel(`prof-planning-${organization.id}-${selectedProfessorId}`)
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'weekly_teaching_models',
        filter: `professor_id=eq.${selectedProfessorId}`,
      }, scheduleSilentRefetch)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [organization?.id, selectedProfessorId, fetchData]);

  // Derived data
  const classModelsThisSchool = useMemo(() =>
    allProfessorModels.filter(m => m.schedule_type === 'CLASS' && m.school_id === selectedSchoolId),
    [allProfessorModels, selectedSchoolId]
  );

  // Opções de filtros (derivadas das aulas desta escola)
  const courseOptions = useMemo(() => {
    const map = new Map<string, string>();
    classModelsThisSchool.forEach(m => { if (m.course_id) map.set(m.course_id, m.course_name || ''); });
    return Array.from(map, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [classModelsThisSchool]);

  const classGroupOptions = useMemo(() => {
    const map = new Map<string, string>();
    classModelsThisSchool
      .filter(m => filterCourseId === '__all__' || m.course_id === filterCourseId)
      .forEach(m => { if (m.class_group_id) map.set(m.class_group_id, m.class_group_name || ''); });
    return Array.from(map, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [classModelsThisSchool, filterCourseId]);

  // Aulas exibidas no quadro (após aplicar filtros)
  const displayedClassesThisSchool = useMemo(() => {
    return classModelsThisSchool.filter(m => {
      if (filterSemester !== '__all__') {
        const sem = m.subject_semester || 'ANNUAL';
        if (filterSemester === 'FIRST' && !(sem === 'FIRST' || sem === 'ANNUAL')) return false;
        if (filterSemester === 'SECOND' && !(sem === 'SECOND' || sem === 'ANNUAL')) return false;
        if (filterSemester === 'ANNUAL' && sem !== 'ANNUAL') return false;
      }
      if (filterCourseId !== '__all__' && m.course_id !== filterCourseId) return false;
      if (filterClassGroupId !== '__all__' && m.class_group_id !== filterClassGroupId) return false;
      return true;
    });
  }, [classModelsThisSchool, filterSemester, filterCourseId, filterClassGroupId]);

  const hasActiveFilters = filterSemester !== '__all__' || filterCourseId !== '__all__' || filterClassGroupId !== '__all__';

  const classModelsOtherSchools = useMemo(() =>
    allProfessorModels.filter(m => m.schedule_type === 'CLASS' && m.school_id !== selectedSchoolId),
    [allProfessorModels, selectedSchoolId]
  );

  const planningModelsThisSchool = useMemo(() =>
    allProfessorModels.filter(m => m.schedule_type === 'PLANNING' && m.school_id === selectedSchoolId),
    [allProfessorModels, selectedSchoolId]
  );

  const classHoursCount = classModelsThisSchool.length;
  const requiredPlanningHours = useMemo(() => computeRequiredPlanning(classHoursCount), [classHoursCount]);
  const currentPlanningHours = planningModelsThisSchool.length;
  const canAddMore = classHoursCount > 0 && currentPlanningHours < requiredPlanningHours;
  const isComplete = classHoursCount > 0 && currentPlanningHours >= requiredPlanningHours;

  // Compute available (free) time slots from school's default schedule
  // When moving, ignore the source PL from conflict check (it will be deleted).
  const availableSlots = useMemo(() => {
    if (!selectedSchoolId) return [];
    const free: { weekday: Weekday; start_time: string; end_time: string; slot_label: string }[] = [];
    const modelsForCheck = movingPlanningId
      ? allProfessorModels.filter(m => m.id !== movingPlanningId)
      : allProfessorModels;
    for (const day of WEEKDAYS) {
      const daySlots = getSlotsByWeekday(day);
      for (const slot of daySlots) {
        const hasConflict = modelsForCheck.some(m =>
          m.weekday === day && m.start_time < slot.end_time && m.end_time > slot.start_time
        );
        if (!hasConflict) {
          free.push({ weekday: day, start_time: slot.start_time, end_time: slot.end_time, slot_label: slot.slot_label });
        }
      }
    }
    return free;
  }, [selectedSchoolId, schoolTimeSlots, allProfessorModels, getSlotsByWeekday, movingPlanningId]);

  const handleAddPlanningSlot = async (weekday: Weekday, startTime: string, endTime: string) => {
    if (!organization?.id || !selectedSchoolId || !selectedProfessorId) return;

    // Se estiver em modo Mover, faz swap (delete + insert) sem respeitar canAddMore.
    if (movingPlanningId) {
      await handleMovePlanning(weekday, startTime, endTime);
      return;
    }

    if (!canAddMore) { toast.error('Limite de horas de planejamento já atingido'); return; }

    setIsSaving(true);
    try {
      // PLANNING é sempre presencial — mas filtramos ANP do outro lado.
      const dayModels = allProfessorModels.filter(m => m.weekday === weekday && ((m as any).class_mode || 'PRESENCIAL') === 'PRESENCIAL');
      const overlapping = dayModels.filter(m => m.start_time < endTime && m.end_time > startTime);
      if (overlapping.length > 0) {
        const profName = professors.find(p => p.id === selectedProfessorId)?.full_name ?? '—';
        const schoolName = schools.find(s => s.id === selectedSchoolId)?.nome;
        const items: ConflictItem[] = overlapping.map((m, i) => {
          const ov = overlapRange(startTime, endTime, m.start_time, m.end_time);
          const suggestions: ConflictSuggestion[] = [];
          if (m.schedule_type === 'PLANNING' && m.school_id === selectedSchoolId) {
            suggestions.push({
              label: 'Mover o planejamento existente',
              description: `Entra no modo "Mover" do planejamento ${m.start_time.slice(0,5)}–${m.end_time.slice(0,5)}; depois clique no novo horário livre.`,
              variant: 'primary',
              action: { type: 'move-slot', slotId: m.id },
            });
            suggestions.push({
              label: 'Excluir o planejamento conflitante',
              description: 'Remove o planejamento atual e libera este horário.',
              variant: 'danger',
              action: { type: 'set-no-indication', slotId: m.id, classId: m.id },
            });
          } else if (m.schedule_type === 'CLASS' && m.school_id === selectedSchoolId) {
            suggestions.push({
              label: 'Editar a aula que está no horário',
              description: `Abra a aula de ${m.subject_name ?? '—'} para mover de dia ou horário.`,
              variant: 'primary',
              action: { type: 'change-teacher', classId: m.id, subjectId: m.subject_id ?? undefined },
            });
          } else if (m.school_id !== selectedSchoolId) {
            suggestions.push({
              label: 'Abrir grade da outra escola',
              description: `Conflito em ${m.school_name}. Ajuste por lá ou escolha outro horário aqui.`,
              variant: 'secondary',
              action: { type: 'open-grade', schoolId: m.school_id },
            });
          }
          suggestions.push({
            label: 'Escolher outro horário livre',
            description: 'Fecha esta janela — clique em outro tempo livre na grade.',
            variant: 'secondary',
            action: { type: 'move-slot', slotId: 'cancel' },
          });
          return {
            key: `pln-${weekday}-${startTime}-${i}`,
            kind: 'admin-grid',
            teacherName: profName,
            weekday: WEEKDAY_PT_TO_CODE[String(weekday)] ?? 'MON',
            overlapStart: ov.start,
            overlapEnd: ov.end,
            sameTurno: inferTurno(startTime) === inferTurno(m.start_time),
            sides: [
              {
                className: 'Novo horário de planejamento',
                schoolName,
                turno: inferTurno(startTime),
              },
              {
                className: describeModel(m),
                schoolName: m.school_name,
                subjectName: m.subject_name,
                turno: inferTurno(m.start_time),
                isExternalSchool: m.school_id !== selectedSchoolId,
              },
            ],
            suggestions,
          };
        });
        setConflictModal({ open: true, items, hint: 'Reorganize antes de salvar o planejamento.' });
        setIsSaving(false);
        return;
      }

      const { data: binding } = await supabase
        .from('professor_school_courses')
        .select('course_id')
        .eq('professor_id', selectedProfessorId)
        .eq('school_id', selectedSchoolId)
        .eq('status', 'ACTIVE')
        .limit(1)
        .maybeSingle();

      if (!binding) { toast.error('Professor não possui vínculo ativo nesta escola'); setIsSaving(false); return; }

      // PLANNING does not require class_group_id or subject_id
      const { error } = await supabase
        .from('weekly_teaching_models')
        .insert({
          organization_id: organization.id,
          school_id: selectedSchoolId,
          course_id: binding.course_id,
          professor_id: selectedProfessorId,
          schedule_type: 'PLANNING',
          weekday,
          start_time: startTime,
          end_time: endTime,
          status: 'ACTIVE',
        });

      if (error) {
        console.error('Insert error:', error);
        if (error.message.includes('Conflito')) {
          const profName = professors.find(p => p.id === selectedProfessorId)?.full_name ?? '—';
          setConflictModal({
            open: true,
            hint: error.message,
            items: [{
              key: `db-${weekday}-${startTime}`,
              kind: 'admin-grid',
              teacherName: profName,
              weekday: WEEKDAY_PT_TO_CODE[String(weekday)] ?? 'MON',
              overlapStart: startTime.slice(0, 5),
              overlapEnd: endTime.slice(0, 5),
              sides: [
                { className: 'Novo horário de planejamento', schoolName: schools.find(s => s.id === selectedSchoolId)?.nome, turno: inferTurno(startTime) },
                { className: 'Conflito detectado pelo banco', schoolName: 'Validação do servidor' },
              ],
              suggestions: [{ label: 'Fechar e escolher outro horário', variant: 'primary', action: { type: 'move-slot', slotId: 'cancel' } }],
            }],
          });
        }
        else toast.error(`Erro: ${error.message}`);
      } else {
        toast.success('Horário de planejamento adicionado!');
        await fetchData({ silent: true });
      }
    } catch (error: any) {
      console.error('Exception:', error);
      toast.error(error.message || 'Erro ao adicionar');
    } finally {
      setIsSaving(false);
    }
  };

  // Remaneja um PL: deleta o existente + insere no novo horário (mantém checagem de conflito).
  const handleMovePlanning = async (weekday: Weekday, startTime: string, endTime: string, sourceIdOverride?: string) => {
    const sourceId = sourceIdOverride ?? movingPlanningId;
    if (!organization?.id || !selectedSchoolId || !selectedProfessorId || !sourceId) return;
    setIsSaving(true);
    try {
      const source = allProfessorModels.find(m => m.id === sourceId);
      if (!source) { toast.error('Planejamento de origem não encontrado'); return; }

      // Conflito ignorando o próprio source
      const dayModels = allProfessorModels.filter(m => m.id !== sourceId && m.weekday === weekday && ((m as any).class_mode || 'PRESENCIAL') === 'PRESENCIAL');
      const overlapping = dayModels.filter(m => m.start_time < endTime && m.end_time > startTime);
      if (overlapping.length > 0) {
        const profName = professors.find(p => p.id === selectedProfessorId)?.full_name ?? '—';
        const items: ConflictItem[] = overlapping.map((m, i) => {
          const ov = overlapRange(startTime, endTime, m.start_time, m.end_time);
          const suggestions: ConflictSuggestion[] = [];
          if (m.schedule_type === 'PLANNING' && m.school_id === selectedSchoolId) {
            suggestions.push({
              label: 'Mover o planejamento conflitante',
              description: `Substitui o ${m.start_time.slice(0,5)}–${m.end_time.slice(0,5)} entrando em modo "Mover".`,
              variant: 'primary',
              action: { type: 'move-slot', slotId: m.id },
            });
            suggestions.push({
              label: 'Excluir o planejamento conflitante',
              variant: 'danger',
              action: { type: 'set-no-indication', slotId: m.id, classId: m.id },
            });
          } else if (m.schedule_type === 'CLASS' && m.school_id === selectedSchoolId) {
            suggestions.push({
              label: 'Editar a aula que está no horário',
              description: `Abrir aula de ${m.subject_name ?? '—'} para mover de dia/horário.`,
              variant: 'primary',
              action: { type: 'change-teacher', classId: m.id, subjectId: m.subject_id ?? undefined },
            });
          } else if (m.school_id !== selectedSchoolId) {
            suggestions.push({
              label: 'Abrir grade da outra escola',
              description: `Conflito em ${m.school_name}.`,
              variant: 'secondary',
              action: { type: 'open-grade', schoolId: m.school_id },
            });
          }
          suggestions.push({
            label: 'Cancelar movimentação',
            variant: 'secondary',
            action: { type: 'move-slot', slotId: 'cancel-move' },
          });
          return {
            key: `move-${weekday}-${startTime}-${i}`,
            kind: 'admin-grid',
            teacherName: profName,
            weekday: WEEKDAY_PT_TO_CODE[String(weekday)] ?? 'MON',
            overlapStart: ov.start,
            overlapEnd: ov.end,
            sameTurno: inferTurno(startTime) === inferTurno(m.start_time),
            sides: [
              { className: 'Mover planejamento para cá', schoolName: schools.find(s => s.id === selectedSchoolId)?.nome, turno: inferTurno(startTime) },
              {
                className: describeModel(m),
                schoolName: m.school_name,
                subjectName: m.subject_name,
                turno: inferTurno(m.start_time),
                isExternalSchool: m.school_id !== selectedSchoolId,
              },
            ],
            suggestions,
          };
        });
        setConflictModal({ open: true, items, hint: 'Escolha outro horário ou resolva o conflitante.' });
        return;
      }

      // delete source + insert new (best-effort sequencial)
      await gradeHorariaApi.client.from('annual_class_occurrences').delete().eq('weekly_model_id', sourceId);
      const { error: delErr } = await gradeHorariaApi.client.from('weekly_teaching_models').delete().eq('id', sourceId);
      if (delErr) throw delErr;

      const { error: insErr } = await supabase
        .from('weekly_teaching_models')
        .insert({
          organization_id: organization.id,
          school_id: source.school_id,
          course_id: source.course_id,
          professor_id: selectedProfessorId,
          schedule_type: 'PLANNING',
          weekday,
          start_time: startTime,
          end_time: endTime,
          status: 'ACTIVE',
        });
      if (insErr) throw insErr;

      toast.success(sourceIdOverride ? 'Planejamento atualizado' : 'Planejamento remanejado');
      if (!sourceIdOverride) setMovingPlanningId(null);
      await fetchData({ silent: true });
    } catch (e: any) {
      toast.error(e.message || 'Erro ao remanejar planejamento');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewSchoolSlot = async () => {
    if (!selectedSchoolId) return;
    const { weekday, start, end } = newSlotForm;
    if (!start || !end || start >= end) {
      toast.error('Informe horário inicial e final válidos');
      return;
    }
    setCreatingSlot(true);
    try {
      const startNorm = start.length === 5 ? `${start}:00` : start;
      const endNorm = end.length === 5 ? `${end}:00` : end;

      // Verifica se já existe um school_time_slot nesse dia que sobreponha o horário.
      // (Ele pode estar "livre" para este professor, mas continua existindo na escola.)
      const existing = getSlotsByWeekday(weekday);
      const exactMatch = existing.find(s => s.start_time === startNorm && s.end_time === endNorm);
      const overlapping = exactMatch ?? existing.find(s => s.start_time < endNorm && s.end_time > startNorm);

      if (overlapping) {
        // Conflito real do professor nesse intervalo? (ignora ANP)
        const profConflict = allProfessorModels.find(m =>
          m.weekday === weekday &&
          (m.class_mode || 'PRESENCIAL') === 'PRESENCIAL' &&
          m.start_time < endNorm && m.end_time > startNorm,
        );
        if (profConflict) {
          const profName = professors.find(p => p.id === selectedProfessorId)?.full_name ?? '—';
          const ov = overlapRange(startNorm, endNorm, profConflict.start_time, profConflict.end_time);
          const suggestions: ConflictSuggestion[] = [];
          if (profConflict.schedule_type === 'PLANNING' && profConflict.school_id === selectedSchoolId) {
            suggestions.push({
              label: 'Excluir o planejamento conflitante',
              variant: 'danger',
              action: { type: 'set-no-indication', slotId: profConflict.id, classId: profConflict.id },
            });
          }
          if (profConflict.school_id !== selectedSchoolId) {
            suggestions.push({
              label: 'Abrir grade da outra escola',
              description: `Conflito em ${profConflict.school_name}.`,
              variant: 'secondary',
              action: { type: 'open-grade', schoolId: profConflict.school_id },
            });
          }
          suggestions.push({
            label: 'Escolher outro intervalo',
            variant: 'primary',
            action: { type: 'move-slot', slotId: 'cancel' },
          });
          setNewSlotOpen(false);
          setConflictModal({
            open: true,
            hint: 'Esse intervalo já está ocupado por este professor.',
            items: [{
              key: `new-slot-${weekday}-${startNorm}`,
              kind: 'admin-grid',
              teacherName: profName,
              weekday: WEEKDAY_PT_TO_CODE[String(weekday)] ?? 'MON',
              overlapStart: ov.start,
              overlapEnd: ov.end,
              sameTurno: inferTurno(startNorm) === inferTurno(profConflict.start_time),
              sides: [
                { className: 'Novo horário da escola', schoolName: schools.find(s => s.id === selectedSchoolId)?.nome, turno: inferTurno(startNorm) },
                {
                  className: describeModel(profConflict),
                  schoolName: profConflict.school_name,
                  subjectName: profConflict.subject_name,
                  turno: inferTurno(profConflict.start_time),
                  isExternalSchool: profConflict.school_id !== selectedSchoolId,
                },
              ],
              suggestions,
            }],
          });
          return;
        }
        // Slot já existe na escola e está livre para este professor → aloca PLANNING direto nele
        await handleAddPlanningSlot(weekday, overlapping.start_time, overlapping.end_time);
        toast.info(`Reutilizado o horário existente ${overlapping.start_time.slice(0, 5)}–${overlapping.end_time.slice(0, 5)}.`);
        setNewSlotOpen(false);
        setNewSlotForm({ weekday: 'SEGUNDA', start: '', end: '' });
        return;
      }

      const num = getNextSlotNumber(weekday);
      await createSlot({
        school_id: selectedSchoolId,
        weekday,
        slot_number: num,
        slot_label: `${num}ª aula`,
        start_time: startNorm,
        end_time: endNorm,
      });
      toast.success('Horário criado — agora você pode usá-lo no remanejamento');
      setNewSlotOpen(false);
      setNewSlotForm({ weekday: 'SEGUNDA', start: '', end: '' });
      await refetchSlots();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar horário');
    } finally {
      setCreatingSlot(false);
    }
  };

  const handleDeletePlanning = async (id: string, opts?: { skipConfirm?: boolean }) => {
    if (!opts?.skipConfirm) {
      const model = allProfessorModels.find(m => m.id === id);
      const label = model ? `${WEEKDAY_LABEL[model.weekday]} · ${model.start_time.slice(0, 5)}–${model.end_time.slice(0, 5)}` : 'este horário';
      const ok = await confirmDialog({
        title: 'Excluir horário',
        description: `Excluir o horário de planejamento de ${label}?\n\nEssa ação não pode ser desfeita.`,
        confirmText: 'Excluir',
        variant: 'destructive',
      });
      if (!ok) return;
    }
    try {
      await gradeHorariaApi.client.from('annual_class_occurrences').delete().eq('weekly_model_id', id);
      const { error } = await gradeHorariaApi.client.from('weekly_teaching_models').delete().eq('id', id);
      if (error) throw error;
      toast.success('Horário de planejamento removido');
      await fetchData({ silent: true });
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover');
    }
  };

  const allSelected = selectedSchoolId && selectedProfessorId;
  const selectedSchoolName = schools.find(s => s.id === selectedSchoolId)?.nome;

  // Build unified weekly grid data for the combined view
  const weeklyGrid = useMemo(() => {
    return WEEKDAYS.map(day => {
      const classes = displayedClassesThisSchool.filter(m => m.weekday === day)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
      const otherClasses = classModelsOtherSchools.filter(m => m.weekday === day)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
      const planning = planningModelsThisSchool.filter(m => m.weekday === day)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
      const free = availableSlots.filter(s => s.weekday === day);
      // Lista combinada (aulas + planejamentos) ordenada por horário para exibição na grade principal
      const items = [...classes, ...planning].sort((a, b) => a.start_time.localeCompare(b.start_time));
      return { day, classes, otherClasses, planning, free, items };
    });
  }, [displayedClassesThisSchool, classModelsOtherSchools, planningModelsThisSchool, availableSlots]);

  return (
    <div className="space-y-4">
      {/* Header */}
      {!embedded && (
        <>
          <PageHeader
            breadcrumbs={[
              { label: 'Grade Horária', href: '/grade-horaria' },
              { label: 'Planejamento do Professor' },
            ]}
            title="Planejamento do Professor"
            description={`Aloque horários de planejamento — ${PLANNING_RATIO_LABEL}`}
            backTo="/grade-horaria"
          />
        </>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                {!selectedSchoolId && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                1. Escola
              </Label>
              <SearchableSelect
                value={selectedSchoolId || ''}
                onValueChange={(v) => { setSelectedSchoolId(v); setSelectedProfessorId(null); }}
                placeholder="Selecione a escola..."
                searchPlaceholder="Buscar escola..."
                triggerClassName={!selectedSchoolId ? 'border-primary/50' : ''}
                options={schools.map(s => ({ value: s.id, label: s.nome ?? '' }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                {selectedSchoolId && !selectedProfessorId && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                2. Professor
              </Label>
              <SearchableSelect
                value={selectedProfessorId || ''}
                onValueChange={setSelectedProfessorId}
                disabled={!selectedSchoolId}
                placeholder={!selectedSchoolId ? '—' : 'Selecione o professor...'}
                searchPlaceholder="Buscar professor..."
                triggerClassName={selectedSchoolId && !selectedProfessorId ? 'border-primary/50' : ''}
                options={professors.map(p => ({ value: p.id, label: p.full_name }))}
              />
            </div>
          </div>

          {/* Filtros de visualização — sempre visíveis */}
          <div className="mt-4 pt-4 border-t border-dashed">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filtrar visualização</span>
              {allSelected && classModelsThisSchool.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {displayedClassesThisSchool.length} de {classModelsThisSchool.length}
                </Badge>
              )}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs ml-auto"
                  onClick={() => { setFilterSemester('__all__'); setFilterCourseId('__all__'); setFilterClassGroupId('__all__'); }}
                >
                  <X className="h-3 w-3 mr-1" /> Limpar
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Semestre</Label>
                <SearchableSelect
                  value={filterSemester}
                  onValueChange={setFilterSemester}
                  options={[
                    { value: '__all__', label: 'Todos' },
                    { value: 'FIRST', label: '1º Semestre' },
                    { value: 'SECOND', label: '2º Semestre' },
                    { value: 'ANNUAL', label: 'Anual' },
                  ]}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Curso</Label>
                <SearchableSelect
                  value={filterCourseId}
                  onValueChange={(v) => { setFilterCourseId(v); setFilterClassGroupId('__all__'); }}
                  placeholder={courseOptions.length ? 'Todos' : 'Selecione professor'}
                  searchPlaceholder="Buscar curso..."
                  disabled={courseOptions.length === 0}
                  options={[{ value: '__all__', label: 'Todos' }, ...courseOptions.map(c => ({ value: c.id, label: c.nome }))]}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Turma</Label>
                <SearchableSelect
                  value={filterClassGroupId}
                  onValueChange={setFilterClassGroupId}
                  placeholder={classGroupOptions.length ? 'Todas' : 'Selecione professor'}
                  searchPlaceholder="Buscar turma..."
                  disabled={classGroupOptions.length === 0}
                  options={[{ value: '__all__', label: 'Todas' }, ...classGroupOptions.map(cg => ({ value: cg.id, label: cg.nome }))]}
                />
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      {!allSelected && (
        <div className="text-center py-12 text-muted-foreground">
          <User className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">{!selectedSchoolId ? 'Selecione uma escola para começar' : 'Selecione o professor'}</p>
        </div>
      )}

      {allSelected && isLoading && allProfessorModels.length === 0 && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {allSelected && (allProfessorModels.length > 0 || !isLoading) && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="relative overflow-hidden border-blue-200/70 bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute inset-y-0 left-0 w-1 bg-blue-600" />
              <CardContent className="flex items-center gap-4 p-5">
                <div className="p-3 rounded-2xl bg-blue-100 ring-1 ring-blue-200">
                  <BookOpen className="h-6 w-6 text-blue-700" />
                </div>
                <div className="min-w-0">
                  <div className="text-3xl font-extrabold leading-none text-blue-800 tabular-nums">{classHoursCount}</div>
                  <div className="text-xs font-medium text-blue-700/70 mt-1.5 uppercase tracking-wide">Aulas / semana</div>
                </div>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden border-amber-200/70 bg-gradient-to-br from-amber-50 to-white shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute inset-y-0 left-0 w-1 bg-amber-500" />
              <CardContent className="flex items-center gap-4 p-5">
                <div className="p-3 rounded-2xl bg-amber-100 ring-1 ring-amber-200">
                  <ClipboardList className="h-6 w-6 text-amber-700" />
                </div>
                <div className="min-w-0">
                  <div className="text-3xl font-extrabold leading-none text-amber-800 tabular-nums">{requiredPlanningHours}</div>
                  <div className="text-xs font-medium text-amber-700/70 mt-1.5 uppercase tracking-wide">Planej. necessários</div>
                </div>
              </CardContent>
            </Card>
            <Card className={`relative overflow-hidden shadow-sm hover:shadow-md transition-shadow ${isComplete ? 'border-green-200/70 bg-gradient-to-br from-green-50 to-white' : 'border-rose-200/70 bg-gradient-to-br from-rose-50 to-white'}`}>
              <div className={`absolute inset-y-0 left-0 w-1 ${isComplete ? 'bg-green-600' : 'bg-rose-500'}`} />
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`p-3 rounded-2xl ring-1 ${isComplete ? 'bg-green-100 ring-green-200' : 'bg-rose-100 ring-rose-200'}`}>
                  {isComplete
                    ? <CheckCircle2 className="h-6 w-6 text-green-700" />
                    : <AlertCircle className="h-6 w-6 text-rose-600" />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-3xl font-extrabold leading-none tabular-nums ${isComplete ? 'text-green-800' : 'text-rose-700'}`}>
                    {currentPlanningHours}<span className="text-lg text-muted-foreground/70 font-bold">/{requiredPlanningHours}</span>
                  </div>
                  <div className={`text-xs font-medium mt-1.5 uppercase tracking-wide ${isComplete ? 'text-green-700/70' : 'text-rose-600/80'}`}>
                    {isComplete ? 'Planejamento completo' : `Faltam ${requiredPlanningHours - currentPlanningHours} horário(s)`}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {classHoursCount === 0 ? (
            <Card className="border-dashed">
              <CardContent className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-7 w-7 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Este professor não possui aulas em <strong>{selectedSchoolName}</strong>.</p>
                <p className="text-xs mt-1 mb-4">Adicione uma aula diretamente nesta grade ou aloque pela "Grade Horária".</p>
                <Button size="sm" onClick={() => setAddingClassWeekday('SEGUNDA')}>
                  <Plus className="h-4 w-4 mr-1.5" /> Adicionar aula
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* ===== HORÁRIOS DE AULA — Visão semanal colorida ===== */}
              {(() => {
                // Paleta estável por turma — facilita identificação visual
                const PALETTE = [
                  { bar: 'bg-sky-500',     chip: 'bg-sky-100 text-sky-800',         ring: 'hover:ring-sky-300' },
                  { bar: 'bg-violet-500',  chip: 'bg-violet-100 text-violet-800',   ring: 'hover:ring-violet-300' },
                  { bar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800', ring: 'hover:ring-emerald-300' },
                  { bar: 'bg-rose-500',    chip: 'bg-rose-100 text-rose-800',       ring: 'hover:ring-rose-300' },
                  { bar: 'bg-amber-500',   chip: 'bg-amber-100 text-amber-800',     ring: 'hover:ring-amber-300' },
                  { bar: 'bg-cyan-500',    chip: 'bg-cyan-100 text-cyan-800',       ring: 'hover:ring-cyan-300' },
                  { bar: 'bg-fuchsia-500', chip: 'bg-fuchsia-100 text-fuchsia-800', ring: 'hover:ring-fuchsia-300' },
                  { bar: 'bg-lime-500',    chip: 'bg-lime-100 text-lime-800',       ring: 'hover:ring-lime-300' },
                ];
                const colorFor = (key: string) => {
                  let h = 0;
                  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
                  return PALETTE[h % PALETTE.length];
                };
                return (
                  <Card className="border-blue-200 overflow-hidden shadow-sm">
                    <CardHeader className="py-3 px-4 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 border-b border-blue-800">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                        <BookOpen className="h-4 w-4" />
                        <span className="truncate">Horários de Aula — {selectedSchoolName}</span>
                        <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold bg-white text-blue-700 rounded-full px-3 py-0.5 shadow">
                          {classHoursCount} aula{classHoursCount === 1 ? '' : 's'}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 bg-slate-50/60">
                      <div className="grid grid-cols-5 divide-x divide-slate-200">
                        {weeklyGrid.map(({ day, items, planning }) => {
                          const isDragOver = dragOverDay === day && draggingClassId !== null;
                          const draggingFromThisDay = draggingClassId
                            ? items.some(c => c.id === draggingClassId)
                            : false;
                          const dayItemsCount = items.length;
                          const dayPlanningCount = planning.length;
                          return (
                          <div
                            key={day}
                            className={`min-h-[120px] flex flex-col transition-colors ${isDragOver && !draggingFromThisDay ? 'bg-blue-50/80 ring-2 ring-inset ring-blue-400' : ''}`}
                            onDragOver={(e) => {
                              if (!draggingClassId) return;
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                              if (dragOverDay !== day) setDragOverDay(day);
                            }}
                            onDragLeave={(e) => {
                              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                if (dragOverDay === day) setDragOverDay(null);
                              }
                            }}
                            onDrop={(e) => {
                              if (!draggingClassId) return;
                              e.preventDefault();
                              const id = e.dataTransfer.getData('text/plain') || draggingClassId;
                              handleDropClassOnDay(id, day);
                            }}
                          >
                            <div className="bg-white/80 backdrop-blur text-center py-2.5 border-b border-slate-200 sticky top-0">
                              <div className="flex items-center justify-center gap-1.5">
                                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">{WEEKDAY_SHORT[day]}</span>
                                {dayItemsCount > 0 ? (
                                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold" title={`${dayItemsCount - dayPlanningCount} aula(s)${dayPlanningCount ? ` + ${dayPlanningCount} planej.` : ''}`}>
                                    {dayItemsCount}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-slate-200 text-slate-500 text-[10px] font-semibold">0</span>
                                )}
                                {dayPlanningCount > 0 && (
                                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-green-600 text-white text-[10px] font-bold" title={`${dayPlanningCount} planejamento(s)`}>
                                    PL
                                  </span>
                                )}
                                <button
                                  type="button"
                                  title={`Adicionar aula em ${WEEKDAY_LABEL[day]}`}
                                  onClick={() => setAddingClassWeekday(day)}
                                  className="ml-0.5 h-5 w-5 rounded-full flex items-center justify-center text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 hover:border-blue-600 transition-colors"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <div className="p-2 space-y-1.5 flex-1">
                              {items.length === 0 ? (
                                <button
                                  type="button"
                                  onClick={() => setAddingClassWeekday(day)}
                                  className={`h-full w-full flex flex-col items-center justify-center py-6 rounded-md border-2 border-dashed transition-colors ${isDragOver && !draggingFromThisDay ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50/40'}`}
                                  title={`Adicionar aula em ${WEEKDAY_LABEL[day]}`}
                                >
                                  <div className="w-8 h-8 rounded-full border-2 border-dashed border-current flex items-center justify-center mb-1">
                                    <Plus className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="text-[10px] italic">
                                    {isDragOver && !draggingFromThisDay ? 'Soltar aqui' : 'Adicionar aula'}
                                  </span>
                                </button>
                              ) : (
                                items.map((c, i) => {
                                  const isPlanning = c.schedule_type === 'PLANNING';
                                  const isDragging = draggingClassId === c.id;
                                  const isMovingThis = movingPlanningId === c.id;

                                  if (isPlanning) {
                                    // Card de PLANEJAMENTO — verde, com botões de mover e excluir
                                    return (
                                      <div
                                        key={i}
                                        draggable
                                        onDragStart={(e) => {
                                          setDraggingClassId(c.id);
                                          e.dataTransfer.effectAllowed = 'move';
                                          e.dataTransfer.setData('text/plain', c.id);
                                        }}
                                        onDragEnd={() => {
                                          setDraggingClassId(null);
                                          setDragOverDay(null);
                                        }}
                                        className={`group relative rounded-lg bg-green-50 border border-green-300 pl-2.5 pr-2 py-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:ring-2 hover:ring-green-300 transition-all overflow-hidden cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-40' : ''} ${isMovingThis ? 'ring-2 ring-amber-400' : ''}`}
                                        title="Arraste para outro dia para mover este planejamento"
                                      >
                                        <div className="absolute inset-y-0 left-0 w-1 bg-green-500" />
                                        <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            type="button"
                                            title="Remanejar para outro horário livre"
                                            onClick={() => setMovingPlanningId(movingPlanningId === c.id ? null : c.id)}
                                            className="h-5 w-5 rounded flex items-center justify-center text-amber-600 hover:text-white hover:bg-amber-600"
                                          >
                                            <Move className={`h-3 w-3 ${isMovingThis ? 'animate-pulse' : ''}`} />
                                          </button>
                                          <button
                                            type="button"
                                            title="Excluir planejamento"
                                            onClick={() => handleDeletePlanning(c.id)}
                                            className="h-5 w-5 rounded flex items-center justify-center text-rose-500 hover:text-white hover:bg-rose-600"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                        <div className="flex items-center gap-1 mb-1">
                                          <CalendarClock className="h-2.5 w-2.5 text-green-600 shrink-0" />
                                          <span className="text-[11px] font-mono font-bold text-green-800 tabular-nums leading-none">
                                            {c.start_time.slice(0, 5)}<span className="text-green-400 mx-0.5">–</span>{c.end_time.slice(0, 5)}
                                          </span>
                                        </div>
                                        <div className="text-[11px] font-semibold text-green-800 leading-tight">
                                          Planejamento
                                        </div>
                                        <div className="mt-1">
                                          <span className="inline-block text-[9px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 bg-green-100 text-green-800">
                                            PL
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  }

                                  // Card de AULA
                                  const color = colorFor(c.class_group_id || c.subject_id || c.id);
                                  return (
                                    <div
                                      key={i}
                                      draggable
                                      onDragStart={(e) => {
                                        setDraggingClassId(c.id);
                                        e.dataTransfer.effectAllowed = 'move';
                                        e.dataTransfer.setData('text/plain', c.id);
                                      }}
                                      onDragEnd={() => {
                                        setDraggingClassId(null);
                                        setDragOverDay(null);
                                      }}
                                      className={`group relative rounded-lg bg-white border border-slate-200 pl-2.5 pr-2 py-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:ring-2 ${color.ring} transition-all overflow-hidden cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-40' : ''}`}
                                      title="Arraste para outro dia para mover esta aula"
                                    >
                                      <div className={`absolute inset-y-0 left-0 w-1 ${color.bar}`} />
                                      <button
                                        type="button"
                                        title="Editar aula (horário/professor)"
                                        onClick={() => setEditingClass({
                                          id: c.id,
                                          school_id: c.school_id,
                                          course_id: c.course_id,
                                          class_group_id: c.class_group_id,
                                          subject_id: c.subject_id,
                                          professor_id: c.professor_id,
                                          weekday: c.weekday,
                                          start_time: c.start_time,
                                          end_time: c.end_time,
                                          subject_name: c.subject_name,
                                          subject_semester: c.subject_semester ?? null,
                                          class_group_name: c.class_group_name,
                                          class_mode: c.class_mode ?? 'PRESENCIAL',
                                        })}
                                        className="absolute top-1 right-1 h-5 w-5 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </button>
                                      <div className="flex items-center gap-1 mb-1">
                                        <Clock className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                                        <span className="text-[11px] font-mono font-bold text-slate-800 tabular-nums leading-none">
                                          {c.start_time.slice(0, 5)}<span className="text-slate-400 mx-0.5">–</span>{c.end_time.slice(0, 5)}
                                        </span>
                                      </div>
                                      {c.subject_name && (
                                        <div className="text-[11px] font-semibold text-slate-800 leading-tight break-words">
                                          <SubjectNameWithAnp
                                            name={c.subject_name}
                                            isAnp={c.subject_id ? anpMap?.bySubject.has(c.subject_id) : false}
                                            compact
                                          />
                                        </div>
                                      )}
                                      <div className="flex items-center gap-1 flex-wrap mt-1">
                                        {c.class_group_name && (
                                          <span className={`inline-block text-[9px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 ${color.chip}`}>
                                            {c.class_group_name}
                                          </span>
                                        )}
                                        {(c as any).class_mode === 'ANP' && (
                                          <span className="inline-block text-[9px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 border border-indigo-300 bg-indigo-50 text-indigo-700" title="Slot ANP">
                                            Slot ANP
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Other schools */}
              {classModelsOtherSchools.length > 0 && (
                <Card className="border-orange-300/40 overflow-hidden">
                  <CardHeader className="py-2.5 px-4 bg-orange-50 border-b border-orange-200/50">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-orange-700">
                      <Building2 className="h-4 w-4" />
                      Horários em Outras Escolas
                      <span className="ml-auto inline-flex items-center gap-1 text-xs font-normal bg-orange-500 text-white rounded-full px-2.5 py-0.5">
                        {classModelsOtherSchools.length} aula(s)
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="grid grid-cols-5 divide-x">
                      {weeklyGrid.map(({ day, otherClasses }) => (
                        <div key={day} className="min-h-[60px]">
                          <div className="bg-orange-50/50 text-center py-1.5 border-b">
                            <span className="text-xs font-semibold text-orange-600">{WEEKDAY_SHORT[day]}</span>
                          </div>
                          <div className="p-1.5 space-y-1">
                            {otherClasses.length === 0 ? (
                              <div className="text-center py-2 text-muted-foreground/30 text-xs">—</div>
                            ) : (
                              otherClasses.map((c, i) => (
                                <div key={i} className="rounded-md bg-orange-50 border border-orange-200 p-1.5">
                                  <div className="text-[10px] font-mono font-bold text-orange-700 text-center">
                                    {c.start_time.slice(0, 5)}–{c.end_time.slice(0, 5)}
                                  </div>
                                  <div className="text-[9px] text-orange-500 text-center truncate">{c.school_name}</div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ===== HORÁRIOS DE PLANEJAMENTO ===== */}
              <Card className="border-green-300/40 overflow-hidden">
                <CardHeader className="py-3 px-4 bg-green-50 border-b border-green-200/50">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-green-800">
                    <ClipboardList className="h-4 w-4" />
                    Horários de Planejamento
                    <div className="ml-auto flex items-center gap-2">
                      {movingPlanningId && (
                        <span className="inline-flex items-center gap-1 text-xs font-normal bg-amber-500 text-white rounded-full px-2.5 py-0.5">
                          <Move className="h-3 w-3" /> Movendo — escolha um horário livre
                          <button onClick={() => setMovingPlanningId(null)} className="ml-1 hover:opacity-80"><X className="h-3 w-3" /></button>
                        </span>
                      )}
                      {!movingPlanningId && isComplete && (
                        <span className="inline-flex items-center gap-1 text-xs font-normal bg-green-600 text-white rounded-full px-2.5 py-0.5">
                          <CheckCircle2 className="h-3 w-3" /> Completo
                        </span>
                      )}
                      {!movingPlanningId && !isComplete && canAddMore && (
                        <span className="inline-flex items-center gap-1 text-xs font-normal bg-amber-500 text-white rounded-full px-2.5 py-0.5">
                          Falta(m) {requiredPlanningHours - currentPlanningHours} horário(s)
                        </span>
                      )}
                      <Popover open={newSlotOpen} onOpenChange={setNewSlotOpen}>
                        <PopoverTrigger asChild>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                            <Plus className="h-3.5 w-3.5 mr-1" /> Novo horário
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-3" align="end">
                          <div className="space-y-3">
                            <div className="text-xs font-medium text-muted-foreground">Criar novo horário para esta escola</div>
                            <div>
                              <label className="text-xs font-medium mb-1 block">Dia da semana</label>
                              <SearchableSelect
                                value={newSlotForm.weekday}
                                onValueChange={(v) => setNewSlotForm(p => ({ ...p, weekday: v as Weekday }))}
                                options={WEEKDAYS.map(w => ({ value: w, label: WEEKDAY_OPTIONS.find(x => x.value === w)?.label || w }))}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs font-medium mb-1 block">Início</label>
                                <Input type="time" value={newSlotForm.start} onChange={e => setNewSlotForm(p => ({ ...p, start: e.target.value }))} />
                              </div>
                              <div>
                                <label className="text-xs font-medium mb-1 block">Fim</label>
                                <Input type="time" value={newSlotForm.end} onChange={e => setNewSlotForm(p => ({ ...p, end: e.target.value }))} />
                              </div>
                            </div>
                            <Button size="sm" className="w-full" onClick={handleCreateNewSchoolSlot} disabled={creatingSlot}>
                              {creatingSlot ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
                              Criar horário
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {/* Existing planning slots */}
                  {planningModelsThisSchool.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-green-700 mb-2">Horários cadastrados:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {planningModelsThisSchool.map(model => (
                          <div
                            key={model.id}
                            className="flex items-center gap-2 p-3 rounded-lg border border-green-300 bg-green-50 group"
                          >
                            <CalendarClock className="h-4 w-4 text-green-600 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-mono font-bold text-green-800">
                                {model.start_time.slice(0, 5)}–{model.end_time.slice(0, 5)}
                              </div>
                              <div className="text-[11px] text-green-600">{WEEKDAY_LABEL[model.weekday]}</div>
                            </div>
                            <PlanningEditPopover
                              model={model}
                              schoolSlots={schoolTimeSlots}
                              disabled={isSaving || !!movingPlanningId}
                              onSubmit={(wd, st, et) => handleMovePlanning(wd, st, et, model.id)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 text-amber-600 hover:text-amber-700"
                              title="Remanejar arrastando para um horário livre da grade"
                              onClick={() => setMovingPlanningId(movingPlanningId === model.id ? null : model.id)}
                            >
                              <Move className={`h-3.5 w-3.5 ${movingPlanningId === model.id ? 'animate-pulse' : ''}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 text-destructive/70 hover:text-destructive"
                              title="Excluir horário de planejamento"
                              onClick={() => handleDeletePlanning(model.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Available slots to add or to move into */}
                  {(canAddMore || movingPlanningId) && (
                    <>
                      {planningModelsThisSchool.length > 0 && <Separator />}
                      <div>
                        <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                          <Plus className="h-3.5 w-3.5" />
                          {movingPlanningId
                            ? <>Clique em um horário <strong>livre</strong> para mover o planejamento.</>
                            : <>Clique em um horário <strong>disponível</strong> para registrar como planejamento:</>}
                        </p>
                        {availableSlots.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed bg-muted/20">
                            <Clock className="h-6 w-6 mx-auto mb-2 opacity-40" />
                            <p className="text-sm font-medium">Nenhum horário livre encontrado</p>
                            <p className="text-xs mt-1 max-w-md mx-auto">
                              Configure os horários padrão da escola em "Horários da Escola" ou libere horários ocupados.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-5 divide-x border rounded-lg overflow-hidden">
                            {WEEKDAYS.map(day => {
                              const dayFree = availableSlots.filter(s => s.weekday === day);
                              return (
                                <div key={day}>
                                  <div className="bg-green-100/50 text-center py-2 border-b">
                                    <span className="text-xs font-bold text-green-700 uppercase tracking-wide">{WEEKDAY_SHORT[day]}</span>
                                    {dayFree.length > 0 && (
                                      <span className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-green-600 text-white text-[9px] font-bold">
                                        {dayFree.length}
                                      </span>
                                    )}
                                  </div>
                                  <div className="p-1.5 space-y-1 min-h-[70px]">
                                    {dayFree.length === 0 ? (
                                      <div className="text-center py-4 text-muted-foreground/30 text-xs italic">—</div>
                                    ) : (
                                      dayFree.map((slot, i) => (
                                        <button
                                          key={i}
                                          disabled={isSaving}
                                          onClick={() => handleAddPlanningSlot(slot.weekday, slot.start_time, slot.end_time)}
                                          className="w-full rounded-lg border-2 border-dashed border-green-300 bg-green-50/80 p-2 text-center hover:bg-green-100 hover:border-green-500 hover:border-solid transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group/slot"
                                        >
                                          <div className="text-xs font-mono font-bold text-green-700 group-hover/slot:text-green-800">
                                            {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                                          </div>
                                          <div className="text-[10px] text-green-500 mt-0.5 flex items-center justify-center gap-0.5">
                                            <Plus className="h-3 w-3" /> Adicionar
                                          </div>
                                        </button>
                                      ))
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {planningModelsThisSchool.length === 0 && !canAddMore && classHoursCount > 0 && (
                    <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed bg-muted/10">
                      <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-500" />
                      <p className="text-sm">Nenhum horário de planejamento necessário</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Weekly summary */}
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold">Resumo Semanal Completo</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2.5 text-xs font-semibold">Tipo</th>
                          {WEEKDAYS.map(day => (
                            <th key={day} className="text-center p-2.5 w-14 text-xs font-semibold">{WEEKDAY_SHORT[day]}</th>
                          ))}
                          <th className="text-center p-2.5 w-16 text-xs font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t hover:bg-primary/5">
                          <td className="p-2.5 text-xs font-medium flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
                            Aulas (esta escola)
                          </td>
                          {WEEKDAYS.map(day => {
                            const count = classModelsThisSchool.filter(m => m.weekday === day).length;
                            return (
                              <td key={day} className="text-center p-2.5">
                                {count > 0
                                  ? <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">{count}</span>
                                  : <span className="text-muted-foreground/30">—</span>
                                }
                              </td>
                            );
                          })}
                          <td className="text-center p-2.5 font-bold text-primary">{classHoursCount}</td>
                        </tr>
                        {classModelsOtherSchools.length > 0 && (
                          <tr className="border-t hover:bg-orange-50/50">
                            <td className="p-2.5 text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                              <span className="h-2.5 w-2.5 rounded-full bg-orange-400 shrink-0" />
                              Aulas (outras escolas)
                            </td>
                            {WEEKDAYS.map(day => {
                              const count = classModelsOtherSchools.filter(m => m.weekday === day).length;
                              return (
                                <td key={day} className="text-center p-2.5">
                                  {count > 0
                                    ? <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-orange-400 text-white text-xs font-bold">{count}</span>
                                    : <span className="text-muted-foreground/30">—</span>
                                  }
                                </td>
                              );
                            })}
                            <td className="text-center p-2.5 text-orange-600 font-semibold">{classModelsOtherSchools.length}</td>
                          </tr>
                        )}
                        <tr className="border-t hover:bg-green-50/50">
                          <td className="p-2.5 text-xs font-medium flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
                            Planejamento
                          </td>
                          {WEEKDAYS.map(day => {
                            const count = planningModelsThisSchool.filter(m => m.weekday === day).length;
                            return (
                              <td key={day} className="text-center p-2.5">
                                {count > 0
                                  ? <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-green-500 text-white text-xs font-bold">{count}</span>
                                  : <span className="text-muted-foreground/30">—</span>
                                }
                              </td>
                            );
                          })}
                          <td className="text-center p-2.5">
                            {isComplete ? (
                              <span className="inline-flex items-center gap-1 text-green-700 font-bold text-xs">
                                <CheckCircle2 className="h-3.5 w-3.5" /> {currentPlanningHours}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-600 font-semibold text-xs">
                                <AlertCircle className="h-3.5 w-3.5" /> {currentPlanningHours}/{requiredPlanningHours}
                              </span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
      <ScheduleConflictModal
        open={conflictModal.open}
        onOpenChange={(open) => setConflictModal((s) => ({ ...s, open }))}
        conflicts={conflictModal.items}
        context="admin"
        hint={conflictModal.hint ?? 'Escolha outro horário livre na grade.'}
        onApplyAction={(action) => {
          const close = () => setConflictModal((s) => ({ ...s, open: false }));
          if (action.type === 'move-slot') {
            close();
            if (action.slotId === 'cancel' || action.slotId === 'cancel-move' || action.slotId === 'new') {
              setMovingPlanningId(null);
              return;
            }
            if (action.slotId) {
              setMovingPlanningId(action.slotId);
              toast.info('Modo Mover ativado — clique em um horário livre na grade.');
            }
            return;
          }
          if (action.type === 'set-no-indication' && action.slotId) {
            close();
            handleDeletePlanning(action.slotId, { skipConfirm: true });
            return;
          }
          if (action.type === 'change-teacher' && action.classId) {
            const m = allProfessorModels.find((x) => x.id === action.classId);
            if (m && m.schedule_type === 'CLASS') {
              close();
              setEditingClass({
                id: m.id,
                weekday: m.weekday,
                start_time: m.start_time,
                end_time: m.end_time,
                school_id: m.school_id,
                course_id: m.course_id,
                class_group_id: m.class_group_id,
                subject_id: m.subject_id,
                professor_id: m.professor_id,
                subject_name: m.subject_name,
                subject_semester: m.subject_semester ?? null,
                class_group_name: m.class_group_name,
                class_mode: m.class_mode ?? 'PRESENCIAL',
              });
            }
            return;
          }
          if (action.type === 'open-grade' && action.schoolId) {
            close();
            navigate(`/grade-horaria?schoolId=${action.schoolId}`);
            return;
          }
          close();
        }}
      />
      <EditClassDialog
        open={!!editingClass}
        onOpenChange={(v) => { if (!v) setEditingClass(null); }}
        klass={editingClass}
        schoolName={selectedSchoolName}
        schoolSlots={schoolTimeSlots}
        onSaved={() => fetchData({ silent: true })}
      />
      {selectedSchoolId && (
        <AddClassDialog
          open={!!addingClassWeekday}
          onOpenChange={(v) => { if (!v) setAddingClassWeekday(null); }}
          schoolId={selectedSchoolId}
          schoolName={selectedSchoolName}
          initialProfessorId={selectedProfessorId}
          initialWeekday={addingClassWeekday || 'SEGUNDA'}
          schoolSlots={schoolTimeSlots}
          onSaved={() => fetchData({ silent: true })}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// PlanningEditPopover — edita dia/horário de um PL existente reutilizando
// a regra de conflitos do handleMovePlanning (não altera regra de negócio).
// ----------------------------------------------------------------------------
interface PlanningEditPopoverProps {
  model: { id: string; weekday: Weekday; start_time: string; end_time: string };
  schoolSlots: Array<{ id: string; weekday: Weekday; start_time: string; end_time: string; slot_label: string }>;
  disabled?: boolean;
  onSubmit: (weekday: Weekday, startTime: string, endTime: string) => void | Promise<void>;
}

function PlanningEditPopover({ model, schoolSlots, disabled, onSubmit }: PlanningEditPopoverProps) {
  const [open, setOpen] = useState(false);
  const [weekday, setWeekday] = useState<Weekday>(model.weekday);
  const [slotKey, setSlotKey] = useState<string>(`${model.start_time}|${model.end_time}`);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setWeekday(model.weekday);
      setSlotKey(`${model.start_time}|${model.end_time}`);
    }
  }, [open, model.id, model.weekday, model.start_time, model.end_time]);

  const slotOptions = useMemo(() => {
    const byKey = new Map<string, { start: string; end: string; label: string; sameDay: boolean }>();
    for (const s of schoolSlots) {
      const key = `${s.start_time}|${s.end_time}`;
      const sameDay = s.weekday === weekday;
      const existing = byKey.get(key);
      if (sameDay || !existing) {
        byKey.set(key, { start: s.start_time, end: s.end_time, label: s.slot_label, sameDay });
      }
    }
    const currentKey = `${model.start_time}|${model.end_time}`;
    if (!byKey.has(currentKey)) {
      byKey.set(currentKey, { start: model.start_time, end: model.end_time, label: 'Atual', sameDay: true });
    }
    return Array.from(byKey.entries())
      .map(([key, v]) => ({ value: key, ...v }))
      .sort((a, b) => a.start.localeCompare(b.start));
  }, [schoolSlots, weekday, model.start_time, model.end_time]);

  const dirty = weekday !== model.weekday || slotKey !== `${model.start_time}|${model.end_time}`;

  const handleSave = async () => {
    if (!dirty || !slotKey) { setOpen(false); return; }
    const [start, end] = slotKey.split('|');
    setSubmitting(true);
    try {
      await onSubmit(weekday, start, end);
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={(v) => !submitting && setOpen(v)}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-green-700 hover:text-green-800"
          title="Editar dia e horário"
          disabled={disabled}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-3">
          <div className="text-xs font-medium text-muted-foreground">Editar horário de planejamento</div>
          <div>
            <Label className="text-xs mb-1 block">Dia da semana</Label>
            <SearchableSelect
              value={weekday}
              onValueChange={(v) => setWeekday(v as Weekday)}
              options={WEEKDAYS.map(w => ({ value: w, label: WEEKDAY_LABEL[w] }))}
            />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Horário</Label>
            <SearchableSelect
              value={slotKey}
              onValueChange={setSlotKey}
              placeholder={slotOptions.length ? 'Selecione…' : 'Nenhum horário'}
              disabled={!slotOptions.length}
              options={slotOptions.map(o => ({
                value: o.value,
                label: `${o.start.slice(0, 5)}–${o.end.slice(0, 5)} (${o.label})${!o.sameDay ? ' · outro dia' : ''}`,
              }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={submitting || !dirty}>
              {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
