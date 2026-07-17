import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loadPersistedFilters, persistFilters } from './utils/persistFilters';
import { RefreshCw, Table, CalendarDays, LayoutGrid, Loader2, BookOpen, ClipboardList, Settings2, Building2, User, CalendarClock, AlertTriangle, Clock, Users, CheckCircle2 } from 'lucide-react';
import { ConfigurationGuard } from '@/components/ConfigurationGuard';
import FeatureGuideCard from '@/components/FeatureGuideCard';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from 'sonner';
import { useWeeklySchedule } from './hooks/useWeeklySchedule';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { ScheduleTableView } from './components/ScheduleTableView';
import { ScheduleWeekView } from './components/ScheduleWeekView';
import { ScheduleCalendarView } from './components/ScheduleCalendarView';
import { ScheduleFilters, type ScheduleFilterValues } from './components/ScheduleFilters';
import { ProfessorScheduleFilters } from './components/ProfessorScheduleFilters';
import { useAuth } from '@/contexts/AuthContext';
import { isManagerRole, isAdminRole } from '@/lib/roles';
import { useSemester } from '@/hooks/useSemester';

// Lazy-load sub-pages as tab content
import SchoolTimeSlotsPage from './SchoolTimeSlotsPage';
import ProfessorPlanningSchedulePage from './ProfessorPlanningSchedulePage';
import { AssignProfessorsBulkDialog } from './components/AssignProfessorsBulkDialog';
import { WeeklyGridEditor } from './components/WeeklyGridEditor';
import { GenerateAllProgressDialog, type GenerateAllProgressState } from './components/GenerateAllProgressDialog';

