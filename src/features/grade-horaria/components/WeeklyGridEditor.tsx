import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { gradeHorariaApi } from '@/features/grade-horaria/api';
import { fetchSchoolsWithCourses } from '@/lib/schoolsWithCourses';
import { useOrganization } from '@/hooks/useOrganization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Save, Trash2, X, Sparkles, BookOpen, ClipboardList, AlertTriangle, Copy, Move, Undo2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScheduleConflictModal } from '@/features/rh/components/conflicts/ScheduleConflictModal';
import type { ConflictItem } from '@/features/rh/lib/conflictTypes';

const WEEKDAY_PT_TO_CODE: Record<string, 'MON'|'TUE'|'WED'|'THU'|'FRI'|'SAT'> = {
  SEGUNDA: 'MON', TERCA: 'TUE', QUARTA: 'WED', QUINTA: 'THU', SEXTA: 'FRI', SABADO: 'SAT',
};
import { toast } from 'sonner';
import { useSchoolTimeSlots } from '../hooks/useSchoolTimeSlots';
import { WEEKDAY_OPTIONS, type Weekday } from '@/types/academic';
import { SEMESTER_LABELS, type SubjectSemester } from '@/hooks/useSemester';
import { computeRequiredPlanning, PLANNING_RATIO_LABEL } from '../utils/planningRule';
import { SubjectNameWithAnp } from '@/components/SubjectNameWithAnp';
import { useAnpSubjectMap } from '@/hooks/useAnpSubjectMap';
import { PlanningObservationButton } from './PlanningObservationButton';


interface WeeklyGridEditorProps {
  onSaved?: () => void;
  initialSchoolId?: string | null;
  initialCourseId?: string | null;
  initialClassGroupId?: string | null;
}

interface FilterOption {
  id: string;
  nome: string;
}

interface SubjectOption {
  id: string;
  nome: string;
  semester?: SubjectSemester;
  weekly_classes?: number; // carga horária semanal alvo
}

interface ProfessorOption {
  id: string;
  full_name: string;
}

interface CellData {
  modelId?: string;          // se já existe no servidor
  subjectId: string | null;
  professorId: string | null;
  scheduleType: 'CLASS' | 'PLANNING';
  classMode?: 'PRESENCIAL' | 'ANP' | null; // marca slot ANP
  observation?: string | null; // observação do planejamento (apenas PLANNING)
  dirty?: boolean;           // alterado nesta sessão
  toDelete?: boolean;
}


type GridState = Record<string, CellData>; // key: `${weekday}::${slotId}`
type GridSemester = Extract<SubjectSemester, 'FIRST' | 'SECOND'>;

const WEEKDAYS: Weekday[] = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'];

function cellKey(weekday: Weekday, slotId: string) {
  return `${weekday}::${slotId}`;
}

