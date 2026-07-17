import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Loader2, Building2, Users, CheckCircle2, ArrowLeft, ArrowRight,
  GraduationCap, BookOpen, Save, ChevronDown, ChevronUp, Sun, Sunset, Moon,
  Plus, Trash2, Info, Sparkles, Circle, CircleCheck, CircleDot, CalendarDays,
  School, Clock, Link2, HelpCircle, UserPlus, Check, AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { indicationLinksApi, type LinkInfoPayload, type LinkInfoCourse } from '../lib/indicationLinksApi';
import { useDraftAutoSave } from '../hooks/useDraftAutoSave';
import {
  TimeSlot, Turno, defaultTimeSlotsByTurno, durationMinutes, formatDuration,
} from '../lib/defaultSchoolHours';
import { calcGridDemand, calcPeakSimultaneity, WEEKDAYS, Weekday } from '../lib/calcGridDemand';
import { SchoolHoursEditor } from '../components/portal/SchoolHoursEditor';
import { ClassWeeklyGridEditor, ScheduleSlot } from '../components/portal/ClassWeeklyGridEditor';
import { PortalHero } from '../components/portal/PortalHero';
import { PortalFooterNav } from '../components/portal/PortalFooterNav';
import { Phase4Stepper, type Phase4Step } from '../components/portal/Phase4Stepper';
import { ScheduleConflictModal } from '../components/conflicts/ScheduleConflictModal';
import {
  ConflictItem,
  ConflictAction,
  WeekdayCode,
  TurnoCode,
  maskPhone,
} from '../lib/conflictTypes';


// =====================================================================
// Tipagem
// =====================================================================

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface ClassDraft {
  id: string;
  nome: string;
  turno: Turno;
}

interface TeacherSlotDraft {
  scheduleSlotId: string;
  nome: string;
  telefone: string;
  formacao: string;
  email: string;
  /** Diretor marcou "não tenho indicação" para este slot. */
  sem_indicacao?: boolean;
}

interface SchoolHoursConfig {
  is_integral: boolean;
  time_slots: Record<Turno, TimeSlot[]>;
  /** Sábado por TURMA (chave = classId). Default false. */
  include_saturday: Record<string, boolean>;
}

interface CourseDraft {
  course_id: string;
  classes: ClassDraft[];
  hours: SchoolHoursConfig;
  /** Override por disciplina (subject_id → aulas/sem) declarado pelo diretor na Fase 4 / Etapa 2.
   *  Quando ausente, usa-se `carga_horaria_semanal` do cadastro. */
  subject_weekly_load: Record<string, number>;
  schedule: ScheduleSlot[];
  teachers: TeacherSlotDraft[];
  status: 'pending' | 'in_progress' | 'submitted';
}

interface PortalDraft {
  current_course_id: string | null;
  current_step: Step;
  diretor_nome: string;
  courses: Record<string, CourseDraft>;
}

const TURNOS: { value: Turno; label: string; icon: typeof Sun }[] = [
  { value: 'manha', label: 'Matutino', icon: Sun },
  { value: 'tarde', label: 'Vespertino', icon: Sunset },
  { value: 'noite', label: 'Noturno', icon: Moon },
];
const WEEKDAY_LABEL: Record<Weekday, string> =
  Object.fromEntries(WEEKDAYS.map((w) => [w.key, w.label])) as Record<Weekday, string>;

function uuid() { return crypto.randomUUID(); }

function emptyCourse(courseId: string): CourseDraft {
  return {
    course_id: courseId,
    classes: [],
    hours: {
      is_integral: false,
      time_slots: defaultTimeSlotsByTurno(),
      include_saturday: {},
    },
    subject_weekly_load: {},
    schedule: [],
    teachers: [],
    status: 'pending',
  };
}

/** Normaliza nome para comparação tolerante a acentos/caixa/espaços extras.
 *  Espelha o `public.normalize_pt_name` usado no servidor. */
function normalizeName(s: string): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/** Garante que cada slot da grade tenha 1 TeacherSlotDraft (preserva o que foi digitado). */
function buildTeachersForSchedule(schedule: ScheduleSlot[], existing: TeacherSlotDraft[]): TeacherSlotDraft[] {
  return schedule.map((s) =>
    existing.find((t) => t.scheduleSlotId === s.id)
    ?? { scheduleSlotId: s.id, nome: '', telefone: '', formacao: '', email: '', sem_indicacao: false },
  );
}

/** Migração leve: rascunhos antigos podem não ter `hours`/`schedule`. */
function ensureCourseShape(c: any, courseId: string): CourseDraft {
  const base = emptyCourse(courseId);
  // include_saturday antigo era por turno ('manha'|'tarde'|'noite'); agora é por classId.
  // Se vier no formato antigo, descartamos (vira objeto vazio = nenhuma turma com sábado).
  const rawSat = c?.hours?.include_saturday;
  const isLegacySat =
    rawSat && typeof rawSat === 'object'
    && Object.keys(rawSat).every((k) => k === 'manha' || k === 'tarde' || k === 'noite');
  const include_saturday = isLegacySat ? {} : (rawSat ?? {});
  return {
    ...base,
    ...c,
    course_id: courseId,
    classes: c?.classes ?? [],
    hours: c?.hours
      ? { ...base.hours, ...c.hours, include_saturday }
      : base.hours,
    subject_weekly_load:
      c?.subject_weekly_load && typeof c.subject_weekly_load === 'object'
        ? c.subject_weekly_load
        : {},
    schedule: c?.schedule ?? [],
    teachers: c?.teachers?.filter((t: any) => t?.scheduleSlotId) ?? [],
    status: c?.status ?? 'pending',
  };
}

// =====================================================================
// Component
// =====================================================================

