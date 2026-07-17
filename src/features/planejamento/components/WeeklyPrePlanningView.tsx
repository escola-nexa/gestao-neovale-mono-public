import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, CalendarDays, Clock, BookOpen, User, Save, Loader2, CheckCircle2, AlertCircle, Trash2, Sparkles, GraduationCap, PlayCircle, Download, Edit, Building2 } from 'lucide-react';
import { PrePlanningData, CourseData, SubjectData, SchoolData, ClassGroupData } from '@/services/supabaseApi';
import { planejamentoApi } from '@/features/planejamento/api';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import WeeklyLessonMaterials from '@/features/disciplinas/components/WeeklyLessonMaterials';

interface ClassDayDetail {
  date: string;
  start_time: string;
  end_time: string;
  weekday: string;
  weekday_label: string;
}

interface WeeklyPrePlanningViewProps {
  items: PrePlanningData[];
  courses: CourseData[];
  subjects: SubjectData[];
  schools: SchoolData[];
  classGroups: ClassGroupData[];
  professors: Record<string, string>;
  onRefresh: () => void;
  onDelete: (pp: PrePlanningData) => void;
  onBulkDelete?: (ids: string[]) => void;
  bulkDeleting?: boolean;
  isProfessor?: boolean;
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

function isWeekFilled(pp: PrePlanningData): boolean {
  return !!(pp.objective && pp.competencies && pp.contents && pp.methodology && pp.resources && pp.evaluation && pp.product && pp.next_steps);
}

function isWeekPartiallyFilled(pp: PrePlanningData): boolean {
  const fields = [pp.objective, pp.competencies, pp.contents, pp.methodology, pp.resources, pp.evaluation, pp.product, pp.next_steps];
  const filledCount = fields.filter(f => f && f.trim()).length;
  return filledCount > 0 && filledCount < 8;
}

function getFilledFieldCount(pp: PrePlanningData): number {
  const fields = [pp.objective, pp.competencies, pp.contents, pp.methodology, pp.resources, pp.evaluation, pp.product, pp.next_steps];
  return fields.filter(f => f && f.trim()).length;
}

interface GroupItem {
  groupKey: string;
  groupLabel: string;
  subLabel?: string;
  items: PrePlanningData[];
  totalWeeks: number;
  filledWeeks: number;
}

interface ProfessorGroup {
  professorId: string;
  professorName: string;
  groups: GroupItem[];
  totalWeeks: number;
  filledWeeks: number;
}

interface SchoolGroup {
  schoolId: string;
  schoolName: string;
  professorGroups: ProfessorGroup[];
  totalWeeks: number;
  filledWeeks: number;
}

export function WeeklyPrePlanningView({
  items, courses, subjects, schools, classGroups, professors,
  onRefresh, onDelete, onBulkDelete, bulkDeleting = false, isProfessor = false, emptyMessage,
}: WeeklyPrePlanningViewProps) {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const { user } = useAuth();
  const [openSchools, setOpenSchools] = useState<Record<string, boolean>>({});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [openWeeks, setOpenWeeks] = useState<Record<string, boolean>>({});
  const [editData, setEditData] = useState<Record<string, Record<string, string>>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [usePrePlanningGroup, setUsePrePlanningGroup] = useState<GroupItem | null>(null);
  const [usingPrePlanning, setUsingPrePlanning] = useState(false);
  const [usePrePlanningStep, setUsePrePlanningStep] = useState<'confirm' | 'success'>('confirm');

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

    sortedItems.forEach((pp) => {
      let groupKey: string;
      let groupLabel: string;
      let subLabel: string | undefined;

      if (isProfessor) {
        groupKey = `${pp.subject_id}_${pp.school_id}_${pp.class_group_id}_${pp.bimester_number}`;
        groupLabel = `${getSubjectName(pp.subject_id)} • ${pp.bimester_number}º Bimestre`;
        subLabel = `${getSchoolName(pp.school_id)} • ${getClassGroupName(pp.class_group_id)}`;
      } else {
        groupKey = `${pp.professor_id}_${pp.subject_id}_${pp.school_id}_${pp.class_group_id}_${pp.bimester_number}`;
        groupLabel = `${getSubjectName(pp.subject_id)}`;
        subLabel = `${getClassGroupName(pp.class_group_id)} • ${pp.bimester_number}º Bimestre`;
      }

      if (!map.has(groupKey)) {
        map.set(groupKey, { groupKey, groupLabel, subLabel, items: [], totalWeeks: 0, filledWeeks: 0 });
      }

      const group = map.get(groupKey)!;
      group.items.push(pp);
      group.totalWeeks++;
      if (isWeekFilled(pp)) group.filledWeeks++;
    });

    return Array.from(map.values()).sort((a, b) => a.groupLabel.localeCompare(b.groupLabel));
  }, [items, professors, isProfessor]);

  // Builder reutilizável: gera SchoolGroups a partir de uma lista qualquer de GroupItem
  const buildSchoolGroups = (gs: GroupItem[]): SchoolGroup[] => {
    if (isProfessor) return [];
    const schoolMap = new Map<string, SchoolGroup>();
    gs.forEach(group => {
      const firstItem = group.items[0];
      const schoolId = firstItem?.school_id || 'unknown';
      const schoolName = getSchoolName(schoolId);
      const professorId = firstItem?.professor_id || 'unknown';
      const professorName = professorId !== 'unknown' ? (professors[professorId] || 'Professor') : 'Não vinculado';
      if (!schoolMap.has(schoolId)) {
        schoolMap.set(schoolId, { schoolId, schoolName, professorGroups: [], totalWeeks: 0, filledWeeks: 0 });
      }
      const sg = schoolMap.get(schoolId)!;
      let pg = sg.professorGroups.find(p => p.professorId === professorId);
      if (!pg) {
        pg = { professorId, professorName, groups: [], totalWeeks: 0, filledWeeks: 0 };
        sg.professorGroups.push(pg);
      }
      pg.groups.push(group);
      pg.totalWeeks += group.totalWeeks;
      pg.filledWeeks += group.filledWeeks;
      sg.totalWeeks += group.totalWeeks;
      sg.filledWeeks += group.filledWeeks;
    });
    return Array.from(schoolMap.values()).sort((a, b) => a.schoolName.localeCompare(b.schoolName));
  };

  // Bimestres presentes (1..4) e grupos por bimestre
  const bimesters = useMemo(() => {
    const set = new Set<number>();
    groups.forEach(g => g.items.forEach(it => it.bimester_number && set.add(it.bimester_number)));
    return Array.from(set).sort((a, b) => a - b);
  }, [groups]);

  const groupsByBimester = useMemo(() => {
    const m = new Map<number, GroupItem[]>();
    bimesters.forEach(b => m.set(b, groups.filter(g => g.items[0]?.bimester_number === b)));
    return m;
  }, [groups, bimesters]);

  const [openBimesters, setOpenBimesters] = useState<Record<number, boolean>>({});
  const toggleBimester = (n: number) => setOpenBimesters(prev => ({ ...prev, [n]: !prev[n] }));
  const [openProfessors, setOpenProfessors] = useState<Record<string, boolean>>({});
  const toggleProfessor = (key: string) => setOpenProfessors(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleSchool = (key: string) => setOpenSchools(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleGroup = (key: string) => setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleWeek = (id: string) => {
    setOpenWeeks(prev => ({ ...prev, [id]: !prev[id] }));
    const pp = items.find(i => i.id === id);
    if (pp && !editData[id]) {
      setEditData(prev => ({
        ...prev,
        [id]: {
          objective: pp.objective || '',
          competencies: pp.competencies || '',
          contents: pp.contents || '',
          methodology: pp.methodology || '',
          resources: pp.resources || '',
          evaluation: pp.evaluation || '',
          product: pp.product || '',
          next_steps: pp.next_steps || '',
        },
      }));
    }
  };

  const updateField = (id: string, field: string, value: string) => {
    setEditData(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };


  const handleSave = async (pp: PrePlanningData) => {
    const data = editData[pp.id];
    if (!data) return;

    setSavingIds(prev => new Set(prev).add(pp.id));
    try {
      await planejamentoApi.updatePrePlanning(pp.id, {
        objective: data.objective,
        competencies: data.competencies,
        contents: data.contents,
        methodology: data.methodology,
        resources: data.resources,
        evaluation: data.evaluation,
        product: data.product,
        next_steps: data.next_steps,
      });
      toast({ title: `Semana ${pp.week_number} salva com sucesso!` });
      onRefresh();
    } catch (error: any) {
      toast({ title: error.message || 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSavingIds(prev => { const n = new Set(prev); n.delete(pp.id); return n; });
    }
  };


  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const deletableIds = useMemo(() => items.filter(pp => pp.status === 'GERADO').map(pp => pp.id), [items]);

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === deletableIds.length ? new Set() : new Set(deletableIds));
  };

  const handleUsePrePlanning = async (group: GroupItem) => {
    setUsingPrePlanning(true);
    try {
      const organizationId = organization?.id;
      if (!organizationId || !user?.id) throw new Error('Organização ou usuário não encontrado');

      for (const pp of group.items) {
        await planejamentoApi.createTeacherPlanning({
          organization_id: organizationId,
          professor_id: user.id,
          pre_planning_id: pp.id,
          occurrence_id: pp.occurrence_id || null,
          school_id: pp.school_id,
          course_id: pp.course_id,
          class_group_id: pp.class_group_id,
          subject_id: pp.subject_id,
          bimester_number: pp.bimester_number,
          week_number: pp.week_number,
          week_start_date: pp.week_start_date,
          week_end_date: pp.week_end_date,
          class_date: pp.class_date,
          start_time: (pp as any).start_time || null,
          end_time: (pp as any).end_time || null,
          objective: pp.objective || '',
          competencies: pp.competencies || '',
          contents: pp.contents || '',
          methodology: pp.methodology || '',
          resources: pp.resources || '',
          evaluation: pp.evaluation || '',
          product: pp.product || '',
          next_steps: pp.next_steps || '',
          status: 'DRAFT',
        });
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

  const openUsePrePlanningDialog = (group: GroupItem) => {
    setUsePrePlanningStep('confirm');
    setUsePrePlanningGroup(group);
  };

  const renderGroup = (group: GroupItem) => {
    const isGroupOpen = openGroups[group.groupKey] ?? false;
    const progressPercent = group.totalWeeks > 0 ? Math.round((group.filledWeeks / group.totalWeeks) * 100) : 0;
    const isFullyFilled = progressPercent === 100;

    return (
      <Collapsible key={group.groupKey} open={isGroupOpen} onOpenChange={() => toggleGroup(group.groupKey)}>
        <CollapsibleTrigger asChild>
          <div className={`relative flex items-center justify-between px-4 py-3.5 rounded-xl border cursor-pointer transition-all duration-300 ${
            isFullyFilled 
              ? 'bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/30 neon-glow-sm hover:neon-glow' 
              : 'bg-gradient-to-r from-muted/40 to-muted/70 hover:from-muted/60 hover:to-muted/90'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center h-5 w-5 rounded transition-transform duration-200 ${isGroupOpen ? 'rotate-0' : '-rotate-90'}`}>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className={`flex items-center justify-center h-10 w-10 rounded-xl shrink-0 shadow-sm transition-all duration-300 ${
                isFullyFilled 
                  ? 'bg-primary text-primary-foreground neon-glow-sm' 
                  : isProfessor ? 'bg-blue-100 text-blue-700' : 'bg-primary/10 text-primary'
              }`}>
                {isFullyFilled ? <Sparkles className="h-5 w-5" /> : isProfessor ? <BookOpen className="h-5 w-5" /> : <User className="h-5 w-5" />}
              </div>
              <div>
                <p className="font-semibold text-sm">{group.groupLabel}</p>
                {group.subLabel && <p className="text-xs text-muted-foreground">{group.subLabel}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
              {isProfessor && (
                <Button
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={(e) => { e.stopPropagation(); openUsePrePlanningDialog(group); }}
                >
                  <PlayCircle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Usar Pré-planejamento</span>
                  <span className="sm:hidden">Usar</span>
                </Button>
              )}
              <div className="hidden sm:flex items-center gap-2 min-w-[120px]">
                <Progress 
                  value={progressPercent} 
                  className={`h-1.5 w-20 ${isFullyFilled ? '[&>div]:bg-primary' : ''}`} 
                />
                <span className={`text-[10px] font-bold tabular-nums ${isFullyFilled ? 'text-primary' : 'text-muted-foreground'}`}>
                  {progressPercent}%
                </span>
              </div>
              {isFullyFilled ? (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge className="text-[10px] px-2.5 py-0.5 font-semibold bg-primary text-primary-foreground gap-1 neon-glow-sm">
                      <Sparkles className="h-3 w-3" />
                      Preenchido
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Todas as semanas foram preenchidas pelo coordenador</TooltipContent>
                </Tooltip>
              ) : (
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-medium">
                  {group.filledWeeks}/{group.totalWeeks}
                </Badge>
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-1.5 mt-1.5 ml-2 sm:ml-4">
            {group.items.map((pp) => {
              const isWeekOpen = openWeeks[pp.id] ?? false;
              const filled = isWeekFilled(pp);
              const partial = isWeekPartiallyFilled(pp);
              const filledCount = getFilledFieldCount(pp);
              const classDays = (pp as any).class_days_detail as ClassDayDetail[] || [];
              const classDaysCount = (pp as any).class_days_count || classDays.length;
              const isSaving = savingIds.has(pp.id);
              const isSelected = selectedIds.has(pp.id);
              const canDelete = pp.status === 'GERADO' || user?.perfil === 'admin';

              return (
                <Collapsible key={pp.id} open={isWeekOpen} onOpenChange={() => toggleWeek(pp.id)}>
                  <CollapsibleTrigger asChild>
                    <div className={`flex items-center justify-between px-3 sm:px-4 py-2.5 rounded-lg border cursor-pointer transition-all duration-200 hover:bg-muted/30 ${
                      isSelected ? 'bg-destructive/5 border-destructive/30' : filled ? 'border-primary/20 bg-primary/[0.02]' : ''
                    }`}>
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        {!isProfessor && onBulkDelete && canDelete && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectItem(pp.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <div className={`flex items-center justify-center h-5 w-5 rounded shrink-0 transition-transform duration-200 ${isWeekOpen ? 'rotate-0' : '-rotate-90'}`}>
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className={`flex items-center justify-center h-7 w-7 rounded-full shrink-0 text-[11px] font-bold transition-all duration-300 ${
                          filled 
                            ? 'bg-primary text-primary-foreground neon-glow-sm' 
                            : partial ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {pp.week_number}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            Semana {pp.week_number}
                            {pp.week_start_date && pp.week_end_date && (
                              <span className="text-muted-foreground font-normal ml-1 text-xs">
                                {formatDate(pp.week_start_date)} – {formatDate(pp.week_end_date)}
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3 shrink-0" />
                            {classDaysCount} aula{classDaysCount !== 1 ? 's' : ''}
                            {classDays.length > 0 && (
                              <span className="hidden sm:inline"> • {classDays.map(d => d.weekday_label || d.weekday).join(', ')}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {filled ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-semibold hidden sm:inline">Preenchida</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>Todos os 8 campos pedagógicos preenchidos</TooltipContent>
                          </Tooltip>
                        ) : partial ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-semibold hidden sm:inline">{filledCount}/8</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>{filledCount} de 8 campos preenchidos</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Badge variant="outline" className="text-[10px] h-5">Pendente</Badge>
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="ml-4 sm:ml-10 mt-1.5 mb-3 border rounded-xl overflow-hidden bg-card shadow-sm">
                      {classDays.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 p-4 pb-3">
                          {classDays.map((day, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/50 rounded-lg text-xs border">
                              <CalendarDays className="h-3 w-3 text-primary/60" />
                              <span className="font-medium">{day.weekday_label || day.weekday}</span>
                              <span className="text-muted-foreground">
                                {formatDate(day.date)} • {day.start_time?.slice(0, 5)}–{day.end_time?.slice(0, 5)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {pp.subject_id && pp.bimester_number && pp.week_number && (
                        <div className="p-4 bg-blue-50/50 dark:bg-blue-950/10 border-t">
                          <WeeklyLessonMaterials
                            subjectId={pp.subject_id}
                            bimesterNumber={pp.bimester_number}
                            weekNumber={pp.week_number}
                            readOnly={isProfessor}
                          />
                        </div>
                      )}

                      <Separator />

                      <div className="p-4 bg-purple-50/30 dark:bg-purple-950/10">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                            <GraduationCap className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <h4 className="text-sm font-semibold">Conteúdo Pedagógico</h4>
                          {filled ? (
                            <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/10 ml-auto">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Completo
                            </Badge>
                          ) : partial ? (
                            <Badge variant="outline" className="text-[10px] border-amber-400/50 text-amber-600 bg-amber-50/50 ml-auto">
                              {filledCount}/8 preenchidos
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground ml-auto">
                              Nenhum campo preenchido
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {PEDAGOGICAL_FIELDS.map(field => {
                            const val = editData[pp.id]?.[field.key] ?? (pp as any)[field.key] ?? '';
                            const isFilled = val.trim().length > 0;
                            return (
                              <div key={field.key} className={`rounded-lg border p-3 transition-colors ${isFilled ? 'border-green-200 bg-green-50/30 dark:border-green-900/30 dark:bg-green-950/10' : 'border-border bg-background'}`}>
                                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                                  {field.label}
                                  {isFilled && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                                </label>
                                {isProfessor ? (
                                  <p className="text-sm text-foreground whitespace-pre-wrap min-h-[36px]">
                                    {val || <span className="text-muted-foreground italic">Não preenchido</span>}
                                  </p>
                                ) : (
                                  <Textarea
                                    value={val}
                                    onChange={(e) => updateField(pp.id, field.key, e.target.value)}
                                    placeholder={field.placeholder}
                                    rows={2}
                                    className="min-h-[72px] text-sm resize-y border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none"
                                    disabled={pp.status !== 'GERADO'}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {!isProfessor && (
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-3 mt-3 border-t">
                          <div className="flex items-center gap-2 flex-wrap">
                            {canDelete && (
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-8 text-xs" onClick={() => onDelete(pp)}>
                                <Trash2 className="h-3.5 w-3.5 mr-1" />Excluir
                              </Button>
                            )}
                          </div>
                          <Button size="sm" onClick={() => handleSave(pp)} disabled={isSaving} className="gap-1.5 h-8">
                            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            Salvar Semana {pp.week_number}
                          </Button>
                        </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4"><BookOpen className="h-8 w-8 text-muted-foreground" /></div>
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
      </div>
    );
  }

  const showBulkActions = !isProfessor && onBulkDelete && selectedIds.size > 0;

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Top bar */}
        <div className="flex items-center justify-between bg-card rounded-xl border px-4 py-2.5 shadow-sm">
          <span className="text-xs text-muted-foreground font-sora">
            {bimesters.length} bimestre(s) • {groups.length} grupo(s) • {items.length} semana(s)
          </span>
          <div className="flex items-center gap-2">
            {!isProfessor && onBulkDelete && deletableIds.length > 0 && (
              <Button variant="outline" size="sm" onClick={toggleSelectAll} className="text-xs h-7 px-2.5">
                {selectedIds.size === deletableIds.length ? 'Desmarcar todos' : `Selecionar todos (${deletableIds.length})`}
              </Button>
            )}
            {showBulkActions && (
              <Button variant="destructive" size="sm" className="h-7 gap-1.5" onClick={() => onBulkDelete!(Array.from(selectedIds))} disabled={bulkDeleting}>
                {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                {bulkDeleting ? 'Excluindo...' : `Excluir ${selectedIds.size}`}
              </Button>
            )}
          </div>
        </div>

        {/* Render por Bimestre (Neovale: amarelo #FFDA45 + azul escuro #1B1E2C) */}
        {bimesters.map((bim) => {
          const bimGroups = groupsByBimester.get(bim) || [];
          const bimItems = bimGroups.flatMap(g => g.items);
          const filledBim = bimGroups.reduce((acc, g) => acc + g.filledWeeks, 0);
          const totalBim = bimGroups.reduce((acc, g) => acc + g.totalWeeks, 0);
          const bimProgress = totalBim > 0 ? Math.round((filledBim / totalBim) * 100) : 0;
          const isBimOpen = openBimesters[bim] ?? true;
          const bimSchoolGroups = buildSchoolGroups(bimGroups);

          return (
            <Collapsible key={`bim-${bim}`} open={isBimOpen} onOpenChange={() => toggleBimester(bim)} className="rounded-2xl overflow-hidden border-2 border-[#1B1E2C]/10 shadow-sm">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between px-5 py-4 cursor-pointer transition-all bg-[#1B1E2C] hover:bg-[#1B1E2C]/95 text-white">
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center h-6 w-6 rounded transition-transform duration-200 ${isBimOpen ? 'rotate-0' : '-rotate-90'}`}>
                      <ChevronDown className="h-5 w-5 text-[#FFDA45]" />
                    </div>
                    <div className="flex items-center justify-center h-12 w-12 rounded-xl shrink-0 bg-[#FFDA45] text-[#1B1E2C] font-sora font-extrabold text-lg shadow-lg">
                      {bim}º
                    </div>
                    <div>
                      <p className="font-sora font-bold text-base tracking-tight">
                        {bim}º Bimestre
                      </p>
                      <p className="text-xs text-white/70 font-sora">
                        {!isProfessor && `${bimSchoolGroups.length} escola(s) • `}
                        {bimGroups.length} grupo(s) • {bimItems.length} semana(s)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 min-w-[140px]">
                      <Progress value={bimProgress} className="h-2 w-24 bg-white/10 [&>div]:bg-[#FFDA45]" />
                      <span className="text-xs font-bold tabular-nums text-[#FFDA45] font-mono">{bimProgress}%</span>
                    </div>
                    <Badge className="bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45] border-0 text-[11px] font-bold px-2.5 py-0.5 font-mono">
                      {filledBim}/{totalBim}
                    </Badge>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-3 sm:p-4 bg-[#FFDA45]/5 space-y-2">
                  {isProfessor ? (
                    bimGroups.map((group) => renderGroup(group))
                  ) : (
                    bimSchoolGroups.map((sg) => {
                      const schoolKey = `${bim}_${sg.schoolId}`;
                      const isSchoolOpen = openSchools[schoolKey] ?? false;
                      const schoolProgress = sg.totalWeeks > 0 ? Math.round((sg.filledWeeks / sg.totalWeeks) * 100) : 0;
                      return (
                        <Collapsible key={schoolKey} open={isSchoolOpen} onOpenChange={() => toggleSchool(schoolKey)}>
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all bg-card hover:bg-muted/30 shadow-sm">
                              <div className="flex items-center gap-3">
                                <div className={`flex items-center justify-center h-5 w-5 rounded transition-transform duration-200 ${isSchoolOpen ? 'rotate-0' : '-rotate-90'}`}>
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="flex items-center justify-center h-10 w-10 rounded-xl shrink-0 bg-[#FFDA45]/20 text-[#1B1E2C]">
                                  <Building2 className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="font-sora font-semibold text-sm">{sg.schoolName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {sg.professorGroups.length} professor(es) • {sg.totalWeeks} semana(s)
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="hidden sm:flex items-center gap-2 min-w-[100px]">
                                  <Progress value={schoolProgress} className="h-1.5 w-16 [&>div]:bg-[#1B1E2C]" />
                                  <span className="text-[10px] font-bold tabular-nums text-muted-foreground font-mono">{schoolProgress}%</span>
                                </div>
                                <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-medium font-mono">
                                  {sg.filledWeeks}/{sg.totalWeeks}
                                </Badge>
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="space-y-2 mt-2 ml-2 sm:ml-4">
                              {sg.professorGroups.map((pg) => {
                                const profKey = `${bim}_${sg.schoolId}_${pg.professorId}`;
                                const isProfOpen = openProfessors[profKey] ?? false;
                                const profProgress = pg.totalWeeks > 0 ? Math.round((pg.filledWeeks / pg.totalWeeks) * 100) : 0;
                                return (
                                  <Collapsible key={profKey} open={isProfOpen} onOpenChange={() => toggleProfessor(profKey)}>
                                    <CollapsibleTrigger asChild>
                                      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border cursor-pointer transition-all bg-muted/20 hover:bg-muted/40">
                                        <div className="flex items-center gap-3">
                                          <div className={`flex items-center justify-center h-5 w-5 rounded transition-transform duration-200 ${isProfOpen ? 'rotate-0' : '-rotate-90'}`}>
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                          </div>
                                          <div className="flex items-center justify-center h-9 w-9 rounded-xl shrink-0 bg-[#FFDA45]/20 text-[#1B1E2C]">
                                            <User className="h-4 w-4" />
                                          </div>
                                          <div>
                                            <p className="font-sora font-semibold text-sm">{pg.professorName}</p>
                                            <p className="text-xs text-muted-foreground">
                                              {pg.groups.length} disciplina(s) • {pg.totalWeeks} semana(s)
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div className="hidden sm:flex items-center gap-2 min-w-[100px]">
                                            <Progress value={profProgress} className="h-1.5 w-16" />
                                            <span className="text-[10px] font-bold tabular-nums text-muted-foreground font-mono">{profProgress}%</span>
                                          </div>
                                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-medium font-mono">
                                            {pg.filledWeeks}/{pg.totalWeeks}
                                          </Badge>
                                        </div>
                                      </div>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <div className="space-y-1.5 mt-1.5 ml-2 sm:ml-4">
                                        {pg.groups.map((group) => renderGroup(group))}
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                );
                              })}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })
                  )}
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
                    <span>Os planejamentos serão criados como <strong className="text-foreground">rascunho</strong> para que você revise e adeque semana a semana à realidade da sua escola.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Download className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span>Os materiais das <strong className="text-foreground">aulas planejadas</strong> estarão disponíveis para download e poderão ser utilizados em sala de aula.</span>
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
                    <span>Acesse a aba <strong className="text-foreground">"Meus Planejamentos"</strong> e revise cada semana, adequando o conteúdo à realidade da sua escola e turma.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Download className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span>Os materiais das aulas planejadas já estão disponíveis para download e uso em sala de aula.</span>
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
    </TooltipProvider>
  );
}