export function WeeklyGridEditor({ onSaved, initialSchoolId, initialCourseId, initialClassGroupId }: WeeklyGridEditorProps) {
  const { organization } = useOrganization();
  const [schools, setSchools] = useState<FilterOption[]>([]);
  const [courses, setCourses] = useState<FilterOption[]>([]);
  const [classGroups, setClassGroups] = useState<FilterOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [professors, setProfessors] = useState<ProfessorOption[]>([]);
  const [profLoad, setProfLoad] = useState<Record<string, number>>({}); // aulas/sem por professor (hora-aula, org-wide)
  // Por escola: { [profId]: { classes, plannings } } — usado para mostrar a regra 1/3
  const [profSchoolLoad, setProfSchoolLoad] = useState<Record<string, { classes: number; plannings: number }>>({});

  const [schoolId, setSchoolId] = useState<string | null>(initialSchoolId ?? null);
  const [courseId, setCourseId] = useState<string | null>(initialCourseId ?? null);
  const [classGroupId, setClassGroupId] = useState<string | null>(initialClassGroupId ?? null);
  const [semesterView, setSemesterView] = useState<GridSemester>('FIRST');

  const [grid, setGrid] = useState<GridState>({});
  const [openCellKey, setOpenCellKey] = useState<string | null>(null);
  const [copyMode, setCopyMode] = useState<{ subjectId: string; professorId: string | null; subjectName: string } | null>(null);
  const [moveMode, setMoveMode] = useState<{ sourceKey: string; subjectId: string | null; professorId: string | null; scheduleType: 'CLASS' | 'PLANNING'; label: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragSourceKey, setDragSourceKey] = useState<string | null>(null);
  const [dragMode, setDragMode] = useState<'content' | 'reorder'>('content');
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [conflictModal, setConflictModal] = useState<{ open: boolean; items: ConflictItem[] }>({ open: false, items: [] });
  // Pilha de "undo" para moves de PL ainda não salvos
  const [undoStack, setUndoStack] = useState<Array<{ label: string; prev: GridState }>>([]);

  const { slots: timeSlots, getSlotsByWeekday, createSlot, updateSlot, getNextSlotNumber, refetch: refetchSlots } = useSchoolTimeSlots(schoolId);
  // Rascunho do horário em edição no popover (por slotId)
  const [slotTimeDraft, setSlotTimeDraft] = useState<Record<string, { start: string; end: string }>>({});
  const [savingSlotTime, setSavingSlotTime] = useState<string | null>(null);
  const [newSlotForm, setNewSlotForm] = useState<{ weekday: Weekday; start: string; end: string }>({ weekday: 'SEGUNDA', start: '', end: '' });
  const [newSlotOpen, setNewSlotOpen] = useState(false);
  const [creatingSlot, setCreatingSlot] = useState(false);

  // Carga semanal por professor (slots ÚNICOS por escola+turma+horário) — evita duplicar
  // quando o mesmo horário tem disciplina anual + 1º sem + 2º sem (3 linhas, 1 slot real).
  useEffect(() => {
    if (!organization?.id) return;
    (async () => {
      const { data } = await supabase
        .from('weekly_teaching_models')
        .select('professor_id, school_id, class_group_id, weekday, start_time, end_time, schedule_type')
        .eq('organization_id', organization.id)
        .eq('status', 'ACTIVE');
      const seen = new Set<string>();
      const acc: Record<string, number> = {};
      (data ?? []).forEach((m: any) => {
        if (!m.professor_id) return;
        const key = `${m.professor_id}|${m.school_id}|${m.class_group_id ?? '_'}|${m.weekday}|${m.start_time}|${m.end_time}|${m.schedule_type}`;
        if (seen.has(key)) return;
        seen.add(key);
        acc[m.professor_id] = (acc[m.professor_id] ?? 0) + 1;
      });
      setProfLoad(acc);
    })();
  }, [organization?.id, classGroupId]);

  // Carga por professor NESTA escola, separada em CLASS e PLANNING (regra oficial 1/3) — slots únicos
  useEffect(() => {
    if (!organization?.id || !schoolId) { setProfSchoolLoad({}); return; }
    (async () => {
      const { data } = await supabase
        .from('weekly_teaching_models')
        .select('professor_id, class_group_id, weekday, start_time, end_time, schedule_type')
        .eq('organization_id', organization.id)
        .eq('school_id', schoolId)
        .eq('status', 'ACTIVE');
      const seen = new Set<string>();
      const acc: Record<string, { classes: number; plannings: number }> = {};
      (data ?? []).forEach((m: any) => {
        if (!m.professor_id) return;
        const key = `${m.professor_id}|${m.class_group_id ?? '_'}|${m.weekday}|${m.start_time}|${m.end_time}|${m.schedule_type}`;
        if (seen.has(key)) return;
        seen.add(key);
        if (!acc[m.professor_id]) acc[m.professor_id] = { classes: 0, plannings: 0 };
        if (m.schedule_type === 'CLASS') acc[m.professor_id].classes++;
        else if (m.schedule_type === 'PLANNING') acc[m.professor_id].plannings++;
      });
      setProfSchoolLoad(acc);
    })();
  }, [organization?.id, schoolId, classGroupId]);

  // Load schools
  useEffect(() => {
    if (!organization?.id) return;
    (async () => {
      const data = await fetchSchoolsWithCourses({ organizationId: organization.id });
      setSchools(data);
    })();
  }, [organization?.id]);

  // Load courses for school
  useEffect(() => {
    if (!schoolId || !organization?.id) { setCourses([]); return; }
    (async () => {
      const { data: cs } = await supabase
        .from('course_schools')
        .select('course_id')
        .eq('school_id', schoolId);
      const ids = [...new Set((cs || []).map(c => c.course_id))];
      if (!ids.length) { setCourses([]); return; }
      const { data } = await supabase
        .from('courses')
        .select('id, nome')
        .in('id', ids)
        .eq('status', 'ativo')
        .order('nome');
      setCourses(data || []);
    })();
  }, [schoolId, organization?.id]);

  // Load class_groups + subjects + professors when school+course
  useEffect(() => {
    if (!schoolId || !courseId) {
      setClassGroups([]); setSubjects([]); setProfessors([]);
      return;
    }
    (async () => {
      const [cg, subj, bind] = await Promise.all([
        gradeHorariaApi.client.from('class_groups').select('id, nome').eq('school_id', schoolId).eq('course_id', courseId).eq('status', 'ativo').order('nome'),
        gradeHorariaApi.client.from('subjects').select('id, nome, semester').eq('course_id', courseId).eq('status', 'ativo').is('deleted_at', null).order('nome'),
        gradeHorariaApi.client.from('professor_school_courses').select('professor_id, professors:professor_id(id, full_name, status, deleted_at)').eq('school_id', schoolId).eq('course_id', courseId).eq('status', 'ACTIVE'),
      ]);
      setClassGroups(cg.data || []);
      setSubjects((subj.data || []).map((s: any) => ({ id: s.id, nome: s.nome, semester: s.semester })));
      const profs = ((bind.data || []) as any[])
        .map(b => b.professors)
        .filter(p => p && p.status === 'ACTIVE' && !p.deleted_at)
        .map(p => ({ id: p.id, full_name: p.full_name }));
      setProfessors(profs);
    })();
  }, [schoolId, courseId]);

  // Load existing grid for class_group
  const loadGrid = useCallback(async () => {
    if (!schoolId || !courseId || !classGroupId || !organization?.id) {
      setGrid({});
      return;
    }
    setLoading(true);
    try {
      // CLASS: estritamente desta turma
      const classQ = supabase
        .from('weekly_teaching_models')
        .select('id, weekday, start_time, end_time, school_time_slot_id, subject_id, professor_id, schedule_type, status, observation, class_mode, class_group_id, subjects:subject_id(semester)')
        .eq('organization_id', organization.id)
        .eq('school_id', schoolId)
        .eq('course_id', courseId)
        .eq('class_group_id', classGroupId)
        .eq('status', 'ACTIVE')
        .eq('schedule_type', 'CLASS');

      // PLANNING: nesta escola, sem class_group (global do professor) OU vinculado a esta turma.
      // Mantém regra: PLANNING é por professor/escola, não por turma — exibimos como referência visual.
      const planQ = supabase
        .from('weekly_teaching_models')
        .select('id, weekday, start_time, end_time, school_time_slot_id, subject_id, professor_id, schedule_type, status, observation, class_mode, class_group_id, subjects:subject_id(semester)')
        .eq('organization_id', organization.id)
        .eq('school_id', schoolId)
        .eq('status', 'ACTIVE')
        .eq('schedule_type', 'PLANNING');

      const [classRes, planRes] = await Promise.all([classQ, planQ]);

      const next: GridState = {};

      // Resolve school_time_slot_id quando NULL (planejamentos antigos), via match weekday+horário
      const resolveSlotId = (m: any): string | null => {
        if (m.school_time_slot_id) return m.school_time_slot_id;
        const norm = (t: string) => (t || '').slice(0, 5);
        const ms = norm(m.start_time);
        const me = norm(m.end_time);
        const found = (timeSlots || []).find((s: any) =>
          s.weekday === m.weekday && norm(s.start_time) === ms && norm(s.end_time) === me
        );
        return found?.id ?? null;
      };

      // 1) Plannings primeiro (CLASS sobrescreve em caso de colisão de cell)
      (planRes.data || []).forEach((m: any) => {
        const slotId = resolveSlotId(m);
        if (!slotId) return;
        const k = cellKey(m.weekday, slotId);
        if (next[k]) return;
        next[k] = {
          modelId: m.id,
          subjectId: m.subject_id,
          professorId: m.professor_id,
          scheduleType: 'PLANNING',
          classMode: (m.class_mode as 'PRESENCIAL' | 'ANP' | null) ?? 'PRESENCIAL',
          observation: m.observation ?? null,
        };
      });
      // 2) Aulas da turma
      (classRes.data || []).forEach((m: any) => {
        const slotId = resolveSlotId(m);
        if (!slotId) return;
        next[cellKey(m.weekday, slotId)] = {
          modelId: m.id,
          subjectId: m.subject_id,
          professorId: m.professor_id,
          scheduleType: m.schedule_type || 'CLASS',
          classMode: (m.class_mode as 'PRESENCIAL' | 'ANP' | null) ?? 'PRESENCIAL',
          observation: m.observation ?? null,
        };
      });

      setGrid(next);
    } finally {
      setLoading(false);
    }
  }, [schoolId, courseId, classGroupId, organization?.id, semesterView, timeSlots]);

  useEffect(() => { loadGrid(); }, [loadGrid]);

  // Carga horária alocada por disciplina
  const allocationBySubject = useMemo(() => {
    const map = new Map<string, number>();
    Object.values(grid).forEach(c => {
      if (c.toDelete || !c.subjectId) return;
      map.set(c.subjectId, (map.get(c.subjectId) || 0) + 1);
    });
    return map;
  }, [grid]);

  const dirtyCount = useMemo(() => Object.values(grid).filter(c => c.dirty || c.toDelete).length, [grid]);

  const handleCellClick = (weekday: Weekday, slotId: string) => {
    const k = cellKey(weekday, slotId);
    if (moveMode) {
      if (k === moveMode.sourceKey) {
        // clicou na própria origem: cancela
        setMoveMode(null);
        return;
      }
      const dest = grid[k];
      const destOccupied = !!(dest && !dest.toDelete && (dest.subjectId || dest.scheduleType === 'PLANNING') && !!dest.modelId);
      const destStagedNew = !!(dest && !dest.toDelete && (dest.subjectId || dest.dirty));
      if (destOccupied || destStagedNew) {
        toast.error('Destino ocupado — escolha uma célula vazia');
        return;
      }
      // Marca origem para deletar (se tinha modelId) ou remove se era novo
      setGrid(prev => {
        const src = prev[moveMode.sourceKey];
        const next = { ...prev };
        if (src?.modelId) {
          next[moveMode.sourceKey] = { ...src, toDelete: true, dirty: true };
        } else {
          delete next[moveMode.sourceKey];
        }
        // Cria destino com os dados da origem
        next[k] = {
          ...(prev[k] || {}),
          subjectId: moveMode.subjectId,
          professorId: moveMode.professorId,
          scheduleType: moveMode.scheduleType,
          dirty: true,
          toDelete: false,
        };
        return next;
      });
      toast.success(`Aula movida — salve para aplicar`);
      setMoveMode(null);
      return;
    }
    if (copyMode) {
      // aplica disciplina/professor do copyMode
      const subj = subjects.find(s => s.id === copyMode.subjectId);
      setGrid(prev => ({
        ...prev,
        [k]: {
          ...(prev[k] || {}),
          subjectId: copyMode.subjectId,
          professorId: copyMode.professorId,
          scheduleType: 'CLASS',
          dirty: true,
          toDelete: false,
        },
      }));
      return;
    }
    setOpenCellKey(k);
  };

  const updateCell = (k: string, patch: Partial<CellData>) => {
    setGrid(prev => ({
      ...prev,
      [k]: {
        scheduleType: 'CLASS',
        subjectId: null,
        professorId: null,
        ...(prev[k] || {}),
        ...patch,
        dirty: true,
        toDelete: false,
      },
    }));
  };

  const removeCell = (k: string) => {
    setGrid(prev => {
      const cur = prev[k];
      if (!cur) return prev;
      if (cur.modelId) {
        return { ...prev, [k]: { ...cur, toDelete: true, dirty: true } };
      }
      const next = { ...prev };
      delete next[k];
      return next;
    });
    setOpenCellKey(null);
  };

  const startCopyFromCell = (k: string) => {
    const c = grid[k];
    if (!c?.subjectId) return;
    const subjName = subjects.find(s => s.id === c.subjectId)?.nome || 'Disciplina';
    setCopyMode({ subjectId: c.subjectId, professorId: c.professorId, subjectName: subjName });
    setOpenCellKey(null);
    toast.info(`Modo copiar ativado: clique nas células para aplicar "${subjName}"`);
  };

  const startMoveFromCell = (k: string) => {
    const c = grid[k];
    if (!c) return;
    const label = c.scheduleType === 'PLANNING'
      ? 'Planejamento'
      : (subjects.find(s => s.id === c.subjectId)?.nome || 'Aula');
    setMoveMode({
      sourceKey: k,
      subjectId: c.subjectId,
      professorId: c.professorId,
      scheduleType: c.scheduleType,
      label,
    });
    setOpenCellKey(null);
    toast.info(`Modo mover: clique numa célula vazia para mover "${label}"`);
  };

  // Verifica conflito do(s) professor(es) em horário de outras turmas/escolas no destino.
  // Retorna lista (vazia = sem conflito). Ignora os próprios models src/dest.
  // Respeita compatibilidade de semestre: FIRST↔SECOND não conflita.
  const checkProfessorConflict = async (
    professorId: string,
    weekday: Weekday,
    startTime: string,
    endTime: string,
    excludeModelIds: string[],
    sourceSemester?: SubjectSemester | null,
  ): Promise<Array<{ school_name?: string; class_mode?: string; start_time: string; end_time: string }>> => {
    const { data, error } = await supabase
      .from('weekly_teaching_models')
      .select('id, start_time, end_time, school_id, class_mode, subject_id, schools:school_id(nome), subjects:subject_id(semester)')
      .eq('professor_id', professorId)
      .eq('weekday', weekday)
      .eq('status', 'ACTIVE');
    if (error) { console.error(error); return []; }
    const mySem = (sourceSemester || 'ANNUAL').toString().toUpperCase();
    const semestersOverlap = (a: string | null | undefined) => {
      const aa = (a || 'ANNUAL').toString().toUpperCase();
      if (aa === 'ANNUAL' || mySem === 'ANNUAL') return true;
      return aa === mySem;
    };
    return (data ?? [])
      .filter((c: any) => !excludeModelIds.includes(c.id))
      .filter((c: any) => (c.class_mode || 'PRESENCIAL') !== 'ANP')
      .filter((c: any) => c.start_time < endTime && c.end_time > startTime)
      .filter((c: any) => semestersOverlap(c.subjects?.semester))
      .map((c: any) => ({
        school_name: c.schools?.nome,
        class_mode: c.class_mode,
        start_time: c.start_time,
        end_time: c.end_time,
      }));
  };

  const buildConflictItems = (
    profName: string,
    weekday: Weekday,
    slotStart: string,
    slotEnd: string,
    rows: Array<{ school_name?: string; start_time: string; end_time: string }>,
    turmaName: string,
  ): ConflictItem[] => {
    const schoolName = schools.find(s => s.id === schoolId)?.nome;
    return rows.map((c, i) => ({
      key: `pl-dnd-${i}`,
      kind: 'admin-grid' as const,
      teacherName: profName,
      weekday: WEEKDAY_PT_TO_CODE[String(weekday)] ?? 'MON',
      overlapStart: slotStart.slice(0, 5),
      overlapEnd: slotEnd.slice(0, 5),
      sides: [
        { className: turmaName, schoolName },
        {
          className: '(aula já cadastrada)',
          schoolName: c.school_name || 'outra escola',
          isExternalSchool: true,
        },
      ],
      suggestions: [],
    }));
  };

  // Move/troca uma célula (Aula ou Planejamento) via drag-and-drop.
  // Destino vazio = move. Destino ocupado (CLASS ou PLANNING) = swap.
  const moveCellToKey = async (sourceKey: string, destKey: string) => {
    if (sourceKey === destKey) return;
    const src = grid[sourceKey];
    if (!src || src.toDelete) return;
    const dest = grid[destKey];
    const destOccupied = !!(dest && !dest.toDelete && (dest.subjectId || dest.scheduleType === 'PLANNING'));

    const [srcWd, srcSlotId] = sourceKey.split('::') as [Weekday, string];
    const [destWd, destSlotId] = destKey.split('::') as [Weekday, string];
    const srcSlot = timeSlots.find(s => s.id === srcSlotId);
    const destSlot = timeSlots.find(s => s.id === destSlotId);
    if (!destSlot) {
      toast.error('Horário de destino inválido');
      return;
    }

    const turmaName = classGroups.find(c => c.id === classGroupId)?.nome ?? '(turma)';
    const excludeIds = [src.modelId, dest?.modelId].filter(Boolean) as string[];

    // Conflito do professor da origem no slot de destino (ANP isenta)
    if (src.professorId && src.classMode !== 'ANP') {
      const profName = professors.find(p => p.id === src.professorId)?.full_name ?? '—';
      const srcSem = subjects.find(s => s.id === src.subjectId)?.semester ?? null;
      const conflicts = await checkProfessorConflict(src.professorId, destWd, destSlot.start_time, destSlot.end_time, excludeIds, srcSem);
      if (conflicts.length > 0) {
        setConflictModal({ open: true, items: buildConflictItems(profName, destWd, destSlot.start_time, destSlot.end_time, conflicts, turmaName) });
        return;
      }
    }
    // Em caso de swap, valida também o destino voltando para a origem
    if (destOccupied && dest?.professorId && srcSlot && dest.classMode !== 'ANP') {
      const profName = professors.find(p => p.id === dest.professorId)?.full_name ?? '—';
      const destSem = subjects.find(s => s.id === dest.subjectId)?.semester ?? null;
      const conflicts = await checkProfessorConflict(dest.professorId, srcWd, srcSlot.start_time, srcSlot.end_time, excludeIds, destSem);
      if (conflicts.length > 0) {
        setConflictModal({ open: true, items: buildConflictItems(profName, srcWd, srcSlot.start_time, srcSlot.end_time, conflicts, turmaName) });
        return;
      }
    }

    setGrid(prev => {
      // snapshot p/ undo
      setUndoStack(stack => [...stack.slice(-9), {
        label: destOccupied ? 'Troca de horário' : 'Movimentação de horário',
        prev,
      }]);

      const s = prev[sourceKey];
      const d = prev[destKey];
      const next = { ...prev };

      // Origem recebe o conteúdo do destino (swap) ou é limpa (move simples)
      if (destOccupied && d) {
        next[sourceKey] = {
          ...s,
          subjectId: d.subjectId ?? null,
          professorId: d.professorId ?? null,
          scheduleType: d.scheduleType,
          classMode: d.classMode ?? null,
          dirty: true,
          toDelete: false,
        };
      } else {
        if (s?.modelId) {
          next[sourceKey] = { ...s, toDelete: true, dirty: true };
        } else {
          delete next[sourceKey];
        }
      }

      // Destino recebe os dados originais da origem
      next[destKey] = {
        ...(d || {}),
        subjectId: s?.subjectId ?? null,
        professorId: s?.professorId ?? null,
        scheduleType: s?.scheduleType ?? 'CLASS',
        classMode: s?.classMode ?? null,
        dirty: true,
        toDelete: false,
      };
      return next;
    });
    toast.success(destOccupied ? 'Horários trocados — salve para aplicar' : 'Horário movido — salve para aplicar');
  };

  // Reordena (troca slot_number) entre dois slots do MESMO dia.
  // Usa número temporário para evitar colisão com o índice único (school_id, weekday, slot_number).
  const reorderSlotNumbers = async (srcSlotId: string, destSlotId: string) => {
    const src = timeSlots.find(s => s.id === srcSlotId);
    const dest = timeSlots.find(s => s.id === destSlotId);
    if (!src || !dest) return;
    if (src.weekday !== dest.weekday) {
      toast.error('A reordenação só funciona dentro do mesmo dia da semana');
      return;
    }
    if (src.slot_number === dest.slot_number) return;
    try {
      const temp = Math.max(...timeSlots.map(s => s.slot_number)) + 1000;
      await updateSlot(src.id, { slot_number: temp } as any);
      await updateSlot(dest.id, { slot_number: src.slot_number } as any);
      await updateSlot(src.id, { slot_number: dest.slot_number } as any);
      await refetchSlots();
      toast.success('Horários reordenados');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao reordenar horários');
      await refetchSlots();
    }
  };

  // Move um slot para um slot_number vazio do MESMO dia (sem swap, sem destino).
  const moveSlotToEmptyNumber = async (srcSlotId: string, targetWeekday: string, targetSlotNumber: number) => {
    const src = timeSlots.find(s => s.id === srcSlotId);
    if (!src) return;
    if (src.weekday !== targetWeekday) {
      toast.error('A reordenação só funciona dentro do mesmo dia da semana');
      return;
    }
    if (src.slot_number === targetSlotNumber) return;
    // Garante que de fato não há slot ocupando esse número nesse dia
    const occupied = getSlotsByWeekday(targetWeekday).find(s => s.slot_number === targetSlotNumber);
    if (occupied) {
      return reorderSlotNumbers(srcSlotId, occupied.id);
    }
    try {
      const temp = Math.max(...timeSlots.map(s => s.slot_number)) + 1000;
      await updateSlot(src.id, { slot_number: temp } as any);
      await updateSlot(src.id, { slot_number: targetSlotNumber } as any);
      await refetchSlots();
      toast.success('Horário movido para a nova posição');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao mover horário');
      await refetchSlots();
    }
  };

  // Edita o horário do slot (afeta TODAS as turmas que usam esse slot) e renumera cronologicamente.
  const saveSlotTime = async (slotId: string) => {
    const draft = slotTimeDraft[slotId];
    const slot = timeSlots.find(s => s.id === slotId);
    if (!slot || !draft) return;
    const startNorm = draft.start.length === 5 ? `${draft.start}:00` : draft.start;
    const endNorm = draft.end.length === 5 ? `${draft.end}:00` : draft.end;
    if (!draft.start || !draft.end || startNorm >= endNorm) {
      toast.error('Informe horário inicial e final válidos (início < fim)');
      return;
    }
    if (startNorm === slot.start_time && endNorm === slot.end_time) {
      toast.info('Horário não foi alterado');
      return;
    }
    setSavingSlotTime(slotId);
    try {
      await updateSlot(slotId, { start_time: startNorm, end_time: endNorm } as any);

      // Renumera cronologicamente todos os slots desse dia.
      const dayAfter = getSlotsByWeekday(slot.weekday)
        .map(s => s.id === slotId ? { ...s, start_time: startNorm, end_time: endNorm } : s)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
      const needsResort = dayAfter.some((s, i) => s.slot_number !== i + 1);
      if (needsResort) {
        const maxNum = Math.max(...timeSlots.map(s => s.slot_number)) + 1000;
        // 1ª passada: move todos para números temporários (evita colisão com índice único)
        for (let i = 0; i < dayAfter.length; i++) {
          await updateSlot(dayAfter[i].id, { slot_number: maxNum + i } as any);
        }
        // 2ª passada: aplica os números definitivos em ordem cronológica
        for (let i = 0; i < dayAfter.length; i++) {
          await updateSlot(dayAfter[i].id, { slot_number: i + 1 } as any);
        }
      }

      await refetchSlots();
      setSlotTimeDraft(prev => { const n = { ...prev }; delete n[slotId]; return n; });
      toast.success('Horário do slot atualizado para todas as turmas');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao atualizar horário');
      await refetchSlots();
    } finally {
      setSavingSlotTime(null);
    }
  };

  const undoLastMove = () => {
    setUndoStack(stack => {
      if (stack.length === 0) return stack;
      const last = stack[stack.length - 1];
      setGrid(last.prev);
      toast.info(`Desfeito: ${last.label}`);
      return stack.slice(0, -1);
    });
  };

  const clearAll = () => {
    setGrid(prev => {
      const next: GridState = {};
      Object.entries(prev).forEach(([k, c]) => {
        if (c.modelId) next[k] = { ...c, toDelete: true, dirty: true };
      });
      return next;
    });
  };

  const handleCreateNewSlot = async () => {
    if (!schoolId) return;
    const { weekday, start, end } = newSlotForm;
    if (!start || !end || start >= end) {
      toast.error('Informe horário inicial e final válidos');
      return;
    }
    setCreatingSlot(true);
    try {
      const startNorm = start.length === 5 ? `${start}:00` : start;
      const endNorm = end.length === 5 ? `${end}:00` : end;

      // Pré-checagem: detecta sobreposição com slot ATIVO já existente.
      // Mensagem útil — o slot pode estar "vazio" na grade da turma atual,
      // mas continua existindo na escola (e em outras turmas).
      const existing = getSlotsByWeekday(weekday);
      const overlapping = existing.find(s =>
        s.start_time < endNorm && s.end_time > startNorm,
      );
      if (overlapping) {
        const fmt = (t: string) => t.slice(0, 5);
        toast.error(
          `Já existe o horário ${fmt(overlapping.start_time)}–${fmt(overlapping.end_time)} (${overlapping.slot_label}) nesse dia. Use-o para "Adicionar aula" ou exclua-o antes de criar um novo.`,
          { duration: 7000 },
        );
        setCreatingSlot(false);
        return;
      }

      // Determina o slot_number correto por ORDEM CRONOLÓGICA (start_time)
      const insertIndex = existing.findIndex(s => s.start_time > startNorm);
      const targetNumber = insertIndex === -1 ? (existing.length + 1) : (existing[insertIndex].slot_number);

      // Renumera os slots posteriores (do maior para o menor) para abrir espaço,
      // evitando colisão com o índice único (school_id, weekday, slot_number).
      if (insertIndex !== -1) {
        const toShift = existing.slice(insertIndex).sort((a, b) => b.slot_number - a.slot_number);
        for (const s of toShift) {
          await updateSlot(s.id, { slot_number: s.slot_number + 1 } as any);
        }
      }

      await createSlot({
        school_id: schoolId,
        weekday,
        slot_number: targetNumber,
        slot_label: `${targetNumber}ª aula`,
        start_time: startNorm,
        end_time: endNorm,
      });
      toast.success('Horário criado na ordem cronológica');
      setNewSlotOpen(false);
      setNewSlotForm({ weekday: 'SEGUNDA', start: '', end: '' });
      await refetchSlots();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar horário');
    } finally {
      setCreatingSlot(false);
    }
  };

  const handleSave = async () => {
    if (!organization?.id || !schoolId || !courseId || !classGroupId) return;
    setSaving(true);
    try {
      const toInsert: any[] = [];
      const toUpdate: { id: string; payload: any }[] = [];
      const toDelete: string[] = [];

      Object.entries(grid).forEach(([k, c]) => {
        if (!c.dirty && !c.toDelete) return;
        const [weekday, slotId] = k.split('::');
        const slot = timeSlots.find(s => s.id === slotId);
        if (!slot) return;

        if (c.toDelete && c.modelId) {
          toDelete.push(c.modelId);
          return;
        }
        // Permite salvar PLANNING sem disciplina; bloqueia CLASS sem disciplina
        if (c.scheduleType === 'CLASS' && !c.subjectId) return;

        const payload = {
          organization_id: organization.id,
          school_id: schoolId,
          course_id: courseId,
          class_group_id: classGroupId,
          subject_id: c.subjectId,
          professor_id: c.professorId,
          schedule_type: c.scheduleType,
          weekday: weekday as Weekday,
          start_time: slot.start_time,
          end_time: slot.end_time,
          school_time_slot_id: slot.id,
          status: 'ACTIVE' as const,
        };

        if (c.modelId) {
          toUpdate.push({ id: c.modelId, payload });
        } else {
          toInsert.push(payload);
        }
      });

      // Delete first (and remove their occurrences)
      if (toDelete.length) {
        await gradeHorariaApi.client.from('annual_class_occurrences').delete().in('weekly_model_id', toDelete);
        const { error } = await gradeHorariaApi.client.from('weekly_teaching_models').delete().in('id', toDelete);
        if (error) throw error;
      }

      // Updates
      for (const u of toUpdate) {
        const { error } = await gradeHorariaApi.client.from('weekly_teaching_models').update(u.payload).eq('id', u.id);
        if (error) throw error;
      }

      // Inserts em lote
      if (toInsert.length) {
        const { error } = await gradeHorariaApi.client.from('weekly_teaching_models').insert(toInsert);
        if (error) throw error;
      }

      toast.success(`Grade salva (${toInsert.length} novos, ${toUpdate.length} atualizados, ${toDelete.length} removidos)`);
      setUndoStack([]);
      onSaved?.();
      await loadGrid();

      // Dispara geração automática de pré-planejamentos para as disciplinas afetadas
      try {
        const affected = new Map<string, { professor_id: string; subject_id: string }>();
        [...toInsert, ...toUpdate.map(u => u.payload)].forEach((p: any) => {
          if (p.subject_id && p.professor_id) {
            affected.set(`${p.professor_id}|${p.subject_id}`, { professor_id: p.professor_id, subject_id: p.subject_id });
          }
        });
        if (affected.size > 0 && courseId && schoolId && classGroupId) {
          const bimestersFor = (subjectId: string): number[] => {
            const sem = subjects.find(s => s.id === subjectId)?.semester ?? 'ANNUAL';
            if (sem === 'FIRST') return [1, 2];
            if (sem === 'SECOND') return [3, 4];
            return [1, 2, 3, 4];
          };
          const callMap = new Map<number, Array<{ professor_id: string; subject_id: string }>>();
          Array.from(affected.values()).forEach(item => {
            bimestersFor(item.subject_id).forEach(b => {
              const list = callMap.get(b) ?? [];
              if (!list.some(x => x.professor_id === item.professor_id && x.subject_id === item.subject_id)) {
                list.push(item);
              }
              callMap.set(b, list);
            });
          });
          const referenceYear = new Date().getFullYear();
          toast.info(`Gerando pré-planejamentos… (${callMap.size} bimestre(s))`);
          const results = await Promise.allSettled(
            Array.from(callMap.entries()).map(([bimester, items]) =>
              supabase.functions.invoke('generate-pre-plannings', {
                body: {
                  organization_id: organization.id,
                  course_id: courseId,
                  school_id: schoolId,
                  class_group_ids: [classGroupId],
                  bimester_number: bimester,
                  reference_year: referenceYear,
                  selected_items: items,
                },
              }).then(r => { if (r.error) throw r.error; return r.data as any; })
            )
          );
          let created = 0, skipped = 0, fail = 0;
          results.forEach(r => {
            if (r.status === 'fulfilled') {
              created += r.value?.created ?? 0;
              skipped += r.value?.skipped ?? 0;
            } else {
              fail++;
              console.error('[auto-pre-plannings] falha:', r.reason);
            }
          });
          if (created > 0) {
            toast.success(`✅ ${created} pré-planejamento(s) gerado(s)${skipped ? ` · ${skipped} já existente(s)` : ''}${fail ? ` · ${fail} falha(s)` : ''}`);
          } else if (skipped > 0) {
            toast.info(`Pré-planejamentos já existentes (${skipped})`);
          } else if (fail > 0) {
            toast.warning(`Falha ao gerar pré-planejamentos (${fail})`);
          }
        }
      } catch (preErr) {
        console.error('[auto-pre-plannings] erro:', preErr);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Erro ao salvar grade');
    } finally {
      setSaving(false);
    }
  };

  const { data: anpMap } = useAnpSubjectMap();
  const subjectName = (id: string | null) => id ? (subjects.find(s => s.id === id)?.nome || '—') : '';
  const professorName = (id: string | null) => id ? (professors.find(p => p.id === id)?.full_name || '—') : '';

  return (
    <div className="space-y-4">
      {/* Header sticky */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Planilha Semanal
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Clique em uma célula para definir Disciplina + Professor. Use "Copiar" para replicar uma aula em várias células.
              </p>
            </div>
            <div className="inline-flex rounded-md border bg-muted/40 p-1 self-start">
              {(['FIRST', 'SECOND'] as GridSemester[]).map((semester) => (
                <button
                  key={semester}
                  type="button"
                  onClick={() => setSemesterView(semester)}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                    semesterView === semester
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {SEMESTER_LABELS[semester]}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Escola</label>
            <SearchableSelect
              value={schoolId || ''}
              onValueChange={(v) => { setSchoolId(v); setCourseId(null); setClassGroupId(null); }}
              placeholder="Selecione a escola"
              options={schools.map(s => ({ value: s.id, label: s.nome }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Curso</label>
            <SearchableSelect
              value={courseId || ''}
              onValueChange={(v) => { setCourseId(v); setClassGroupId(null); }}
              disabled={!schoolId}
              placeholder={!schoolId ? 'Selecione a escola' : 'Selecione o curso'}
              options={courses.map(c => ({ value: c.id, label: c.nome }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Turma</label>
            <SearchableSelect
              value={classGroupId || ''}
              onValueChange={setClassGroupId}
              disabled={!courseId}
              placeholder={!courseId ? 'Selecione o curso' : 'Selecione a turma'}
              options={classGroups.map(c => ({ value: c.id, label: c.nome }))}
            />
          </div>
        </CardContent>
      </Card>

      {!classGroupId ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Selecione Escola, Curso e Turma para começar a montar a grade.
          </CardContent>
        </Card>
      ) : timeSlots.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
            Esta escola não possui horários (slots) configurados. Configure em "Horários da Escola".
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          {/* Grid */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3 space-y-0">
              <CardTitle className="text-sm">Grade da Turma</CardTitle>
              <div className="flex items-center gap-2">
                {copyMode && (
                  <Badge variant="default" className="gap-1">
                    Copiando: {copyMode.subjectName}
                    <button onClick={() => setCopyMode(null)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                  </Badge>
                )}
                {moveMode && (
                  <Badge variant="secondary" className="gap-1 border border-primary/40">
                    <Move className="h-3 w-3" /> Movendo: {moveMode.label}
                    <button onClick={() => setMoveMode(null)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                  </Badge>
                )}
                {undoStack.length > 0 && (
                  <Button size="sm" variant="outline" onClick={undoLastMove} title="Desfaz a última troca/movimentação de Planejamento">
                    <Undo2 className="mr-1.5 h-3.5 w-3.5" /> Desfazer
                  </Button>
                )}
                <Popover open={newSlotOpen} onOpenChange={setNewSlotOpen}>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" title="Cria um novo horário (slot) na escola para poder remanejar planejamentos">
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Novo horário
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
                      <Button size="sm" className="w-full" onClick={handleCreateNewSlot} disabled={creatingSlot}>
                        {creatingSlot ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
                        Criar horário
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button size="sm" variant="ghost" onClick={clearAll} disabled={loading}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Limpar tudo
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving || dirtyCount === 0}>
                  {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                  Salvar {dirtyCount > 0 && `(${dirtyCount})`}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-2">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-separate border-spacing-1">
                    <thead>
                      <tr>
                        <th className="text-left font-medium text-muted-foreground p-2 sticky left-0 bg-background">Horário</th>
                        {WEEKDAYS.map(wd => (
                          <th key={wd} className="font-medium text-muted-foreground p-2 text-center min-w-[140px]">
                            {WEEKDAY_OPTIONS.find(w => w.value === wd)?.label.split('-')[0].trim()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Build rows from union of slot_numbers across weekdays */}
                      {Array.from(new Set(timeSlots.map(s => s.slot_number))).sort((a, b) => a - b).map(slotNum => (
                        <tr key={slotNum}>
                          <td className="p-2 align-middle text-muted-foreground whitespace-nowrap">
                            <div className="font-medium text-foreground">{slotNum}ª</div>
                          </td>
                          {WEEKDAYS.map(wd => {
                            const slot = getSlotsByWeekday(wd).find(s => s.slot_number === slotNum);
                            if (!slot) {
                              const isReorderDrag = !!dragSourceKey && dragMode === 'reorder';
                              const sameDayDrag = isReorderDrag && dragSourceKey?.split('::')[0] === wd;
                              const phKey = `placeholder::${wd}::${slotNum}`;
                              const isOver = dragOverKey === phKey;
                              return (
                                <td key={wd} className="p-1">
                                  <div
                                    onDragOver={(e) => {
                                      if (!sameDayDrag) return;
                                      e.preventDefault();
                                      e.dataTransfer.dropEffect = 'move';
                                      if (dragOverKey !== phKey) setDragOverKey(phKey);
                                    }}
                                    onDragLeave={() => { if (dragOverKey === phKey) setDragOverKey(null); }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      const src = dragSourceKey;
                                      setDragSourceKey(null);
                                      setDragOverKey(null);
                                      setDragMode('content');
                                      if (!src || !sameDayDrag) return;
                                      const [, srcSlotId] = src.split('::');
                                      moveSlotToEmptyNumber(srcSlotId, wd, slotNum);
                                    }}
                                    className={`min-h-[3.5rem] h-full rounded border border-dashed bg-muted/10 transition-colors ${
                                      sameDayDrag ? 'border-emerald-400/60 ring-2 ring-emerald-400/40' : 'border-muted/50'
                                    } ${isOver ? 'bg-emerald-500/10 ring-2 ring-emerald-500' : ''}`}
                                    title={sameDayDrag ? 'Solte aqui para mover o horário para esta posição' : ''}
                                  />
                                </td>
                              );
                            }
                            const k = cellKey(wd, slot.id);
                            const cell = grid[k];
                            const isPlanning = cell?.scheduleType === 'PLANNING' && !cell.toDelete;
                            const isEmpty = !cell || cell.toDelete || (!cell.subjectId && !isPlanning);
                            const isOpen = openCellKey === k;
                            // Toda célula com slot é arrastável: cheia => move/swap conteúdo; vazia => reordenar slot_number
                            const isDraggable = true;
                            const isDragging = !!dragSourceKey;
                            const isDragSource = dragSourceKey === k;
                            // Em modo "reorder", só aceita drop em outra célula do MESMO dia
                            const isValidDropTarget = isDragging && !isDragSource && (
                              dragMode === 'content' ? true : (dragSourceKey?.split('::')[0] === wd)
                            );
                            const cellButton = (
                              <button
                                type="button"
                                onClick={() => { handleCellClick(wd, slot.id); }}
                                draggable={isDraggable}
                                onDragStart={(e) => {
                                  setDragSourceKey(k);
                                  setDragMode(isEmpty ? 'reorder' : 'content');
                                  e.dataTransfer.effectAllowed = 'move';
                                  try { e.dataTransfer.setData('text/plain', k); } catch {}
                                }}
                                onDragEnd={() => { setDragSourceKey(null); setDragOverKey(null); setDragMode('content'); }}
                                onDragOver={(e) => {
                                  if (!isValidDropTarget) return;
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = 'move';
                                  if (dragOverKey !== k) setDragOverKey(k);
                                }}
                                onDragLeave={() => { if (dragOverKey === k) setDragOverKey(null); }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  const src = dragSourceKey;
                                  const mode = dragMode;
                                  setDragSourceKey(null);
                                  setDragOverKey(null);
                                  setDragMode('content');
                                  if (!src) return;
                                  if (mode === 'reorder') {
                                    const [srcWd, srcSlotId] = src.split('::');
                                    if (srcWd !== wd) { toast.error('Reordene dentro do mesmo dia'); return; }
                                    reorderSlotNumbers(srcSlotId, slot.id);
                                  } else {
                                    moveCellToKey(src, k);
                                  }
                                }}
                                className={`w-full min-h-[3.5rem] rounded border text-left px-2 py-1 transition-colors text-[11px] leading-tight ${
                                  isEmpty
                                    ? `border-dashed text-muted-foreground hover:border-primary hover:bg-primary/5 cursor-grab active:cursor-grabbing ${copyMode ? 'border-primary/40 bg-primary/5' : ''}`
                                    : isPlanning
                                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-800 cursor-grab active:cursor-grabbing'
                                      : 'bg-primary/10 border-primary/40 text-foreground cursor-grab active:cursor-grabbing'
                                } ${cell?.dirty ? 'ring-2 ring-primary/30' : ''} ${
                                  isDragSource ? 'opacity-40' : ''
                                } ${
                                  isValidDropTarget && dragOverKey !== k ? 'ring-2 ring-emerald-400/60' : ''
                                } ${
                                  dragOverKey === k ? 'ring-2 ring-emerald-500 bg-emerald-500/10' : ''
                                }`}
                                title={isEmpty ? 'Arraste para outra linha do MESMO dia para reordenar este horário' : 'Arraste para outro dia/horário (vazio = mover, ocupado = trocar)'}
                              >

                                <div className="text-[9px] opacity-60">{slot.start_time.slice(0, 5)}-{slot.end_time.slice(0, 5)}</div>
                                {isEmpty ? (
                                  <div className="opacity-60">+ Adicionar</div>
                                ) : isPlanning ? (
                                  <>
                                    <div className="font-semibold flex items-start gap-1 break-words">
                                      <ClipboardList className="h-3 w-3 mt-[2px] shrink-0" /> <span className="line-clamp-2">Planejamento</span>
                                    </div>
                                    <div className="opacity-80 break-words line-clamp-2">{cell?.professorId ? professorName(cell.professorId) : 'Sem professor'}</div>
                                  </>
                                ) : (
                                  <>
                                    <div className="font-semibold flex items-start gap-1 break-words">
                                      <span className="line-clamp-2 min-w-0">
                                        <SubjectNameWithAnp name={subjectName(cell.subjectId)} isAnp={cell.subjectId ? anpMap?.bySubject.has(cell.subjectId) : false} compact />
                                      </span>
                                      {(cell.classMode === 'ANP' || (cell.subjectId && anpMap?.bySubject.has(cell.subjectId))) && (
                                        <span className="shrink-0 inline-flex items-center rounded border border-indigo-300 bg-indigo-50 text-indigo-700 font-bold text-[8px] px-1 leading-none py-0.5" title="Slot ANP">ANP</span>
                                      )}
                                    </div>
                                    <div className="opacity-70 break-words line-clamp-2">{cell.professorId ? professorName(cell.professorId) : 'Sem professor'}</div>
                                  </>
                                )}
                              </button>
                            );
                            const draft = slotTimeDraft[slot.id] ?? { start: slot.start_time.slice(0, 5), end: slot.end_time.slice(0, 5) };
                            const isPL = cell?.scheduleType === 'PLANNING';
                            return (
                              <td key={wd} className="p-1">
                                <div className="relative">
                                  <Popover open={isOpen} onOpenChange={(o) => {
                                    setOpenCellKey(o ? k : null);
                                    if (o) {
                                      setSlotTimeDraft(prev => ({ ...prev, [slot.id]: { start: slot.start_time.slice(0, 5), end: slot.end_time.slice(0, 5) } }));
                                    }
                                  }}>
                                    <PopoverTrigger asChild>
                                      {cellButton}
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-3" align="start">
                                      <div className="space-y-3">
                                        <div className="text-xs font-medium text-muted-foreground">
                                          {WEEKDAY_OPTIONS.find(w => w.value === wd)?.label} · {slot.start_time.slice(0, 5)}-{slot.end_time.slice(0, 5)}
                                        </div>

                                        {!isPL && (
                                          <div>
                                            <label className="text-xs font-medium mb-1 block">Disciplina</label>
                                            <SearchableSelect
                                              value={cell?.subjectId || ''}
                                              onValueChange={(v) => updateCell(k, { subjectId: v })}
                                              placeholder="Selecione"
                                              options={subjects.map(s => ({
                                                value: s.id,
                                                label: s.nome,
                                                description: s.semester ? SEMESTER_LABELS[s.semester] : undefined,
                                              })).filter((option) => {
                                                const subject = subjects.find((s) => s.id === option.value);
                                                return !subject?.semester || subject.semester === 'ANNUAL' || subject.semester === semesterView;
                                              })}
                                            />
                                          </div>
                                        )}
                                        <div>
                                          <label className="text-xs font-medium mb-1 block">Professor</label>
                                          <SearchableSelect
                                            value={cell?.professorId || ''}
                                            onValueChange={(v) => updateCell(k, { professorId: v })}
                                            placeholder={professors.length === 0 ? 'Vincule professores ao curso' : 'Selecione'}
                                            options={professors.map(p => {
                                              const aulas = profLoad[p.id] ?? 0;
                                              const sl = profSchoolLoad[p.id] ?? { classes: 0, plannings: 0 };
                                              const target = computeRequiredPlanning(sl.classes);
                                              const status = target === 0
                                                ? (aulas > 0 ? `${aulas} aula(s)/sem` : 'sem aulas')
                                                : `${sl.classes} aulas · PL ${sl.plannings}/${target} (${PLANNING_RATIO_LABEL})`;
                                              return {
                                                value: p.id,
                                                label: p.full_name,
                                                description: status,
                                              };
                                            })}
                                          />
                                        </div>
                                        <div className="flex items-center justify-between pt-1">
                                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={cell?.scheduleType === 'PLANNING'}
                                              onChange={(e) => updateCell(k, { scheduleType: e.target.checked ? 'PLANNING' : 'CLASS' })}
                                            />
                                            <ClipboardList className="h-3 w-3" /> Planejamento
                                          </label>
                                        </div>

                                        {/* Editor de horário do slot (global) */}
                                        <div className="pt-2 border-t space-y-1.5">
                                          <div className="text-xs font-medium">Horário do slot (global)</div>
                                          <div className="flex items-end gap-1.5">
                                            <div className="flex-1">
                                              <label className="text-[10px] text-muted-foreground">Início</label>
                                              <Input
                                                type="time"
                                                value={draft.start}
                                                onChange={e => setSlotTimeDraft(prev => ({ ...prev, [slot.id]: { ...draft, start: e.target.value } }))}
                                                className="h-8 text-xs"
                                              />
                                            </div>
                                            <div className="flex-1">
                                              <label className="text-[10px] text-muted-foreground">Fim</label>
                                              <Input
                                                type="time"
                                                value={draft.end}
                                                onChange={e => setSlotTimeDraft(prev => ({ ...prev, [slot.id]: { ...draft, end: e.target.value } }))}
                                                className="h-8 text-xs"
                                              />
                                            </div>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="h-8 text-xs"
                                              disabled={savingSlotTime === slot.id}
                                              onClick={() => saveSlotTime(slot.id)}
                                            >
                                              {savingSlotTime === slot.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Salvar'}
                                            </Button>
                                          </div>
                                          <div className="flex items-start gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-1">
                                            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                                            <span>Altera o horário para <strong>todas as turmas</strong> que usam este slot neste dia.</span>
                                          </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                                          {cell?.subjectId && !isPL && (
                                            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => startCopyFromCell(k)}>
                                              <Copy className="h-3 w-3 mr-1" /> Copiar
                                            </Button>
                                          )}
                                          {(cell?.subjectId || isPL) && (
                                            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => startMoveFromCell(k)}>
                                              <Move className="h-3 w-3 mr-1" /> Mover
                                            </Button>
                                          )}
                                          <Button size="sm" variant="ghost" className="flex-1 h-8 text-xs text-destructive" onClick={() => removeCell(k)}>
                                            <Trash2 className="h-3 w-3 mr-1" /> Limpar
                                          </Button>
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                  {isPlanning && cell?.modelId && (
                                    <div className="absolute top-0.5 right-0.5">
                                      <PlanningObservationButton
                                        model={{
                                          id: cell.modelId,
                                          schedule_type: 'PLANNING',
                                          observation: cell.observation ?? null,
                                          subject_name: cell.subjectId ? subjectName(cell.subjectId) : 'Planejamento',
                                          professor_name: cell.professorId ? professorName(cell.professorId) : undefined,
                                        }}
                                        onSaved={(obs) => setGrid(prev => ({ ...prev, [k]: { ...prev[k], observation: obs } }))}
                                      />
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Painel: carga horária */}
          <Card className="self-start sticky top-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" /> Carga horária
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {subjects.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem disciplinas no curso.</p>
              ) : (
                subjects.filter(s => !s.semester || s.semester === 'ANNUAL' || s.semester === semesterView).map(s => {
                  const allocated = allocationBySubject.get(s.id) || 0;
                  return (
                    <div key={s.id} className="flex items-center justify-between text-xs gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{s.nome}</div>
                        {s.semester && (
                          <div className="text-[10px] text-muted-foreground">{SEMESTER_LABELS[s.semester]}</div>
                        )}
                      </div>
                      <Badge variant={allocated > 0 ? 'default' : 'outline'} className="shrink-0">
                        {allocated} <span className="opacity-70 ml-0.5">aula{allocated !== 1 ? 's' : ''}/sem</span>
                      </Badge>
                    </div>
                  );
                })
              )}
              <div className="pt-2 mt-2 border-t flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total alocado</span>
                <span className="font-semibold">
                  {Array.from(allocationBySubject.values()).reduce((a, b) => a + b, 0)} aulas/sem
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      <ScheduleConflictModal
        open={conflictModal.open}
        onOpenChange={(o) => setConflictModal(s => ({ ...s, open: o }))}
        conflicts={conflictModal.items}
        context="admin"
        hint="O professor já possui aula/planejamento ativo em outra turma neste horário. Escolha outro destino."
      />
    </div>
  );
}
