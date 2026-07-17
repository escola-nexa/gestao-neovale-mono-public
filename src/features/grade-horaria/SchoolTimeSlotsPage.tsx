import { useState, useEffect, useCallback, useMemo } from 'react';
import { Trash2, Clock, ArrowLeft, BookOpen, AlertCircle, CheckCircle2, User, Wifi, MapPin, Settings2, ClipboardList } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from 'sonner';
import { useOrganization } from '@/hooks/useOrganization';
import { useSchoolTimeSlots } from './hooks/useSchoolTimeSlots';
import { gradeHorariaApi, type SchoolTimeSlot } from './api';
import { fetchSchoolsWithCourses } from '@/lib/schoolsWithCourses';
import { useClassModalityConfig } from './hooks/useClassModalityConfig';
import { ClassModalityConfigDialog } from './components/ClassModalityConfigDialog';
import { WEEKDAY_OPTIONS, type Weekday } from '@/types/academic';
import { SEMESTER_LABELS, type SubjectSemester } from '@/hooks/useSemester';
import { ScheduleConflictModal } from '@/features/rh/components/conflicts/ScheduleConflictModal';
import type { ConflictItem, WeekdayCode } from '@/features/rh/lib/conflictTypes';
import { PlanningObservationButton } from './components/PlanningObservationButton';
import { loadPersistedFilters, persistFilters } from './utils/persistFilters';


const WEEKDAY_PT_TO_CODE: Record<string, WeekdayCode> = {
  SEGUNDA: 'MON', TERCA: 'TUE', QUARTA: 'WED', QUINTA: 'THU', SEXTA: 'FRI', SABADO: 'SAT',
  MON: 'MON', TUE: 'TUE', WED: 'WED', THU: 'THU', FRI: 'FRI', SAT: 'SAT',
};

interface FilterOption { id: string; nome?: string; }
interface ProfessorOption { id: string; full_name: string; }
interface SubjectOption { id: string; nome: string; codigo: string; semester: SubjectSemester; carga_horaria_semanal: number; }
interface ExistingModel {
  id: string;
  subject_id: string | null;
  weekday: Weekday;
  start_time: string;
  end_time: string;
  school_time_slot_id: string | null;
  professor_id: string | null;
  professor_name?: string;
  schedule_type: string;
  class_mode: 'PRESENCIAL' | 'ANP';
  observation?: string | null;
}


const WEEKDAYS: Weekday[] = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'];
const WEEKDAY_SHORT: Record<Weekday, string> = {
  SEGUNDA: 'Seg',
  TERCA: 'Ter',
  QUARTA: 'Qua',
  QUINTA: 'Qui',
  SEXTA: 'Sex',
};