export default function GradeHorariaPage() {
  const { user } = useAuth();
  const isCoordinator = isManagerRole(user?.perfil);
  const isAdmin = isAdminRole(user?.perfil);
  
  const [searchParams] = useSearchParams();
  // Estado persistido (URL > localStorage > defaults). Garante que F5 / troca
  // de aba não limpe filtros aplicados pelo usuário.
  type PersistedState = {
    tab: string;
    groupBy: 'school' | 'professor' | 'school-course';
    filters: ScheduleFilterValues;
  };
  const defaultPersisted: PersistedState = {
    tab: 'grade',
    groupBy: 'school-course',
    filters: {
      schoolId: null,
      courseId: null,
      classGroupId: null,
      professorId: null,
      subjectId: null,
      startDate: null,
      endDate: null,
      semester: null,
      bimester: null,
    },
  };
  const storageKey = 'grade-horaria:main';
  const persisted = useRef<PersistedState>(loadPersistedFilters(storageKey, defaultPersisted)).current;

  const urlTab = searchParams.get('tab');
  const initialTab =
    urlTab && ['grade', 'planilha', 'horarios', 'planejamento'].includes(urlTab)
      ? urlTab
      : persisted.tab || 'grade';
  const [mainTab, setMainTab] = useState(initialTab);
  const initialSchoolId = searchParams.get('schoolId') ?? persisted.filters.schoolId;
  const initialCourseId = searchParams.get('courseId') ?? persisted.filters.courseId;
  const initialClassGroupId = searchParams.get('classGroupId') ?? persisted.filters.classGroupId;
  const fromRh = searchParams.get('from') === 'rh';

  // Sincroniza aba se URL mudar (ex: navegação dentro do app)
  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && t !== mainTab && ['grade','planilha','horarios','planejamento'].includes(t)) {
      setMainTab(t);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [lastGenResult, setLastGenResult] = useState<{ classes: number; plannings: number } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressMinimized, setProgressMinimized] = useState(false);
  const [progressStatus, setProgressStatus] = useState<GenerateAllProgressState | null>(null);
  const [groupBy, setGroupBy] = useState<'school' | 'professor' | 'school-course'>(persisted.groupBy);
  const [filters, setFilters] = useState<ScheduleFilterValues>({
    ...persisted.filters,
    schoolId: initialSchoolId ?? persisted.filters.schoolId,
    courseId: initialCourseId ?? persisted.filters.courseId,
    classGroupId: initialClassGroupId ?? persisted.filters.classGroupId,
  });

  // Persiste qualquer mudança em filtros / aba / agrupamento
  useEffect(() => {
    persistFilters<PersistedState>(storageKey, { tab: mainTab, groupBy, filters });
  }, [mainTab, groupBy, filters]);

  // Professor: aplica semestre vigente como filtro padrão (usuário pode trocar)
  const { currentSemester } = useSemester();
  const semesterDefaultApplied = useRef(false);
  useEffect(() => {
    if (isCoordinator) return;
    if (semesterDefaultApplied.current) return;
    if (!currentSemester) return;
    if (filters.semester) {
      semesterDefaultApplied.current = true;
      return;
    }
    semesterDefaultApplied.current = true;
    setFilters({ ...filters, semester: currentSemester });
  }, [isCoordinator, currentSemester, filters]);

  const {
    models,
    classModels,
    planningModels,
    occurrences,
    isLoading,
    pendingGenerationModels,
    pendingGenerationSchools,
    schoolGenerationStatus,
    createModel,
    deleteModel,
    bulkDeleteModels,
    generateOccurrences,
    generateAllOccurrences,
    refetch
  } = useWeeklySchedule();

  // Base filters (não-temporais) — escola/curso/turma/professor/semestre
  const baseFilteredModels = useMemo(() => {
    return models.filter(m => {
      if (filters.schoolId && m.school_id !== filters.schoolId) return false;
      if (filters.courseId && m.course_id !== filters.courseId) return false;
      if (filters.classGroupId && m.class_group_id !== filters.classGroupId) return false;
      if (filters.professorId && m.professor_id !== filters.professorId) return false;
      if (filters.subjectId && m.subject_id !== filters.subjectId) return false;
      if (filters.semester === 'FIRST' || filters.semester === 'SECOND') {
        if (m.schedule_type === 'CLASS') {
          const s = m.subject_semester;
          if (s && s !== 'ANNUAL' && s !== filters.semester) return false;
        }
      }
      return true;
    });
  }, [models, filters]);

  // Ocorrências filtradas (já considera janela de datas) — usadas pelo Calendário
  const filteredOccurrences = useMemo(() => {
    const baseIds = new Set(baseFilteredModels.map(m => m.id));
    return occurrences.filter(o => {
      if (!baseIds.has(o.weekly_model_id)) return false;
      if (filters.startDate && o.occurrence_date < filters.startDate) return false;
      if (filters.endDate && o.occurrence_date > filters.endDate) return false;
      return true;
    });
  }, [occurrences, baseFilteredModels, filters.startDate, filters.endDate]);

  // Modelos finais para Tabela/Semanal: aplicam a janela de datas via ocorrências
  const hasDateWindow = !!(filters.startDate || filters.endDate);
  const filteredModels = useMemo(() => {
    if (!hasDateWindow) return baseFilteredModels;
    const inWindow = new Set(filteredOccurrences.map(o => o.weekly_model_id));
    return baseFilteredModels.filter(m => inWindow.has(m.id));
  }, [baseFilteredModels, filteredOccurrences, hasDateWindow]);

  // Optimized single-pass summary computation
  const summaryStats = useMemo(() => {
    const filteredModelMap = new Map<string, string>();
    let unassignedCount = 0;

    // ---------------------------------------------------------------------
    // Todos os KPIs são expressos em H/A (carga horária), nunca em "slots".
    // Para CLASS: o peso H/A de cada slot = CH oficial da disciplina dividida
    // pela quantidade de slots daquele par (professor × escola × turma ×
    // disciplina). Assim a soma dos pesos por grupo = CH semanal real da
    // disciplina (idêntica ao relatório de Carga Horária Semanal), mesmo que
    // existam aulas duplas, componente ANP, etc.
    // Para PLANNING: cada slot vale 1 H/A (cada hora-aula de planejamento).
    // ---------------------------------------------------------------------
    const groupCH = new Map<string, number>();
    const groupSlots = new Map<string, number>();
    for (const m of filteredModels) {
      filteredModelMap.set(m.id, m.schedule_type);
      if (!m.professor_id) unassignedCount++;
      if (m.schedule_type === 'CLASS') {
        const key = `${m.professor_id || '-'}|${m.school_id}|${m.class_group_id || '-'}|${m.subject_id || '-'}`;
        groupSlots.set(key, (groupSlots.get(key) || 0) + 1);
        if (!groupCH.has(key)) groupCH.set(key, Number(m.subject_ch_semanal) || 0);
      }
    }

    const slotHa = new Map<string, number>();
    let totalHaSemanal = 0;
    let planningHa = 0;
    for (const m of filteredModels) {
      if (m.schedule_type === 'CLASS') {
        const key = `${m.professor_id || '-'}|${m.school_id}|${m.class_group_id || '-'}|${m.subject_id || '-'}`;
        const ch = groupCH.get(key) || 0;
        const slots = groupSlots.get(key) || 1;
        const weight = ch / slots;
        slotHa.set(m.id, weight);
        totalHaSemanal += weight;
      } else if (m.schedule_type === 'PLANNING') {
        slotHa.set(m.id, 1);
        planningHa += 1;
      }
    }

    let generatedClassesHa = 0;
    let generatedPlanningsHa = 0;
    for (const o of filteredOccurrences) {
      const type = filteredModelMap.get(o.weekly_model_id);
      const w = slotHa.get(o.weekly_model_id) || 0;
      if (type === 'CLASS') generatedClassesHa += w;
      else if (type === 'PLANNING') generatedPlanningsHa += w;
    }

    const assigned = filteredModels.length - unassignedCount;
    const coverage = filteredModels.length > 0
      ? Math.round((assigned / filteredModels.length) * 100)
      : 0;

    const round = (n: number) => Math.round(n * 10) / 10;

    return {
      // Valores oficiais em H/A — exibidos nos KPIs
      classCount: round(totalHaSemanal),
      totalHaSemanal: round(totalHaSemanal),
      planningCount: round(planningHa),
      generatedClasses: round(generatedClassesHa),
      generatedPlannings: round(generatedPlanningsHa),
      totalModels: round(totalHaSemanal + planningHa),
      unassignedCount,
      coverage,
    };
  }, [filteredModels, filteredOccurrences]);

  // Generation scope summary for confirmation dialog — escolas pendentes/alteradas
  const generationSummary = useMemo(() => {
    const pendingSchoolIds = new Set(pendingGenerationSchools.map(s => s.schoolId));
    const activeModels = models.filter(m => m.status === 'ACTIVE');
    const inScope = activeModels.filter(m => pendingSchoolIds.has(m.school_id));
    const withProfessor = inScope.filter(m => m.professor_id);
    const withoutProfessor = inScope.filter(m => !m.professor_id);
    const classesToGenerate = withProfessor.filter(m => m.schedule_type === 'CLASS').length;
    const planningsToGenerate = withProfessor.filter(m => m.schedule_type === 'PLANNING').length;
    const upToDateSchools = Array.from(schoolGenerationStatus.values()).filter(s => s.status === 'upToDate');
    const unassignedNames = withoutProfessor.map(m => `${m.school_name || ''} · ${m.subject_name || 'Horário'}`).slice(0, 5);

    return {
      total: inScope.length,
      withProfessor: withProfessor.length,
      withoutProfessor: withoutProfessor.length,
      classesToGenerate,
      planningsToGenerate,
      schoolsInScope: pendingGenerationSchools,
      upToDateSchools,
      unassignedNames,
    };
  }, [models, pendingGenerationSchools, schoolGenerationStatus]);

  const filteredClassModels = useMemo(() => filteredModels.filter(m => m.schedule_type === 'CLASS'), [filteredModels]);
  const filteredPlanningModels = useMemo(() => filteredModels.filter(m => m.schedule_type === 'PLANNING'), [filteredModels]);

  const handleSaveSchedules = async (entries: Parameters<typeof createModel>[0][]) => {
    for (const entry of entries) {
      await createModel(entry);
    }
    await refetch();
  };

  const handleGenerateAll = async () => {
    if (isGeneratingAll) {
      toast.warning('Processamento em andamento', {
        description: 'Já existe uma geração de ocorrências em execução. Aguarde a finalização antes de iniciar uma nova.',
      });
      return;
    }
    setShowConfirmDialog(false);
    setIsGeneratingAll(true);
    const schoolIds = pendingGenerationSchools.map(s => s.schoolId);
    setProgressStatus({ state: 'processing', schoolsCount: schoolIds.length });
    setProgressMinimized(false);
    setProgressOpen(true);
    try {
      const results = await generateAllOccurrences(undefined, {
        onlyPending: true,
        schoolIds,
        onProgress: ({ current, total, schoolName, itemLabel, typeLabel }) => {
          setProgressStatus({
            state: 'processing',
            schoolsCount: schoolIds.length,
            current,
            total,
            schoolName,
            itemLabel,
            typeLabel,
          });
        },
      });
      setLastGenResult({ classes: results.successClasses, plannings: results.successPlannings });
      setProgressStatus({
        state: 'done',
        successClasses: results.successClasses,
        successPlannings: results.successPlannings,
        schoolsProcessed: results.schoolsProcessed,
        skipped: results.skipped,
        errors: results.errors,
      });
      // Ao terminar: restaura a janela e dispara toast (caso esteja minimizado)
      setProgressMinimized(false);
      setProgressOpen(true);
      if (results.errors.length > 0) {
        console.error('Erros ao gerar:', results.errors);
        toast.warning(`Geração concluída com ${results.errors.length} erro(s)`, {
          description: `${results.successClasses} aula(s) e ${results.successPlannings} planejamento(s) gerados.`,
        });
      } else {
        toast.success('Geração concluída com sucesso', {
          description: `${results.successClasses} aula(s) e ${results.successPlannings} planejamento(s) gerados em ${results.schoolsProcessed} escola(s).`,
        });
      }
    } catch (error: any) {
      console.error('Erro ao gerar aulas:', error);
      const msg =
        error?.message ||
        (typeof error === 'string' ? error : JSON.stringify(error, null, 2));
      setProgressStatus({ state: 'error', message: msg });
      setProgressMinimized(false);
      setProgressOpen(true);
      toast.error('Falha ao gerar aulas', { description: msg.slice(0, 200) });
    } finally {
      setIsGeneratingAll(false);
    }
  };

  // Apenas a 1ª carga real exibe o spinner full-page. Refetches em background
  // (mutações, Realtime) são silenciosos — preservam UI, filtros e scroll.
  const isInitialLoading = isLoading && models.length === 0;
  if (isInitialLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ConfigurationGuard stepKey="schedule">
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Pedagógico' }, { label: 'Grade Horária' }]}
        title="Grade Horária"
        description="Gerencie horários de aula e planejamento dos professores"
        icon={CalendarClock}
        actions={isCoordinator && mainTab === 'grade' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (isGeneratingAll) {
                toast.warning('Processamento em andamento', {
                  description: 'Já existe uma geração de ocorrências em execução. Aguarde a finalização antes de iniciar uma nova.',
                });
                return;
              }
              setShowConfirmDialog(true);
            }}
            disabled={pendingGenerationSchools.length === 0}
            title={
              isGeneratingAll
                ? 'Geração em andamento — aguarde a finalização'
                : pendingGenerationSchools.length === 0
                ? 'Todas as escolas estão com a grade em dia. Apenas escolas novas ou com alteração são processadas.'
                : `${pendingGenerationSchools.length} escola(s) pendente(s)/alterada(s): ${pendingGenerationSchools.slice(0, 5).map(s => s.schoolName).join(', ')}${pendingGenerationSchools.length > 5 ? '…' : ''}`
            }
          >
            {isGeneratingAll ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : pendingGenerationSchools.length === 0 ? (
              <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {isGeneratingAll
              ? 'Gerando…'
              : pendingGenerationSchools.length === 0
              ? 'Todas as escolas em dia'
              : `Gerar Todas as Aulas (${pendingGenerationSchools.length} escola${pendingGenerationSchools.length === 1 ? '' : 's'})`}
          </Button>
        )}
      />

      {/* Main Tabs - unified view */}
      {isCoordinator ? (
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="grade" className="gap-1.5">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Grade</span> Horária
            </TabsTrigger>
            <TabsTrigger value="planilha" className="gap-1.5">
              <LayoutGrid className="h-4 w-4" />
              Planilha
            </TabsTrigger>
            <TabsTrigger value="horarios" className="gap-1.5">
              <Settings2 className="h-4 w-4" />
              Horários <span className="hidden sm:inline">da Escola</span>
            </TabsTrigger>
            <TabsTrigger value="planejamento" className="gap-1.5">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Planejamento</span> Professor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="grade" className="space-y-4 sm:space-y-6 mt-4">
            <GradeContent
              isCoordinator={isCoordinator}
              isAdmin={isAdmin}
              filters={filters}
              setFilters={setFilters}
              groupBy={groupBy}
              setGroupBy={setGroupBy}
              allModels={models}
              filteredModels={filteredModels}
              filteredClassModels={filteredClassModels}
              filteredPlanningModels={filteredPlanningModels}
              filteredOccurrences={filteredOccurrences}
              summaryStats={summaryStats}
              deleteModel={deleteModel}
              bulkDeleteModels={bulkDeleteModels}
              generateOccurrences={generateOccurrences}
              onOpenBulkAssign={() => setShowBulkAssignDialog(true)}
              schoolGenerationStatus={schoolGenerationStatus}
            />
          </TabsContent>

          <TabsContent value="planilha" className="mt-4 space-y-3">
            {fromRh && (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>Vindo de R.H. → Alocação.</span>
                <a href="/rh/alocacao?tab=cobertura" className="underline hover:text-foreground">← Voltar para Alocação R.H.</a>
              </div>
            )}
            <WeeklyGridEditor
              onSaved={refetch}
              initialSchoolId={initialSchoolId}
              initialCourseId={initialCourseId}
              initialClassGroupId={initialClassGroupId}
            />
          </TabsContent>

          <TabsContent value="horarios" className="mt-4">
            <SchoolTimeSlotsPage embedded />
          </TabsContent>

          <TabsContent value="planejamento" className="mt-4">
            <ProfessorPlanningSchedulePage embedded />
          </TabsContent>
        </Tabs>
      ) : (
        <>
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-muted-foreground flex items-center gap-2">
            <Badge variant="outline" className="border-primary/40 text-primary">Somente leitura</Badge>
            Você está visualizando sua grade horária. Apenas coordenação pode editar slots.
          </div>
          <GradeContent
            isCoordinator={isCoordinator}
            isAdmin={isAdmin}
            filters={filters}
            setFilters={setFilters}
            groupBy={groupBy}
            setGroupBy={setGroupBy}
            allModels={models}
            filteredModels={filteredModels}
            filteredClassModels={filteredClassModels}
            filteredPlanningModels={filteredPlanningModels}
            filteredOccurrences={filteredOccurrences}
            summaryStats={summaryStats}
            deleteModel={deleteModel}
            bulkDeleteModels={bulkDeleteModels}
            generateOccurrences={generateOccurrences}
            onOpenBulkAssign={() => setShowBulkAssignDialog(true)}
            schoolGenerationStatus={schoolGenerationStatus}
          />
        </>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Gerar Todas as Aulas</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Apenas escolas <strong>novas</strong> ou <strong>com alteração</strong> desde a última geração serão processadas.
                  Escolas com a grade em dia são ignoradas.
                </p>

                <div className="bg-muted rounded-lg p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span>Escolas a processar:</span>
                    <span className="font-medium">{generationSummary.schoolsInScope.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Horários a gerar:</span>
                    <span className="font-medium">{generationSummary.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Aulas a gerar:</span>
                    <span className="font-medium text-primary">{generationSummary.classesToGenerate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Planejamentos a gerar:</span>
                    <span className="font-medium text-amber-600">{generationSummary.planningsToGenerate}</span>
                  </div>
                  {generationSummary.upToDateSchools.length > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Escolas já em dia (ignoradas):</span>
                      <span className="font-medium">{generationSummary.upToDateSchools.length}</span>
                    </div>
                  )}
                </div>

                {generationSummary.schoolsInScope.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-56 overflow-y-auto pr-1">
                    {generationSummary.schoolsInScope.map(s => (
                      <div key={s.schoolId} className="flex items-start justify-between gap-3 p-2.5 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium break-words">{s.schoolName}</div>
                          <div className="text-xs text-muted-foreground">
                            {s.classModels} aula(s) · {s.planningModels} planejamento(s)
                            {s.unassignedModels > 0 && (
                              <> · <span className="text-amber-600">{s.unassignedModels} sem professor</span></>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {s.lastGeneratedAt
                              ? `Última geração: ${new Date(s.lastGeneratedAt).toLocaleString('pt-BR')}`
                              : 'Nunca gerada'}
                            {s.reasons.length > 0 && ` · ${s.reasons.join(', ')}`}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            'shrink-0 ' + (
                              s.status === 'pending'
                                ? 'border-amber-300 bg-amber-50 text-amber-800'
                                : 'border-blue-300 bg-blue-50 text-blue-800'
                            )
                          }
                        >
                          {s.status === 'pending' ? 'Pendente' : 'Alterada'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {generationSummary.withoutProfessor > 0 && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800">
                        {generationSummary.withoutProfessor} horário(s) sem professor atribuído
                      </p>
                      <p className="text-amber-700 text-xs mt-1">
                        Estes horários serão ignorados: {generationSummary.unassignedNames.join(', ')}
                        {generationSummary.withoutProfessor > 5 && '...'}
                      </p>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Ocorrências existentes das escolas processadas serão substituídas. Esta ação pode levar alguns segundos.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isGeneratingAll}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleGenerateAll} disabled={isGeneratingAll}>
              {isGeneratingAll ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Gerando…
                </>
              ) : (
                'Confirmar Geração'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Progress / Result Dialog */}
      <GenerateAllProgressDialog
        open={progressOpen}
        onOpenChange={setProgressOpen}
        status={progressStatus}
        minimized={progressMinimized}
        onMinimize={() => setProgressMinimized(true)}
        onRestore={() => setProgressMinimized(false)}
      />



      {/* Bulk Assign Professors Dialog */}
      <AssignProfessorsBulkDialog
        open={showBulkAssignDialog}
        onOpenChange={setShowBulkAssignDialog}
        unassignedModels={models.filter(m => !m.professor_id && m.status === 'ACTIVE').map(m => ({
          id: m.id,
          school_id: m.school_id,
          course_id: m.course_id,
          subject_id: m.subject_id,
          subject_name: m.subject_name,
          course_name: m.course_name,
          school_name: m.school_name,
          weekday: m.weekday,
          start_time: m.start_time,
          end_time: m.end_time,
        }))}
        onAssigned={refetch}
      />
    </div>
    </ConfigurationGuard>
  );
}

// Summary stats type
interface SummaryStats {
  classCount: number;
  totalHaSemanal: number;
  planningCount: number;
  generatedClasses: number;
  generatedPlannings: number;
  totalModels: number;
  unassignedCount: number;
  coverage: number;
}

// Extracted grade content for reuse
function GradeContent({
  isCoordinator,
  isAdmin,
  filters,
  setFilters,
  groupBy,
  setGroupBy,
  allModels,
  filteredModels,
  filteredClassModels,
  filteredPlanningModels,
  filteredOccurrences,
  summaryStats,
  deleteModel,
  bulkDeleteModels,
  generateOccurrences,
  onOpenBulkAssign,
  schoolGenerationStatus,
}: {
  isCoordinator: boolean;
  isAdmin: boolean;
  filters: ScheduleFilterValues;
  setFilters: (f: ScheduleFilterValues) => void;
  groupBy: 'school' | 'professor' | 'school-course';
  setGroupBy: (g: 'school' | 'professor' | 'school-course') => void;
  allModels: any[];
  filteredModels: any[];
  filteredClassModels: any[];
  filteredPlanningModels: any[];
  filteredOccurrences: any[];
  summaryStats: SummaryStats;
  deleteModel: (id: string) => Promise<void>;
  bulkDeleteModels: (ids: string[]) => Promise<{ ok: number; fail: number }>;
  generateOccurrences: (modelId: string) => Promise<any>;
  onOpenBulkAssign?: () => void;
  schoolGenerationStatus?: Map<string, import('./hooks/useWeeklySchedule').SchoolGenerationInfo>;
}) {
  return (
    <>
      <FeatureGuideCard title="Como usar a Grade Horária" steps={[
        { icon: ClipboardList, title: 'Montar a grade', description: 'Selecione escola, curso e turma, depois adicione aulas nos horários.', color: 'blue' },
        { icon: Clock, title: 'Horários da escola', description: 'Configure os slots de tempo na aba "Horários da Escola".', color: 'green' },
        { icon: Users, title: 'Alocar professores', description: 'Cada aula é vinculada a um professor e disciplina específica.', color: 'purple' },
        { icon: CalendarDays, title: 'Visualizar por semana', description: 'Alterne entre tabela, semana e calendário para diferentes visões.', color: 'amber' },
      ]} />
      {/* Filters: coordinators see full filters; professors see their own scoped filters */}
      {isCoordinator
        ? <ScheduleFilters value={filters} onChange={setFilters} />
        : <ProfessorScheduleFilters value={filters} onChange={setFilters} models={allModels} />
      }

      {/* Unassigned professor alert */}
      {isCoordinator && summaryStats.unassignedCount > 0 && (
        <div className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-amber-800">
              <strong>{summaryStats.unassignedCount}</strong> horário(s) sem professor — não serão gerados.
            </span>
          </div>
          {onOpenBulkAssign && (
            <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100 shrink-0" onClick={onOpenBulkAssign}>
              <Users className="mr-1.5 h-3.5 w-3.5" /> Atribuir em massa
            </Button>
          )}
        </div>
      )}

      {/* Summary Stats — só para coordenação/admin */}
      {isCoordinator && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Aulas (H/A)', value: summaryStats.totalHaSemanal, icon: BookOpen, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Planejamentos (H/A)', value: summaryStats.planningCount, icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-500/10' },
            { label: 'Aulas Geradas (H/A)', value: summaryStats.generatedClasses, icon: CalendarDays, color: 'text-green-600', bg: 'bg-green-500/10' },
            { label: 'Planej. Gerados (H/A)', value: summaryStats.generatedPlannings, icon: CalendarClock, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
            { label: 'Total H/A Semanal', value: summaryStats.totalModels, icon: LayoutGrid, color: 'text-muted-foreground', bg: 'bg-secondary/50' },
            {
              label: 'Cobertura',
              value: `${summaryStats.coverage}%`,
              icon: Users,
              color: summaryStats.coverage >= 90 ? 'text-green-600' : summaryStats.coverage >= 70 ? 'text-amber-600' : 'text-red-600',
              bg: summaryStats.coverage >= 90 ? 'bg-green-500/10' : summaryStats.coverage >= 70 ? 'bg-amber-500/10' : 'bg-red-500/10',
            },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="shadow-sm">
              <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                <div className={`p-2 sm:p-2.5 rounded-lg ${bg}`}>
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${color}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-xl sm:text-2xl font-bold leading-none">{value}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">{label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base sm:text-lg">
            {isCoordinator ? 'Planejamento Anual de Horários' : 'Meus Horários'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          <Tabs defaultValue={isCoordinator ? 'table' : 'week'}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="overflow-x-auto">
                <TabsList className="inline-flex w-auto">
                  <TabsTrigger value="table" className="gap-1.5 text-xs sm:text-sm">
                    <Table className="h-4 w-4" />
                    <span className="hidden sm:inline">Tabela</span>
                  </TabsTrigger>
                  <TabsTrigger value="week" className="gap-1.5 text-xs sm:text-sm">
                    <LayoutGrid className="h-4 w-4" />
                    <span className="hidden sm:inline">Semanal</span>
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className="gap-1.5 text-xs sm:text-sm">
                    <CalendarDays className="h-4 w-4" />
                    <span className="hidden sm:inline">Calendário</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>



            <TabsContent value="table">
              <ScheduleTableView
                models={filteredModels}
                groupBy={groupBy}
                onDelete={isCoordinator ? deleteModel : undefined}
                onBulkDelete={isAdmin ? bulkDeleteModels : undefined}
                onGenerateOccurrences={isCoordinator ? generateOccurrences : undefined}
                canBulkDelete={isAdmin}
                schoolGenerationStatus={schoolGenerationStatus}
              />
            </TabsContent>

            <TabsContent value="week">
              <ScheduleWeekView models={filteredModels} groupBy={groupBy === 'professor' ? 'professor' : 'school'} />
            </TabsContent>

            <TabsContent value="calendar">
              <ScheduleCalendarView occurrences={filteredOccurrences} models={filteredModels} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
