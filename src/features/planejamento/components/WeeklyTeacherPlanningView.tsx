import { supabase } from '@/integrations/supabase/client';
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronDown, CalendarDays, Clock, BookOpen, Save, Loader2, CheckCircle2, AlertCircle, GraduationCap, Sparkles, Send, FileText, RotateCcw, PenTool, ClipboardEdit, ArrowLeft, PlayCircle, Download, Edit, ClipboardList } from 'lucide-react';
import { TeacherPlanningData, PrePlanningData, CourseData, SubjectData, SchoolData, ClassGroupData } from '@/services/supabaseApi';
import { TeacherPlanningStatus, PLANNING_STATUS_LABELS } from '@/types/academic';
import { planejamentoApi } from '@/features/planejamento/api';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import WeeklyLessonMaterials from '@/features/disciplinas/components/WeeklyLessonMaterials';
import { DigitalSignatureDialog } from './DigitalSignatureDialog';

interface WeeklyTeacherPlanningViewProps {
  items: TeacherPlanningData[];
  prePlannings?: PrePlanningData[];
  courses: CourseData[];
  subjects: SubjectData[];
  schools: SchoolData[];
  classGroups: ClassGroupData[];
  professors: Record<string, string>;
  onRefresh: () => void;
  onView: (tp: TeacherPlanningData) => void;
  emptyMessage: string;
}

const PEDAGOGICAL_FIELDS = [
  { key: 'objective', label: 'Objetivo', placeholder: 'Descreva os objetivos de aprendizagem desta semana...' },
  { key: 'competencies', label: 'Competências', placeholder: 'Competências a serem desenvolvidas...' },
  { key: 'contents', label: 'Conteúdos', placeholder: 'Conteúdos programáticos...' },
  { key: 'methodology', label: 'Metodologia', placeholder: 'Estratégias metodológicas...' },
  { key: 'resources', label: 'Recursos Didáticos', placeholder: 'Recursos necessários...' },
  { key: 'evaluation', label: 'Avaliação', placeholder: 'Critérios e instrumentos de avaliação...' },
  { key: 'product', label: 'Produto/Registro', placeholder: 'Produtos ou registros esperados...' },
  { key: 'next_steps', label: 'Próximos Passos', placeholder: 'Orientações para continuidade...' },
];

function isWeekFilled(tp: TeacherPlanningData): boolean {
  return !!(tp.objective && tp.competencies && tp.contents && tp.methodology && tp.resources && tp.evaluation && tp.product && tp.next_steps);
}

function isWeekPartiallyFilled(tp: TeacherPlanningData): boolean {
  const fields = [tp.objective, tp.competencies, tp.contents, tp.methodology, tp.resources, tp.evaluation, tp.product, tp.next_steps];
  const filledCount = fields.filter(f => f && f.trim()).length;
  return filledCount > 0 && filledCount < 8;
}

function getFilledFieldCount(tp: TeacherPlanningData): number {
  const fields = [tp.objective, tp.competencies, tp.contents, tp.methodology, tp.resources, tp.evaluation, tp.product, tp.next_steps];
  return fields.filter(f => f && f.trim()).length;
}

function isWeekEditedByProfessor(tp: TeacherPlanningData, sourcePrePlanning?: PrePlanningData | null): boolean {
  const normalize = (value?: string | null) => (value || '').trim();

  if (sourcePrePlanning) {
    const fields: Array<keyof Pick<TeacherPlanningData, 'objective' | 'competencies' | 'contents' | 'methodology' | 'resources' | 'evaluation' | 'product' | 'next_steps'>> = [
      'objective',
      'competencies',
      'contents',
      'methodology',
      'resources',
      'evaluation',
      'product',
      'next_steps',
    ];

    return fields.some((field) => normalize(tp[field]) !== normalize(sourcePrePlanning[field] as string | null));
  }

  if (!tp.created_at || !tp.updated_at) return false;

  const createdAtMs = new Date(tp.created_at).getTime();
  const updatedAtMs = new Date(tp.updated_at).getTime();
  if (Number.isNaN(createdAtMs) || Number.isNaN(updatedAtMs)) return false;

  return updatedAtMs - createdAtMs > 30000;
}

const statusConfig: Record<string, { icon: React.ReactNode; className: string; label: string }> = {
  DRAFT: { icon: <FileText className="h-3 w-3" />, className: 'border-slate-300 text-slate-600 bg-slate-50', label: 'Em edição' },
  CONCLUIDO: { icon: <CheckCircle2 className="h-3 w-3" />, className: 'border-emerald-300 text-emerald-700 bg-emerald-50', label: 'Concluído' },
  ENVIADO: { icon: <Send className="h-3 w-3" />, className: 'border-amber-300 text-amber-700 bg-amber-50', label: 'Enviado para coordenação' },
  PENDING: { icon: <Clock className="h-3 w-3" />, className: 'border-amber-300 text-amber-700 bg-amber-50', label: 'Enviado para coordenação' },
  DEVOLVIDO: { icon: <RotateCcw className="h-3 w-3" />, className: 'border-red-300 text-red-700 bg-red-50', label: 'Devolvido' },
  REJECTED: { icon: <RotateCcw className="h-3 w-3" />, className: 'border-red-300 text-red-700 bg-red-50', label: 'Devolvido' },
  ASSINADO: { icon: <CheckCircle2 className="h-3 w-3" />, className: 'bg-emerald-600 text-white border-emerald-600', label: 'Assinado' },
  APPROVED: { icon: <CheckCircle2 className="h-3 w-3" />, className: 'bg-emerald-600 text-white border-emerald-600', label: 'Assinado' },
  AGUARDANDO_ASSINATURA: { icon: <PenTool className="h-3 w-3" />, className: 'border-blue-300 text-blue-700 bg-blue-50', label: 'Aguardando assinatura' },
  AGUARDANDO_ASSINATURA_COORDENADOR: { icon: <PenTool className="h-3 w-3" />, className: 'border-violet-300 text-violet-700 bg-violet-50', label: 'Aguardando coord.' },
};