export default function ExternalSchoolIndicationPage() {
  const { token } = useParams<{ token: string }>();
  const [keyword, setKeyword] = useState('');
  const [info, setInfo] = useState<LinkInfoPayload | null>(null);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [submittingCourse, setSubmittingCourse] = useState(false);
  const [helpOpen, setHelpOpen] = useState(true);
  const draftLoadedRef = useRef(false);

  const [draft, setDraft] = useState<PortalDraft>({
    current_course_id: null,
    current_step: 1,
    diretor_nome: '',
    courses: {},
  });

  // Sub-etapa interna da Fase 4 (1=Horários, 2=Carga horária, 3=Grade por turma)
  const [phase4Step, setPhase4Step] = useState<Phase4Step>(1);
  const [phase4Reached, setPhase4Reached] = useState<Phase4Step>(1);
  const [validationIssue, setValidationIssue] = useState<{
    kind: 'partial' | 'empty' | 'conflict' | 'generic';
    title: string;
    summary: string;
    explanation: string;
    suggestion: string[];
    items: string[];
  } | null>(null);
  function goPhase4(step: Phase4Step) {
    setPhase4Step(step);
    setPhase4Reached((r) => (step > r ? step : r));
  }
  // Sempre que (re)entra na Fase 4, abre na Etapa 1.
  useEffect(() => {
    if (draft.current_step === 4) {
      setPhase4Step(1);
      setPhase4Reached(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.current_step, draft.current_course_id]);
  const currentCourse: LinkInfoCourse | undefined = useMemo(
    () => info?.courses.find((c) => c.id === draft.current_course_id),
    [info, draft.current_course_id],
  );
  const currentDraft = draft.current_course_id ? draft.courses[draft.current_course_id] : undefined;
  const tetoCH = info?.teto_ch_professor ?? 24;

  // Professores já vinculados à escola do link atual (lista de seleção rápida)
  const schoolTeachersQuery = useQuery({
    queryKey: ['portal-school-teachers', token, keyword.trim(), info?.school.id, draft.current_course_id],
    enabled: !!info && !!token && !!keyword && !!draft.current_course_id,
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: () => indicationLinksApi.listSchoolTeachers(token!, keyword.trim(), draft.current_course_id!),
  });
  const schoolTeachers = schoolTeachersQuery.data ?? [];

  // Auto-save
  const autoSave = useDraftAutoSave({
    token, keyword,
    enabled: !!info && draft.current_step >= 2,
    payload: draft,
    diretorNome: draft.diretor_nome,
  });

  // ---------- Acesso ----------
  async function handleAccess() {
    if (!token || !keyword.trim()) { toast.error('Informe a palavra-chave'); return; }
    if (!draft.diretor_nome.trim()) { toast.error('Informe seu nome (diretor responsável)'); return; }
    setLoadingAccess(true);
    try {
      const data = await indicationLinksApi.getLinkInfo(token, keyword.trim());
      if (!data.courses?.length) { toast.error('Esta escola ainda não possui cursos vinculados.'); return; }
      setInfo(data);
      try {
        const ld = await indicationLinksApi.loadDraft(token, keyword.trim());
        if ((ld as any)?.found) {
          const payload = (ld as any).payload as PortalDraft;
          if (payload && payload.courses) {
            const fixed: Record<string, CourseDraft> = {};
            data.courses.forEach((c) => { fixed[c.id] = ensureCourseShape((payload.courses as any)[c.id], c.id); });
            // Sempre cair na Fase 2 (lista de cursos) ao acessar o portal.
            // Isso garante que escolas reabertas mostrem os cursos com botão "Reabrir"
            // e o diretor escolha explicitamente qual curso editar/continuar.
            setDraft({
              ...payload,
              courses: fixed,
              diretor_nome: payload.diretor_nome || draft.diretor_nome,
              current_step: 2,
              current_course_id: null,
            });
            draftLoadedRef.current = true;
            const hasSubmitted = Object.values(fixed).some((c) => c?.status === 'submitted');
            toast.success(
              hasSubmitted
                ? 'Bem-vindo de volta! Selecione um curso concluído para reabrir e editar, ou continue os pendentes.'
                : 'Rascunho recuperado — escolha o curso que deseja continuar.'
            );
            return;
          }
        }
      } catch { /* ignore */ }

      const courses: Record<string, CourseDraft> = {};
      data.courses.forEach((c) => { courses[c.id] = emptyCourse(c.id); });
      setDraft((d) => ({ ...d, courses, current_step: 2 }));
    } catch (e: any) {
      toast.error(e.message || 'Não foi possível validar o link');
    } finally { setLoadingAccess(false); }
  }

  // ---------- Mutações ----------
  function patchCourse(courseId: string, patch: Partial<CourseDraft>) {
    setDraft((d) => ({
      ...d,
      courses: { ...d.courses, [courseId]: { ...d.courses[courseId], ...patch } },
    }));
  }

  function startCourse(courseId: string) {
    setDraft((d) => {
      const cur = d.courses[courseId] ?? emptyCourse(courseId);
      return {
        ...d,
        current_course_id: courseId,
        current_step: 3,
        courses: { ...d.courses, [courseId]: { ...cur, status: cur.status === 'submitted' ? 'submitted' : 'in_progress' } },
      };
    });
  }

  function addClass(turno: Turno) {
    if (!currentDraft) return;
    const nova: ClassDraft = { id: uuid(), nome: '', turno };
    patchCourse(currentDraft.course_id, { classes: [...currentDraft.classes, nova] });
  }

  function removeClass(classId: string) {
    if (!currentDraft) return;
    const classes = currentDraft.classes.filter((c) => c.id !== classId);
    const schedule = currentDraft.schedule.filter((s) => s.classId !== classId);
    const teachers = buildTeachersForSchedule(schedule, currentDraft.teachers);
    const include_saturday = { ...currentDraft.hours.include_saturday };
    delete include_saturday[classId];
    const hours = { ...currentDraft.hours, include_saturday };
    patchCourse(currentDraft.course_id, { classes, schedule, teachers, hours });
  }

  function updateClass(classId: string, patch: Partial<ClassDraft>) {
    if (!currentDraft) return;
    const classes = currentDraft.classes.map((c) => c.id === classId ? { ...c, ...patch } : c);
    patchCourse(currentDraft.course_id, { classes });
  }

  // ---------- Mutações da grade (Fase 4) ----------
  function setHoursPatch(patch: Partial<SchoolHoursConfig>) {
    if (!currentDraft) return;
    patchCourse(currentDraft.course_id, { hours: { ...currentDraft.hours, ...patch } });
  }
  function setTimeSlots(turno: Turno, slots: TimeSlot[]) {
    if (!currentDraft) return;
    const hours = { ...currentDraft.hours, time_slots: { ...currentDraft.hours.time_slots, [turno]: slots } };
    // Remove slots da grade que apontam para tempos deletados
    const validIds = new Set(slots.map((s) => s.id));
    const schedule = currentDraft.schedule.filter((s) => s.turno !== turno || validIds.has(s.time_slot_id));
    const teachers = buildTeachersForSchedule(schedule, currentDraft.teachers);
    patchCourse(currentDraft.course_id, { hours, schedule, teachers });
  }
  function setSubjectWeeklyLoad(subjectId: string, value: number) {
    if (!currentDraft) return;
    const next = { ...(currentDraft.subject_weekly_load ?? {}), [subjectId]: Math.max(0, Math.floor(value)) };
    patchCourse(currentDraft.course_id, { subject_weekly_load: next });
  }
  function setCellSubject(classId: string, turno: Turno, weekday: Weekday, time_slot_id: string, subject_id: string | null) {
    if (!currentDraft) return;
    const others = currentDraft.schedule.filter(
      (s) => !(s.classId === classId && s.turno === turno && s.weekday === weekday && s.time_slot_id === time_slot_id),
    );
    let schedule = others;
    let newSlotId: string | null = null;
    if (subject_id) {
      newSlotId = uuid();
      schedule = [...others, { id: newSlotId, classId, turno, weekday, time_slot_id, subject_id }];
    }
    let teachers = buildTeachersForSchedule(schedule, currentDraft.teachers);

    // Normalização Turma × Disciplina: se já existe um "irmão" indicado nessa
    // (turma × disciplina), copia o professor para o slot recém-criado para
    // evitar o status "Sem professor indicado" em slots órfãos do mesmo grupo.
    if (newSlotId && subject_id) {
      const siblingSlotIds = schedule
        .filter((s) => s.classId === classId && s.subject_id === subject_id && s.id !== newSlotId)
        .map((s) => s.id);
      const reference = currentDraft.teachers.find((t) =>
        siblingSlotIds.includes(t.scheduleSlotId) &&
        (t.sem_indicacao || (t.nome.trim() && t.telefone.trim())),
      );
      if (reference) {
        teachers = teachers.map((t) =>
          t.scheduleSlotId === newSlotId
            ? {
                ...t,
                nome: reference.nome,
                telefone: reference.telefone,
                formacao: reference.formacao,
                email: reference.email,
                sem_indicacao: !!reference.sem_indicacao,
              }
            : t,
        );
      }
    }

    patchCourse(currentDraft.course_id, { schedule, teachers });
  }
  function setCellAnp(classId: string, turno: Turno, weekday: Weekday, time_slot_id: string, isAnp: boolean) {
    if (!currentDraft) return;
    const schedule = currentDraft.schedule.map((s) =>
      s.classId === classId && s.turno === turno && s.weekday === weekday && s.time_slot_id === time_slot_id
        ? { ...s, is_anp: isAnp }
        : s,
    );
    patchCourse(currentDraft.course_id, { schedule });
  }
  function clearClassSchedule(classId: string) {
    if (!currentDraft) return;
    const schedule = currentDraft.schedule.filter((s) => s.classId !== classId);
    const teachers = buildTeachersForSchedule(schedule, currentDraft.teachers);
    patchCourse(currentDraft.course_id, { schedule, teachers });
  }
  function setIntegral(v: boolean) {
    setHoursPatch({ is_integral: v });
  }
  function setIncludeSaturdayForClass(classId: string, v: boolean) {
    if (!currentDraft) return;
    const include_saturday = { ...currentDraft.hours.include_saturday, [classId]: v };
    const hours = { ...currentDraft.hours, include_saturday };
    // Se desligar sábado, remove os slots de sábado dessa turma
    let schedule = currentDraft.schedule;
    let teachers = currentDraft.teachers;
    if (!v) {
      schedule = currentDraft.schedule.filter((s) => !(s.classId === classId && s.weekday === 'SAT'));
      teachers = buildTeachersForSchedule(schedule, currentDraft.teachers);
    }
    patchCourse(currentDraft.course_id, { hours, schedule, teachers });
  }

  // ---------- Mutações dos professores (Fase 5) ----------
  function updateTeacher(scheduleSlotId: string, patch: Partial<TeacherSlotDraft>) {
    if (!currentDraft) return;
    const teachers = currentDraft.teachers.map((t) =>
      t.scheduleSlotId === scheduleSlotId ? { ...t, ...patch } : t,
    );
    patchCourse(currentDraft.course_id, { teachers });
  }
  function applyTeacherToSlot(scheduleSlotId: string, src: TeacherSlotDraft) {
    updateTeacher(scheduleSlotId, {
      nome: src.nome, telefone: src.telefone, formacao: src.formacao, email: src.email,
    });
  }

  /** Atualiza TODOS os slots da mesma (turma × disciplina) com o mesmo professor.
   *  Garante que mesmo slots ainda não materializados em `teachers` recebam o patch
   *  (essencial para que `sem_indicacao` cubra o grupo inteiro). */
  function updateTeacherForGroup(classId: string, subject_id: string, patch: Partial<TeacherSlotDraft>) {
    if (!currentDraft) return;
    const slotIds = currentDraft.schedule
      .filter((s) => s.classId === classId && s.subject_id === subject_id)
      .map((s) => s.id);
    const slotIdSet = new Set(slotIds);
    const existingIds = new Set(currentDraft.teachers.map((t) => t.scheduleSlotId));
    const updated = currentDraft.teachers.map((t) =>
      slotIdSet.has(t.scheduleSlotId) ? { ...t, ...patch } : t,
    );
    // Cria entradas para slots ainda não presentes
    const missing = slotIds
      .filter((id) => !existingIds.has(id))
      .map((id) => ({
        scheduleSlotId: id,
        nome: '', telefone: '', formacao: '', email: '',
        sem_indicacao: false,
        ...patch,
      } as TeacherSlotDraft));
    patchCourse(currentDraft.course_id, { teachers: [...updated, ...missing] });
  }
  function applyTeacherToGroup(classId: string, subject_id: string, src: TeacherSlotDraft) {
    // Ao reutilizar um professor existente, sempre desmarcamos "sem indicação".
    updateTeacherForGroup(classId, subject_id, {
      nome: src.nome, telefone: src.telefone, formacao: src.formacao, email: src.email,
      sem_indicacao: false,
    });
  }

  /**
   * Resolve cada slot da grade para um intervalo real {weekday, start, end} em minutos.
   * Isso permite detectar sobreposição CROSS-TURNO (ex.: TARDE acabando 18:30 e
   * NOITE começando 18:20 no mesmo dia), o que comparar `time_slot_id` literal não pegava.
   */
  const resolvedSchedule = useMemo(() => {
    if (!currentDraft) return [] as Array<{
      slotId: string; classId: string; subjectId: string; turno: Turno;
      weekday: string; start: number; end: number; label: string; isAnp: boolean;
    }>;
    const toMin = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number);
      return (Number.isNaN(h) ? 0 : h) * 60 + (Number.isNaN(m) ? 0 : m);
    };
    const out: Array<{
      slotId: string; classId: string; subjectId: string; turno: Turno;
      weekday: string; start: number; end: number; label: string; isAnp: boolean;
    }> = [];
    currentDraft.schedule.forEach((s) => {
      const ts = currentDraft.hours.time_slots[s.turno]?.find((x) => x.id === s.time_slot_id);
      if (!ts) return;
      out.push({
        slotId: s.id,
        classId: s.classId,
        subjectId: s.subject_id,
        turno: s.turno,
        weekday: s.weekday,
        start: toMin(ts.inicio),
        end: toMin(ts.fim),
        label: `${WEEKDAY_LABEL[s.weekday]} ${ts.inicio}–${ts.fim}`,
        isAnp: (s as any).is_anp === true,
      });
    });
    return out;
  }, [currentDraft]);

  /**
   * Detecta conflitos por SOBREPOSIÇÃO REAL de tempo:
   * mesmo professor (nome+telefone) com 2 slots em turmas distintas cujos
   * intervalos [start, end) se sobrepõem no mesmo dia da semana.
   * Funciona inclusive entre turnos diferentes (cross-turno).
   */
  const teacherConflicts = useMemo(() => {
    if (!currentDraft) return [] as { key: string; label: string; turnos: Turno[]; sameTurno: boolean }[];
    const items = resolvedSchedule
      .map((r) => {
        const t = currentDraft.teachers.find((x) => x.scheduleSlotId === r.slotId);
        const name = t?.nome.trim() ?? '';
        const phone = t?.telefone.trim() ?? '';
        if (!name || !phone) return null;
        return { ...r, teacherKey: `${name.toLowerCase()}|${phone}`, teacherName: name };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const byProfDay = new Map<string, typeof items>();
    items.forEach((it) => {
      const k = `${it.teacherKey}|${it.weekday}`;
      if (!byProfDay.has(k)) byProfDay.set(k, [] as typeof items);
      byProfDay.get(k)!.push(it);
    });

    const seen = new Set<string>();
    const out: { key: string; label: string; turnos: Turno[]; sameTurno: boolean }[] = [];
    byProfDay.forEach((list) => {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i], b = list[j];
          if (a.classId === b.classId) continue;
          // ANP (Aula Não Presencial) NUNCA conflita com nada.
          if (a.isAnp || b.isAnp) continue;
          const overlap = a.start < b.end && b.start < a.end;
          if (!overlap) continue;
          const classA = currentDraft.classes.find((c) => c.id === a.classId)?.nome || '(turma)';
          const classB = currentDraft.classes.find((c) => c.id === b.classId)?.nome || '(turma)';
          const ovStart = Math.max(a.start, b.start);
          const ovEnd = Math.min(a.end, b.end);
          const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
          const key = `${a.teacherKey}|${a.weekday}|${ovStart}|${ovEnd}|${[a.classId, b.classId].sort().join('+')}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const turnos = Array.from(new Set([a.turno, b.turno])) as Turno[];
          out.push({
            key,
            turnos,
            sameTurno: a.turno === b.turno,
            label: `${a.teacherName} — ${WEEKDAY_LABEL[a.weekday]} ${fmt(ovStart)}–${fmt(ovEnd)} em ${classA} e ${classB}`,
          });
        }
      }
    });
    return out;
  }, [currentDraft, resolvedSchedule]);

  type BlockedInfo = {
    weekday: WeekdayCode;
    overlapStart: string;
    overlapEnd: string;
    otherClassId: string;
    otherClassName: string;
    otherSubjectId?: string;
    otherSubjectName?: string;
    otherTurno: TurnoCode;
    sameTurno: boolean;
    groupSideClassId: string;
    groupSideClassName: string;
    groupSideSubjectId: string;
    groupSideSubjectName?: string;
    groupSideTurno: TurnoCode;
  };

  /**
   * Para um par (classId, subject_id) atual, retorna um Map<chave, BlockedInfo[]>
   * com TODOS os conflitos por professor (nome|telefone, lowercase) — SOBREPOSIÇÃO REAL
   * de horário com slots de OUTRAS turmas do MESMO link. Cobre cross-turno.
   */
  function getBlockedTeacherInfoForGroup(
    classId: string,
    subject_id: string,
  ): Map<string, BlockedInfo[]> {
    const out = new Map<string, BlockedInfo[]>();
    if (!currentDraft) return out;
    const groupIntervals = resolvedSchedule.filter(
      (r) => r.classId === classId && r.subjectId === subject_id && !r.isAnp,
    );
    if (groupIntervals.length === 0) return out;
    const fmt = (m: number) =>
      `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const groupCls = currentDraft.classes.find((c) => c.id === classId);
    const groupSubj = currentCourse?.subjects.find((s) => s.id === subject_id);

    resolvedSchedule.forEach((r) => {
      if (r.classId === classId) return;
      // Slot ANP do outro lado também não bloqueia.
      if (r.isAnp) return;
      const g = groupIntervals.find(
        (gi) => gi.weekday === r.weekday && gi.start < r.end && r.start < gi.end,
      );
      if (!g) return;
      const t = currentDraft.teachers.find((x) => x.scheduleSlotId === r.slotId);
      const name = t?.nome.trim() ?? '';
      const phone = t?.telefone.trim() ?? '';
      if (!name || !phone) return;
      const key = `${name.toLowerCase()}|${phone}`;
      const otherCls = currentDraft.classes.find((c) => c.id === r.classId);
      const otherSubj = currentCourse?.subjects.find((s) => s.id === r.subjectId);
      const ovStart = fmt(Math.max(g.start, r.start));
      const ovEnd = fmt(Math.min(g.end, r.end));
      const info: BlockedInfo = {
        weekday: r.weekday as WeekdayCode,
        overlapStart: ovStart,
        overlapEnd: ovEnd,
        otherClassId: r.classId,
        otherClassName: otherCls?.nome ?? '(turma)',
        otherSubjectId: r.subjectId,
        otherSubjectName: otherSubj?.nome,
        otherTurno: r.turno as TurnoCode,
        sameTurno: r.turno === g.turno,
        groupSideClassId: classId,
        groupSideClassName: groupCls?.nome ?? '(turma)',
        groupSideSubjectId: subject_id,
        groupSideSubjectName: groupSubj?.nome,
        groupSideTurno: g.turno as TurnoCode,
      };
      const arr = out.get(key) ?? [];
      arr.push(info);
      out.set(key, arr);
    });
    return out;
  }

  /** Compat: somente as chaves bloqueadas (mantido para uso pré-existente). */
  function getBlockedTeacherKeysForGroup(classId: string, subject_id: string): Set<string> {
    return new Set(getBlockedTeacherInfoForGroup(classId, subject_id).keys());
  }

  /** Constrói um ConflictItem para preview a partir de um professor bloqueado. */
  function buildPreviewConflict(
    teacherName: string,
    teacherPhone: string,
    info: BlockedInfo,
  ): ConflictItem {
    return {
      key: `preview|${classOrEmpty(info.groupSideClassId)}|${info.groupSideSubjectId}|${teacherName.toLowerCase()}|${teacherPhone}|${info.weekday}|${info.overlapStart}|${info.overlapEnd}|${info.otherClassId}`,
      kind: 'intra-link',
      teacherName,
      teacherPhoneMasked: maskPhone(teacherPhone),
      weekday: info.weekday,
      overlapStart: info.overlapStart,
      overlapEnd: info.overlapEnd,
      sameTurno: info.sameTurno,
      sides: [
        {
          classId: info.groupSideClassId,
          className: info.groupSideClassName,
          turno: info.groupSideTurno,
          subjectName: info.groupSideSubjectName,
          subjectId: info.groupSideSubjectId,
          schoolName: info?.otherClassId ? undefined : undefined,
        },
        {
          classId: info.otherClassId,
          className: info.otherClassName,
          turno: info.otherTurno,
          subjectName: info.otherSubjectName,
          subjectId: info.otherSubjectId,
        },
      ],
      suggestions: [
        {
          label: `Marcar "Sem indicação" em ${info.groupSideClassName}`,
          variant: 'primary',
          action: {
            type: 'set-no-indication',
            classId: info.groupSideClassId,
            subjectId: info.groupSideSubjectId,
          },
        },
        {
          label: `Trocar professor em ${info.otherClassName}`,
          action: {
            type: 'change-teacher',
            classId: info.otherClassId,
            subjectId: info.otherSubjectId,
          },
        },
      ],
    };
  }
  function classOrEmpty(id?: string) { return id ?? ''; }

  // Lista de professores únicos já preenchidos (por nome+telefone)
  const uniqueTeachers = useMemo(() => {
    if (!currentDraft) return [] as TeacherSlotDraft[];
    const seen = new Map<string, TeacherSlotDraft>();
    currentDraft.teachers.forEach((t) => {
      const key = `${t.nome.trim().toLowerCase()}|${t.telefone.trim()}`;
      if (key === '|' || !t.nome.trim() || !t.telefone.trim()) return;
      if (!seen.has(key)) seen.set(key, t);
    });
    return Array.from(seen.values());
  }, [currentDraft]);

  // =====================================================================
  // CROSS-ESCOLA: candidatos para verificar contra weekly_teaching_models
  // =====================================================================
  const crossSchoolCandidates = useMemo(() => {
    if (!currentDraft || draft.current_step !== 5) return [] as Array<{
      slot_id: string; teacher_name: string; teacher_phone: string;
      weekday: WeekdayCode; start_time: string; end_time: string;
    }>;
    const out: Array<{
      slot_id: string; teacher_name: string; teacher_phone: string;
      weekday: WeekdayCode; start_time: string; end_time: string;
    }> = [];
    resolvedSchedule.forEach((r) => {
      if (r.weekday === 'SAT') return; // weekday enum no DB não cobre sábado
      // ANP nunca conflita — não envia ao servidor.
      if (r.isAnp) return;
      const t = currentDraft.teachers.find((x) => x.scheduleSlotId === r.slotId);
      const nome = t?.nome.trim() ?? '';
      if (!nome || t?.sem_indicacao) return;
      const ts = currentDraft.hours.time_slots[r.turno]?.find((x) => x.id === currentDraft.schedule.find((s) => s.id === r.slotId)?.time_slot_id);
      if (!ts) return;
      out.push({
        slot_id: r.slotId,
        teacher_name: nome,
        teacher_phone: t?.telefone?.trim() ?? '',
        weekday: r.weekday as WeekdayCode,
        start_time: ts.inicio,
        end_time: ts.fim,
      });
    });
    return out;
  }, [currentDraft, draft.current_step, resolvedSchedule]);

  // Debounce (chave estável) para evitar flood de requisições durante digitação
  const candidatesKey = useMemo(
    () => crossSchoolCandidates.map((c) =>
      `${c.slot_id}|${c.teacher_name}|${c.teacher_phone}|${c.weekday}|${c.start_time}|${c.end_time}`,
    ).join('~'),
    [crossSchoolCandidates],
  );

  const crossConflictsQuery = useQuery({
    queryKey: ['portal-cross-conflicts', token, keyword.trim(), candidatesKey],
    enabled: !!token && !!keyword && draft.current_step === 5 && crossSchoolCandidates.length > 0,
    staleTime: 30_000,
    queryFn: () => indicationLinksApi.checkExternalConflicts(token!, keyword.trim(), crossSchoolCandidates),
  });

  // =====================================================================
  // Lista UNIFICADA de conflitos (intra + cross)
  // =====================================================================
  const conflictItems = useMemo<ConflictItem[]>(() => {
    if (!currentDraft) return [];
    const items: ConflictItem[] = [];

    // Intra-link (mesmo professor em 2 turmas do MESMO link)
    teacherConflicts.forEach((c) => {
      // Re-extrai os 2 lados a partir de resolvedSchedule + teachers
      const parts = c.label.split(' — ')[1] ?? '';
      const [, classesPart] = parts.split(' em ').length === 2
        ? ['', parts.split(' em ')[1]]
        : ['', ''];
      const [classA, classB] = (classesPart || '').split(' e ');

      const overlapMatch = c.label.match(/(\d{2}:\d{2})–(\d{2}:\d{2})/);
      const teacherName = c.label.split(' — ')[0] ?? '';

      // Achar slots/disciplinas dos 2 lados
      const dayMatch = c.label.match(/(Segunda|Terça|Quarta|Quinta|Sexta|Sábado)/i)?.[1] ?? '';
      const weekdayCode: WeekdayCode = ((): WeekdayCode => {
        const m: Record<string, WeekdayCode> = {
          'Segunda': 'MON', 'Terça': 'TUE', 'Quarta': 'WED',
          'Quinta': 'THU', 'Sexta': 'FRI', 'Sábado': 'SAT',
        };
        return m[dayMatch] ?? 'MON';
      })();

      const involved = resolvedSchedule.filter((r) => {
        const className = currentDraft.classes.find((cl) => cl.id === r.classId)?.nome;
        return r.weekday === c.label.match(/MON|TUE|WED|THU|FRI|SAT/)?.[0]
          || className === classA || className === classB;
      });

      const sideFor = (className: string) => {
        const cls = currentDraft.classes.find((cl) => cl.nome === className);
        if (!cls) return undefined;
        const slot = involved.find((r) => r.classId === cls.id);
        const subj = slot ? currentCourse?.subjects.find((s) => s.id === slot.subjectId) : undefined;
        return {
          slotId: slot?.slotId,
          classId: cls.id,
          className: cls.nome,
          turno: (slot?.turno ?? cls.turno) as TurnoCode,
          subjectName: subj?.nome,
          subjectId: slot?.subjectId,
        };
      };
      const sideA = sideFor(classA);
      const sideB = sideFor(classB);
      const phoneRaw = currentDraft.teachers.find(
        (t) => t.nome.trim().toLowerCase() === teacherName.toLowerCase(),
      )?.telefone;

      const overlapStart = overlapMatch?.[1] ?? '00:00';
      const overlapEnd   = overlapMatch?.[2] ?? '00:00';

      const suggestions: ConflictItem['suggestions'] = [];
      if (sideA?.slotId && sideA.classId) {
        suggestions.push({
          label: `Marcar "Sem indicação" em ${sideA.className}`,
          variant: 'primary',
          action: { type: 'set-no-indication', slotId: sideA.slotId, classId: sideA.classId, subjectId: sideA.subjectId },
        });
        suggestions.push({
          label: `Trocar professor em ${sideA.className}`,
          action: { type: 'change-teacher', slotId: sideA.slotId, classId: sideA.classId, subjectId: sideA.subjectId },
        });
      }
      if (sideB?.slotId && sideB.classId) {
        suggestions.push({
          label: `Marcar "Sem indicação" em ${sideB.className}`,
          action: { type: 'set-no-indication', slotId: sideB.slotId, classId: sideB.classId, subjectId: sideB.subjectId },
        });
        suggestions.push({
          label: `Trocar professor em ${sideB.className}`,
          action: { type: 'change-teacher', slotId: sideB.slotId, classId: sideB.classId, subjectId: sideB.subjectId },
        });
      }

      items.push({
        key: c.key,
        kind: 'intra-link',
        teacherName,
        teacherPhoneMasked: maskPhone(phoneRaw),
        weekday: weekdayCode,
        overlapStart,
        overlapEnd,
        sameTurno: c.sameTurno,
        sides: [sideA, sideB].filter(Boolean) as any,
        suggestions,
      });
    });

    // Cross-school (RPC)
    const crossPayload = crossConflictsQuery.data ?? [];
    crossPayload.forEach((row) => {
      const slot = resolvedSchedule.find((r) => r.slotId === row.slot_id);
      if (!slot) return;
      const cls = currentDraft.classes.find((c) => c.id === slot.classId);
      const subj = currentCourse?.subjects.find((s) => s.id === slot.subjectId);
      const teacherDraft = currentDraft.teachers.find((t) => t.scheduleSlotId === row.slot_id);

      row.conflicts.forEach((cf, i) => {
        const overlapStart = (cf.overlap_start || '').slice(0, 5);
        const overlapEnd   = (cf.overlap_end   || '').slice(0, 5);
        const key = `cross|${row.slot_id}|${cf.school_id}|${cf.class_group_id ?? i}|${overlapStart}|${overlapEnd}`;
        const suggestions: ConflictItem['suggestions'] = [];
        if (cls) {
          suggestions.push({
            label: `Marcar "Sem indicação" em ${cls.nome}`,
            variant: 'primary',
            action: { type: 'set-no-indication', slotId: row.slot_id, classId: cls.id, subjectId: slot.subjectId },
          });
          suggestions.push({
            label: `Trocar professor em ${cls.nome}`,
            action: { type: 'change-teacher', slotId: row.slot_id, classId: cls.id, subjectId: slot.subjectId },
          });
        }
        items.push({
          key,
          kind: 'cross-school',
          teacherName: row.teacher_name,
          teacherPhoneMasked: maskPhone(teacherDraft?.telefone),
          weekday: (row.weekday as any) === 'SEGUNDA' ? 'MON'
                  : (row.weekday as any) === 'TERCA' ? 'TUE'
                  : (row.weekday as any) === 'QUARTA' ? 'WED'
                  : (row.weekday as any) === 'QUINTA' ? 'THU'
                  : (row.weekday as any) === 'SEXTA' ? 'FRI'
                  : (row.weekday as WeekdayCode),
          overlapStart,
          overlapEnd,
          sides: [
            {
              classId: cls?.id, className: cls?.nome ?? '(turma)',
              turno: slot.turno as TurnoCode,
              subjectName: subj?.nome,
              schoolName: info?.school.nome,
            },
            {
              className: cf.class_name ?? '(turma)',
              schoolId: cf.school_id, schoolName: cf.school_name,
              subjectName: cf.subject_name ?? undefined,
              isExternalSchool: true,
            },
          ],
          suggestions,
        });
      });
    });

    return items;
  }, [currentDraft, teacherConflicts, crossConflictsQuery.data, resolvedSchedule, currentCourse, info]);

  // =====================================================================
  // Modal de Conflito — abre automaticamente quando surge um novo conflito
  // =====================================================================
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictDismissedKey, setConflictDismissedKey] = useState<string>('');
  // Preview de conflito disparado ao clicar em professor bloqueado no SearchableSelect
  const [previewConflicts, setPreviewConflicts] = useState<ConflictItem[] | null>(null);
  const conflictKeysSig = useMemo(
    () => conflictItems.map((c) => c.key).sort().join('|'),
    [conflictItems],
  );

  useEffect(() => {
    if (draft.current_step !== 5) return;
    if (conflictItems.length === 0) {
      setConflictModalOpen(false);
      setConflictDismissedKey('');
      return;
    }
    // Reabre automaticamente quando o conjunto muda (e ainda não foi dismissed para esta assinatura)
    if (conflictKeysSig !== conflictDismissedKey) {
      const t = setTimeout(() => setConflictModalOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [conflictKeysSig, conflictItems.length, draft.current_step, conflictDismissedKey]);

  function handleConflictAction(action: ConflictAction) {
    if (!currentDraft) return;
    if (action.type === 'set-no-indication' && action.classId && action.subjectId) {
      updateTeacherForGroup(action.classId, action.subjectId, {
        sem_indicacao: true, nome: '', telefone: '', formacao: '', email: '',
      });
      toast.success('Marcado como "Sem indicação".');
      return;
    }
    if (action.type === 'change-teacher' && action.classId && action.subjectId) {
      updateTeacherForGroup(action.classId, action.subjectId, {
        sem_indicacao: false, nome: '', telefone: '', formacao: '', email: '',
      });
      toast.message('Selecione outro professor para essa disciplina.', {
        description: 'Os campos foram limpos. Role até a turma para escolher um novo professor.',
      });
      setConflictModalOpen(false);
      return;
    }
    toast.error('Ação não disponível neste contexto.');
  }

  // ---------- Validações ----------
  function validateStep3(): string | null {
    if (!currentDraft) return 'Curso não selecionado';
    if (currentDraft.classes.length === 0) return 'Adicione pelo menos uma turma.';
    if (currentDraft.classes.find((c) => !c.nome.trim())) return 'Preencha o nome de todas as turmas.';
    return null;
  }
  function validateStep4(): string | null {
    if (!currentDraft) return 'Curso não selecionado';
    if (currentDraft.schedule.length === 0) return 'Selecione pelo menos uma disciplina na grade.';
    // turmas sem nenhum slot
    const empty = currentDraft.classes.find((c) => !currentDraft.schedule.some((s) => s.classId === c.id));
    if (empty) return `A turma "${empty.nome || '(sem nome)'}" não tem nenhuma aula na grade.`;
    return null;
  }
  /** Alerta (não bloqueia) quando disciplinas estão abaixo da CH semanal por turma. */
  function warnStep4Underload(): void {
    if (!currentDraft || !currentCourse) return;
    const lows: string[] = [];
    currentDraft.classes.forEach((cls) => {
      currentCourse.subjects.forEach((subj) => {
        const overrideH = currentDraft.subject_weekly_load?.[subj.id];
        const targetH = typeof overrideH === 'number' && !Number.isNaN(overrideH)
          ? Math.max(0, Math.floor(overrideH))
          : (subj.carga_horaria_semanal ?? 0);
        if (targetH <= 0) return;
        const allocMin = currentDraft.schedule
          .filter((s) => s.classId === cls.id && s.subject_id === subj.id)
          .reduce((sum, s) => {
            const t = currentDraft.hours.time_slots[s.turno].find((x) => x.id === s.time_slot_id);
            return sum + (t ? durationMinutes(t.inicio, t.fim) : 0);
          }, 0);
        const allocH = allocMin / 60;
        if (allocH < targetH) {
          lows.push(`${cls.nome || '(turma)'} · ${subj.nome}: ${allocH.toFixed(allocMin % 60 === 0 ? 0 : 1)}h de ${targetH}h`);
        }
      });
    });
    if (lows.length > 0) {
      toast.warning(
        `Atenção: ${lows.length} disciplina(s) abaixo da carga horária prevista. Verifique antes de finalizar.`,
        { description: lows.slice(0, 6).join('  •  ') + (lows.length > 6 ? `  •  +${lows.length - 6}` : '') },
      );
    }
  }
  type ValidationIssue = {
    kind: 'partial' | 'empty' | 'conflict' | 'generic';
    title: string;
    summary: string;
    explanation: string;
    suggestion: string[];
    items: string[];
  };

  function validateStep5Detailed(): ValidationIssue | null {
    if (!currentDraft) {
      return {
        kind: 'generic',
        title: 'Curso não selecionado',
        summary: 'Não foi possível identificar o curso atual.',
        explanation: 'O fluxo precisa de um curso ativo para validar as indicações.',
        suggestion: ['Volte à tela inicial e selecione novamente um curso para continuar.'],
        items: [],
      };
    }
    const partials: string[] = [];
    const empties: string[] = [];

    for (const cls of currentDraft.classes) {
      const slotsCls = currentDraft.schedule.filter((s) => s.classId === cls.id);
      const subjectIds = Array.from(new Set(slotsCls.map((s) => s.subject_id)));
      for (const subjectId of subjectIds) {
        const groupSlots = slotsCls.filter((s) => s.subject_id === subjectId);
        const firstSlotId = groupSlots[0].id;
        const t = currentDraft.teachers.find((x) => x.scheduleSlotId === firstSlotId);
        if (t?.sem_indicacao) continue;
        const subjectName = currentCourse?.subjects.find((x) => x.id === subjectId)?.nome ?? '—';
        const label = `${cls.nome || '(turma)'} — ${subjectName}`;
        const nome = t?.nome.trim() ?? '';
        const telefone = t?.telefone.trim() ?? '';
        const formacao = t?.formacao.trim() ?? '';
        const email = t?.email.trim() ?? '';
        const anyFilled = !!(nome || telefone || formacao || email);
        const isFromSchool = !!nome && schoolTeachers.some(
          (p) => normalizeName(p.nome_completo) === normalizeName(nome),
        );
        if (isFromSchool) continue;
        const allRequired = !!(nome && telefone && formacao);
        if (anyFilled && !allRequired) partials.push(label);
        else if (!anyFilled) empties.push(label);
      }
    }

    if (partials.length > 0) {
      return {
        kind: 'partial',
        title: `${partials.length} indicação(ões) de fora incompleta(s)`,
        summary: 'Você começou a digitar uma indicação externa, mas faltam dados obrigatórios.',
        explanation:
          'Quando o professor indicado NÃO está cadastrado na escola, o R.H. precisa de pelo menos Nome completo, Telefone e Formação para entrar em contato e validar a contratação. Sem esses três campos, a indicação não pode ser processada.',
        suggestion: [
          'Complete os campos Nome, Telefone e Formação para cada disciplina listada abaixo,',
          'OU escolha um professor já cadastrado da lista da escola (selecione no campo "Professor da escola"),',
          'OU marque "Não tenho indicação — deixar para o R.H." se você realmente não souber quem indicar.',
        ],
        items: partials,
      };
    }
    if (empties.length > 0) {
      return {
        kind: 'empty',
        title: `${empties.length} disciplina(s) sem preenchimento`,
        summary: 'Há disciplinas na grade sem nenhuma decisão registrada.',
        explanation:
          'Toda disciplina precisa de uma definição: ou um professor indicado (da escola ou de fora), ou a marcação explícita de que o R.H. ficará responsável.',
        suggestion: [
          'Para cada disciplina abaixo, selecione um professor da escola na lista,',
          'ou preencha a indicação de fora (Nome + Telefone + Formação),',
          'ou marque "Não tenho indicação — deixar para o R.H.".',
        ],
        items: empties,
      };
    }
    if (teacherConflicts.length > 0) {
      return {
        kind: 'conflict',
        title: `${teacherConflicts.length} conflito(s) de horário`,
        summary: 'O mesmo professor foi alocado em duas turmas no mesmo dia e horário.',
        explanation:
          'Um professor não pode estar em duas salas ao mesmo tempo. O sistema detectou sobreposições no calendário semanal que precisam ser resolvidas antes de prosseguir.',
        suggestion: [
          'Volte à grade horária (Fase 4) e mova um dos slots para outro horário,',
          'ou substitua um dos professores conflitantes por outro disponível,',
          'ou marque um dos slots como "Sem indicação" para o R.H. resolver.',
        ],
        items: teacherConflicts.map((c: any) => typeof c === 'string' ? c : c?.label ?? '—'),
      };
    }
    return null;
  }

  /** Compatibilidade — devolve string p/ chamadas antigas (mostra modal automaticamente). */
  function validateStep5(): string | null {
    const issue = validateStep5Detailed();
    if (!issue) return null;
    setValidationIssue(issue);
    return issue.summary;
  }

  async function handleManualSave() {
    const ok = await autoSave.saveNow();
    if (ok) toast.success('Salvo!');
    else toast.error(autoSave.error || 'Falha ao salvar');
  }

  // ---------- Submit ----------
  async function submitCurrentCourse() {
    // Guard contra double-submit (clique duplo, Enter, race condition).
    if (submittingCourse) return;
    if (!token || !currentDraft || !currentCourse) return;

    // BLOQUEIO DEFINITIVO: se o curso já foi enviado nesta sessão/rascunho,
    // não permitir reenvio pelo botão. Evita duplicação de turmas/indicações.
    // Para reabrir, o R.H. precisa usar "Reabrir horários" em /rh/links-escolas.
    if (draft.courses[currentCourse.id]?.status === 'submitted') {
      toast.error('Este curso já foi enviado. Para alterar, peça ao R.H. para reabrir os horários.');
      return;
    }

    const issue = validateStep5Detailed();
    if (issue) { setValidationIssue(issue); return; }

    // PREVENÇÃO DE DUPLICIDADE DE SLOT — bloqueia 2 professores DIFERENTES no
    // mesmo (turma × disciplina × dia × tempo). Era a causa das duplicidades
    // que apareciam depois em /rh/links-escolas/.../conferir (ex.: Debora ×
    // Marines, Reginaldo × Kallil em EE 11 de Outubro).
    {
      const slotGroups = new Map<string, { teacher: string; slotId: string }[]>();
      currentDraft.schedule.forEach((s) => {
        const t = currentDraft.teachers.find((x) => x.scheduleSlotId === s.id);
        const nome = t?.sem_indicacao ? '' : (t?.nome ?? '').trim();
        if (!nome) return;
        const k = `${s.classId}|${s.subject_id}|${s.weekday}|${s.time_slot_id}`;
        const arr = slotGroups.get(k) ?? [];
        arr.push({ teacher: nome, slotId: s.id });
        slotGroups.set(k, arr);
      });
      const dupItems: string[] = [];
      slotGroups.forEach((arr, key) => {
        if (arr.length < 2) return;
        const distinct = new Set(arr.map((x) => normalizeName(x.teacher)));
        if (distinct.size < 2) return;
        const [classId, subjectId, weekday] = key.split('|');
        const turma = currentDraft.classes.find((c) => c.id === classId);
        const subj = currentCourse.subjects.find((x) => x.id === subjectId);
        const nomes = arr.map((x) => x.teacher).join(' × ');
        dupItems.push(`${turma?.nome ?? 'Turma'} · ${subj?.nome ?? 'Disciplina'} · ${weekday} → ${nomes}`);
      });
      if (dupItems.length) {
        setValidationIssue({
          kind: 'conflict',
          title: 'Dois professores diferentes no mesmo horário',
          summary: `Cada horário só pode ter UM professor por turma e disciplina. Encontramos ${dupItems.length} ocorrência(s).`,
          explanation:
            'Quando o mesmo (turma × disciplina × dia × tempo) recebe nomes diferentes, o sistema acaba criando aulas duplicadas no diário do professor. Por isso o envio é bloqueado até que cada slot tenha um único responsável.',
          suggestion: [
            'Volte à Fase 4 (Grade horária) e edite os slots em conflito.',
            'Escolha apenas UM professor para cada combinação turma × disciplina × dia × tempo.',
            'Se ainda não sabe o nome, marque o slot como "Sem indicação" para o R.H. resolver.',
          ],
          items: dupItems,
        });
        return;
      }

    }


    setSubmittingCourse(true);
    try {
      const classOrder = currentDraft.classes;
      const indices = new Map(classOrder.map((c, i) => [c.id, i] as const));

      // 1 indicação por slot da grade. Cada slot tem 1 disciplina + dia + tempo.
      const classes = classOrder.map((c) => ({
        nome: c.nome.trim(),
        turno: c.turno,
        qtd: currentDraft.schedule.filter((s) => s.classId === c.id).length,
      }));

      // Pré-calcula, por grupo (turma × disciplina), se QUALQUER slot foi marcado
      // como "sem indicação" — assim slots ainda não materializados em `teachers`
      // herdam o estado e não disparam "Nome obrigatório" no backend.
      const groupSemInd = new Map<string, boolean>();
      for (const s of currentDraft.schedule) {
        const key = `${s.classId}::${s.subject_id}`;
        const t = currentDraft.teachers.find((x) => x.scheduleSlotId === s.id);
        if (t?.sem_indicacao) groupSemInd.set(key, true);
        else if (!groupSemInd.has(key)) groupSemInd.set(key, false);
      }

      const indications = currentDraft.schedule.map((s) => {
        const teacher = currentDraft.teachers.find((t) => t.scheduleSlotId === s.id);
        const ts = currentDraft.hours.time_slots[s.turno].find((x) => x.id === s.time_slot_id);
        const subjectName = currentCourse.subjects.find((x) => x.id === s.subject_id)?.nome ?? '';

        // Enriquecimento "from_school" (fonte de verdade interna)
        const nomeT = teacher?.nome.trim() ?? '';
        const fromSchool = !!nomeT && schoolTeachers.find(
          (p) => normalizeName(p.nome_completo) === normalizeName(nomeT),
        );
        const telefoneFinal = (teacher?.telefone.trim() || fromSchool?.telefone?.trim() || '');
        const formacaoFinal = (teacher?.formacao.trim() || fromSchool?.formacao?.trim() || '');
        const emailFinal = (teacher?.email.trim() || fromSchool?.email?.trim() || '');

        // Regra final de "sem indicação":
        //  1) flag explícita no slot, OU
        //  2) qualquer outro slot do mesmo grupo (turma × disciplina) marcou, OU
        //  3) FALLBACK — slot ficou sem nome preenchido (evita "Nome obrigatório" no backend).
        const semIndicacao =
          !!teacher?.sem_indicacao ||
          !!groupSemInd.get(`${s.classId}::${s.subject_id}`) ||
          !nomeT;

        return {
          class_index: indices.get(s.classId) ?? 0,
          nome: semIndicacao ? '[SEM INDICAÇÃO — A DEFINIR PELO R.H.]' : nomeT,
          telefone: semIndicacao ? '' : telefoneFinal,
          email: semIndicacao ? '' : emailFinal,
          formacao: semIndicacao ? 'A definir' : (formacaoFinal || (fromSchool ? 'A definir' : '')),
          sem_indicacao: semIndicacao,
          from_school: !semIndicacao && !!fromSchool,
          disciplinas: subjectName ? [subjectName] : [],
          grade: {
            subject_id: s.subject_id,
            subject_nome: subjectName,
            weekday: s.weekday,
            time_slot_label: ts ? `${ts.nome} ${ts.inicio}–${ts.fim}` : null,
            turno: s.turno,
            is_anp: s.is_anp === true,
            class_mode: s.is_anp === true ? 'ANP' : 'PRESENCIAL',
          },
        } as any;
      });

      await indicationLinksApi.submitFull(
        token, keyword.trim(), currentCourse.id, classes, indications, draft.diretor_nome.trim(),
      );
      patchCourse(currentCourse.id, { status: 'submitted' });

      const pendingCount = info!.courses.filter((c) => c.id !== currentCourse.id && draft.courses[c.id]?.status !== 'submitted').length;
      if (pendingCount > 0) {
        toast.success(`Curso "${currentCourse.nome}" enviado! Faltam ${pendingCount} curso(s) — escolha o próximo na tela inicial.`);
        setDraft((d) => ({ ...d, current_step: 2, current_course_id: null }));
        setPhase4Step(1);
        setPhase4Reached(1);
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
      } else {
        toast.success(`Curso "${currentCourse.nome}" enviado com sucesso!`);
        setDraft((d) => ({ ...d, current_step: 7, current_course_id: null }));
      }
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao enviar curso');
    } finally { setSubmittingCourse(false); }
  }

  // =====================================================================
  // Render
  // =====================================================================

  const totalSubmitted = info ? info.courses.filter((c) => draft.courses[c.id]?.status === 'submitted').length : 0;
  const totalCourses = info?.courses.length ?? 0;

  const remainingCourses = info && currentCourse
    ? info.courses.filter((c) => c.id !== currentCourse.id && draft.courses[c.id]?.status !== 'submitted')
    : [];

  const CurrentCourseBanner = () => {
    if (!currentCourse || remainingCourses.length === 0) return null;
    return (
      <div className="rounded-xl border-2 border-[#FFDA45] bg-[#FFF8DC] text-[#1B1E2C] px-4 py-3 flex gap-3 items-start shadow-sm">
        <div className="h-9 w-9 rounded-full bg-[#FFDA45] flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-[#1B1E2C]" />
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="font-bold text-sm sm:text-base">
            Você está preenchendo: <span className="underline decoration-[#FFDA45] decoration-2 underline-offset-2">{currentCourse.nome}</span>
          </div>
          <div className="text-xs sm:text-sm text-[#1B1E2C]/85">
            Após enviar este curso, ainda faltam <strong>{remainingCourses.length} curso(s)</strong>:
          </div>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {remainingCourses.map((c) => (
              <span key={c.id} className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md border border-[#1B1E2C]/25 bg-white text-[#1B1E2C]">
                {c.nome}
              </span>
            ))}
          </div>
          <div className="text-[11px] text-[#1B1E2C]/65 pt-0.5">
            Confirme se está cadastrando turmas, grade e professores no curso correto.
          </div>
        </div>
      </div>
    );
  };

  // Turnos visíveis na grade (Fase 4) por turma
  function turnosForClass(cls: ClassDraft): Turno[] {
    if (!currentDraft) return [cls.turno];
    if (!currentDraft.hours.is_integral) return [cls.turno];
    // Integral: manhã + tarde sempre; mantém noturno separado se a turma for noturna
    if (cls.turno === 'noite') return ['noite'];
    return ['manha', 'tarde'];
  }

  // Subtítulo dinâmico em função da fase atual
  const heroSubtitle = info
    ? `${info.school.nome} — indicação de professores por curso e grade horária.`
    : '"Onde a gestão escolar encontra os melhores professores."';

  // Fase 4 (grade horária) precisa de largura cheia para exibir todas as colunas/dias confortavelmente
  const isWideStep = draft.current_step === 4;

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#1B1E2C] py-8 px-3 sm:px-4 lg:px-6 pb-32">
      <div className={`mx-auto space-y-5 ${isWideStep ? 'max-w-[1800px]' : 'max-w-5xl'}`}>

        {/* Cabeçalho padrão Neovale */}
        <PortalHero
          eyebrow="Neovale · Portal do Diretor"
          title="Indicação de Professores"
          subtitle={heroSubtitle}
          trailing={
            info && (
              <div className="hidden sm:flex flex-col items-end gap-1">
                <Badge className="bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45] font-bold">
                  Fase {draft.current_step} de 7
                </Badge>
                <span className="text-[11px] text-[#1B1E2C]/65 font-medium">
                  {totalSubmitted}/{totalCourses} curso(s) concluído(s)
                </span>
              </div>
            )
          }
        />

        {info && draft.current_step >= 2 && (
          <Stepper current={draft.current_step} totalCourses={totalCourses} submitted={totalSubmitted} />
        )}

        {/* Faixa de contexto: Escola e Curso atuais (visível em todas as fases após o acesso) */}
        {info && draft.current_step >= 2 && (
          <div className="rounded-lg border border-[#1B1E2C]/10 bg-white shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-stretch divide-x divide-[#1B1E2C]/10">
              <div className="flex items-center gap-2.5 px-4 py-2.5 flex-1 min-w-[220px]">
                <Building2 className="h-4 w-4 text-[#1B1E2C]/55 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#1B1E2C]/55">Escola</div>
                  <div className="text-sm font-bold text-[#1B1E2C] break-words leading-tight">
                    {info.school.nome}
                    {info.school.cidade && <span className="text-[#1B1E2C]/55 font-medium"> · {info.school.cidade}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-4 py-2.5 flex-1 min-w-[220px] bg-[#FFDA45]/10">
                <Sparkles className="h-4 w-4 text-[#1B1E2C]/55 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#1B1E2C]/55">Curso atual</div>
                  <div className="text-sm font-bold text-[#1B1E2C] break-words leading-tight">
                    {currentCourse ? (
                      <>
                        {currentCourse.nome}
                        {currentCourse.codigo && <span className="text-[#1B1E2C]/55 font-medium"> · {currentCourse.codigo}</span>}
                      </>
                    ) : (
                      <span className="text-[#1B1E2C]/45 italic font-medium">Nenhum curso selecionado</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {info && draft.current_step >= 2 && (
          <HelpBanner open={helpOpen} onToggle={() => setHelpOpen((v) => !v)} />
        )}

        {info && draft.current_step >= 2 && (
          <div className="flex items-center justify-end gap-2 text-xs text-[#1B1E2C]/60">
            {autoSave.status === 'saving' && (<><Loader2 className="h-3 w-3 animate-spin" /> Salvando…</>)}
            {autoSave.status === 'saved' && autoSave.lastSavedAt && (
              <><CheckCircle2 className="h-3 w-3 text-emerald-600" /> Salvo às {autoSave.lastSavedAt.toLocaleTimeString('pt-BR')}</>
            )}
            {autoSave.status === 'error' && (<><Info className="h-3 w-3 text-red-600" /> Falha ao salvar</>)}
            {autoSave.status === 'idle' && draftLoadedRef.current && (<><Info className="h-3 w-3" /> Rascunho carregado</>)}
          </div>
        )}

        {/* Fase 1 — Acesso */}
        {draft.current_step === 1 && (
          <Card className="border-[#1B1E2C]/10 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#1B1E2C]"><Building2 className="h-5 w-5 text-[#1B1E2C]" /> Acessar o portal</CardTitle>
              <CardDescription className="text-[#1B1E2C]/65">Informe seu nome e a palavra-chave que o R.H. enviou.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="diretor" className="text-[#1B1E2C]">Seu nome (diretor responsável) *</Label>
                <Input id="diretor" value={draft.diretor_nome}
                  onChange={(e) => setDraft((d) => ({ ...d, diretor_nome: e.target.value }))}
                  placeholder="Ex: Maria Silva" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kw" className="text-[#1B1E2C]">Palavra-chave *</Label>
                <Input id="kw" value={keyword} onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Ex: ABCD1234" />
              </div>
              <Button onClick={handleAccess} disabled={loadingAccess}
                className="w-full bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45]/90 font-semibold shadow-sm">
                {loadingAccess ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Acessar portal →'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Fase 2 — Lista de cursos */}
        {info && draft.current_step === 2 && (
          <Card className="border-[#1B1E2C]/10 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#1B1E2C]">
                <Sparkles className="h-5 w-5 text-[#FFC107]" /> Bem-vindo(a), {draft.diretor_nome}!
              </CardTitle>
              <CardDescription className="text-[#1B1E2C]/65">
                <strong className="text-[#1B1E2C]">{info.school.nome}</strong> tem <strong className="text-[#1B1E2C]">{info.courses.length} curso(s)</strong> vinculado(s).
                Você indicará professores para um curso por vez. Tudo é salvo automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-[#1B1E2C]/70 mb-2">
                Progresso: <strong className="text-[#1B1E2C]">{totalSubmitted} de {totalCourses}</strong> curso(s) concluído(s).
              </div>
              <ul className="space-y-2">
                {info.courses.map((c) => {
                  const cd = draft.courses[c.id];
                  const status = cd?.status ?? 'pending';
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-3 p-4 rounded-xl border border-[#1B1E2C]/10 bg-white hover:border-[#FFDA45] hover:bg-[#FAFBFD] transition shadow-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <CourseStatusIcon status={status} />
                        <div className="min-w-0">
                          <div className="font-semibold text-[#1B1E2C] break-words">{c.nome}</div>
                          <div className="text-xs text-[#1B1E2C]/55">{c.subjects.length} disciplina(s) cadastrada(s)</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CourseStatusBadge status={status} />
                        {status === 'submitted' ? (
                          <>
                            <Button size="sm" disabled
                              className="bg-[#FFDA45]/60 text-[#1B1E2C] font-semibold shadow-sm cursor-not-allowed">
                              Concluído
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-[#1B1E2C]/30 text-[#1B1E2C] hover:bg-[#FFF8DC] font-semibold"
                              onClick={() => {
                                if (!confirm(`Reabrir o curso "${c.nome}"?\n\nVocê poderá editar turmas, grade e professores e enviar novamente.`)) return;
                                patchCourse(c.id, { status: 'in_progress' });
                                startCourse(c.id);
                              }}
                              title="Reabrir este curso para edição e novo envio"
                            >
                              <ArrowLeft className="h-4 w-4 mr-1" /> Reabrir
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" onClick={() => startCourse(c.id)}
                            className="bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45]/90 font-semibold shadow-sm">
                            {status === 'in_progress' ? 'Continuar' : 'Iniciar'}
                            <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {totalSubmitted === totalCourses && totalCourses > 0 && (
                <div className="pt-2">
                  <Button onClick={() => setDraft((d) => ({ ...d, current_step: 7 }))}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                    Ver resumo final <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Fase 3 — Cadastro de Turmas */}
        {info && draft.current_step === 3 && currentCourse && currentDraft && (<><CurrentCourseBanner /></>)}
        {info && draft.current_step === 3 && currentCourse && currentDraft && (
          <Card className="border-[#1B1E2C]/10 bg-white shadow-sm overflow-hidden">
            <CardHeader className="border-b-2 border-[#FFDA45]/70 bg-gradient-to-b from-[#FAFBFD] to-white">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45] font-bold">FASE 3 DE 7</Badge>
                <Badge variant="outline" className="border-[#1B1E2C]/20 text-[#1B1E2C]/75">Cadastro de Turmas</Badge>
              </div>
              <CardTitle className="flex items-center gap-2 text-2xl text-[#1B1E2C]">
                <BookOpen className="h-6 w-6 text-[#1B1E2C]" /> Cadastro de Turmas do Curso
              </CardTitle>
              <CardDescription className="text-[#1B1E2C]/65">
                Curso: <strong className="text-[#1B1E2C]">{currentCourse.nome}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="rounded-xl border border-[#FFDA45]/40 bg-[#FFFEF7] p-4 space-y-2">
                <div className="flex items-center gap-2 text-[#1B1E2C] font-semibold">
                  <BookOpen className="h-4 w-4" /> Como cadastrar suas turmas
                </div>
                <ul className="text-sm text-[#1B1E2C]/80 space-y-1 list-disc list-inside">
                  <li>Clique em <strong className="text-[#1B1E2C]">"+ Adicionar turma"</strong> no turno desejado.</li>
                  <li>Dê um <strong className="text-[#1B1E2C]">nome</strong> para cada turma (ex.: <em>1º A, 2º B</em>).</li>
                  <li>Na próxima tela você montará a <strong className="text-[#1B1E2C]">grade horária</strong> com as disciplinas.</li>
                </ul>
              </div>

              {TURNOS.map(({ value, label, icon: Icon }) => {
                const turmas = currentDraft.classes.filter((c) => c.turno === value);
                return (
                  <div key={value} className="rounded-xl border border-[#1B1E2C]/10 bg-[#F9FAFC] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-[#1B1E2C]">
                        <Icon className="h-4 w-4 text-[#FFC107]" /> Turno {label}
                        <Badge variant="outline" className="ml-2 border-[#1B1E2C]/20 text-[#1B1E2C]/75">{turmas.length} turma(s)</Badge>
                      </div>
                      <Button size="sm" variant="outline"
                        className="border-[#1B1E2C]/20 text-[#1B1E2C] hover:bg-[#FAFBFD] hover:border-[#FFDA45]"
                        onClick={() => addClass(value)}>
                        <Plus className="h-3 w-3 mr-1" /> Adicionar turma
                      </Button>
                    </div>
                    {turmas.length === 0 && (
                      <div className="rounded-md border border-dashed border-[#1B1E2C]/15 bg-white p-3 text-center text-xs text-[#1B1E2C]/50 italic">
                        Nenhuma turma cadastrada neste turno.
                      </div>
                    )}
                    {turmas.map((cls, idx) => (
                      <div key={cls.id} className="rounded-lg border border-[#1B1E2C]/10 bg-white p-3 space-y-2 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#1B1E2C] uppercase tracking-wide">
                            Turma {idx + 1} — {label}
                          </span>
                          <Button variant="ghost" size="icon"
                            onClick={() => removeClass(cls.id)}
                            className="h-7 w-7 text-[#1B1E2C]/55 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {(() => {
                          const ANO_OPTS = ['1º Ano','2º Ano','3º Ano','EJA'];
                          const LETRA_OPTS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
                          // Parse aceitando seleção parcial: "1º", "1º A", "EJA", "EJA A", "A"
                          const raw = cls.nome.trim();
                          const mFull = raw.match(/^(\d+)\s*º?\s*([A-Z])?$/i);
                          const mEja = raw.match(/^EJA\s*([A-Z])?$/i);
                          const mLetraOnly = raw.match(/^([A-Z])$/i);
                          const anoAtual = mEja ? 'EJA' : (mFull ? `${mFull[1]}º Ano` : '');
                          const letraAtual = mEja
                            ? (mEja[1] ? mEja[1].toUpperCase() : '')
                            : mFull
                              ? (mFull[2] ? mFull[2].toUpperCase() : '')
                              : (mLetraOnly ? mLetraOnly[1].toUpperCase() : '');
                          const compose = (ano: string, letra: string) => {
                            if (!ano && !letra) return '';
                            if (!ano) return letra; // só letra
                            if (ano === 'EJA') return letra ? `EJA ${letra}` : 'EJA';
                            const num = ano.replace(/\D/g, '');
                            return letra ? `${num}º ${letra}` : `${num}º`;
                          };
                          const isLegacy = !!raw && !anoAtual && !letraAtual;
                          return (
                            <div className="space-y-2">
                              <Label className="text-xs text-[#1B1E2C]/70">Nome da turma *</Label>
                              <div className="grid grid-cols-2 gap-2">
                                <SearchableSelect
                                  value={anoAtual}
                                  onValueChange={(v) => updateClass(cls.id, { nome: compose(v, letraAtual) })}
                                  options={ANO_OPTS.map((a) => ({ value: a, label: a }))}
                                  placeholder="Ano"
                                  searchPlaceholder="Buscar ano..."
                                />
                                <SearchableSelect
                                  value={letraAtual}
                                  onValueChange={(v) => updateClass(cls.id, { nome: compose(anoAtual, v) })}
                                  options={LETRA_OPTS.map((l) => ({ value: l, label: l }))}
                                  placeholder="Letra"
                                  searchPlaceholder="Buscar letra..."
                                />
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-[#1B1E2C]/55">Nome final:</span>
                                <span className="font-mono font-bold text-[#1B1E2C] bg-[#FFDA45]/30 px-2 py-0.5 rounded">
                                  {cls.nome.trim() || '—'}
                                </span>
                              </div>
                              {isLegacy && (
                                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                  Nome legado <strong>"{cls.nome}"</strong> — selecione Ano e Letra para padronizar.
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                );
              })}

              <PortalFooterNav
                onBack={() => setDraft((d) => ({ ...d, current_step: 2 }))}
                backLabel="Voltar aos cursos"
                onSaveDraft={handleManualSave}
                onNext={() => {
                  const err = validateStep3();
                  if (err) { toast.error(err); return; }
                  setDraft((d) => ({ ...d, current_step: 4 }));
                }}
                nextLabel="Montar grade horária"
              />
            </CardContent>
          </Card>
        )}

        {/* Fase 4 — Grade horária por turma (em 3 sub-etapas) */}
        {info && draft.current_step === 4 && currentCourse && currentDraft && (<><CurrentCourseBanner /></>)}
        {info && draft.current_step === 4 && currentCourse && currentDraft && (() => {
          // Total de tempos ofertados na semana = soma dos tempos × dias úteis (5 ou 6 quando alguma turma tem sábado)
          const turnosUsadosSet = new Set<Turno>();
          currentDraft.classes.forEach((cls) => turnosForClass(cls).forEach((t) => turnosUsadosSet.add(t)));
          const turnosUsados = Array.from(turnosUsadosSet);
          const anySaturday = Object.values(currentDraft.hours.include_saturday).some(Boolean);
          const diasUteis = anySaturday ? 6 : 5;
          const tempos = turnosUsados.reduce(
            (sum, t) => sum + (currentDraft.hours.time_slots[t]?.length ?? 0),
            0,
          );
          const weeklyOfferedSlots = tempos * diasUteis;

          // Validações por etapa
          const step1Error = (() => {
            // Pelo menos 1 tempo cadastrado em cada turno usado pelas turmas
            for (const t of turnosUsados) {
              if ((currentDraft.hours.time_slots[t]?.length ?? 0) === 0) {
                const label = t === 'manha' ? 'Matutino' : t === 'tarde' ? 'Vespertino' : 'Noturno';
                return `Cadastre ao menos um tempo no turno ${label} (há turmas neste turno).`;
              }
            }
            return null;
          })();

          return (
            <Card className="border-[#1B1E2C]/10 bg-white shadow-sm overflow-hidden">
              <CardHeader className="relative border-b border-[#1B1E2C]/10 bg-[#1B1E2C] text-white p-5 sm:p-6">
                <div className="absolute inset-x-0 bottom-0 h-1 bg-[#FFDA45]" aria-hidden />
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge className="bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45] font-bold tracking-wide">FASE 4 DE 7</Badge>
                  <Badge variant="outline" className="border-white/25 text-white/85 bg-white/5">Grade Horária</Badge>
                  {currentDraft.hours.is_integral && (
                    <Badge
                      className="bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45] font-bold tracking-wide flex items-center gap-1 ring-2 ring-[#FFDA45]/50 ring-offset-2 ring-offset-[#1B1E2C]"
                      title="A escola está configurada como integral. Turmas do diurno terão grade Matutino + Vespertino combinada."
                    >
                      <Sparkles className="h-3 w-3" /> ESCOLA INTEGRAL
                    </Badge>
                  )}
                </div>
                <CardTitle className="flex items-center gap-2.5 text-2xl text-white">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFDA45] text-[#1B1E2C]">
                    <CalendarDays className="h-5 w-5" />
                  </span>
                  Grade Horária por Turma
                </CardTitle>
                <CardDescription className="text-white/75">
                  Curso: <strong className="text-[#FFDA45]">{currentCourse.nome}</strong>.
                  Configure em 2 etapas: horários da escola e a grade de cada turma.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-5 bg-[#FAFBFD]/40">

                {/* Stepper interno da Fase 4 */}
                <Phase4Stepper current={phase4Step} reached={phase4Reached} onGo={goPhase4} />

                {/* ===================== Etapa 1 — Horários da escola ===================== */}
                {phase4Step === 1 && (
                  <div className="space-y-5">
                    {/* Toggle Escola Integral */}
                    {(() => {
                      const integral = currentDraft.hours.is_integral;
                      return (
                        <div
                          className={
                            integral
                              ? 'rounded-xl border-2 border-[#FFDA45] bg-[#FFDA45]/40 p-4 flex flex-wrap items-center justify-between gap-3 shadow-[0_2px_0_rgba(27,30,44,0.06)]'
                              : 'rounded-xl border border-[#FFDA45]/50 bg-gradient-to-r from-[#FFFCEB] via-white to-white p-4 flex flex-wrap items-center justify-between gap-3 shadow-[0_1px_0_rgba(27,30,44,0.04)]'
                          }
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1B1E2C] text-[#FFDA45]">
                              {integral ? <Sparkles className="h-4.5 w-4.5" /> : <School className="h-4.5 w-4.5" />}
                            </span>
                            <div className="min-w-0">
                              <div className="font-extrabold text-[#1B1E2C] leading-tight flex items-center gap-2">
                                {integral ? (
                                  <>
                                    Escola integral ativada
                                    <Badge className="bg-[#1B1E2C] text-[#FFDA45] hover:bg-[#1B1E2C] font-bold tracking-wide text-[10px] px-1.5 py-0 h-4 flex items-center gap-1">
                                      <Sparkles className="h-2.5 w-2.5" /> ATIVO
                                    </Badge>
                                  </>
                                ) : (
                                  'A escola é integral?'
                                )}
                              </div>
                              <p className="text-xs text-[#1B1E2C]/80 max-w-xl mt-0.5">
                                {integral
                                  ? <>Turmas do diurno terão grade combinada <strong className="text-[#1B1E2C]">Matutino + Vespertino</strong>. Noturno permanece independente.</>
                                  : <>Quando ligada, cada turma poderá ter aulas tanto no <strong className="text-[#1B1E2C]">Matutino</strong> quanto no <strong className="text-[#1B1E2C]">Vespertino</strong> simultaneamente.</>
                                }
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 rounded-md bg-white border border-[#1B1E2C]/10 px-3 py-1.5">
                            <Switch id="integral" checked={integral} onCheckedChange={setIntegral} />
                            <Label htmlFor="integral" className="text-sm font-semibold text-[#1B1E2C] cursor-pointer select-none">
                              {integral ? 'Sim, integral' : 'Não'}
                            </Label>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Editor de horários — abre os 3 turnos por padrão */}
                    <SchoolHoursEditor
                      timeSlotsByTurno={currentDraft.hours.time_slots}
                      onChange={setTimeSlots}
                      defaultOpenAll
                    />

                    <PortalFooterNav
                      onBack={() => setDraft((d) => ({ ...d, current_step: 3 }))}
                      backLabel="Voltar às turmas"
                      onSaveDraft={handleManualSave}
                      onNext={() => {
                        if (step1Error) { toast.error(step1Error); return; }
                        goPhase4(2);
                      }}
                      nextLabel="Próxima etapa: Grade por turma"
                    />
                  </div>
                )}

                {/* ===================== Etapa 2 — Grade horária por turma ===================== */}
                {phase4Step === 2 && (
                  <div className="space-y-5">
                    {currentDraft.hours.is_integral && (
                      <div className="rounded-xl border-2 border-[#FFDA45] bg-[#FFDA45]/40 px-4 py-3 flex items-start gap-3">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1B1E2C] text-[#FFDA45]">
                          <Sparkles className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 text-sm text-[#1B1E2C]">
                          <div className="font-extrabold tracking-wide">ESCOLA INTEGRAL</div>
                          <p className="text-xs text-[#1B1E2C]/80 mt-0.5">
                            Cada turma do diurno aparece com grade <strong>Matutino + Vespertino</strong> combinada. Turmas noturnas seguem isoladas.
                          </p>
                        </div>
                      </div>
                    )}
                    {currentDraft.classes.length === 0 && (
                      <div className="rounded-xl border border-dashed border-[#1B1E2C]/15 bg-[#F9FAFC] p-6 text-center text-sm text-[#1B1E2C]/55">
                        Volte para a fase anterior e cadastre ao menos uma turma.
                      </div>
                    )}

                    <div className="space-y-4">
                      {currentDraft.classes.map((cls) => (
                        <ClassWeeklyGridEditor
                          key={cls.id}
                          className={cls.nome}
                          classId={cls.id}
                          turnos={turnosForClass(cls)}
                          timeSlotsByTurno={currentDraft.hours.time_slots}
                          schedule={currentDraft.schedule}
                          subjects={currentCourse.subjects.map((s) => ({ id: s.id, nome: s.nome, carga_horaria_semanal: s.carga_horaria_semanal }))}
                          subjectWeeklyLoad={currentDraft.subject_weekly_load}
                          includeSaturday={!!currentDraft.hours.include_saturday[cls.id]}
                          onToggleSaturday={(v) => setIncludeSaturdayForClass(cls.id, v)}
                          onSetCell={(turno, weekday, time_slot_id, subject_id) =>
                            setCellSubject(cls.id, turno, weekday, time_slot_id, subject_id)
                          }
                          onToggleAnp={(turno, weekday, time_slot_id, isAnp) =>
                            setCellAnp(cls.id, turno, weekday, time_slot_id, isAnp)
                          }
                          onClearAll={() => clearClassSchedule(cls.id)}
                        />
                      ))}
                    </div>

                    <DemandSummaryGrid course={currentDraft} tetoCH={tetoCH} />

                    <PortalFooterNav
                      onBack={() => goPhase4(1)}
                      backLabel="Voltar: Horários"
                      onSaveDraft={handleManualSave}
                      onNext={() => {
                        const err = validateStep4();
                        if (err) { toast.error(err); return; }
                        warnStep4Underload();
                        setDraft((d) => ({ ...d, current_step: 5 }));
                      }}
                      nextLabel="Indicar professores"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* Fase 5 — Indicar professores (1 por slot da grade) */}
        {info && draft.current_step === 5 && currentCourse && currentDraft && (<><CurrentCourseBanner /></>)}
        {info && draft.current_step === 5 && currentCourse && currentDraft && (
          <Card className="border-[#1B1E2C]/10 bg-white shadow-sm overflow-hidden">
            <CardHeader className="border-b-2 border-[#FFDA45]/70 bg-gradient-to-b from-[#FAFBFD] to-white">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className="bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45] font-bold">FASE 5 DE 7</Badge>
                <Badge variant="outline" className="border-[#1B1E2C]/20 text-[#1B1E2C]/75">Indicar Professores</Badge>
                {currentDraft.hours.is_integral && (
                  <Badge
                    className="bg-[#1B1E2C] text-[#FFDA45] hover:bg-[#1B1E2C] font-bold tracking-wide flex items-center gap-1 ring-2 ring-[#FFDA45]"
                    title="Escola integral: turmas do diurno terão indicação combinada Matutino + Vespertino."
                  >
                    <Sparkles className="h-3 w-3" /> ESCOLA INTEGRAL
                  </Badge>
                )}
              </div>
              <CardTitle className="flex items-center gap-2 text-2xl text-[#1B1E2C]"><GraduationCap className="h-6 w-6 text-[#1B1E2C]" /> Indicar professores</CardTitle>
              <CardDescription className="text-[#1B1E2C]/65">
                Indique <strong className="text-[#1B1E2C]">um professor por disciplina em cada turma</strong>. O mesmo professor pode aparecer em outras turmas, desde que não haja conflito de horário.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">

              <DemandSummaryGrid course={currentDraft} tetoCH={tetoCH} />

              {conflictItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConflictModalOpen(true)}
                  className="w-full text-left rounded-lg border-2 border-rose-300 bg-rose-50 hover:bg-rose-100 transition-colors p-3 flex items-center gap-3 group"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 ring-2 ring-rose-300">
                    <Info className="h-4 w-4 text-rose-700" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-rose-800 text-sm">
                      {conflictItems.length} conflito(s) de horário detectado(s)
                    </div>
                    <div className="text-xs text-rose-700/80">
                      Clique para ver os detalhes e aplicar a correção sugerida.
                    </div>
                  </div>
                  <span className="text-[11px] uppercase tracking-wider font-bold text-rose-700 group-hover:underline">
                    Ver detalhes
                  </span>
                </button>
              )}

              {(() => {
                const TURNO_INFO: Record<Turno, {
                  label: string;
                  icon: typeof Sun;
                  text: string;
                  bg: string;
                  border: string;
                  iconBg: string;
                  chip: string;
                  cardTone: string;
                  period: string;
                }> = {
                  manha: {
                    label: 'Matutino', icon: Sun, period: '07h–12h',
                    text: 'text-amber-700',
                    bg: 'bg-amber-50/60',
                    border: 'border-amber-300',
                    iconBg: 'bg-amber-100 ring-1 ring-amber-300',
                    chip: 'bg-amber-100 border-amber-300 text-amber-800',
                    cardTone: 'border-amber-200 bg-white',
                  },
                  tarde: {
                    label: 'Vespertino', icon: Sunset, period: '13h–18h',
                    text: 'text-orange-700',
                    bg: 'bg-orange-50/60',
                    border: 'border-orange-300',
                    iconBg: 'bg-orange-100 ring-1 ring-orange-300',
                    chip: 'bg-orange-100 border-orange-300 text-orange-800',
                    cardTone: 'border-orange-200 bg-white',
                  },
                  noite: {
                    label: 'Noturno', icon: Moon, period: '19h–22h',
                    text: 'text-indigo-700',
                    bg: 'bg-indigo-50/60',
                    border: 'border-indigo-300',
                    iconBg: 'bg-indigo-100 ring-1 ring-indigo-300',
                    chip: 'bg-indigo-100 border-indigo-300 text-indigo-800',
                    cardTone: 'border-indigo-200 bg-white',
                  },
                };
                const turnosOrdem: Turno[] = ['manha', 'tarde', 'noite'];
                const turnosAtivos = turnosOrdem.filter((t) =>
                  currentDraft.classes.some((c) => c.turno === t && currentDraft.schedule.some((s) => s.classId === c.id))
                );

                return turnosAtivos.map((turno) => {
                  const meta = TURNO_INFO[turno];
                  const TurnoIcon = meta.icon;
                  const turmasDoTurno = currentDraft.classes.filter((c) => c.turno === turno);

                  return (
                    <div
                      key={turno}
                      className={`relative rounded-2xl border ${meta.border} ${meta.bg} p-4 sm:p-5 space-y-4`}
                    >
                      {/* Header do turno */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${meta.iconBg}`}>
                            <TurnoIcon className={`h-6 w-6 ${meta.text}`} />
                          </div>
                          <div className="min-w-0">
                            <div className={`text-xs uppercase tracking-[0.18em] font-bold ${meta.text} opacity-80`}>
                              Turno
                            </div>
                            <div className={`font-extrabold text-lg sm:text-xl leading-tight ${meta.text}`}>
                              {meta.label}
                            </div>
                          </div>
                          <Badge variant="outline" className={`${meta.chip} text-[10px] font-mono font-bold ml-1`}>
                            {meta.period}
                          </Badge>
                        </div>
                        <Badge variant="outline" className={`${meta.chip} text-[11px] font-bold`}>
                          {turmasDoTurno.length} turma{turmasDoTurno.length > 1 ? 's' : ''}
                        </Badge>
                      </div>

                      {/* Lista de turmas desse turno */}
                      <div className="space-y-3">
                        {turmasDoTurno.map((cls) => {
                          const slotsCls = currentDraft.schedule.filter((s) => s.classId === cls.id);
                          if (slotsCls.length === 0) return null;
                          const subjectsInClass = Array.from(new Set(slotsCls.map((s) => s.subject_id)));

                          return (
                            <div key={cls.id} className={`rounded-xl border ${meta.cardTone} p-4 space-y-3 shadow-sm`}>
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${meta.chip} border`}>
                                    <TurnoIcon className="h-3 w-3" /> {meta.label}
                                  </span>
                                  <div className="font-bold text-base text-[#1B1E2C] break-words">{cls.nome || '(sem nome)'}</div>
                                </div>
                                <Badge variant="outline" className="border-[#1B1E2C]/20 text-[#1B1E2C]/70">
                                  {subjectsInClass.length} disciplina(s) · {slotsCls.length} aula(s)
                                </Badge>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                {subjectsInClass.map((subjectId) => {
                                  const subjectName = currentCourse.subjects.find((x) => x.id === subjectId)?.nome ?? '—';
                                  const groupSlots = slotsCls.filter((s) => s.subject_id === subjectId);
                                  const firstSlotId = groupSlots[0].id;
                                  const teacher = currentDraft.teachers.find((t) => t.scheduleSlotId === firstSlotId)
                                    ?? { scheduleSlotId: firstSlotId, nome: '', telefone: '', formacao: '', email: '', sem_indicacao: false };

                                  const sortedSlots = groupSlots.slice().sort((a, b) => {
                                    const wa = WEEKDAYS.findIndex((w) => w.key === a.weekday);
                                    const wb = WEEKDAYS.findIndex((w) => w.key === b.weekday);
                                    if (wa !== wb) return wa - wb;
                                    const tsa = currentDraft.hours.time_slots[a.turno].find((x) => x.id === a.time_slot_id)?.inicio ?? '';
                                    const tsb = currentDraft.hours.time_slots[b.turno].find((x) => x.id === b.time_slot_id)?.inicio ?? '';
                                    return tsa.localeCompare(tsb);
                                  });

                                  const isSemIndicacao = !!teacher.sem_indicacao;
                                  const blockedInfo = getBlockedTeacherInfoForGroup(cls.id, subjectId);
                                  const blockedKeys = new Set(blockedInfo.keys());
                                  const teacherKey = `${teacher.nome.trim().toLowerCase()}|${teacher.telefone.trim()}`;
                                  const hasConflict = !isSemIndicacao && !!teacher.nome.trim() && !!teacher.telefone.trim() && blockedKeys.has(teacherKey);

                                  const candidates = uniqueTeachers.filter((c) => {
                                    const k = `${c.nome.trim().toLowerCase()}|${c.telefone.trim()}`;
                                    return k === teacherKey || !blockedKeys.has(k);
                                  });

                                  const isComplete = !!(teacher.nome.trim() && teacher.telefone.trim() && teacher.formacao.trim());

                                  // Estado visual da disciplina → cor da barra lateral
                                  const sideBar = isSemIndicacao
                                    ? 'bg-[#FFDA45]'
                                    : hasConflict
                                      ? 'bg-red-500'
                                      : isComplete
                                        ? 'bg-[#1B1E2C]'
                                        : 'bg-[#1B1E2C]/15';

                                  // IMPORTANTE: NÃO filtramos a lista da escola — professores em conflito
                                  // ficam visíveis (apenas marcados); ao clicar abrimos a modal de conflito.
                                  const matched = schoolTeachers.find(
                                    (p) => normalizeName(p.nome_completo) === normalizeName(teacher.nome),
                                  );
                                  const selectedId = matched?.id ?? '';
                                  const hasVinculados = schoolTeachers.length > 0;
                                  const isBlockedSchoolTeacher = (p: typeof schoolTeachers[number]) => {
                                    const k = `${p.nome_completo.trim().toLowerCase()}|${(p.telefone || '').trim()}`;
                                    return k !== teacherKey && blockedKeys.has(k);
                                  };
                                  const availableCount = schoolTeachers.filter((p) => !isBlockedSchoolTeacher(p)).length;
                                  const blockedCount = schoolTeachers.length - availableCount;
                                  const vinculadosCurso = schoolTeachers.filter(
                                    (p) => p.vinculado_ao_curso && !isBlockedSchoolTeacher(p),
                                  ).length;
                                  // Ordena: selecionado → disponíveis vinculados ao curso → demais disponíveis → bloqueados (no fim)
                                  const orderedSchool = [...schoolTeachers].sort((a, b) => {
                                    if (a.id === selectedId) return -1;
                                    if (b.id === selectedId) return 1;
                                    const ab = isBlockedSchoolTeacher(a);
                                    const bb = isBlockedSchoolTeacher(b);
                                    if (ab !== bb) return ab ? 1 : -1;
                                    if (a.vinculado_ao_curso && !b.vinculado_ao_curso) return -1;
                                    if (!a.vinculado_ao_curso && b.vinculado_ao_curso) return 1;
                                    return a.nome_completo.localeCompare(b.nome_completo);
                                  });

                                  return (
                                    <div
                                      key={subjectId}
                                      className={`relative overflow-hidden rounded-lg border ${hasConflict ? 'border-red-300' : 'border-[#1B1E2C]/10'} bg-white shadow-sm transition-shadow hover:shadow-md`}
                                    >
                                      {/* Barra lateral indicadora de estado */}
                                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${sideBar}`} aria-hidden />

                                      <div className="pl-4 pr-3 py-3 space-y-2.5">
                                        {/* Header: nome da disciplina + reutilizar */}
                                        <div className="flex items-start justify-between gap-2 flex-wrap">
                                          <div className="min-w-0 flex-1">
                                            <div className="text-sm font-bold text-[#1B1E2C] break-words leading-tight">{subjectName}</div>
                                            <div className="text-[11px] text-[#1B1E2C]/55 mt-1">
                                              {sortedSlots.length} aula(s) na semana ·{' '}
                                              {sortedSlots.map((s) => {
                                                const ts = currentDraft.hours.time_slots[s.turno].find((x) => x.id === s.time_slot_id);
                                                return `${WEEKDAY_LABEL[s.weekday].slice(0, 3)} ${ts ? ts.inicio : ''}`;
                                              }).join(' • ')}
                                            </div>
                                          </div>
                                          {!isSemIndicacao && candidates.length > 0 && (
                                            <ReusePopover
                                              candidates={candidates}
                                              onPick={(t) => applyTeacherToGroup(cls.id, subjectId, t)}
                                            />
                                          )}
                                        </div>

                                        {/* Detecta se há indicação "de fora" preenchida (não é da escola) */}
                                        {/* hasForaFilled: algum campo digitado e nenhum match com a lista da escola */}
                                        {/* showSchool: oculta quando preencheu indicação de fora */}
                                        {/* showFora: oculta quando selecionou professor da escola */}
                                        {(() => { return null; })()}
                                        {!isSemIndicacao && !((!matched) && (teacher.nome.trim() || teacher.telefone.trim() || teacher.formacao.trim() || teacher.email.trim())) && (
                                          <div className="rounded-md border border-[#1B1E2C]/15 bg-[#1B1E2C]/[0.03] p-2.5 space-y-1.5">
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#1B1E2C]">
                                                <Link2 className="h-3 w-3" /> Professor da escola
                                                {hasVinculados && (
                                                  <span className="ml-1 inline-flex items-center justify-center rounded-full bg-[#1B1E2C] text-white text-[9px] font-bold px-1.5 py-0.5 leading-none">
                                                    {availableCount}{blockedCount > 0 ? `/${schoolTeachers.length}` : ''}
                                                  </span>
                                                )}
                                              </span>
                                              {matched && (
                                                <span className="inline-flex items-center gap-2">
                                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FFDA45] text-[#1B1E2C] text-[10px] font-bold px-2 py-0.5 border border-[#1B1E2C]/20">
                                                    <Check className="h-2.5 w-2.5" /> Selecionado
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={() => updateTeacherForGroup(cls.id, subjectId, { nome: '', telefone: '', formacao: '', email: '', sem_indicacao: false })}
                                                    className="text-[10px] font-bold text-[#1B1E2C] underline underline-offset-2 hover:no-underline"
                                                  >
                                                    Trocar
                                                  </button>
                                                </span>
                                              )}
                                            </div>
                                            {!hasVinculados ? (
                                              <p className="text-[11px] text-[#1B1E2C]/55 italic">
                                                Sem professores vinculados a esta escola — use uma das opções abaixo.
                                              </p>
                                            ) : (
                                              <>
                                                <SearchableSelect
                                                  value={selectedId}
                                                  onValueChange={(id) => {
                                                    const p = schoolTeachers.find((x) => x.id === id);
                                                    if (!p) return;
                                                    // Conflito? Não atribui — abre modal explicativa.
                                                    if (isBlockedSchoolTeacher(p)) {
                                                      const k = `${p.nome_completo.trim().toLowerCase()}|${(p.telefone || '').trim()}`;
                                                      const infos = blockedInfo.get(k) ?? [];
                                                      const previews = infos.map((info) =>
                                                        buildPreviewConflict(p.nome_completo, p.telefone || '', info),
                                                      );
                                                      if (previews.length > 0) setPreviewConflicts(previews);
                                                      return;
                                                    }
                                                    updateTeacherForGroup(cls.id, subjectId, {
                                                      nome: p.nome_completo,
                                                      telefone: p.telefone || '',
                                                      formacao: p.formacao || '',
                                                      email: p.email || '',
                                                      sem_indicacao: false,
                                                    });
                                                  }}
                                                  options={orderedSchool.map((p) => {
                                                    const cursos = (p.cursos_vinculados ?? []).filter(Boolean);
                                                    const blocked = isBlockedSchoolTeacher(p);
                                                    const k = `${p.nome_completo.trim().toLowerCase()}|${(p.telefone || '').trim()}`;
                                                    const infos = blocked ? (blockedInfo.get(k) ?? []) : [];
                                                    const conflictTag = blocked && infos[0]
                                                      ? `⚠ Conflito ${WEEKDAY_LABEL[infos[0].weekday].slice(0, 3)} ${infos[0].overlapStart}–${infos[0].overlapEnd} em ${infos[0].otherClassName}`
                                                      : '';
                                                    const tag = p.vinculado_ao_curso
                                                      ? '★ Deste curso'
                                                      : cursos.length > 0
                                                        ? `Outro curso: ${cursos.slice(0, 2).join(', ')}${cursos.length > 2 ? '…' : ''}`
                                                        : '';
                                                    return {
                                                      value: p.id,
                                                      label: blocked ? `${p.nome_completo}` : p.nome_completo,
                                                      // NÃO desabilitamos no cmdk — clique abre a modal.
                                                      disabled: false,
                                                      description: [conflictTag, tag, p.formacao, p.telefone].filter(Boolean).join(' · '),
                                                    };
                                                  })}
                                                  placeholder="Escolher professor da escola…"
                                                  searchPlaceholder="Buscar por nome…"
                                                  emptyMessage="Nenhum professor cadastrado nesta escola."
                                                  className="bg-white border-[#1B1E2C]/20"
                                                />
                                                <p className="text-[10px] text-[#1B1E2C]/55">
                                                  {availableCount} de {schoolTeachers.length} disponível(is) neste horário
                                                  {blockedCount > 0 && ` · ${blockedCount} com conflito (clique para ver)`}
                                                  {vinculadosCurso > 0 && ` · ${vinculadosCurso} já leciona(m) neste curso`}.
                                                </p>
                                              </>
                                            )}
                                          </div>
                                        )}

                                        {/* Divisor "OU" — só quando ambas faixas visíveis */}
                                        {!isSemIndicacao && !matched && !(teacher.nome.trim() || teacher.telefone.trim() || teacher.formacao.trim() || teacher.email.trim()) && (
                                          <div className="flex items-center gap-2 py-0.5">
                                            <div className="flex-1 h-px bg-[#1B1E2C]/10" />
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-[#1B1E2C]/40">ou</span>
                                            <div className="flex-1 h-px bg-[#1B1E2C]/10" />
                                          </div>
                                        )}

                                        {/* === Faixa 2 — INDICAR NOVO === Oculta quando professor da escola selecionado */}
                                        {!isSemIndicacao && !matched && (
                                          <div className="rounded-md border border-dashed border-[#1B1E2C]/20 bg-white p-2.5 space-y-2">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#1B1E2C]/70">
                                              <UserPlus className="h-3 w-3" /> Indicar professor de fora da lista
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                              <TeacherNameAutocomplete
                                                value={teacher.nome}
                                                candidates={candidates}
                                                disabled={isSemIndicacao}
                                                onChange={(v) => updateTeacherForGroup(cls.id, subjectId, { nome: v })}
                                                onPick={(t) => applyTeacherToGroup(cls.id, subjectId, t)}
                                              />
                                              <Input placeholder="Telefone *" value={teacher.telefone}
                                                disabled={isSemIndicacao}
                                                onChange={(e) => updateTeacherForGroup(cls.id, subjectId, { telefone: e.target.value })} />
                                              <Input placeholder="Formação *" value={teacher.formacao}
                                                disabled={isSemIndicacao}
                                                onChange={(e) => updateTeacherForGroup(cls.id, subjectId, { formacao: e.target.value })} />
                                              <Input type="email" placeholder="E-mail (opcional)" value={teacher.email}
                                                disabled={isSemIndicacao}
                                                onChange={(e) => updateTeacherForGroup(cls.id, subjectId, { email: e.target.value })} />
                                            </div>
                                            {hasConflict && (
                                              <div className="text-[11px] text-red-700 font-medium bg-red-50 border border-red-200 rounded px-2 py-1">
                                                ⚠ Este professor já leciona em outra turma no mesmo dia/horário.
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* === Faixa 3 — SEM INDICAÇÃO (amarelo Neovale quando ativo, discreto azul quando inativo) === */}
                                        {isSemIndicacao ? (
                                          <div className="flex items-center justify-between gap-3 rounded-md border-2 border-[#1B1E2C] bg-[#FFDA45] px-3 py-2 shadow-sm">
                                            <div className="flex items-center gap-2 min-w-0">
                                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1B1E2C] text-[#FFDA45] flex-shrink-0">
                                                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                              </div>
                                              <div className="min-w-0">
                                                <div className="text-xs font-bold text-[#1B1E2C] leading-tight">
                                                  Sem indicação — R.H. define
                                                </div>
                                                <div className="text-[10px] text-[#1B1E2C]/70 leading-tight mt-0.5">
                                                  O R.H. ficará responsável por esta disciplina.
                                                </div>
                                              </div>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => updateTeacherForGroup(cls.id, subjectId, { sem_indicacao: false })}
                                              className="text-[11px] font-bold text-[#1B1E2C] underline underline-offset-2 hover:no-underline whitespace-nowrap"
                                            >
                                              Desfazer
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => updateTeacherForGroup(cls.id, subjectId, {
                                              sem_indicacao: true, nome: '', telefone: '', formacao: '', email: '',
                                            })}
                                            className="group inline-flex w-full items-center justify-between gap-2 rounded-md border border-dashed border-[#1B1E2C]/30 bg-white px-3 py-2 text-left text-[11px] font-semibold text-[#1B1E2C]/70 transition-all hover:border-[#FFDA45] hover:bg-[#FFDA45]/10 hover:text-[#1B1E2C]"
                                          >
                                            <span className="flex items-center gap-2 min-w-0">
                                              <HelpCircle className="h-3.5 w-3.5 flex-shrink-0 text-[#1B1E2C]/50 group-hover:text-[#1B1E2C]" />
                                              <span className="truncate">Não tenho indicação — deixar para o R.H.</span>
                                            </span>
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-[#1B1E2C]/50 group-hover:text-[#1B1E2C] whitespace-nowrap">
                                              R.H. define
                                            </span>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}

              {(() => {
                if (!currentDraft) return null;
                let total = 0, resolved = 0, semInd = 0, preenchidas = 0;
                for (const cls of currentDraft.classes) {
                  const slotsCls = currentDraft.schedule.filter((s) => s.classId === cls.id);
                  const subjectIds = Array.from(new Set(slotsCls.map((s) => s.subject_id)));
                  for (const subjectId of subjectIds) {
                    total++;
                    const firstSlotId = slotsCls.find((s) => s.subject_id === subjectId)!.id;
                    const t = currentDraft.teachers.find((x) => x.scheduleSlotId === firstSlotId);
                    if (t?.sem_indicacao) { resolved++; semInd++; }
                    else if (t && t.nome.trim() && t.telefone.trim() && t.formacao.trim()) { resolved++; preenchidas++; }
                  }
                }
                const pct = total ? Math.round((resolved / total) * 100) : 0;
                const allDone = resolved === total && total > 0;
                return (
                  <div className={`rounded-lg border px-4 py-3 flex items-center justify-between gap-3 flex-wrap ${allDone ? 'border-emerald-300 bg-emerald-50' : 'border-[#1B1E2C]/15 bg-[#F9FAFC]'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${allDone ? 'bg-emerald-500 text-white' : 'bg-[#FFDA45] text-[#1B1E2C]'}`}>
                        {allDone ? '✓' : pct + '%'}
                      </div>
                      <div className="text-sm">
                        <div className="font-semibold text-[#1B1E2C]">
                          {resolved} de {total} disciplina(s) resolvidas
                        </div>
                        <div className="text-[11px] text-[#1B1E2C]/60">
                          {preenchidas} preenchida(s) · {semInd} sem indicação · {Math.max(0, total - resolved)} sem professor indicado
                        </div>
                      </div>
                    </div>
                    <div className="h-2 flex-1 min-w-[120px] max-w-[260px] bg-[#1B1E2C]/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${allDone ? 'bg-emerald-500' : 'bg-[#FFDA45]'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              <PortalFooterNav
                onBack={() => setDraft((d) => ({ ...d, current_step: 4 }))}
                backLabel="Voltar à grade"
                onSaveDraft={handleManualSave}
                onNext={() => {
                  const issue = validateStep5Detailed();
                  if (issue) { setValidationIssue(issue); return; }
                  setDraft((d) => ({ ...d, current_step: 6 }));
                }}
                nextLabel="Revisar curso"
              />
            </CardContent>
          </Card>
        )}

        {/* Fase 6 — Revisão */}
        {info && draft.current_step === 6 && currentCourse && currentDraft && (<><CurrentCourseBanner /></>)}
        {info && draft.current_step === 6 && currentCourse && currentDraft && (() => {
          const alreadySent = draft.courses[currentCourse.id]?.status === 'submitted';
          return (
          <Card className="border-[#1B1E2C]/10 bg-white shadow-sm overflow-hidden">
            <CardHeader className="border-b-2 border-[#FFDA45]/70 bg-gradient-to-b from-[#FAFBFD] to-white">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45] font-bold">FASE 6 DE 7</Badge>
                <Badge variant="outline" className="border-[#1B1E2C]/20 text-[#1B1E2C]/75">Revisão</Badge>
                {alreadySent && (
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Curso já enviado</Badge>
                )}
              </div>
              <CardTitle className="flex items-center gap-2 text-2xl text-[#1B1E2C]"><CircleCheck className="h-6 w-6 text-[#1B1E2C]" /> Revisar antes de enviar</CardTitle>
              <CardDescription className="text-[#1B1E2C]/65">
                Confira o curso <strong className="text-[#1B1E2C]">{currentCourse.nome}</strong>. Após enviar, marcamos como concluído.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              {alreadySent && (
                <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 flex items-start gap-2">
                  <CircleCheck className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Este curso já foi enviado ao R.H.</strong> O botão de envio foi bloqueado para evitar duplicação de turmas e indicações.
                    Se precisar alterar algo, solicite ao R.H. para <strong>reabrir os horários</strong> em <em>Links por Escola</em>.
                  </div>
                </div>
              )}
              <CourseReviewGrid course={currentCourse} draft={currentDraft} tetoCH={tetoCH} schoolName={info.school.nome} schoolTeacherNames={new Set(schoolTeachers.map((p) => normalizeName(p.nome_completo)))} />
              <PortalFooterNav
                onBack={() => setDraft((d) => ({ ...d, current_step: 5 }))}
                backLabel="Editar"
                onNext={submitCurrentCourse}
                nextLabel={alreadySent ? 'Curso já enviado' : 'Confirmar e enviar curso'}
                nextVariant="success"
                nextDisabled={submittingCourse || alreadySent}
                nextIcon={submittingCourse
                  ? <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  : <CircleCheck className="h-4 w-4 ml-2" />
                }
              />

            </CardContent>
          </Card>
          );
        })()}


        {/* Fase 7 — Final (sucesso) com resumo completo somente-leitura */}
        {info && draft.current_step === 7 && (() => {
          const submittedCourses = info.courses
            .map((c) => ({ courseInfo: c, courseDraft: draft.courses[c.id] }))
            .filter((x) => x.courseDraft && x.courseDraft.status === 'submitted');
          const totalIndic = submittedCourses.reduce((s, x) => s + x.courseDraft.teachers.length, 0);
          const schoolTeacherNames = new Set(schoolTeachers.map((p) => normalizeName(p.nome_completo)));
          return (
            <div className="space-y-6">
              {/* Cabeçalho de sucesso */}
              <Card className="border-[#1B1E2C]/10 bg-white shadow-sm">
                <CardContent className="py-10 text-center space-y-4">
                  <div className="mx-auto h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center ring-4 ring-emerald-50">
                    <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-[#1B1E2C]">Indicações enviadas com sucesso!</h2>
                  <p className="text-[#1B1E2C]/70 max-w-xl mx-auto">
                    {submittedCourses.length} curso(s) enviado(s) — total de {totalIndic} indicação(ões).
                    O R.H. analisará e entrará em contato com os selecionados.
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
                    <Info className="h-3.5 w-3.5" />
                    Envio confirmado — somente leitura. Para alterações, fale com o R.H.
                  </div>
                </CardContent>
              </Card>

              {/* Resumo somente-leitura de cada curso enviado */}
              {submittedCourses.map(({ courseInfo, courseDraft }) => (
                <Card key={courseInfo.id} className="border-[#1B1E2C]/10 bg-white shadow-sm overflow-hidden">
                  <CardHeader className="border-b-2 border-emerald-400/70 bg-gradient-to-b from-emerald-50/60 to-white">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 font-bold inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> ENVIADO
                      </Badge>
                      <Badge variant="outline" className="border-[#1B1E2C]/20 text-[#1B1E2C]/75">Somente leitura</Badge>
                    </div>
                    <CardTitle className="flex items-center gap-2 text-xl text-[#1B1E2C]">
                      <BookOpen className="h-5 w-5 text-[#1B1E2C]" /> {courseInfo.nome}
                    </CardTitle>
                    <CardDescription className="text-[#1B1E2C]/65">
                      Grade horária por turno e por turma, com os professores indicados. Este envio não pode mais ser editado.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <CourseReviewGrid
                      course={courseInfo}
                      draft={courseDraft}
                      tetoCH={tetoCH}
                      schoolName={info.school.nome}
                      schoolTeacherNames={schoolTeacherNames}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        })()}
      </div>

      <ScheduleConflictModal
        open={conflictModalOpen || !!previewConflicts}
        onOpenChange={(o) => {
          if (!o) {
            setConflictModalOpen(false);
            setPreviewConflicts(null);
          } else {
            setConflictModalOpen(true);
          }
        }}
        conflicts={previewConflicts ?? conflictItems}
        context="external"
        onApplyAction={(a) => {
          handleConflictAction(a);
          setPreviewConflicts(null);
        }}
        onDismiss={() => {
          if (!previewConflicts) setConflictDismissedKey(conflictKeysSig);
          setPreviewConflicts(null);
        }}
        hint={previewConflicts
          ? 'Esse professor já tem outra alocação no mesmo horário.'
          : 'Resolva antes de finalizar este curso.'}
      />

      {/* Modal detalhado de validação — substitui toasts opacos com explicação + sugestões + lista. */}
      <Dialog open={!!validationIssue} onOpenChange={(o) => { if (!o) setValidationIssue(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className={`shrink-0 h-10 w-10 rounded-full grid place-items-center ${
                validationIssue?.kind === 'conflict'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-[#FFDA45]/30 text-[#1B1E2C]'
              }`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-[#1B1E2C] text-xl">
                  {validationIssue?.title}
                </DialogTitle>
                <DialogDescription className="text-[#1B1E2C]/70 mt-1">
                  {validationIssue?.summary}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {validationIssue && (
            <div className="space-y-4 mt-2">
              <div className="rounded-lg border border-[#1B1E2C]/10 bg-[#F8F9FB] p-3">
                <div className="text-xs font-semibold text-[#1B1E2C]/60 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" /> Por que isso aparece?
                </div>
                <p className="text-sm text-[#1B1E2C] leading-relaxed">{validationIssue.explanation}</p>
              </div>

              <div className="rounded-lg border-l-4 border-[#FFDA45] bg-[#FFFBE8] p-3">
                <div className="text-xs font-semibold text-[#1B1E2C] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Como resolver
                </div>
                <ul className="space-y-1.5">
                  {validationIssue.suggestion.map((s, i) => (
                    <li key={i} className="text-sm text-[#1B1E2C] flex gap-2">
                      <span className="shrink-0 h-5 w-5 rounded-full bg-[#FFDA45] text-[#1B1E2C] text-[11px] font-bold grid place-items-center">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed pt-0.5">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {validationIssue.items.length > 0 && (
                <div className="rounded-lg border border-[#1B1E2C]/10 bg-white">
                  <div className="px-3 py-2 border-b border-[#1B1E2C]/10 text-xs font-semibold text-[#1B1E2C]/60 uppercase tracking-wide flex items-center justify-between">
                    <span>Disciplinas afetadas</span>
                    <Badge variant="secondary" className="text-[10px]">{validationIssue.items.length}</Badge>
                  </div>
                  <ScrollArea className="max-h-56">
                    <ul className="divide-y divide-[#1B1E2C]/5">
                      {validationIssue.items.map((it, i) => (
                        <li key={i} className="px-3 py-2 text-sm text-[#1B1E2C] flex items-center gap-2">
                          <Circle className="h-2 w-2 fill-[#FFDA45] text-[#FFDA45] shrink-0" />
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4 gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setValidationIssue(null)}
              className="border-[#1B1E2C]/20"
            >
              Fechar e revisar
            </Button>
            <Button
              onClick={async () => {
                setValidationIssue(null);
                await handleManualSave();
              }}
              className="bg-[#1B1E2C] text-white hover:bg-[#1B1E2C]/90"
            >
              <Save className="h-4 w-4 mr-1.5" /> Salvar rascunho e continuar depois
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =====================================================================
// Subcomponentes
// =====================================================================

function Stepper({ current, totalCourses, submitted }: { current: Step; totalCourses: number; submitted: number }) {
  const steps = [
    { n: 1, label: 'Acesso' },
    { n: 2, label: 'Cursos' },
    { n: 3, label: 'Turmas' },
    { n: 4, label: 'Grade' },
    { n: 5, label: 'Professores' },
    { n: 6, label: 'Revisão' },
    { n: 7, label: 'Concluído' },
  ];
  return (
    <div className="rounded-xl border border-[#1B1E2C]/10 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 overflow-x-auto">
        {steps.map((s, i) => {
          const active = current === s.n;
          const done = current > s.n;
          return (
            <div key={s.n} className="flex items-center gap-2 flex-1 min-w-[80px]">
              <div className={`h-8 w-8 rounded-full grid place-items-center text-xs font-bold transition shadow-sm
                ${done
                  ? 'bg-emerald-500 text-white'
                  : active
                    ? 'bg-[#FFDA45] text-[#1B1E2C] ring-4 ring-[#FFDA45]/25'
                    : 'bg-[#F0F1F5] text-[#1B1E2C]/40'}`}>
                {done ? '✓' : s.n}
              </div>
              <div className={`text-xs whitespace-nowrap ${active ? 'text-[#1B1E2C] font-semibold' : 'text-[#1B1E2C]/45'}`}>
                {s.label}
              </div>
              {i < steps.length - 1 && <div className="flex-1 h-px bg-[#1B1E2C]/10 hidden sm:block" />}
            </div>
          );
        })}
      </div>
      {totalCourses > 0 && (
        <div className="mt-3 pt-3 border-t border-[#1B1E2C]/5 text-xs text-[#1B1E2C]/55 text-right">
          Cursos concluídos: <strong className="text-[#1B1E2C]">{submitted}/{totalCourses}</strong>
        </div>
      )}
    </div>
  );
}

function HelpBanner({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-xl border border-[#1B1E2C]/10 bg-white overflow-hidden shadow-sm border-l-4 border-l-[#FFDA45]">
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left">
        <div className="flex items-center gap-2 font-semibold text-[#1B1E2C]">
          <Info className="h-4 w-4 text-[#1B1E2C]" /> Como funciona o cálculo de professores?
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-[#1B1E2C]" /> : <ChevronDown className="h-4 w-4 text-[#1B1E2C]" />}
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-[#1B1E2C]/80 space-y-2 border-t border-[#FFDA45]/40">
          <p className="pt-3">
            Para cada curso você vai: <strong className="text-[#1B1E2C]">(1) cadastrar turmas</strong> → <strong className="text-[#1B1E2C]">(2) montar a grade horária</strong> escolhendo a disciplina em cada dia/horário → <strong className="text-[#1B1E2C]">(3) indicar 1 professor por aula</strong>.
          </p>
          <p className="text-xs text-[#1B1E2C]/65">
            Dica: o mesmo professor pode aparecer em várias aulas (em turmas e disciplinas diferentes). Use o botão <strong className="text-[#1B1E2C]">"Reutilizar"</strong> na fase de indicação para repetir os dados.
          </p>
        </div>
      )}
    </div>
  );
}

function DemandSummaryGrid({ course, tetoCH }: { course: CourseDraft; tetoCH: number }) {
  const totalSlots = course.schedule.length;
  if (totalSlots === 0) {
    return (
      <div className="rounded-xl border border-[#1B1E2C]/10 bg-[#F9FAFC] p-4 text-sm text-[#1B1E2C]/55 text-center">
        Selecione disciplinas na grade acima para ver o cálculo automático.
      </div>
    );
  }

  // Total geral (com simultaneidade)
  let totalMin = 0;
  course.schedule.forEach((s) => {
    const ts = course.hours.time_slots[s.turno].find((x) => x.id === s.time_slot_id);
    if (ts) totalMin += durationMinutes(ts.inicio, ts.fim);
  });
  const picoGeral = calcPeakSimultaneity(course.schedule, course.hours.time_slots);
  const d = calcGridDemand(totalSlots, totalMin, tetoCH, picoGeral);

  // Profissionais únicos já indicados (geral)
  const seen = new Set<string>();
  course.teachers.forEach((t) => {
    if (!t.nome.trim() || !t.telefone.trim()) return;
    seen.add(`${t.nome.trim().toLowerCase()}|${t.telefone.trim()}`);
  });

  // Breakdown por TURNO — apenas turnos que têm pelo menos 1 turma cadastrada
  const TURNO_META: Record<Turno, {
    label: string;
    icon: typeof Sun;
    text: string;
    bgGrad: string;
    border: string;
    chip: string;
    iconBg: string;
    period: string;
    accent: string;
  }> = {
    manha: {
      label: 'Matutino',
      icon: Sun,
      text: 'text-amber-700',
      bgGrad: 'from-amber-50 to-white',
      border: 'border-amber-200',
      chip: 'bg-amber-100 border-amber-300 text-amber-800',
      iconBg: 'bg-amber-100 ring-1 ring-amber-300',
      period: '07h–12h',
      accent: 'bg-amber-400',
    },
    tarde: {
      label: 'Vespertino',
      icon: Sunset,
      text: 'text-orange-700',
      bgGrad: 'from-orange-50 to-white',
      border: 'border-orange-200',
      chip: 'bg-orange-100 border-orange-300 text-orange-800',
      iconBg: 'bg-orange-100 ring-1 ring-orange-300',
      period: '13h–18h',
      accent: 'bg-orange-400',
    },
    noite: {
      label: 'Noturno',
      icon: Moon,
      text: 'text-indigo-700',
      bgGrad: 'from-indigo-50 to-white',
      border: 'border-indigo-200',
      chip: 'bg-indigo-100 border-indigo-300 text-indigo-800',
      iconBg: 'bg-indigo-100 ring-1 ring-indigo-300',
      period: '19h–22h',
      accent: 'bg-indigo-400',
    },
  };
  const turnosComTurma: Turno[] = (['manha', 'tarde', 'noite'] as Turno[]).filter(
    (t) => course.classes.some((c) => c.turno === t),
  );

  const byTurno = turnosComTurma.map((turno) => {
    const classIds = course.classes.filter((c) => c.turno === turno).map((c) => c.id);
    const slots = course.schedule.filter((s) => classIds.includes(s.classId));
    let min = 0;
    slots.forEach((s) => {
      const ts = course.hours.time_slots[s.turno].find((x) => x.id === s.time_slot_id);
      if (ts) min += durationMinutes(ts.inicio, ts.fim);
    });
    const pico = calcPeakSimultaneity(slots, course.hours.time_slots);
    const dem = calcGridDemand(slots.length, min, tetoCH, pico);
    const seenT = new Set<string>();
    slots.forEach((s) => {
      const t = course.teachers.find((x) => x.scheduleSlotId === s.id);
      if (!t?.nome.trim() || !t.telefone.trim()) return;
      seenT.add(`${t.nome.trim().toLowerCase()}|${t.telefone.trim()}`);
    });
    return {
      turno,
      qtdTurmas: classIds.length,
      qtdAulas: slots.length,
      horas: dem.total_horas,
      sugeridos: dem.profissionais_sugeridos,
      pico: dem.pico_simultaneidade,
      ajusteConflito: dem.ajuste_por_conflito,
      indicados: seenT.size,
      meta: TURNO_META[turno],
    };
  });

  const totalSugeridos = d.profissionais_sugeridos;
  const totalIndicados = seen.size;
  const pctGeral = totalSugeridos > 0 ? Math.min(100, Math.round((totalIndicados / totalSugeridos) * 100)) : 0;

  return (
    <div className="rounded-2xl border border-[#1B1E2C]/10 bg-white shadow-sm overflow-hidden">
      {/* Header com faixa amarela compacta + mini progresso */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-[#1B1E2C]/8 bg-gradient-to-r from-[#FFDA45]/30 via-[#FFDA45]/10 to-transparent">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFDA45] shadow-sm ring-1 ring-[#1B1E2C]/10">
            <Sparkles className="h-4 w-4 text-[#1B1E2C]" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#1B1E2C]/55 leading-none">
              Resumo da demanda
            </div>
            <div className="text-base sm:text-lg font-bold text-[#1B1E2C] leading-tight mt-0.5">
              Cálculo automático
            </div>
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1 min-w-[170px]">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono font-bold text-lg text-[#1B1E2C] tabular-nums">{totalIndicados}</span>
            <span className="text-xs text-[#1B1E2C]/60">/ {totalSugeridos} indicados</span>
            {pctGeral >= 100 && <span className="text-xs font-bold text-emerald-600 ml-1">✓</span>}
          </div>
          <div className="h-1.5 w-full bg-[#1B1E2C]/8 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${pctGeral >= 100 ? 'bg-emerald-500' : 'bg-[#FFDA45]'}`}
              style={{ width: `${pctGeral}%` }}
            />
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">

      {/* KPIs principais — destaque maior */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <BigStat
          label="Carga horária total"
          value={`${d.total_horas}h`}
          sub="por semana"
          icon={Clock}
          highlight
        />
        <BigStat
          label="Aulas na grade"
          value={d.total_slots}
          sub={`em ${course.classes.length} turma(s)`}
          icon={CalendarDays}
        />
        <BigStat
          label="Professores sugeridos p/ contratação"
          value={d.profissionais_sugeridos}
          sub={
            d.ajuste_por_conflito > 0
              ? `pico ${d.pico_simultaneidade} turmas no mesmo horário`
              : `teto ${tetoCH}h/sem por professor`
          }
          icon={Users}
          accent
        />
        <BigStat
          label="Distintos já indicados"
          value={`${seen.size}/${d.profissionais_sugeridos}`}
          sub={seen.size >= d.profissionais_sugeridos ? '✓ meta atingida' : `faltam ${Math.max(0, d.profissionais_sugeridos - seen.size)}`}
          icon={GraduationCap}
          ok={seen.size >= d.profissionais_sugeridos}
        />
      </div>

      {/* Breakdown por turno — visual reforçado (light) */}
      {byTurno.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#1B1E2C]/15 to-transparent" />
            <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[#1B1E2C]/70">
              Por turno
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#1B1E2C]/15 to-transparent" />
          </div>

          <div className={`grid grid-cols-1 ${byTurno.length === 2 ? 'md:grid-cols-2' : byTurno.length >= 3 ? 'md:grid-cols-2 lg:grid-cols-3' : ''} gap-3`}>
            {byTurno.map((b) => {
              const Icon = b.meta.icon;
              const completo = b.indicados >= b.sugeridos && b.sugeridos > 0;
              const pct = b.sugeridos > 0 ? Math.min(100, Math.round((b.indicados / b.sugeridos) * 100)) : 0;
              return (
                <div
                  key={b.turno}
                  className="relative overflow-hidden rounded-xl border border-[#1B1E2C]/10 bg-white p-4 space-y-4 shadow-sm hover:border-[#1B1E2C]/20 hover:shadow-md transition-all"
                >
                  {/* faixa lateral colorida */}
                  <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${b.meta.iconBg}`} />

                  {/* Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`h-8 w-8 rounded-md flex items-center justify-center ${b.meta.iconBg}`}>
                        <Icon className={`h-4 w-4 ${b.meta.text}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-[15px] text-[#1B1E2C] leading-tight">
                          {b.meta.label}
                        </div>
                        <div className="text-[10px] text-[#1B1E2C]/50 font-mono mt-0.5">
                          {b.meta.period} · {b.qtdTurmas} turma{b.qtdTurmas > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* HERO: Professores sugeridos */}
                  <div className="text-center py-1">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-[#1B1E2C]/55 font-semibold mb-1">
                      Professores sugeridos
                    </div>
                    <div className="flex items-baseline justify-center gap-1.5">
                      <span className={`font-mono font-bold text-5xl leading-none ${completo ? 'text-emerald-600' : 'text-[#1B1E2C]'}`}>
                        {b.sugeridos}
                      </span>
                      <span className="text-sm text-[#1B1E2C]/50 font-medium">
                        p/ contratar
                      </span>
                    </div>
                    {b.ajusteConflito > 0 && (
                      <div className="mt-1.5 text-[10px] text-amber-700 inline-flex items-center gap-1">
                        <span>⚠</span>
                        <span>Pico de {b.pico} turmas simultâneas</span>
                      </div>
                    )}
                  </div>

                  {/* Métricas secundárias */}
                  <div className="flex items-center justify-between text-[11px] text-[#1B1E2C]/65 border-t border-[#1B1E2C]/10 pt-3">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="h-3 w-3 text-[#1B1E2C]/45" />
                      <span><strong className="text-[#1B1E2C] font-semibold">{b.qtdAulas}</strong> aulas</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-[#1B1E2C]/45" />
                      <span><strong className="text-[#1B1E2C] font-semibold">{b.horas}h</strong>/sem</span>
                    </div>
                  </div>

                  {/* Progresso de indicação */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-[#1B1E2C]/55 uppercase tracking-wide font-semibold">Já indicados</span>
                      <span className={`font-mono font-bold ${completo ? 'text-emerald-600' : 'text-[#1B1E2C]'}`}>
                        {b.indicados}/{b.sugeridos}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#1B1E2C]/8 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${completo ? 'bg-emerald-500' : 'bg-[#FFDA45]'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className={`text-[10px] mt-1 ${completo ? 'text-emerald-700' : 'text-[#1B1E2C]/55'}`}>
                      {completo
                        ? '✓ Meta atingida'
                        : b.sugeridos > 0
                          ? `Faltam ${b.sugeridos - b.indicados} indicação(ões)`
                          : 'Sem demanda'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-[11px] text-[#1B1E2C]/65 leading-relaxed bg-[#FFDA45]/10 border border-[#FFDA45]/30 rounded-lg p-3">
        Cada aula precisa de 1 indicação. O mesmo professor pode cobrir várias aulas (use "Reutilizar"), <strong className="text-[#1B1E2C]">desde que não haja choque de horário</strong>: 1 professor não pode estar em 2 turmas ao mesmo tempo. Teto considerado: <strong className="text-[#1B1E2C]">{tetoCH}h/sem</strong>.
      </div>
      </div>
    </div>
  );
}

function BigStat({
  label, value, sub, icon: Icon, highlight, accent, ok,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: typeof Sun;
  highlight?: boolean;
  accent?: boolean;
  ok?: boolean;
}) {
  const cls = ok
    ? 'border-emerald-300 bg-emerald-50'
    : accent
      ? 'border-[#FFDA45] bg-[#FFDA45]/25 ring-2 ring-[#FFDA45]/40'
      : highlight
        ? 'border-[#FFDA45]/60 bg-[#FFDA45]/15'
        : 'border-[#1B1E2C]/12 bg-white';
  const valueCls = ok ? 'text-emerald-700' : accent || highlight ? 'text-[#1B1E2C]' : 'text-[#1B1E2C]';
  const iconCls = ok ? 'text-emerald-600' : accent || highlight ? 'text-[#1B1E2C]' : 'text-[#1B1E2C]/60';
  return (
    <div className={`rounded-xl border ${cls} p-3 sm:p-4 space-y-1 shadow-sm`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconCls}`} />
        <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-[#1B1E2C]/65 font-semibold leading-tight">
          {label}
        </div>
      </div>
      <div className={`font-mono font-bold text-2xl sm:text-3xl ${valueCls} leading-none`}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-[#1B1E2C]/60">{sub}</div>}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-2 border ${highlight ? 'bg-[#FFDA45]/20 border-[#FFDA45]/50' : 'bg-white border-[#1B1E2C]/10'}`}>
      <div className="text-[#1B1E2C]/60 text-[10px] uppercase tracking-wide">{label}</div>
      <div className={`font-bold ${highlight ? 'text-[#1B1E2C]' : 'text-[#1B1E2C]'}`}>{value}</div>
    </div>
  );
}

function CourseStatusIcon({ status }: { status: CourseDraft['status'] }) {
  if (status === 'submitted') return <CircleCheck className="h-5 w-5 text-emerald-600" />;
  if (status === 'in_progress') return <CircleDot className="h-5 w-5 text-[#F5C518]" />;
  return <Circle className="h-5 w-5 text-[#1B1E2C]/30" />;
}

function CourseStatusBadge({ status }: { status: CourseDraft['status'] }) {
  if (status === 'submitted') return <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-emerald-100">Concluído</Badge>;
  if (status === 'in_progress') return <Badge className="bg-[#FFDA45]/25 text-[#1B1E2C] border border-[#FFDA45] hover:bg-[#FFDA45]/25">Em andamento</Badge>;
  return <Badge variant="outline" className="border-[#1B1E2C]/20 text-[#1B1E2C]/60">Pendente</Badge>;
}

function ReusePopover({ candidates, onPick }: { candidates: TeacherSlotDraft[]; onPick: (t: TeacherSlotDraft) => void }) {
  const [open, setOpen] = useState(false);
  if (candidates.length === 0) return null;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#FFDA45] to-[#F5C518] px-3 py-1.5 text-xs font-bold text-[#1B1E2C] shadow-[0_4px_14px_rgba(255,218,69,0.35)] ring-1 ring-[#FFDA45]/60 transition-all hover:shadow-[0_6px_20px_rgba(255,218,69,0.55)] hover:-translate-y-0.5 active:translate-y-0"
        title="Reutilizar dados de um professor já indicado"
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span>Reutilizar professor</span>
        <span className="ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#1B1E2C]/15 px-1 text-[10px] font-extrabold tabular-nums">
          {candidates.length}
        </span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-xl border border-[#FFDA45]/50 bg-white shadow-2xl ring-1 ring-[#1B1E2C]/10">
            <div className="border-b border-[#1B1E2C]/10 bg-gradient-to-r from-[#FFDA45]/20 to-transparent px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#1B1E2C]">
                Já indicados
              </div>
              <div className="text-[10px] text-[#1B1E2C]/55">Selecione para preencher automaticamente</div>
            </div>
            <div className="max-h-64 overflow-auto p-1">
              {candidates.map((c, i) => (
                <button
                  key={`${c.nome}-${c.telefone}-${i}`}
                  onClick={() => { onPick(c); setOpen(false); }}
                  className="group flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-[#FFDA45]/15"
                >
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#FFDA45]/25 text-xs font-bold text-[#1B1E2C] ring-1 ring-[#FFDA45]/50">
                    {c.nome.trim().charAt(0).toUpperCase() || '?'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[#1B1E2C] group-hover:text-[#1B1E2C]">{c.nome}</div>
                    <div className="truncate text-[11px] text-[#1B1E2C]/55">{c.telefone} · {c.formacao}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CourseReviewGrid({ course, draft, tetoCH, schoolName, schoolTeacherNames }: { course: LinkInfoCourse; draft: CourseDraft; tetoCH: number; schoolName?: string; schoolTeacherNames?: Set<string> }) {
  // Ordem fixa dos dias da semana
  const WEEKDAY_ORDER: Record<Weekday, number> = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };
  const TURNO_LABEL: Record<Turno, string> = { manha: 'Matutino', tarde: 'Vespertino', noite: 'Noturno' };
  const TURNO_ORDER: Record<Turno, number> = { manha: 1, tarde: 2, noite: 3 };
  const TURNO_BG: Record<Turno, string> = {
    manha: 'bg-amber-50/60',
    tarde: 'bg-sky-50/60',
    noite: 'bg-indigo-50/60',
  };
  const TURNO_DOT: Record<Turno, string> = {
    manha: 'bg-amber-400',
    tarde: 'bg-sky-400',
    noite: 'bg-indigo-400',
  };

  // Helper: enriquecer slot com lookups
  type SlotInfo = {
    s: typeof draft.schedule[number];
    ts: { id: string; inicio: string; fim: string } | undefined;
    durMin: number;
    subjectName: string;
    teacher: typeof draft.teachers[number] | undefined;
    status: 'OK' | 'SEM_IND' | 'PENDENTE';
    profKey: string; // chave para agrupar professores
    profLabel: string;
  };

  // Normalização Turma × Disciplina: a indicação é por grupo (não por slot
  // individual). Se QUALQUER slot do mesmo grupo (mesma turma + mesma disciplina)
  // tiver professor preenchido (ou marcado como "sem indicação"), todos os
  // slots-irmãos herdam esses dados — evitando status "Sem professor indicado"
  // em slots órfãos quando o diretor já indicou um professor para a UC.
  type GroupTeacher = { nome: string; telefone: string; formacao: string; email: string; sem_indicacao: boolean } | null;
  const groupTeacherMap = new Map<string, GroupTeacher>();
  draft.schedule.forEach((s) => {
    const key = `${s.classId}|${s.subject_id}`;
    if (groupTeacherMap.has(key)) return;
    const slotIds = draft.schedule.filter((x) => x.classId === s.classId && x.subject_id === s.subject_id).map((x) => x.id);
    const teachers = draft.teachers.filter((t) => slotIds.includes(t.scheduleSlotId));
    // Prioriza um teacher OK; senão, um marcado como "sem indicação"
    // OK = tem telefone OU é um professor já cadastrado na escola (fonte de verdade interna)
    const isFromSchoolName = (n: string) =>
      !!schoolTeacherNames && schoolTeacherNames.has(normalizeName(n));
    const okT = teachers.find((t) => !t.sem_indicacao && t.nome.trim() && (t.telefone.trim() || isFromSchoolName(t.nome)));
    const semT = teachers.find((t) => t.sem_indicacao);
    const ref = okT ?? semT ?? null;
    groupTeacherMap.set(key, ref ? {
      nome: ref.nome, telefone: ref.telefone, formacao: ref.formacao, email: ref.email,
      sem_indicacao: !!ref.sem_indicacao,
    } : null);
  });

  const allSlots: SlotInfo[] = draft.schedule.map((s) => {
    const ts = draft.hours.time_slots[s.turno].find((x) => x.id === s.time_slot_id);
    const durMin = ts ? durationMinutes(ts.inicio, ts.fim) : 0;
    const subjectName = course.subjects.find((x) => x.id === s.subject_id)?.nome ?? '—';
    // teacher real do slot (mantém p/ telefone/formacao se único)
    const ownTeacher = draft.teachers.find((x) => x.scheduleSlotId === s.id);
    // teacher efetivo herdado do grupo (Turma × Disciplina)
    const groupRef = groupTeacherMap.get(`${s.classId}|${s.subject_id}`);
    const effective = groupRef ?? (ownTeacher ? {
      nome: ownTeacher.nome, telefone: ownTeacher.telefone, formacao: ownTeacher.formacao,
      email: ownTeacher.email, sem_indicacao: !!ownTeacher.sem_indicacao,
    } : null);
    const teacher = effective
      ? { scheduleSlotId: s.id, nome: effective.nome, telefone: effective.telefone, formacao: effective.formacao, email: effective.email, sem_indicacao: effective.sem_indicacao }
      : ownTeacher;
    const isSemInd = !!effective?.sem_indicacao;
    const nome = effective?.nome.trim() ?? '';
    const tel = effective?.telefone.trim() ?? '';
    const fromSchool = !!nome && !!schoolTeacherNames && schoolTeacherNames.has(normalizeName(nome));
    let status: 'OK' | 'SEM_IND' | 'PENDENTE';
    let profKey: string;
    let profLabel: string;
    if (isSemInd) {
      status = 'SEM_IND';
      profKey = `__sem_ind__|${s.turno}`;
      profLabel = 'Sem indicação — R.H. define';
    } else if (nome && (tel || fromSchool)) {
      status = 'OK';
      profKey = tel ? `${nome.toLowerCase()}|${tel}` : `${nome.toLowerCase()}|__escola__`;
      profLabel = nome;
    } else {
      status = 'PENDENTE';
      profKey = `__pendente__|${s.turno}`;
      profLabel = 'Sem professor indicado';
    }
    return { s, ts, durMin, subjectName, teacher, status, profKey, profLabel };
  });

  const totalMin = allSlots.reduce((acc, x) => acc + x.durMin, 0);
  const countOk = allSlots.filter((x) => x.status === 'OK').length;
  const countSemInd = allSlots.filter((x) => x.status === 'SEM_IND').length;
  const countPendente = allSlots.filter((x) => x.status === 'PENDENTE').length;
  const uniqueProfs = new Set(allSlots.filter((x) => x.status === 'OK').map((x) => x.profKey));

  // Agrupar por turno
  const turnosUsed = (Object.keys(TURNO_LABEL) as Turno[])
    .filter((t) => allSlots.some((x) => x.s.turno === t))
    .sort((a, b) => TURNO_ORDER[a] - TURNO_ORDER[b]);

  const slotsByTurno: Record<Turno, SlotInfo[]> = { manha: [], tarde: [], noite: [] };
  allSlots.forEach((x) => slotsByTurno[x.s.turno].push(x));

  // Agregação por professor dentro do turno
  function aggregateProfs(slots: SlotInfo[]) {
    const map = new Map<string, { label: string; telefone: string; formacao: string; status: SlotInfo['status']; aulas: number; minutos: number }>();
    slots.forEach((x) => {
      const cur = map.get(x.profKey);
      const tel = x.teacher?.telefone.trim() ?? '';
      const formacao = x.teacher?.formacao.trim() ?? '';
      if (cur) {
        cur.aulas += 1;
        cur.minutos += x.durMin;
      } else {
        map.set(x.profKey, {
          label: x.profLabel,
          telefone: x.status === 'OK' ? tel : '',
          formacao: x.status === 'OK' ? formacao : '',
          status: x.status,
          aulas: 1,
          minutos: x.durMin,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      // OK primeiro, depois SEM_IND, depois PENDENTE; dentro do grupo, maior carga primeiro
      const order = { OK: 0, SEM_IND: 1, PENDENTE: 2 } as const;
      const d = order[a.status] - order[b.status];
      if (d !== 0) return d;
      return b.minutos - a.minutos;
    });
  }

  return (
    <div className="space-y-4">
      {/* Resumo geral */}
      <div className="rounded-xl border border-[#1B1E2C]/10 bg-[#F5F6FA] p-3 text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="Turmas" value={draft.classes.length} />
        <Stat label="Aulas na grade" value={draft.schedule.length} />
        <Stat label="Carga total (hora-aula)" value={formatDuration(totalMin)} />
        <Stat label="Professores únicos" value={uniqueProfs.size} highlight />
      </div>

      {/* Status das indicações */}
      {(countSemInd > 0 || countPendente > 0 || countOk > 0) && (
        <div className="rounded-xl border border-[#1B1E2C]/10 bg-white p-3 text-xs flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
            ✓ Indicados: {countOk}
          </span>
          {countSemInd > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-semibold">
              ⚠ Sem indicação (R.H. define): {countSemInd}
            </span>
          )}
          {countPendente > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
              ✗ Sem professor indicado: {countPendente}
            </span>
          )}
        </div>
      )}

      {/* Indicador 1: Horas por turno */}
      {turnosUsed.length > 0 && (
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-[#1B1E2C]/60 mb-2">Horas por turno</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {turnosUsed.map((t) => {
              const ss = slotsByTurno[t];
              const min = ss.reduce((acc, x) => acc + x.durMin, 0);
              const turmas = new Set(ss.map((x) => x.s.classId)).size;
              const profs = new Set(ss.filter((x) => x.status === 'OK').map((x) => x.profKey)).size;
              const semInd = ss.filter((x) => x.status === 'SEM_IND').length;
              const pend = ss.filter((x) => x.status === 'PENDENTE').length;
              return (
                <div key={t} className="rounded-xl border border-[#1B1E2C]/10 bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${TURNO_DOT[t]}`} />
                    <span className="font-bold text-[#1B1E2C] text-sm">{TURNO_LABEL[t]}</span>
                  </div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <div className="text-2xl font-bold text-[#1B1E2C] tabular-nums">
                      {formatDuration(min)}
                    </div>
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#FFDA45] text-[#1B1E2C] text-[11px] font-bold tabular-nums leading-none border border-[#1B1E2C]/15"
                      title="Quantidade de aulas (slots) contadas no turno"
                    >
                      {ss.length} aula{ss.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-[#1B1E2C]/65 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>{turmas} turma(s)</span>
                    <span>{profs} prof(s)</span>
                  </div>
                  {(semInd > 0 || pend > 0) && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {semInd > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-semibold">
                          {semInd} sem indicação
                        </span>
                      )}
                      {pend > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
                          {pend} sem professor indicado
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Indicador 2: Horas por professor (por turno) — Layout Neovale em cards */}
      {turnosUsed.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-xs font-bold uppercase tracking-wider text-[#1B1E2C]/60">
              Horas por professor — por turno
            </div>
            <div className="text-[10px] text-[#1B1E2C]/50 italic">
              hora-aula (duração real do horário)
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {turnosUsed.map((t) => {
              const aggs = aggregateProfs(slotsByTurno[t]);
              const totalAulas = aggs.reduce((acc, p) => acc + p.aulas, 0);
              const totalMinTurno = aggs.reduce((acc, p) => acc + p.minutos, 0);
              const maxMin = Math.max(1, ...aggs.map((p) => p.minutos));
              return (
                <div
                  key={t}
                  className="rounded-2xl border-2 border-[#1B1E2C]/10 bg-white shadow-sm overflow-hidden flex flex-col"
                >
                  {/* Cabeçalho do turno - amarelo Neovale */}
                  <div className="bg-[#FFDA45] px-4 py-3 border-b-2 border-[#1B1E2C]/15">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block h-3 w-3 rounded-full ring-2 ring-white ${TURNO_DOT[t]}`} />
                        <span className="font-bold text-[#1B1E2C] text-sm uppercase tracking-wide">
                          {TURNO_LABEL[t]}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold uppercase text-[#1B1E2C]/70 leading-none">Total turno</div>
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                          <span className="font-bold text-[#1B1E2C] tabular-nums text-sm leading-tight">
                            {formatDuration(totalMinTurno)}
                          </span>
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-white text-[#1B1E2C] text-[10px] font-bold tabular-nums leading-none border border-[#1B1E2C]/25"
                            title="Quantidade de aulas (slots) contadas no turno"
                          >
                            {totalAulas} aula{totalAulas === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-1 text-[10px] text-[#1B1E2C]/70 font-semibold">
                      {aggs.length} professor(es)/vaga(s)
                    </div>
                  </div>

                  {/* Lista de professores com barra de carga */}
                  <div className="p-3 space-y-2 flex-1">
                    {aggs.map((p, i) => {
                      const pct = (p.minutos / maxMin) * 100;
                      const isOk = p.status === 'OK';
                      const isSemInd = p.status === 'SEM_IND';
                      return (
                        <div
                          key={`${t}-${i}`}
                          className={`rounded-lg border p-2.5 ${
                            isOk
                              ? 'border-[#1B1E2C]/15 bg-[#F5F6FA]'
                              : isSemInd
                              ? 'border-amber-300 bg-amber-50/60'
                              : 'border-rose-300 bg-rose-50/60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="min-w-0 flex-1">
                              {isOk ? (
                                <>
                                  <div className="font-bold text-[#1B1E2C] text-xs leading-tight break-words">
                                    {p.label}
                                  </div>
                                  {(p.telefone || p.formacao) && (
                                    <div className="text-[10px] text-[#1B1E2C]/60 mt-0.5 leading-tight">
                                      {p.telefone}
                                      {p.telefone && p.formacao && ' · '}
                                      {p.formacao}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isSemInd
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                      : 'bg-rose-100 text-rose-900 border border-rose-300'
                                  }`}
                                >
                                  {p.label}
                                </span>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="font-bold text-[#1B1E2C] tabular-nums text-sm leading-none">
                                  {formatDuration(p.minutos)}
                                </span>
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#FFDA45] text-[#1B1E2C] text-[10px] font-bold tabular-nums leading-none border border-[#1B1E2C]/15"
                                  title="Quantidade de aulas (slots) contadas"
                                >
                                  {p.aulas} aula{p.aulas === 1 ? '' : 's'}
                                </span>
                              </div>
                            </div>
                          </div>
                          {/* Barra de carga */}
                          <div className="h-1.5 w-full rounded-full bg-[#1B1E2C]/8 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isOk ? 'bg-[#1B1E2C]' : isSemInd ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {aggs.length === 0 && (
                      <div className="text-[11px] italic text-[#1B1E2C]/40 text-center py-3">
                        Sem aulas neste turno
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grade semanal por turma — agrupada por TURNO */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-block h-4 w-1 rounded-full bg-[#FFDA45]" />
          <div className="text-xs font-bold uppercase tracking-wider text-[#1B1E2C]">Grade semanal por turma</div>
        </div>

        {(() => {
          const sortedClasses = [...draft.classes].sort((a, b) =>
            a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true, sensitivity: 'base' }),
          );
          const turnosOrdem: Turno[] = ['manha', 'tarde', 'noite'];
          const grupos = turnosOrdem
            .map((t) => ({ turno: t, classes: sortedClasses.filter((c) => c.turno === t) }))
            .filter((g) => g.classes.length > 0);

          return (
            <div className="space-y-8">
              {grupos.map((g) => (
                <div key={g.turno} className="space-y-4">
                  {/* Cabeçalho do turno */}
                  <div className="flex items-center gap-3 pb-2 border-b-2 border-[#1B1E2C]/10">
                    <span className={`inline-block h-3 w-3 rounded-full ring-2 ring-white shadow ${TURNO_DOT[g.turno]}`} />
                    <span className="text-sm font-bold uppercase tracking-[0.18em] text-[#1B1E2C]">
                      {TURNO_LABEL[g.turno]}
                    </span>
                    <span className="text-[11px] font-semibold text-[#1B1E2C]/55 tabular-nums">
                      {g.classes.length} {g.classes.length === 1 ? 'turma' : 'turmas'}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {g.classes.map((cls) => {
                      const slotsCls = allSlots.filter((x) => x.s.classId === cls.id);

              // Cabeçalho Neovale (Escola · Curso · Turma)
              const HeaderBar = (
                <div className="bg-[#1B1E2C] px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-[#FFDA45]" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#FFDA45]">Turma</span>
                    <span className="text-sm font-bold text-white break-words">{cls.nome}</span>
                  </div>
                  <span className="text-white/25">|</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">Escola</span>
                    <span className="text-sm font-semibold text-white break-words">{schoolName ?? '—'}</span>
                  </div>
                  <span className="text-white/25">|</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">Curso</span>
                    <span className="text-sm font-semibold text-white break-words">{course.nome}</span>
                  </div>
                </div>
              );

              if (slotsCls.length === 0) {
                return (
                  <div key={cls.id} className="rounded-2xl border-2 border-[#1B1E2C]/10 bg-white shadow-sm overflow-hidden">
                    {HeaderBar}
                    <div className="p-6 text-center text-xs italic text-[#1B1E2C]/45">Nenhuma aula nesta turma</div>
                  </div>
                );
              }

              // Dias usados
              const daysUsed = Array.from(new Set(slotsCls.map((x) => x.s.weekday)))
                .sort((a, b) => (WEEKDAY_ORDER[a] ?? 99) - (WEEKDAY_ORDER[b] ?? 99));

              // Linhas de horário
              type Row = { key: string; inicio: string; fim: string; turno: Turno };
              const rowMap = new Map<string, Row>();
              slotsCls.forEach((x) => {
                if (!x.ts) return;
                const key = `${x.s.turno}|${x.ts.inicio}|${x.ts.fim}`;
                if (!rowMap.has(key)) {
                  rowMap.set(key, { key, inicio: x.ts.inicio, fim: x.ts.fim, turno: x.s.turno });
                }
              });
              const rows = Array.from(rowMap.values()).sort((a, b) => {
                const td = TURNO_ORDER[a.turno] - TURNO_ORDER[b.turno];
                if (td !== 0) return td;
                return a.inicio.localeCompare(b.inicio);
              });

              // Métricas da turma
              const clsMin = slotsCls.reduce((acc, x) => acc + x.durMin, 0);
              const okCount = slotsCls.filter((x) => x.status === 'OK').length;
              const semIndCount = slotsCls.filter((x) => x.status === 'SEM_IND').length;
              const pendCount = slotsCls.filter((x) => x.status === 'PENDENTE').length;
              const turnosCls = Array.from(new Set(slotsCls.map((x) => x.s.turno)))
                .sort((a, b) => TURNO_ORDER[a] - TURNO_ORDER[b]);

              // Carga horária ainda sem indicação (SEM_IND + PENDENTE), com quebra por disciplina
              const faltaSlots = slotsCls.filter((x) => x.status === 'SEM_IND' || x.status === 'PENDENTE');
              const faltaMin = faltaSlots.reduce((acc, x) => acc + x.durMin, 0);
              const faltaPorDisciplina = (() => {
                const map = new Map<string, { nome: string; minutos: number; aulas: number }>();
                faltaSlots.forEach((x) => {
                  const key = x.subjectName || '—';
                  const cur = map.get(key) ?? { nome: key, minutos: 0, aulas: 0 };
                  cur.minutos += x.durMin;
                  cur.aulas += 1;
                  map.set(key, cur);
                });
                const orderKey = (nome: string) => {
                  const m = nome.match(/^UC\s*(\d+)/i);
                  if (m) return [0, parseInt(m[1], 10), nome] as const;
                  return [1, 0, nome] as const; // Projetos e demais ao final
                };
                return Array.from(map.values()).sort((a, b) => {
                  const ka = orderKey(a.nome); const kb = orderKey(b.nome);
                  if (ka[0] !== kb[0]) return ka[0] - kb[0];
                  if (ka[1] !== kb[1]) return ka[1] - kb[1];
                  return a.nome.localeCompare(b.nome, 'pt-BR');
                });
              })();
              const totalPorDisciplina = (() => {
                const map = new Map<string, { nome: string; minutos: number; aulas: number }>();
                slotsCls.forEach((x) => {
                  const key = x.subjectName || '—';
                  const cur = map.get(key) ?? { nome: key, minutos: 0, aulas: 0 };
                  cur.minutos += x.durMin;
                  cur.aulas += 1;
                  map.set(key, cur);
                });
                return Array.from(map.values()).sort((a, b) => b.minutos - a.minutos);
              })();

              // Cor de chip por professor (rotativa) para diferenciação visual
              const profColors = [
                'bg-[#FFDA45]/25 text-[#1B1E2C] border-[#FFDA45]',
                'bg-sky-100 text-sky-900 border-sky-300',
                'bg-emerald-100 text-emerald-900 border-emerald-300',
                'bg-violet-100 text-violet-900 border-violet-300',
                'bg-pink-100 text-pink-900 border-pink-300',
                'bg-orange-100 text-orange-900 border-orange-300',
                'bg-teal-100 text-teal-900 border-teal-300',
                'bg-indigo-100 text-indigo-900 border-indigo-300',
              ];
              const uniqueProfs = Array.from(new Set(slotsCls.filter(x => x.status === 'OK').map(x => x.profKey)));
              const profColorMap = new Map<string, string>();
              uniqueProfs.forEach((k, i) => profColorMap.set(k, profColors[i % profColors.length]));

              return (
                <div key={cls.id} className="rounded-2xl border-2 border-[#1B1E2C]/10 bg-white shadow-sm overflow-hidden">
                  {HeaderBar}

                  {/* Barra de KPIs */}
                  <div className="grid grid-cols-4 gap-px bg-[#1B1E2C]/10">
                    <div className="bg-white px-3 py-2">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-[#1B1E2C]/55">Aulas</div>
                      <div className="text-base font-bold text-[#1B1E2C] tabular-nums">{slotsCls.length}</div>
                    </div>
                    <div className="bg-white px-3 py-2">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-[#1B1E2C]/55">Carga</div>
                      <div className="text-base font-bold text-[#1B1E2C] tabular-nums">{formatDuration(clsMin)}</div>
                    </div>
                    <div className="bg-white px-3 py-2">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-[#1B1E2C]/55">Indicados</div>
                      <div className="text-base font-bold text-[#1B1E2C] tabular-nums">{okCount}</div>
                    </div>
                    <div className={`px-3 py-2 ${faltaMin > 0 ? 'bg-amber-50' : 'bg-white'}`}>
                      <div className={`text-[9px] font-bold uppercase tracking-wider ${faltaMin > 0 ? 'text-amber-800' : 'text-[#1B1E2C]/55'}`}>
                        Sem indicação
                      </div>
                      <div className={`text-base font-bold tabular-nums ${faltaMin > 0 ? 'text-amber-900' : 'text-[#1B1E2C]/40'}`}>
                        {faltaMin > 0 ? formatDuration(faltaMin) : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Quebra de carga horária faltante por disciplina */}
                  {faltaPorDisciplina.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-amber-200 bg-amber-50/60">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                          Carga horária pendente por disciplina
                        </span>
                        <span className="text-[10px] font-semibold text-amber-800/70">
                          ({faltaSlots.length} aula{faltaSlots.length === 1 ? '' : 's'} · {formatDuration(faltaMin)})
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#1B1E2C]">
                        {faltaPorDisciplina.map((d, i) => (
                          <span key={d.nome} className="inline-flex items-center gap-1">
                            <span className="font-semibold">{d.nome}:</span>
                            <span className="font-bold tabular-nums text-amber-900">
                              {d.aulas} aula{d.aulas === 1 ? '' : 's'}
                            </span>
                            {i < faltaPorDisciplina.length - 1 && (
                              <span className="text-amber-800/50 ml-1">-</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Legenda Carga/disc. removida — info já em "Carga horária pendente por disciplina" */}

                  {/* Legenda turnos */}
                  {turnosCls.length > 0 && (
                    <div className="px-4 py-2 border-t border-[#1B1E2C]/8 bg-[#FAFBFD] flex flex-wrap items-center gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#1B1E2C]/55">Turnos:</span>
                      {turnosCls.map((t) => (
                        <span key={t} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#1B1E2C]">
                          <span className={`inline-block h-2 w-2 rounded-full ${TURNO_DOT[t]}`} />
                          {TURNO_LABEL[t]}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Grade horária */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] border-separate border-spacing-0">
                      <thead>
                        <tr>
                          <th className="text-left font-bold uppercase tracking-wider text-[10px] px-3 py-2.5 sticky left-0 bg-[#1B1E2C] text-[#FFDA45] z-10 min-w-[110px]">
                            Horário
                          </th>
                          {daysUsed.map((d) => (
                            <th key={d} className="text-center font-bold uppercase tracking-wider text-[10px] px-2 py-2.5 bg-[#1B1E2C] text-white min-w-[120px] border-l border-white/10">
                              {WEEKDAY_LABEL[d]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, ri) => {
                          const dur = durationMinutes(r.inicio, r.fim);
                          return (
                            <tr key={r.key}>
                              <td className={`px-3 py-2 sticky left-0 bg-white z-10 border-b border-[#1B1E2C]/8 ${ri === 0 ? '' : ''}`}>
                                <div className="flex items-center gap-2">
                                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${TURNO_DOT[r.turno]} ring-2 ring-white shadow`} />
                                  <div>
                                    <div className="font-mono font-bold tabular-nums text-[#1B1E2C] text-[11px]">{r.inicio}–{r.fim}</div>
                                    <div className="text-[9px] text-[#1B1E2C]/50 font-semibold">{formatDuration(dur)}</div>
                                  </div>
                                </div>
                              </td>
                              {daysUsed.map((d) => {
                                const cell = slotsCls.find(
                                  (x) => x.s.weekday === d && x.ts && x.ts.inicio === r.inicio && x.ts.fim === r.fim && x.s.turno === r.turno
                                );
                                if (!cell) {
                                  return (
                                    <td key={d} className="px-2 py-2 text-center text-[#1B1E2C]/15 border-b border-l border-[#1B1E2C]/8">
                                      ·
                                    </td>
                                  );
                                }
                                const profClass = cell.status === 'OK' ? (profColorMap.get(cell.profKey) ?? profColors[0]) : '';
                                const cellBgByStatus =
                                  cell.status === 'OK' ? 'bg-white hover:bg-[#FFDA45]/5'
                                  : cell.status === 'SEM_IND' ? 'bg-amber-50/70'
                                  : 'bg-rose-50/70';
                                const borderLeftAccent =
                                  cell.status === 'OK' ? 'border-l-[3px] border-l-[#FFDA45]'
                                  : cell.status === 'SEM_IND' ? 'border-l-[3px] border-l-amber-400'
                                  : 'border-l-[3px] border-l-rose-400';
                                const isAnpCell = (cell.s as any).is_anp === true;
                                return (
                                  <td key={d} className={`px-2 py-2 align-top border-b border-[#1B1E2C]/8 ${cellBgByStatus} ${borderLeftAccent} transition-colors`}>
                                    <div className="font-bold text-[#1B1E2C] leading-tight break-words text-[11px] inline-flex items-center gap-1 flex-wrap">
                                      <span>{cell.subjectName}</span>
                                      {isAnpCell && (
                                        <span className="px-1 py-0 rounded border border-amber-300 bg-amber-100 text-amber-900 font-bold text-[9px] leading-none h-4 inline-flex items-center" title="Atividade Não Presencial">
                                          ANP
                                        </span>
                                      )}
                                    </div>
                                    {cell.status === 'SEM_IND' ? (
                                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-amber-200/80 border border-amber-400 text-amber-900 font-bold text-[9px] uppercase tracking-wider">
                                        Sem indicação
                                      </span>
                                    ) : cell.status === 'PENDENTE' ? (
                                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-rose-200/80 border border-rose-400 text-rose-900 font-bold text-[9px] uppercase tracking-wider">
                                        Sem professor indicado
                                      </span>
                                    ) : (
                                      <div className={`mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-semibold text-[10px] leading-tight max-w-full ${profClass}`}>
                                        <span className="break-words">{cell.teacher?.nome.trim()}</span>
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function TeacherNameAutocomplete({
  value,
  candidates,
  onChange,
  onPick,
  disabled,
}: {
  value: string;
  candidates: TeacherSlotDraft[];
  onChange: (v: string) => void;
  onPick: (t: TeacherSlotDraft) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const q = value.trim().toLowerCase();
  const filtered = q
    ? candidates.filter((c) => c.nome.toLowerCase().includes(q))
    : candidates;
  const showList = !disabled && open && filtered.length > 0;
  return (
    <div className="relative">
      <Input
        placeholder="Nome completo *"
        value={value}
        disabled={disabled}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="bg-white border-[#1B1E2C]/15 text-[#1B1E2C] placeholder:text-[#1B1E2C]/40 focus-visible:ring-[#FFDA45] focus-visible:border-[#FFDA45]"
      />
      {showList && (
        <div className="absolute left-0 right-0 z-30 mt-1 rounded-md border border-[#1B1E2C]/15 bg-white shadow-xl p-1 max-h-56 overflow-auto">
          {filtered.slice(0, 8).map((c, i) => (
            <button
              type="button"
              key={`${c.nome}-${c.telefone}-${i}`}
              onMouseDown={(e) => { e.preventDefault(); onPick(c); setOpen(false); }}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-[#FFDA45]/15 text-sm"
            >
              <div className="font-semibold text-[#1B1E2C] truncate">{c.nome}</div>
              <div className="text-xs text-[#1B1E2C]/60 truncate">{c.telefone} · {c.formacao}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