export default function SchoolTimeSlotsPage({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const { organization } = useOrganization();

  // Persistência de filtros (sobrevive a F5 / troca de aba)
  type HorariosPersist = {
    selectedSchoolId: string | null;
    selectedCourseId: string | null;
    selectedClassGroupId: string | null;
    semesterFilter: SubjectSemester | null;
    selectedDay: Weekday;
  };
  const HORARIOS_KEY = 'grade-horaria:horarios';
  const persisted = loadPersistedFilters<HorariosPersist>(HORARIOS_KEY, {
    selectedSchoolId: null,
    selectedCourseId: null,
    selectedClassGroupId: null,
    semesterFilter: null,
    selectedDay: 'SEGUNDA',
  });

  // Filters
  const [schools, setSchools] = useState<FilterOption[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(persisted.selectedSchoolId);
  const [courses, setCourses] = useState<FilterOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(persisted.selectedCourseId);
  const [classGroups, setClassGroups] = useState<FilterOption[]>([]);
  const [selectedClassGroupId, setSelectedClassGroupId] = useState<string | null>(persisted.selectedClassGroupId);
  const [semesterFilter, setSemesterFilter] = useState<SubjectSemester | null>(persisted.semesterFilter);

  // Day & data
  const [selectedDay, setSelectedDay] = useState<Weekday>(persisted.selectedDay);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [existingModels, setExistingModels] = useState<ExistingModel[]>([]);
  const [professors, setProfessors] = useState<ProfessorOption[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignMode, setAssignMode] = useState<'PRESENCIAL' | 'ANP'>('PRESENCIAL');
  const [modalityDialogOpen, setModalityDialogOpen] = useState(false);
  const [conflictModal, setConflictModal] = useState<{ open: boolean; items: ConflictItem[] }>({ open: false, items: [] });

  const { slots: timeSlots, getSlotsByWeekday } = useSchoolTimeSlots(selectedSchoolId);

  // Persiste filtros sempre que mudarem
  useEffect(() => {
    persistFilters<HorariosPersist>(HORARIOS_KEY, {
      selectedSchoolId,
      selectedCourseId,
      selectedClassGroupId,
      semesterFilter,
      selectedDay,
    });
  }, [selectedSchoolId, selectedCourseId, selectedClassGroupId, semesterFilter, selectedDay]);
  const { rows: modalityRows, getConfig: getModalityConfig, refetch: refetchModality } =
    useClassModalityConfig(selectedClassGroupId);

  // Load schools
  useEffect(() => {
    if (!organization?.id) return;
    fetchSchoolsWithCourses({ organizationId: organization.id })
      .then((data) => setSchools(data))
      .catch(() => setSchools([]));
  }, [organization?.id]);

  // Load courses when school changes
  useEffect(() => {
    if (!organization?.id || !selectedSchoolId) { setCourses([]); return; }
    const load = async () => {
      const data = await gradeHorariaApi.getCoursesBySchool(organization.id, selectedSchoolId);
      setCourses(data || []);
    };
    load();
  }, [organization?.id, selectedSchoolId]);

  // Load class groups
  useEffect(() => {
    if (!selectedSchoolId || !selectedCourseId) { setClassGroups([]); return; }
    gradeHorariaApi.getClassGroupsByCourse(selectedSchoolId, selectedCourseId)
      .then(data => setClassGroups(data || []));
  }, [selectedSchoolId, selectedCourseId]);

  // Load subjects
  useEffect(() => {
    if (!selectedCourseId) { setSubjects([]); return; }
    gradeHorariaApi.getSubjectsByCourse(selectedCourseId)
      .then((data: any) => setSubjects((data || []).map((d: any) => ({ ...d, semester: d.semester as SubjectSemester }))));
  }, [selectedCourseId]);

  // Load professors linked to school+course
  useEffect(() => {
    if (!organization?.id || !selectedSchoolId || !selectedCourseId) { setProfessors([]); return; }
    const load = async () => {
      const data = await gradeHorariaApi.getProfessorsBySchoolCourse(organization.id, selectedSchoolId, selectedCourseId);
      setProfessors(data || []);
    };
    load();
  }, [organization?.id, selectedSchoolId, selectedCourseId]);

  // Load existing models
  const fetchExistingModels = useCallback(async () => {
    if (!organization?.id || !selectedSchoolId || !selectedCourseId || !selectedClassGroupId) {
      setExistingModels([]);
      return;
    }
    const data = await gradeHorariaApi.getWeeklyModels(organization.id, selectedSchoolId, selectedCourseId, selectedClassGroupId);
    setExistingModels((data || []).map((m: any) => ({
      ...m,
      professor_name: m.professors?.full_name || null,
    })));
  }, [organization?.id, selectedSchoolId, selectedCourseId, selectedClassGroupId]);

  useEffect(() => { fetchExistingModels(); }, [fetchExistingModels]);

  // Filtered subjects by selected semester
  const filteredSubjects = useMemo(() => {
    if (!semesterFilter) return [];
    return subjects.filter(s => s.semester === semesterFilter || s.semester === 'ANNUAL');
  }, [subjects, semesterFilter]);

  // Current day slots & models
  const currentDaySlots = useMemo(() => getSlotsByWeekday(selectedDay), [timeSlots, selectedDay]);

  // Filter existing models by semester context
  const semesterFilteredModels = useMemo(() => {
    if (!semesterFilter) return existingModels;
    return existingModels.filter(m => {
      if (!m.subject_id) return true; // non-subject models (e.g. PLANNING) always show
      const subj = subjects.find(s => s.id === m.subject_id);
      if (!subj) return false;
      return subj.semester === semesterFilter || subj.semester === 'ANNUAL';
    });
  }, [existingModels, semesterFilter, subjects]);

  const getSlotModel = useCallback((slot: SchoolTimeSlot) => {
    return semesterFilteredModels.find(
      m => m.weekday === selectedDay && m.school_time_slot_id === slot.id
    );
  }, [semesterFilteredModels, selectedDay]);

  const handleSchoolChange = (id: string) => {
    setSelectedSchoolId(id);
    setSelectedCourseId(null);
    setSelectedClassGroupId(null);
    setSemesterFilter(null);
  };

  const handleCourseChange = (id: string) => {
    setSelectedCourseId(id);
    setSelectedClassGroupId(null);
    setSemesterFilter(null);
  };

  const handleClassGroupChange = (id: string) => {
    setSelectedClassGroupId(id);
    setSemesterFilter(null);
  };

  // Assign subject to slot
  const handleAssignSubject = async (subjectId: string, slot: SchoolTimeSlot) => {
    if (!organization?.id || !selectedSchoolId || !selectedCourseId || !selectedClassGroupId) return;

    const subject = subjects.find(s => s.id === subjectId);
    if (!subject || !semesterFilter) return;

    // Validate against modality config (Pres/ANP separate quotas)
    const cfg = getModalityConfig(subjectId, semesterFilter);
    const sameModeCount = semesterFilteredModels.filter(
      m => m.subject_id === subjectId && (m.class_mode || 'PRESENCIAL') === assignMode,
    ).length;

    if (cfg) {
      const limit = assignMode === 'PRESENCIAL' ? cfg.ch_presencial : cfg.ch_anp;
      if (limit === 0) {
        toast.error(
          `Esta turma não tem horas ${assignMode === 'ANP' ? 'ANP' : 'presenciais'} configuradas para "${subject.nome}". Ajuste em "Configurar ANP".`,
        );
        return;
      }
      if (sameModeCount >= limit) {
        toast.error(
          `Limite ${assignMode === 'ANP' ? 'ANP' : 'presencial'} atingido para "${subject.nome}" (${sameModeCount}/${limit}h).`,
        );
        return;
      }
    } else {
      // Sem config explícita: comporta-se como antes (presencial só)
      if (assignMode === 'ANP') {
        toast.error(
          `Configure a divisão Presencial/ANP da turma antes de alocar como ANP. Use "Configurar ANP".`,
        );
        return;
      }
      const totalCount = semesterFilteredModels.filter(m => m.subject_id === subjectId).length;
      if (totalCount >= subject.carga_horaria_semanal) {
        toast.error(`Carga horária semanal da disciplina "${subject.nome}" já está completa (${totalCount}/${subject.carga_horaria_semanal})`);
        return;
      }
    }

    setIsAssigning(true);
    try {
      await gradeHorariaApi.insertWeeklyModel({
        organization_id: organization.id,
        school_id: selectedSchoolId,
        course_id: selectedCourseId,
        class_group_id: selectedClassGroupId,
        subject_id: subjectId,
        weekday: selectedDay,
        start_time: slot.start_time,
        end_time: slot.end_time,
        school_time_slot_id: slot.id,
        schedule_type: 'CLASS',
        class_mode: assignMode,
        status: 'ACTIVE',
      });
      toast.success(
          assignMode === 'ANP'
            ? 'Aula ANP alocada ao horário'
            : 'Disciplina alocada ao horário',
        );
        await fetchExistingModels();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao alocar');
    } finally {
      setIsAssigning(false);
    }
  };

  // Remove assignment
  const handleRemoveAssignment = async (modelId: string) => {
    try {
      await gradeHorariaApi.deleteWeeklyModel(modelId);
      toast.success('Alocação removida');
      await fetchExistingModels();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover');
    }
  };

  // Assign professor to existing model with conflict validation
  const handleAssignProfessor = async (modelId: string, professorId: string) => {
    try {
      const model = existingModels.find(m => m.id === modelId);
      if (!model) return;

      // ANP nunca conflita — pula validação inteira.
      const isAnpModel = (model.class_mode || 'PRESENCIAL') === 'ANP';

      // Check for conflicts: same professor, same weekday, overlapping time across all schools
      const conflicts = isAnpModel ? [] : await gradeHorariaApi.getWeeklyModelsByProfessorWeekday(professorId, model.weekday, modelId);

      if (conflicts && conflicts.length > 0) {
        const overlapping = conflicts.filter((c: any) => {
          if ((c.class_mode || 'PRESENCIAL') === 'ANP') return false;
          return c.start_time < model.end_time && c.end_time > model.start_time;
        });

        if (overlapping.length > 0) {
          const profName = professors.find(p => p.id === professorId)?.full_name ?? '—';
          const turmaName = classGroups.find(cg => cg.id === selectedClassGroupId)?.nome ?? '(turma)';
          const items: ConflictItem[] = overlapping.map((c: any, i: number) => ({
            key: `slot-${modelId}-${i}`,
            kind: 'admin-grid',
            teacherName: profName,
            weekday: WEEKDAY_PT_TO_CODE[String(model.weekday)] ?? 'MON',
            overlapStart: String(model.start_time).slice(0, 5),
            overlapEnd: String(model.end_time).slice(0, 5),
            sides: [
              { className: turmaName, schoolName: schools.find(s => s.id === selectedSchoolId)?.nome },
              {
                className: '(aula já cadastrada)',
                schoolName: (c.schools as any)?.nome || 'outra escola',
                isExternalSchool: c.school_id !== selectedSchoolId,
              },
            ],
            suggestions: [
              {
                label: 'Escolher outro professor',
                description: 'Fecha a modal para você selecionar outro professor neste slot.',
                variant: 'primary',
                action: { type: 'change-teacher', classId: selectedClassGroupId ?? '', slotId: modelId },
              },
            ],
          }));
          setConflictModal({ open: true, items });
          return;
        }
      }

      await gradeHorariaApi.updateWeeklyModel(modelId, { professor_id: professorId });
      toast.success('Professor vinculado ao horário');
      await fetchExistingModels();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao vincular professor');
    }
  };



  const allFiltersSelected = selectedSchoolId && selectedCourseId && selectedClassGroupId && semesterFilter;

  // Count total allocations per day
  const getDayAllocCount = (day: Weekday) => semesterFilteredModels.filter(m => m.weekday === day).length;
  const getDaySlotCount = (day: Weekday) => getSlotsByWeekday(day).length;

  // Summary stats
  const summaryStats = useMemo(() => {
    if (!allFiltersSelected || filteredSubjects.length === 0) return null;
    
    const totalRequired = filteredSubjects.reduce((sum, s) => sum + s.carga_horaria_semanal, 0);
    const totalAllocated = semesterFilteredModels.filter(m => {
      const subj = subjects.find(s => s.id === m.subject_id);
      return subj && (subj.semester === semesterFilter || subj.semester === 'ANNUAL');
    }).length;
    const completedSubjects = filteredSubjects.filter(s => {
      const count = semesterFilteredModels.filter(m => m.subject_id === s.id).length;
      return count >= s.carga_horaria_semanal;
    }).length;

    return { totalRequired, totalAllocated, completedSubjects, totalSubjects: filteredSubjects.length };
  }, [allFiltersSelected, filteredSubjects, semesterFilteredModels, subjects, semesterFilter]);

  // Step indicator
  const currentStep = !selectedSchoolId ? 1 : !selectedCourseId ? 2 : !selectedClassGroupId ? 3 : !semesterFilter ? 4 : 5;

  return (
    <div className="space-y-4">
      {/* Header */}
      {!embedded && (
        <>
          <PageHeader
            breadcrumbs={[
              { label: 'Grade Horária', href: '/grade-horaria' },
              { label: 'Horários da Escola' },
            ]}
            title="Horários da Escola"
            description="Configure os tempos de aula e aloque disciplinas — um semestre por vez"
            backTo="/grade-horaria"
          />
        </>
      )}

      {/* Filters — step-by-step with visual guidance */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                {currentStep === 1 && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                1. Escola
              </Label>
              <SearchableSelect
                value={selectedSchoolId || ''}
                onValueChange={handleSchoolChange}
                placeholder="Selecione a escola..."
                searchPlaceholder="Buscar escola..."
                triggerClassName={!selectedSchoolId ? 'border-primary/50' : ''}
                options={schools.map(s => ({ value: s.id, label: s.nome ?? '' }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                {currentStep === 2 && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                2. Curso
              </Label>
              <SearchableSelect
                value={selectedCourseId || ''}
                onValueChange={handleCourseChange}
                disabled={!selectedSchoolId}
                placeholder={!selectedSchoolId ? '—' : 'Selecione o curso...'}
                searchPlaceholder="Buscar curso..."
                triggerClassName={selectedSchoolId && !selectedCourseId ? 'border-primary/50' : ''}
                options={courses.map(c => ({ value: c.id, label: c.nome ?? '' }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                {currentStep === 3 && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                3. Turma
              </Label>
              <SearchableSelect
                value={selectedClassGroupId || ''}
                onValueChange={handleClassGroupChange}
                disabled={!selectedCourseId}
                placeholder={!selectedCourseId ? '—' : 'Selecione a turma...'}
                searchPlaceholder="Buscar turma..."
                triggerClassName={selectedCourseId && !selectedClassGroupId ? 'border-primary/50' : ''}
                options={classGroups.map(cg => ({ value: cg.id, label: cg.nome ?? '' }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                {currentStep === 4 && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                4. Semestre
              </Label>
              <Select
                value={semesterFilter || ''}
                onValueChange={(v) => setSemesterFilter(v as SubjectSemester)}
                disabled={!selectedClassGroupId}
              >
                <SelectTrigger className={selectedClassGroupId && !semesterFilter ? 'border-primary/50' : ''}>
                  <SelectValue placeholder={!selectedClassGroupId ? '—' : 'Selecione o semestre...'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIRST">1º Semestre</SelectItem>
                  <SelectItem value="SECOND">2º Semestre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empty state with step guidance */}
      {currentStep < 5 && (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">
            {currentStep === 1 && 'Selecione uma escola para começar'}
            {currentStep === 2 && 'Agora selecione o curso'}
            {currentStep === 3 && 'Selecione a turma'}
            {currentStep === 4 && 'Selecione o semestre para alocar disciplinas'}
          </p>
          <p className="text-xs mt-1">Passo {currentStep} de 4</p>
        </div>
      )}

      {/* Main content — only when all filters selected */}
      {currentStep === 5 && selectedSchoolId && (
        <>
          {/* Progress stats */}
          {summaryStats && (
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-muted/30">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold">{summaryStats.totalAllocated}/{summaryStats.totalRequired}</div>
                  <div className="text-xs text-muted-foreground">Aulas alocadas</div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold">{summaryStats.completedSubjects}/{summaryStats.totalSubjects}</div>
                  <div className="text-xs text-muted-foreground">Disciplinas completas</div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold">
                    {SEMESTER_LABELS[semesterFilter!]}
                  </div>
                  <div className="text-xs text-muted-foreground">Semestre selecionado</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Day selector */}
          <div className="flex items-center gap-1.5">
            {WEEKDAYS.map(day => {
              const slotCount = getDaySlotCount(day);
              const allocCount = getDayAllocCount(day);
              const isFull = slotCount > 0 && allocCount === slotCount;
              return (
                <Button
                  key={day}
                  variant={selectedDay === day ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDay(day)}
                  className="flex-1 gap-1.5 relative"
                >
                  {WEEKDAY_SHORT[day]}
                  {slotCount > 0 && (
                    <Badge
                      variant={selectedDay === day ? 'secondary' : 'outline'}
                      className={`h-5 px-1.5 text-[10px] ${isFull && selectedDay !== day ? 'bg-green-100 text-green-700 border-green-200' : ''}`}
                    >
                      {allocCount}/{slotCount}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>

          {/* Mode toolbar: Presencial / ANP + config button */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Próxima alocação será:</Label>
              <ToggleGroup
                type="single"
                value={assignMode}
                onValueChange={(v) => v && setAssignMode(v as 'PRESENCIAL' | 'ANP')}
                size="sm"
              >
                <ToggleGroupItem value="PRESENCIAL" className="gap-1.5 text-xs h-8">
                  <MapPin className="h-3.5 w-3.5" />
                  Presencial
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="ANP"
                  className="gap-1.5 text-xs h-8 data-[state=on]:bg-amber-100 data-[state=on]:text-amber-900 dark:data-[state=on]:bg-amber-950/40 dark:data-[state=on]:text-amber-200"
                >
                  <Wifi className="h-3.5 w-3.5" />
                  ANP
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalityDialogOpen(true)}
              className="gap-1.5"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Configurar Pres/ANP
              {modalityRows.some((r) => r.ch_anp > 0) && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  ANP ativo
                </Badge>
              )}
            </Button>
          </div>

          {/* Slots list for selected day */}
          <Card>
            <CardContent className="pt-4 pb-3 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">
                  {WEEKDAY_OPTIONS.find(w => w.value === selectedDay)?.label}
                  {currentDaySlots.length > 0 && (
                    <span className="text-muted-foreground font-normal ml-2">
                      ({currentDaySlots.length} {currentDaySlots.length === 1 ? 'tempo' : 'tempos'})
                    </span>
                  )}
                </h3>
              </div>

              {currentDaySlots.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                  <Clock className="h-7 w-7 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhum horário padrão configurado para este dia</p>
                  <p className="text-xs mt-1">Configure os horários padrão na página de Escolas</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-1.5"
                    onClick={() => selectedSchoolId && navigate(`/escolas/${selectedSchoolId}/horarios`)}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Configurar horários padrão
                  </Button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {currentDaySlots.map(slot => {
                    const model = getSlotModel(slot);
                    const allocatedSubject = model ? subjects.find(s => s.id === model.subject_id) : null;
                    const isPlanning = model?.schedule_type === 'PLANNING';

                    const isAnp = (model?.class_mode || 'PRESENCIAL') === 'ANP';
                    return (
                      <div
                        key={slot.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                          model
                            ? isPlanning
                              ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/20 dark:border-amber-800'
                              : isAnp
                                ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/20 dark:border-amber-800'
                                : 'bg-primary/5 border-primary/20'
                            : 'bg-muted/20 border-dashed border-muted-foreground/20 hover:border-muted-foreground/40'
                        }`}
                      >

                        {/* Time */}
                        <div className="shrink-0 text-center min-w-[72px]">
                          <div className="text-[10px] font-medium text-muted-foreground uppercase">{slot.slot_label}</div>
                          <div className="text-sm font-mono leading-tight">
                            {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                          </div>
                        </div>

                        <Separator orientation="vertical" className="h-8" />

                        {/* Subject allocation */}
                        <div className="flex-1 min-w-0">
                          {model && isPlanning ? (
                            <div className="flex items-center gap-2">
                              <ClipboardList className="h-4 w-4 shrink-0 text-amber-600" />
                              <div className="min-w-0 flex-1">
                                <span className="font-medium text-sm truncate block text-amber-800">Planejamento</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <Badge className="text-[10px] h-4 px-1 bg-amber-500 hover:bg-amber-500 text-white border-0">PL</Badge>
                                  {model.professor_name && (
                                    <span className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {model.professor_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : model && allocatedSubject ? (

                            <div className="flex items-center gap-2">
                              {isAnp ? (
                                <Wifi className="h-4 w-4 shrink-0 text-amber-600" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                              )}
                              <div className="min-w-0 flex-1">
                                <span className="font-medium text-sm truncate block">{allocatedSubject.nome}</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <Badge variant="outline" className="text-[10px] h-4 px-1">
                                    {SEMESTER_LABELS[allocatedSubject.semester]}
                                  </Badge>
                                  {isAnp && (
                                    <Badge className="text-[10px] h-4 px-1 bg-amber-500 hover:bg-amber-500 text-white border-0">
                                      ANP
                                    </Badge>
                                  )}
                                  {model.professor_name ? (
                                    <span className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {model.professor_name}
                                    </span>
                                  ) : (
                                    <Select
                                      value=""
                                      onValueChange={(profId) => handleAssignProfessor(model.id, profId)}
                                    >
                                      <SelectTrigger className="h-5 text-[10px] border-dashed text-amber-600 w-auto min-w-[140px] px-1.5 gap-1">
                                        <User className="h-3 w-3" />
                                        <SelectValue placeholder="Vincular professor..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {professors.length === 0 ? (
                                          <div className="p-2 text-xs text-muted-foreground text-center">
                                            Nenhum professor vinculado a este curso
                                          </div>
                                        ) : (
                                          professors.map(p => (
                                            <SelectItem key={p.id} value={p.id} className="text-xs">
                                              {p.full_name}
                                            </SelectItem>
                                          ))
                                        )}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <Select
                              value=""
                              onValueChange={(subjectId) => handleAssignSubject(subjectId, slot)}
                              disabled={isAssigning}
                            >
                              <SelectTrigger className="h-8 text-xs border-dashed text-muted-foreground">
                                <SelectValue placeholder="Selecionar disciplina..." />
                              </SelectTrigger>
                              <SelectContent>
                                {filteredSubjects.length === 0 ? (
                                  <div className="p-2 text-xs text-muted-foreground text-center">
                                    Nenhuma disciplina para este semestre
                                  </div>
                                ) : (
                                  filteredSubjects.map(s => {
                                    const cfg = semesterFilter ? getModalityConfig(s.id, semesterFilter) : null;
                                    const presCount = semesterFilteredModels.filter(m => m.subject_id === s.id && (m.class_mode || 'PRESENCIAL') === 'PRESENCIAL').length;
                                    const anpCount = semesterFilteredModels.filter(m => m.subject_id === s.id && m.class_mode === 'ANP').length;
                                    const totalCount = presCount + anpCount;
                                    const limit = cfg
                                      ? (assignMode === 'ANP' ? cfg.ch_anp : cfg.ch_presencial)
                                      : s.carga_horaria_semanal;
                                    const currentForMode = assignMode === 'ANP' ? anpCount : presCount;
                                    const isFullForMode = currentForMode >= limit;
                                    return (
                                      <SelectItem key={s.id} value={s.id} className="text-xs" disabled={isFullForMode}>
                                        <div className="flex items-center gap-2 w-full">
                                          <span className={isFullForMode ? 'text-muted-foreground line-through' : ''}>{s.nome}</span>
                                          {cfg && cfg.ch_anp > 0 ? (
                                            <span className="ml-auto flex items-center gap-1 shrink-0">
                                              <Badge variant="outline" className="text-[9px] h-3.5 px-1">
                                                P {presCount}/{cfg.ch_presencial}
                                              </Badge>
                                              <Badge className="text-[9px] h-3.5 px-1 bg-amber-500 hover:bg-amber-500 text-white border-0">
                                                ANP {anpCount}/{cfg.ch_anp}
                                              </Badge>
                                            </span>
                                          ) : (
                                            <Badge variant="outline" className="text-[9px] h-3.5 px-1 ml-auto shrink-0">
                                              {totalCount}/{s.carga_horaria_semanal}
                                            </Badge>
                                          )}
                                        </div>
                                      </SelectItem>
                                    );
                                  })
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        </div>

                        {/* Remove action */}
                        {model && (
                          <div className="flex items-center gap-1 shrink-0">
                            {isPlanning && (
                              <PlanningObservationButton
                                model={{
                                  id: model.id,
                                  schedule_type: 'PLANNING',
                                  observation: model.observation ?? null,
                                  subject_name: 'Planejamento',
                                  professor_name: model.professor_name,
                                }}
                                onSaved={(obs) => setExistingModels(prev => prev.map(m => m.id === model.id ? { ...m, observation: obs } : m))}
                              />
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveAssignment(model.id)}
                              title="Remover alocação"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}

            </CardContent>
          </Card>

          {/* Summary table */}
          {filteredSubjects.length > 0 && (
            <Card>
              <CardContent className="pt-4 pb-3">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Resumo — {SEMESTER_LABELS[semesterFilter!]}
                  <Badge variant="outline" className="text-xs">{filteredSubjects.length} disciplina(s)</Badge>
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2">Disciplina</th>
                        {WEEKDAYS.map(day => (
                          <th key={day} className="text-center p-2 w-10">{WEEKDAY_SHORT[day]}</th>
                        ))}
                        <th className="text-center p-2 w-16">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubjects.map(subject => {
                        const subjectModels = semesterFilteredModels.filter(m => m.subject_id === subject.id);
                        const totalAlloc = subjectModels.length;
                        const isFull = totalAlloc >= subject.carga_horaria_semanal;
                        return (
                          <tr key={subject.id} className={`border-t ${isFull ? 'bg-green-50/50' : ''}`}>
                            <td className="p-2">
                              <span className="font-medium">{subject.nome}</span>
                            </td>
                            {WEEKDAYS.map(day => {
                              const count = subjectModels.filter(m => m.weekday === day).length;
                              return (
                                <td key={day} className="text-center p-2">
                                  {count > 0 ? (
                                    <Badge variant="default" className="text-[10px] h-5 w-5 p-0 justify-center">
                                      {count}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground/30">—</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="text-center p-2">
                              {isFull ? (
                                <Badge className="text-xs bg-green-600 gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {totalAlloc}/{subject.carga_horaria_semanal}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {totalAlloc}/{subject.carga_horaria_semanal}
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 pb-4">
            <Button
              variant="outline"
              onClick={() => navigate('/grade-horaria')}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                toast.success('Horários salvos com sucesso!');
                navigate('/grade-horaria');
              }}
            >
              Salvar
            </Button>
          </div>
        </>
      )}

      <ClassModalityConfigDialog
        open={modalityDialogOpen}
        onOpenChange={setModalityDialogOpen}
        classGroupId={selectedClassGroupId}
        classGroupName={classGroups.find(cg => cg.id === selectedClassGroupId)?.nome}
        onSaved={() => {
          refetchModality();
          fetchExistingModels();
        }}
      />

      <ScheduleConflictModal
        open={conflictModal.open}
        onOpenChange={(open) => setConflictModal((s) => ({ ...s, open }))}
        conflicts={conflictModal.items}
        context="admin"
        onApplyAction={() => setConflictModal((s) => ({ ...s, open: false }))}
        hint="Escolha outro professor ou libere o horário na outra escola."
      />
    </div>
  );
}