interface GroupItem {
  groupKey: string;
  groupLabel: string;
  subLabel?: string;
  items: TeacherPlanningData[];
  totalWeeks: number;
  filledWeeks: number;
}

interface PrePlanningGroupItem {
  groupKey: string;
  groupLabel: string;
  subLabel?: string;
  items: PrePlanningData[];
  totalWeeks: number;
  filledWeeks: number;
}

export function WeeklyTeacherPlanningView({
  items, prePlannings = [], courses, subjects, schools, classGroups, professors,
  onRefresh, onView, emptyMessage,
}: WeeklyTeacherPlanningViewProps) {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const { user } = useAuth();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [openWeeks, setOpenWeeks] = useState<Record<string, boolean>>({});
  const [editData, setEditData] = useState<Record<string, Record<string, string>>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set());
  const [launchMode, setLaunchMode] = useState<string | null>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [confirmSubmitGroup, setConfirmSubmitGroup] = useState<GroupItem | null>(null);
  const [savedWeekIds, setSavedWeekIds] = useState<Set<string>>(new Set());
  // Pre-planning adoption state
  const [usePrePlanningGroup, setUsePrePlanningGroup] = useState<PrePlanningGroupItem | null>(null);
  const [usingPrePlanning, setUsingPrePlanning] = useState(false);
  const [usePrePlanningStep, setUsePrePlanningStep] = useState<'confirm' | 'success'>('confirm');
  const [openSchoolGroups, setOpenSchoolGroups] = useState<Record<string, boolean>>({});
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [signingPlanningIds, setSigningPlanningIds] = useState<string[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();

  const prePlanningById = useMemo(() => {
    const map = new Map<string, PrePlanningData>();
    prePlannings.forEach((pp) => map.set(pp.id, pp));
    return map;
  }, [prePlannings]);

  useEffect(() => {
    const launchGroupKey = searchParams.get('launchGroup');
    if (launchGroupKey) {
      if (launchMode !== launchGroupKey) {
        setLaunchMode(launchGroupKey);
        setSavedWeekIds(new Set());
      }
      return;
    }

    if (launchMode !== null) setLaunchMode(null);
  }, [searchParams, launchMode]);

  

  const getSubjectName = (id: string | null) => {
    if (!id) return '-';
    const s = subjects.find(s => s.id === id);
    if (!s) return '-';
    return s.nome_boletim ? `${s.nome} (${s.nome_boletim})` : s.nome;
  };
  const getSchoolName = (id: string | null) => schools.find(s => s.id === id)?.nome || '-';
  const getClassGroupName = (id: string | null) => classGroups.find(cg => cg.id === id)?.nome || '-';

  const groups = useMemo((): GroupItem[] => {
    const map = new Map<string, GroupItem>();
    const sortedItems = [...items].sort((a, b) => (a.week_number || 0) - (b.week_number || 0));

    sortedItems.forEach((tp) => {
      const groupKey = `${tp.subject_id}_${tp.school_id}_${tp.class_group_id}_${tp.bimester_number}`;
      const groupLabel = `${getSubjectName(tp.subject_id)} • ${tp.bimester_number}º Bimestre`;
      const subLabel = `${getSchoolName(tp.school_id)} • ${getClassGroupName(tp.class_group_id)}`;

      if (!map.has(groupKey)) {
        map.set(groupKey, { groupKey, groupLabel, subLabel, items: [], totalWeeks: 0, filledWeeks: 0 });
      }

      const group = map.get(groupKey)!;
      group.items.push(tp);
      group.totalWeeks++;
      if (isWeekFilled(tp)) group.filledWeeks++;
    });

    return Array.from(map.values()).sort((a, b) => a.groupLabel.localeCompare(b.groupLabel));
  }, [items]);

  // Pre-planning groups (read-only, for adoption)
  const prePlanningGroups = useMemo((): PrePlanningGroupItem[] => {
    if (!prePlannings || prePlannings.length === 0) return [];
    const map = new Map<string, PrePlanningGroupItem>();
    const sortedItems = [...prePlannings].sort((a, b) => (a.week_number || 0) - (b.week_number || 0));

    sortedItems.forEach((pp) => {
      const groupKey = `pp_${pp.subject_id}_${pp.school_id}_${pp.class_group_id}_${pp.bimester_number}`;
      const groupLabel = `${getSubjectName(pp.subject_id)} • ${pp.bimester_number}º Bimestre`;
      const subLabel = `${getSchoolName(pp.school_id)} • ${getClassGroupName(pp.class_group_id)}`;

      if (!map.has(groupKey)) {
        map.set(groupKey, { groupKey, groupLabel, subLabel, items: [], totalWeeks: 0, filledWeeks: 0 });
      }

      const group = map.get(groupKey)!;
      group.items.push(pp);
      group.totalWeeks++;
      const ppFilled = !!(pp.objective && pp.competencies && pp.contents && pp.methodology && pp.resources && pp.evaluation && pp.product && pp.next_steps);
      if (ppFilled) group.filledWeeks++;
    });

    return Array.from(map.values()).sort((a, b) => a.groupLabel.localeCompare(b.groupLabel));
  }, [prePlannings]);

  const handleUsePrePlanning = async (group: PrePlanningGroupItem) => {
    setUsingPrePlanning(true);
    try {
      const organizationId = organization?.id;
      if (!organizationId || !user?.id) throw new Error('Organização ou usuário não encontrado');

      for (const pp of group.items) {
        await planejamentoApi.createTeacherPlanning({ pre_planning_id: pp.id, class_group_id: classGroupId, course_id: courseId, subject_id: subjectId, school_id: schoolId, organization_id: orgId, professor_id: profId, bimester_id: bimesterId, week_number: pp.week_number, topic: pp.topic, objectives: pp.objectives, competences: pp.competences, contents: pp.contents, methodology: pp.methodology, resources: pp.resources, evaluation: pp.evaluation, product: pp.product, next_actions: pp.next_actions, observations: '', status: 'draft' });
        if (error) throw error;

        // Update pre-planning status to EM_EDICAO so it disappears from coordinator list
        await planejamentoApi.updatePrePlanning(pp.id, { status: 'EM_EDICAO' });
      }

      setUsePrePlanningStep('success');
      onRefresh();
    } catch (error: any) {
      toast({ title: error.message || 'Erro ao usar pré-planejamento', variant: 'destructive' });
      setUsePrePlanningGroup(null);
    } finally {
      setUsingPrePlanning(false);
    }
  };

  const openUsePrePlanningDialog = (group: PrePlanningGroupItem) => {
    setUsePrePlanningStep('confirm');
    setUsePrePlanningGroup(group);
  };

  const toggleGroup = (key: string) => setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleWeek = (id: string) => {
    setOpenWeeks(prev => ({ ...prev, [id]: !prev[id] }));
    initEditData(id);
  };

  const initEditData = (id: string) => {
    const tp = items.find(i => i.id === id);
    if (tp && !editData[id]) {
      setEditData(prev => ({
        ...prev,
        [id]: {
          objective: tp.objective || '',
          competencies: tp.competencies || '',
          contents: tp.contents || '',
          methodology: tp.methodology || '',
          resources: tp.resources || '',
          evaluation: tp.evaluation || '',
          product: tp.product || '',
          next_steps: tp.next_steps || '',
        },
      }));
    }
  };

  // Auto-save refs
  const autoSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const autoSavingIds = useRef<Set<string>>(new Set());
  const editDataRef = useRef(editData);
  editDataRef.current = editData;

  const autoSave = useCallback(async (id: string) => {
    if (autoSavingIds.current.has(id)) return;
    autoSavingIds.current.add(id);
    try {
      const data = editDataRef.current[id];
      if (!data) return;
      const hasContent = Object.values(data).some(v => v.trim().length > 0);
      if (!hasContent) return;

      await supabase
        .from('teacher_plannings')
        .update({
          objective: data.objective,
          competencies: data.competencies,
          contents: data.contents,
          methodology: data.methodology,
          resources: data.resources,
          evaluation: data.evaluation,
          product: data.product,
          next_steps: data.next_steps,
        })
        .eq('id', id);
    } catch {
      // Silent fail for auto-save
    } finally {
      autoSavingIds.current.delete(id);
    }
  }, []);

  const updateField = (id: string, field: string, value: string) => {
    setEditData(prev => {
      const updated = { ...prev, [id]: { ...prev[id], [field]: value } };
      // Schedule debounced auto-save (2 seconds)
      if (autoSaveTimers.current[id]) clearTimeout(autoSaveTimers.current[id]);
      autoSaveTimers.current[id] = setTimeout(() => {
        autoSave(id);
      }, 2000);
      return updated;
    });
  };

  // "Lançar Planejamento" - redirect to launch mode URL for weekly view
  const handleLaunchPlanning = (group: GroupItem) => {
    try {
      const params = new URLSearchParams(searchParams);
      params.set('launchGroup', group.groupKey);
      setSearchParams(params);
    } catch (error: any) {
      toast({ title: error?.message || 'Erro ao abrir planejamento', variant: 'destructive' });
    }
  };

  const handleExitLaunchMode = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('launchGroup');
    setSearchParams(params);
    setLaunchMode(null);
  };

  const canEdit = (tp: TeacherPlanningData) => {
    return tp.status === 'DRAFT' || tp.status === 'DEVOLVIDO' || tp.status === 'REJECTED';
  };

  const isFinalized = (tp: TeacherPlanningData) => {
    return tp.status === 'ASSINADO' || tp.status === 'APPROVED' || tp.professor_signed;
  };

  const isWeekCompleted = (tp: TeacherPlanningData) => {
    return savedWeekIds.has(tp.id) || (tp.status as string) === 'CONCLUIDO';
  };

  const savedWeekIdsRef = useRef(savedWeekIds);
  savedWeekIdsRef.current = savedWeekIds;

  const openWeeksRef = useRef(openWeeks);
  openWeeksRef.current = openWeeks;

  const handleSaveWeek = async (tp: TeacherPlanningData, groupItems?: TeacherPlanningData[]) => {
    const data = editData[tp.id];
    if (!data) return;

    const requiredFields: Array<{ key: keyof typeof data; label: string }> = [
      { key: 'objective', label: 'Objetivo' },
      { key: 'competencies', label: 'Competências' },
      { key: 'contents', label: 'Conteúdos' },
      { key: 'methodology', label: 'Metodologia' },
      { key: 'resources', label: 'Recursos Didáticos' },
      { key: 'evaluation', label: 'Avaliação' },
      { key: 'product', label: 'Produto/Registro' },
      { key: 'next_steps', label: 'Próximos Passos' },
    ];

    const missingFields = requiredFields.filter(({ key }) => !data[key]?.trim());
    if (missingFields.length > 0) {
      toast({
        title: 'Preencha todos os campos da semana antes de concluir.',
        description: `Faltando: ${missingFields.map(f => f.label).join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    // Cancel any pending auto-save for this id
    if (autoSaveTimers.current[tp.id]) {
      clearTimeout(autoSaveTimers.current[tp.id]);
      delete autoSaveTimers.current[tp.id];
    }

    setSavingIds(prev => new Set(prev).add(tp.id));
    try {
      const { error } = await supabase
        .from('teacher_plannings')
        .update({
          objective: data.objective,
          competencies: data.competencies,
          contents: data.contents,
          methodology: data.methodology,
          resources: data.resources,
          evaluation: data.evaluation,
          product: data.product,
          next_steps: data.next_steps,
          status: 'CONCLUIDO' as any,
        })
        .eq('id', tp.id);

      if (error) throw error;

      // 1) Marca visualmente como concluído e atualiza progresso
      const newSavedIds = new Set(savedWeekIdsRef.current);
      newSavedIds.add(tp.id);
      setSavedWeekIds(newSavedIds);
      savedWeekIdsRef.current = newSavedIds;

      toast({ title: `✅ Semana ${tp.week_number} concluída com sucesso!` });

      // 2) Fecha semana atual IMEDIATAMENTE
      setOpenWeeks(prev => ({ ...prev, [tp.id]: false }));

      // 3) Encontra e abre próxima semana
      let nextTpToOpen: TeacherPlanningData | undefined;
      if (groupItems) {
        const currentIndex = groupItems.findIndex(i => i.id === tp.id);
        if (currentIndex >= 0) {
          nextTpToOpen = groupItems.slice(currentIndex + 1).find(t =>
            canEdit(t) && !isFinalized(t) && !newSavedIds.has(t.id)
          );
        }
      }

      if (nextTpToOpen) {
        const nextId = nextTpToOpen.id;
        // Abre próxima semana com transição suave
        setTimeout(() => {
          initEditData(nextId);
          setOpenWeeks(prev => ({ ...prev, [nextId]: true }));

          setTimeout(() => {
            const el = document.getElementById(`week-${nextId}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 150);
        }, 300);
      } else if (groupItems) {
        toast({ title: '🎉 Todas as semanas foram concluídas!', description: 'Agora você pode enviar ao coordenador.' });
      }

      // Refresh data AFTER transitions (delayed to not reset UI state)
      setTimeout(() => {
        onRefresh();
      }, 800);
    } catch (error: any) {
      toast({ title: error.message || 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSavingIds(prev => { const n = new Set(prev); n.delete(tp.id); return n; });
    }
  };

  const handleSubmitWeek = async (tp: TeacherPlanningData) => {
    const data = editData[tp.id];
    if (!data?.objective?.trim()) {
      toast({ title: 'Preencha pelo menos o objetivo antes de enviar', variant: 'destructive' });
      return;
    }

    setSubmittingIds(prev => new Set(prev).add(tp.id));
    try {
      const { error } = await supabase
        .from('teacher_plannings')
        .update({
          objective: data.objective,
          competencies: data.competencies,
          contents: data.contents,
          methodology: data.methodology,
          resources: data.resources,
          evaluation: data.evaluation,
          product: data.product,
          next_steps: data.next_steps,
          status: 'ENVIADO' as TeacherPlanningStatus,
        })
        .eq('id', tp.id);

      if (error) throw error;
      toast({ title: `Semana ${tp.week_number} enviada ao coordenador!` });
      onRefresh();
    } catch (error: any) {
      toast({ title: error.message || 'Erro ao enviar', variant: 'destructive' });
    } finally {
      setSubmittingIds(prev => { const n = new Set(prev); n.delete(tp.id); return n; });
    }
  };

  // Bulk submit all editable weeks in a group
  const handleBulkSubmit = async (group: GroupItem): Promise<boolean> => {
    const editableItems = group.items.filter(tp => (canEdit(tp) || (tp.status as string) === 'CONCLUIDO') && !isFinalized(tp));

    if (editableItems.length === 0) {
      toast({ title: 'Nenhuma semana disponível para envio', variant: 'destructive' });
      return false;
    }

    const allCompleted = editableItems.every(tp => isWeekCompleted(tp));
    if (!allCompleted) {
      toast({ title: 'Conclua todas as semanas antes de enviar ao coordenador.', variant: 'destructive' });
      return false;
    }

    const missingObjective = editableItems.filter(tp => {
      const data = editData[tp.id];
      const objective = (data?.objective ?? tp.objective ?? '').trim();
      return !objective;
    });

    if (missingObjective.length > 0) {
      toast({
        title: `${missingObjective.length} semana(s) sem objetivo preenchido. Preencha antes de enviar.`,
        variant: 'destructive'
      });
      return false;
    }

    setBulkSubmitting(true);
    try {
      let successCount = 0;
      for (const tp of editableItems) {
        const data = editData[tp.id];

        const payload = {
          objective: data?.objective ?? tp.objective ?? '',
          competencies: data?.competencies ?? tp.competencies ?? '',
          contents: data?.contents ?? tp.contents ?? '',
          methodology: data?.methodology ?? tp.methodology ?? '',
          resources: data?.resources ?? tp.resources ?? '',
          evaluation: data?.evaluation ?? tp.evaluation ?? '',
          product: data?.product ?? tp.product ?? '',
          next_steps: data?.next_steps ?? tp.next_steps ?? '',
          status: 'ENVIADO' as TeacherPlanningStatus,
        };

        const { error } = await supabase
          .from('teacher_plannings')
          .update(payload)
          .eq('id', tp.id);

        if (!error) successCount++;
      }

      if (successCount === editableItems.length) {
        toast({ title: `${successCount} semana(s) enviada(s) ao coordenador!` });
        setLaunchMode(null);
        onRefresh();
        return true;
      }

      toast({
        title: 'Algumas semanas não foram enviadas. Tente novamente.',
        variant: 'destructive',
      });
      return false;
    } catch (error: any) {
      toast({ title: error.message || 'Erro ao enviar', variant: 'destructive' });
      return false;
    } finally {
      setBulkSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };




  // Auto-open first unsaved week and init all editData ONLY when first entering launch mode
  const launchInitializedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!launchMode) {
      launchInitializedRef.current = null;
      return;
    }
    // Only run init logic once per launch mode session
    if (launchInitializedRef.current === launchMode) return;

    const lg = groups.find(g => g.groupKey === launchMode);
    if (!lg || lg.items.length === 0) return;

    launchInitializedRef.current = launchMode;
    
    // Init edit data for all weeks
    const newEditData: Record<string, Record<string, string>> = {};
    lg.items.forEach(tp => {
      newEditData[tp.id] = {
        objective: tp.objective || '',
        competencies: tp.competencies || '',
        contents: tp.contents || '',
        methodology: tp.methodology || '',
        resources: tp.resources || '',
        evaluation: tp.evaluation || '',
        product: tp.product || '',
        next_steps: tp.next_steps || '',
      };
    });
    setEditData(prev => ({ ...prev, ...newEditData }));

    // Open only the first unsaved week
    const firstUnsaved = lg.items.find(t => canEdit(t) && !isFinalized(t) && !savedWeekIdsRef.current.has(t.id));
    if (firstUnsaved) {
      setOpenWeeks(prev => ({ ...prev, [firstUnsaved.id]: true }));
    }
  }, [launchMode, groups]);

  if (items.length === 0 && prePlanningGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4"><BookOpen className="h-8 w-8 text-muted-foreground" /></div>
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
      </div>
    );
  }

  // If in launch mode, show only that group's content
  const launchGroup = launchMode ? groups.find(g => g.groupKey === launchMode) : null;

  if (launchMode && launchGroup) {
    const editableItems = launchGroup.items.filter(tp => (canEdit(tp) || (tp.status as string) === 'CONCLUIDO') && !isFinalized(tp));
    const hasEditableItems = editableItems.length > 0;
    const allWeeksCompleted = launchGroup.items.every(tp => isWeekCompleted(tp));

    return (
      <TooltipProvider>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleExitLaunchMode} className="gap-1.5 h-8">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ClipboardEdit className="h-5 w-5 text-primary" />
                Lançar Planejamento
              </h2>
              <p className="text-sm text-muted-foreground">{launchGroup.groupLabel} • {launchGroup.subLabel}</p>
            </div>
          </div>

          <Alert className="border-primary/30 bg-primary/5">
            <ClipboardEdit className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Revise e edite cada semana abaixo. Use <strong>"Salvar"</strong> para guardar as alterações de cada semana individualmente. 
              Quando estiver pronto, clique em <strong>"Enviar ao Coordenador"</strong> no final da página para enviar todas as semanas de uma vez.
            </AlertDescription>
          </Alert>

          {/* Progress bar */}
          {(() => {
            const totalWeeks = launchGroup.items.length;
            const checkedWeeks = launchGroup.items.filter(tp => isWeekCompleted(tp)).length;
            const pct = totalWeeks > 0 ? Math.round((checkedWeeks / totalWeeks) * 100) : 0;
            return (
              <div className="flex items-center gap-3 bg-card border rounded-xl px-4 py-3 shadow-sm">
                <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">{checkedWeeks}/{totalWeeks} semanas</span>
                <Progress value={pct} className={`h-2 flex-1 ${pct === 100 ? '[&>div]:bg-primary' : ''}`} />
                <span className={`text-xs font-bold tabular-nums ${pct === 100 ? 'text-primary' : 'text-muted-foreground'}`}>{pct}%</span>
              </div>
            );
          })()}

          {/* All weeks - default closed */}
          <div className="space-y-3">
            {(() => {
              // Find the first editable, non-saved week = the "next to fill"
              const nextToFillId = launchGroup.items.find(t => canEdit(t) && !isFinalized(t) && !isWeekCompleted(t))?.id;

              return launchGroup.items.map((tp) => {
              const filled = isWeekFilled(tp);
              const partial = isWeekPartiallyFilled(tp);
              const filledCount = getFilledFieldCount(tp);
              const isSaving = savingIds.has(tp.id);
              const editable = canEdit(tp) || (tp.status as string) === 'CONCLUIDO';
              const finalized = isFinalized(tp);
              const isWeekOpen = openWeeks[tp.id] ?? false;
              const isNextToFill = tp.id === nextToFillId;
              const isSaved = isWeekCompleted(tp);
              // In launch mode: show "Em edição" for unsaved editable weeks, even if DB status is CONCLUIDO
              const config = isSaved
                ? statusConfig.CONCLUIDO
                : (!finalized && ((tp.status as string) === 'DRAFT' || (tp.status as string) === 'CONCLUIDO'))
                  ? statusConfig.DRAFT
                  : (statusConfig[tp.status] || statusConfig.DRAFT);

              return (
                <Collapsible key={tp.id} open={isWeekOpen} onOpenChange={() => toggleWeek(tp.id)}>
                  <div id={`week-${tp.id}`}></div>
                  <CollapsibleTrigger asChild>
                    <div className={`flex items-center justify-between px-3 sm:px-4 py-2.5 rounded-lg border cursor-pointer transition-all duration-300 hover:bg-muted/30 ${
                      isNextToFill ? 'border-primary/50 bg-primary/10 shadow-[0_0_18px_hsl(var(--primary)/0.25)]' 
                      : isSaved ? 'border-primary/20 bg-primary/[0.02]' 
                      : ''
                    }`}>
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className={`flex items-center justify-center h-5 w-5 rounded shrink-0 transition-transform duration-200 ${isWeekOpen ? 'rotate-0' : '-rotate-90'}`}>
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className={`flex items-center justify-center h-7 w-7 rounded-full shrink-0 text-[11px] font-bold transition-all duration-300 ${
                          isSaved 
                            ? 'bg-primary text-primary-foreground neon-glow-sm' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {tp.week_number || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            Semana {tp.week_number || '?'}
                            {tp.week_start_date && tp.week_end_date && (
                              <span className="text-muted-foreground font-normal ml-1 text-xs">
                                {formatDate(tp.week_start_date)} – {formatDate(tp.week_end_date)}
                              </span>
                            )}
                          </p>
                          {tp.class_date && (
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <CalendarDays className="h-3 w-3 shrink-0" />
                              {formatDate(tp.class_date)}
                              {tp.start_time && tp.end_time && (
                                <span> • {tp.start_time.toString().slice(0, 5)}–{tp.end_time.toString().slice(0, 5)}</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-medium gap-1 ${config.className}`}>
                          {config.icon}
                          <span className="hidden sm:inline">{config.label}</span>
                        </Badge>
                        {!isSaved && partial && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-semibold hidden sm:inline">{filledCount}/8</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="ml-4 sm:ml-10 mt-1.5 mb-3 border rounded-xl overflow-hidden bg-card shadow-sm">
                      {/* Coordinator feedback alert */}
                      {(tp.status === 'DEVOLVIDO' || tp.status === 'REJECTED') && tp.coordinator_feedback && (
                        <div className="p-4 bg-red-50/70 dark:bg-red-950/20 border-b border-red-200/50">
                          <div className="flex items-start gap-2">
                            <RotateCcw className="h-4 w-4 mt-0.5 text-red-500 shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-red-700">Orientação da Coordenação:</p>
                              <p className="text-sm text-red-600 mt-1 whitespace-pre-wrap">{tp.coordinator_feedback}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Lesson materials */}
                      {tp.subject_id && tp.bimester_number && tp.week_number && (
                        <div className="p-4 bg-blue-50/50 dark:bg-blue-950/10 border-b">
                          <WeeklyLessonMaterials
                            subjectId={tp.subject_id}
                            bimesterNumber={tp.bimester_number}
                            weekNumber={tp.week_number}
                            readOnly
                          />
                        </div>
                      )}

                      <Separator />

                      {/* Pedagogical content */}
                      <div className="p-4 bg-purple-50/30 dark:bg-purple-950/10">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                            <GraduationCap className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <h4 className="text-sm font-semibold">Conteúdo Pedagógico</h4>
                          {isSaved ? (
                            <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/10 ml-auto">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Completo
                            </Badge>
                          ) : partial ? (
                            <Badge variant="outline" className="text-[10px] border-amber-400/50 text-amber-600 bg-amber-50/50 ml-auto">
                              {filledCount}/8 preenchidos
                            </Badge>
                          ) : filled ? (
                            <Badge variant="outline" className="text-[10px] border-amber-400/50 text-amber-600 bg-amber-50/50 ml-auto">
                              8/8 preenchidos
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground ml-auto">
                              Nenhum campo preenchido
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {PEDAGOGICAL_FIELDS.map(field => {
                            const val = editData[tp.id]?.[field.key] ?? (tp as any)[field.key] ?? '';
                            const isFilled = val.trim().length > 0;
                            return (
                              <div key={field.key} className={`rounded-lg border p-3 transition-colors ${isFilled ? 'border-green-200 bg-green-50/30 dark:border-green-900/30 dark:bg-green-950/10' : 'border-border bg-background'}`}>
                                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                                  {field.label}
                                  {isFilled && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                                </label>
                                {editable && !finalized ? (
                                  <Textarea
                                    value={val}
                                    onChange={(e) => updateField(tp.id, field.key, e.target.value)}
                                    placeholder={field.placeholder}
                                    rows={2}
                                    className="min-h-[72px] text-sm resize-y border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none"
                                  />
                                ) : (
                                  <p className="text-sm text-foreground whitespace-pre-wrap min-h-[36px]">
                                    {val || <span className="text-muted-foreground italic">Não preenchido</span>}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Per-week save button */}
                        {editable && !finalized && (
                          <div className="flex justify-end pt-3 mt-3 border-t">
                            <Button variant="outline" size="sm" onClick={() => handleSaveWeek(tp, launchGroup.items)} disabled={isSaving} className="gap-1.5 h-9">
                              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                              Salvar Semana {tp.week_number}
                            </Button>
                          </div>
                        )}

                        {finalized && (
                          <div className="pt-3 mt-3 border-t">
                            <p className="text-xs text-muted-foreground italic">Este planejamento foi assinado e está imutável.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
              });
            })()}
          </div>

          {/* Bottom action bar */}
          <div className="sticky bottom-0 bg-card border rounded-xl p-4 shadow-lg flex flex-col sm:flex-row justify-between items-center gap-3">
            <Button 
              variant="outline"
              onClick={handleExitLaunchMode} 
              className="gap-2 w-full sm:w-auto"
              size="lg"
            >
              Cancelar
            </Button>
            {hasEditableItems && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="w-full sm:w-auto">
                      <Button 
                        onClick={() => setConfirmSubmitGroup(launchGroup)} 
                        disabled={bulkSubmitting || !allWeeksCompleted} 
                        className="gap-2 w-full sm:w-auto"
                        size="lg"
                      >
                        {bulkSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Enviar ao Coordenador
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!allWeeksCompleted && (
                    <TooltipContent>
                      <p>Conclua todas as semanas antes de enviar</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Default group list view - show ALL groups for professors, not just editable
  const editableGroups = groups.filter(g => g.items.some(tp => canEdit(tp) && !isFinalized(tp)));
  const nonEditableGroups = groups.filter(g => !g.items.some(tp => canEdit(tp) && !isFinalized(tp)));
  const totalGroups = groups.length + prePlanningGroups.length;
  const totalWeeks = groups.reduce((sum, g) => sum + g.items.length, 0) + prePlanningGroups.reduce((sum, g) => sum + g.items.length, 0);

  // Group by school for professor view - include ALL groups
  const schoolGroupings = (() => {
    const schoolMap = new Map<string, { schoolId: string; schoolName: string; teacherGroups: GroupItem[]; nonEditableGroups: GroupItem[]; prePlanningGroupItems: PrePlanningGroupItem[]; totalWeeks: number }>();

    const ensureSchool = (schoolId: string | null) => {
      const sId = schoolId || 'unknown';
      if (!schoolMap.has(sId)) {
        schoolMap.set(sId, { schoolId: sId, schoolName: getSchoolName(sId), teacherGroups: [], nonEditableGroups: [], prePlanningGroupItems: [], totalWeeks: 0 });
      }
      return schoolMap.get(sId)!;
    };

    editableGroups.forEach(g => {
      const sg = ensureSchool(g.items[0]?.school_id || null);
      sg.teacherGroups.push(g);
      sg.totalWeeks += g.items.length;
    });

    nonEditableGroups.forEach(g => {
      const sg = ensureSchool(g.items[0]?.school_id || null);
      sg.nonEditableGroups.push(g);
      sg.totalWeeks += g.items.length;
    });

    prePlanningGroups.forEach(g => {
      const sg = ensureSchool(g.items[0]?.school_id || null);
      sg.prePlanningGroupItems.push(g);
      sg.totalWeeks += g.items.length;
    });

    return Array.from(schoolMap.values()).sort((a, b) => a.schoolName.localeCompare(b.schoolName));
  })();


  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Summary line */}
        <p className="text-xs text-muted-foreground px-1">
          {totalGroups} disciplina(s) • {totalWeeks} semana(s)
        </p>

        {schoolGroupings.map((sg) => {
          const isSchoolOpen = openSchoolGroups[sg.schoolId] === true;
          const allGroupsCount = sg.teacherGroups.length + sg.nonEditableGroups.length + sg.prePlanningGroupItems.length;

          // Check if any group in this school needs professor attention
          const attentionStatuses = ['DEVOLVIDO', 'REJECTED', 'AGUARDANDO_ASSINATURA'];
          const allSchoolItems = [...sg.teacherGroups, ...sg.nonEditableGroups].flatMap(g => g.items);
          const hasAttention = allSchoolItems.some(tp => attentionStatuses.includes(tp.status));
          const attentionCount = allSchoolItems.filter(tp => attentionStatuses.includes(tp.status)).length;

          return (
            <Collapsible key={sg.schoolId} open={isSchoolOpen} onOpenChange={() => setOpenSchoolGroups(prev => ({ ...prev, [sg.schoolId]: !isSchoolOpen }))}>
              <CollapsibleTrigger asChild>
                <div className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                  hasAttention 
                    ? 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.3)]' 
                    : 'bg-gradient-to-r from-muted/40 to-muted/70 hover:from-muted/60 hover:to-muted/90'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center h-5 w-5 rounded transition-transform duration-200 ${isSchoolOpen ? 'rotate-0' : '-rotate-90'}`}>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className={`flex items-center justify-center h-9 w-9 rounded-lg shrink-0 ${
                      hasAttention ? 'bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.5)]' : 'bg-primary/10 text-primary'
                    }`}>
                      {hasAttention ? <AlertCircle className="h-5 w-5 animate-pulse" /> : <GraduationCap className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{sg.schoolName}</p>
                      <p className="text-[11px] text-muted-foreground">{allGroupsCount} disciplina(s) • {sg.totalWeeks} semana(s)</p>
                    </div>
                  </div>
                  {hasAttention && (
                    <Badge className="text-[10px] px-2.5 py-1 font-bold gap-1 bg-primary text-primary-foreground border-primary shadow-[0_0_10px_hsl(var(--primary)/0.4)] animate-pulse">
                      <AlertCircle className="h-3 w-3" />
                      {attentionCount} pendência(s)
                    </Badge>
                  )}
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="ml-4 mt-2 space-y-2">
                  {sg.teacherGroups.map((group) => {
                    const editedWeeks = group.items.filter(tp =>
                      isWeekEditedByProfessor(tp, tp.pre_planning_id ? prePlanningById.get(tp.pre_planning_id) : null)
                    ).length;
                    const progressPercent = group.totalWeeks > 0 ? Math.round((editedWeeks / group.totalWeeks) * 100) : 0;
                    const isFullyFilled = progressPercent === 100;

                    // Determine dominant status for the group
                    const groupStatusCounts: Record<string, number> = {};
                    group.items.forEach(tp => { groupStatusCounts[tp.status] = (groupStatusCounts[tp.status] || 0) + 1; });
                    const groupDominantStatus = Object.entries(groupStatusCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'DRAFT';
                    const groupStatusConfig = statusConfig[groupDominantStatus] || statusConfig.DRAFT;

                    return (
                      <div key={group.groupKey} className={`rounded-xl border overflow-hidden transition-all duration-300 ${
                        isFullyFilled ? 'border-primary/30 shadow-[0_0_12px_hsl(var(--primary)/0.15)]' : 'shadow-sm'
                      }`}>
                        <div className="flex items-center justify-between px-4 py-3 bg-card">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`flex items-center justify-center h-9 w-9 rounded-lg shrink-0 transition-all duration-300 ${
                              isFullyFilled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                            }`}>
                              {isFullyFilled ? <Sparkles className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">{group.groupLabel}</p>
                              {group.subLabel && <p className="text-[11px] text-muted-foreground truncate">{group.subLabel}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className={`text-[10px] px-2.5 py-1 font-semibold gap-1.5 ${groupStatusConfig.className}`}>
                              {groupStatusConfig.icon}
                              {groupStatusConfig.label}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-medium">
                              {group.totalWeeks} sem.
                            </Badge>
                            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => handleLaunchPlanning(group)}>
                              <ClipboardEdit className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Lançar Planejamento</span>
                              <span className="sm:hidden">Lançar</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Non-editable groups (submitted, awaiting signature, signed) */}
                  {sg.nonEditableGroups.map((group) => {
                    // Determine the dominant status of the group
                    const statusCounts: Record<string, number> = {};
                    group.items.forEach(tp => { statusCounts[tp.status] = (statusCounts[tp.status] || 0) + 1; });
                    const dominantStatus = Object.entries(statusCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'ENVIADO';
                    const config = statusConfig[dominantStatus] || statusConfig.ENVIADO;

                    return (
                      <div key={group.groupKey} className={`rounded-xl border overflow-hidden shadow-sm ${
                        dominantStatus === 'ASSINADO' || dominantStatus === 'APPROVED' ? 'border-emerald-200' :
                        dominantStatus === 'DEVOLVIDO' || dominantStatus === 'REJECTED' ? 'border-red-200' :
                        dominantStatus === 'AGUARDANDO_ASSINATURA' ? 'border-blue-200' :
                        dominantStatus === 'AGUARDANDO_ASSINATURA_COORDENADOR' ? 'border-violet-200' :
                        'border-amber-200'
                      }`}>
                        <div className="flex items-center justify-between px-4 py-3 bg-card">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`flex items-center justify-center h-9 w-9 rounded-lg shrink-0 ${
                              dominantStatus === 'ASSINADO' || dominantStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                              dominantStatus === 'DEVOLVIDO' || dominantStatus === 'REJECTED' ? 'bg-red-100 text-red-700' :
                              dominantStatus === 'AGUARDANDO_ASSINATURA' ? 'bg-blue-100 text-blue-700' :
                              dominantStatus === 'AGUARDANDO_ASSINATURA_COORDENADOR' ? 'bg-violet-100 text-violet-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {config.icon ? <span className="scale-125">{config.icon}</span> : <BookOpen className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">{group.groupLabel}</p>
                              {group.subLabel && <p className="text-[11px] text-muted-foreground truncate">{group.subLabel}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-medium gap-1 ${config.className}`}>
                              {config.icon}
                              {config.label}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-medium">
                              {group.totalWeeks} sem.
                            </Badge>
                            {dominantStatus === 'AGUARDANDO_ASSINATURA' && (
                              <Button
                                size="sm"
                                className="h-8 gap-1.5 text-xs"
                                onClick={() => {
                                  const ids = group.items
                                    .filter(tp => tp.status === 'AGUARDANDO_ASSINATURA' && !tp.professor_signed)
                                    .map(tp => tp.id);
                                  if (ids.length > 0) {
                                    setSigningPlanningIds(ids);
                                    setSignatureDialogOpen(true);
                                  }
                                }}
                              >
                                <PenTool className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Assinar</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {sg.prePlanningGroupItems.map((group) => (
                    <div key={group.groupKey} className="rounded-xl border border-primary/20 overflow-hidden shadow-sm">
                      <div className="flex items-center justify-between px-4 py-3 bg-primary/[0.03]">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex items-center justify-center h-9 w-9 rounded-lg shrink-0 bg-primary/15 text-primary">
                            <ClipboardList className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{group.groupLabel}</p>
                            {group.subLabel && <p className="text-[11px] text-muted-foreground truncate">{group.subLabel}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => openUsePrePlanningDialog(group)}>
                            <PlayCircle className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Usar Pré-planejamento</span>
                            <span className="sm:hidden">Usar</span>
                          </Button>
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-medium border-primary/30 text-primary bg-primary/10">Pré-planejamento</Badge>
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-medium">{group.totalWeeks} sem.</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {/* Dialog: Usar Pré-planejamento */}
      <Dialog open={!!usePrePlanningGroup} onOpenChange={(open) => { if (!open) setUsePrePlanningGroup(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {usePrePlanningStep === 'confirm' ? (
                <><PlayCircle className="h-5 w-5 text-primary" /> Usar Pré-planejamento</>
              ) : (
                <><CheckCircle2 className="h-5 w-5 text-primary" /> Pré-planejamento Adotado!</>
              )}
            </DialogTitle>
            <DialogDescription>
              {usePrePlanningStep === 'confirm' ? (
                <>
                  Ao confirmar, o conteúdo pré-planejado de <strong>{usePrePlanningGroup?.totalWeeks} semana(s)</strong> será
                  copiado para seus planejamentos como rascunho.
                </>
              ) : (
                <>O pré-planejamento foi adotado com sucesso!</>
              )}
            </DialogDescription>
          </DialogHeader>

          {usePrePlanningStep === 'confirm' ? (
            <div className="space-y-3 py-2">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
                <p className="font-medium text-foreground">O que acontecerá:</p>
                <ul className="space-y-1.5 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Edit className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span>Os planejamentos serão criados como <strong className="text-foreground">rascunho</strong> para que você revise e adeque semana a semana.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Download className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span>Os materiais das <strong className="text-foreground">aulas planejadas</strong> estarão disponíveis para uso em sala.</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2 text-sm">
                <p className="font-medium text-foreground">Próximos passos:</p>
                <ul className="space-y-1.5 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Edit className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span>Use o botão <strong className="text-foreground">"Lançar Planejamento"</strong> para revisar e editar cada semana.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Download className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span>Os materiais das aulas já estão disponíveis para download e uso em sala.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            {usePrePlanningStep === 'confirm' ? (
              <>
                <Button variant="outline" onClick={() => setUsePrePlanningGroup(null)} disabled={usingPrePlanning}>
                  Cancelar
                </Button>
                <Button onClick={() => handleUsePrePlanning(usePrePlanningGroup!)} disabled={usingPrePlanning} className="gap-1.5">
                  {usingPrePlanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                  Confirmar
                </Button>
              </>
            ) : (
              <Button onClick={() => setUsePrePlanningGroup(null)} className="gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Entendi
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm bulk submit dialog */}
      <Dialog open={!!confirmSubmitGroup} onOpenChange={(open) => { if (!open) setConfirmSubmitGroup(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar ao Coordenador</DialogTitle>
            <DialogDescription>
              Você está prestes a enviar {confirmSubmitGroup?.items.length} semana(s) para análise do coordenador. 
              Após o envio, não será possível editar até que o coordenador devolva ou aprove o planejamento.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmSubmitGroup(null)} disabled={bulkSubmitting}>
              Cancelar
            </Button>
            <Button 
              onClick={async () => {
                if (!confirmSubmitGroup) return;
                const submitted = await handleBulkSubmit(confirmSubmitGroup);
                if (submitted) setConfirmSubmitGroup(null);
              }} 
              disabled={bulkSubmitting}
              className="gap-2"
            >
              {bulkSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Confirmar Envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Digital Signature Dialog for professor */}
      {signingPlanningIds.length > 0 && (
        <DigitalSignatureDialog
          open={signatureDialogOpen}
          onOpenChange={setSignatureDialogOpen}
          planningId={signingPlanningIds[0]}
          planningIds={signingPlanningIds}
          signatureType="PROFESSOR"
          onSuccess={() => {
            setSignatureDialogOpen(false);
            setSigningPlanningIds([]);
            onRefresh();
          }}
        />
      )}
    </TooltipProvider>
  );
}
