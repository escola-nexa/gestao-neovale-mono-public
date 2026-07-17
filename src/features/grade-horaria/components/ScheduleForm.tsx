import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Info, BookOpen, ClipboardList } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { gradeHorariaApi } from '@/features/grade-horaria/api';
import { fetchSchoolsWithCourses } from '@/lib/schoolsWithCourses';
import { useOrganization } from '@/hooks/useOrganization';
import { useSchoolTimeSlots, type SchoolTimeSlot } from '../hooks/useSchoolTimeSlots';
import { WEEKDAY_OPTIONS, type Weekday } from '@/types/academic';
import { SEMESTER_LABELS, type SubjectSemester } from '@/hooks/useSemester';
import type { ScheduleType } from '../hooks/useWeeklySchedule';

interface ScheduleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (entries: Array<{
    professor_id?: string | null;
    school_id: string;
    course_id: string;
    class_group_id?: string | null;
    subject_id?: string | null;
    schedule_type: ScheduleType;
    weekday: Weekday;
    start_time: string;
    end_time: string;
    school_time_slot_id?: string;
  }>) => Promise<void>;
}

interface SelectedSlotEntry {
  slot: SchoolTimeSlot;
  weekday: Weekday;
}

interface FilterOption {
  id: string;
  nome?: string;
  full_name?: string;
  semester?: SubjectSemester;
}

export function ScheduleForm({ open, onOpenChange, onSave }: ScheduleFormProps) {
  const { organization } = useOrganization();
  const [scheduleType, setScheduleType] = useState<ScheduleType>('CLASS');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: School
  const [schools, setSchools] = useState<FilterOption[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);

  // Step 2: Weekday + Slot selection
  const [selectedWeekday, setSelectedWeekday] = useState<Weekday | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<SelectedSlotEntry[]>([]);

  // Step 3: Course
  const [courses, setCourses] = useState<FilterOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Step 4: Class Group
  const [classGroups, setClassGroups] = useState<FilterOption[]>([]);
  const [selectedClassGroupId, setSelectedClassGroupId] = useState<string | null>(null);

  // Step 5: Subject
  const [subjects, setSubjects] = useState<(FilterOption & { semester?: SubjectSemester })[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedSubjectSemester, setSelectedSubjectSemester] = useState<SubjectSemester | null>(null);

  // Step 6: Professor
  const [professors, setProfessors] = useState<FilterOption[]>([]);
  const [selectedProfessorId, setSelectedProfessorId] = useState<string | null>(null);

  const { slots: timeSlots, getSlotsByWeekday } = useSchoolTimeSlots(selectedSchoolId);

  // Load schools
  useEffect(() => {
    if (!organization?.id || !open) return;
    const load = async () => {
      const data = await fetchSchoolsWithCourses({ organizationId: organization.id });
      setSchools(data);
    };
    load();
  }, [organization?.id, open]);

  // Load courses when school changes (via course_schools)
  useEffect(() => {
    if (!organization?.id || !selectedSchoolId) {
      setCourses([]);
      return;
    }
    const load = async () => {
      const { data: cs } = await supabase
        .from('course_schools')
        .select('course_id')
        .eq('school_id', selectedSchoolId);
      
      const courseIds = [...new Set((cs || []).map(c => c.course_id))];
      if (courseIds.length === 0) { setCourses([]); return; }

      const { data } = await supabase
        .from('courses')
        .select('id, nome')
        .in('id', courseIds)
        .eq('organization_id', organization.id)
        .eq('status', 'ativo')
        .order('nome');
      setCourses(data || []);
    };
    load();
  }, [organization?.id, selectedSchoolId]);

  // Load class groups when school + course set
  useEffect(() => {
    if (!selectedSchoolId || !selectedCourseId) {
      setClassGroups([]);
      return;
    }
    const load = async () => {
      const { data } = await supabase
        .from('class_groups')
        .select('id, nome')
        .eq('school_id', selectedSchoolId)
        .eq('course_id', selectedCourseId)
        .eq('status', 'ativo')
        .order('nome');
      setClassGroups(data || []);
    };
    load();
  }, [selectedSchoolId, selectedCourseId]);

  // Load subjects when course set
  useEffect(() => {
    if (!selectedCourseId) {
      setSubjects([]);
      return;
    }
    const load = async () => {
      const { data } = await supabase
        .from('subjects')
        .select('id, nome, semester')
        .eq('course_id', selectedCourseId)
        .eq('status', 'ativo')
        .is('deleted_at', null)
        .order('nome');
      setSubjects((data || []).map(d => ({ ...d, semester: d.semester as SubjectSemester })));
    };
    load();
  }, [selectedCourseId]);

  // Load professors filtered by school + course bindings
  useEffect(() => {
    if (!selectedSchoolId || !selectedCourseId) {
      setProfessors([]);
      return;
    }
    const load = async () => {
      const { data: bindings } = await supabase
        .from('professor_school_courses')
        .select('professor_id')
        .eq('school_id', selectedSchoolId)
        .eq('course_id', selectedCourseId)
        .eq('status', 'ACTIVE');

      const profIds = [...new Set((bindings || []).map(b => b.professor_id))];
      if (profIds.length === 0) { setProfessors([]); return; }

      const { data } = await supabase
        .from('professors')
        .select('id, full_name')
        .in('id', profIds)
        .eq('status', 'ACTIVE')
        .is('deleted_at', null)
        .order('full_name');
      setProfessors(data || []);
    };
    load();
  }, [selectedSchoolId, selectedCourseId]);

  const handleSchoolChange = (id: string) => {
    setSelectedSchoolId(id);
    setSelectedWeekday(null);
    setSelectedEntries([]);
    setSelectedCourseId(null);
    setSelectedClassGroupId(null);
    setSelectedSubjectId(null);
    setSelectedSubjectSemester(null);
    setSelectedProfessorId(null);
  };

  const handleCourseChange = (id: string) => {
    setSelectedCourseId(id);
    setSelectedClassGroupId(null);
    setSelectedSubjectId(null);
    setSelectedSubjectSemester(null);
    setSelectedProfessorId(null);
  };

  const handleSubjectChange = (id: string) => {
    setSelectedSubjectId(id);
    const subject = subjects.find(s => s.id === id);
    setSelectedSubjectSemester(subject?.semester || null);
  };

  const handleAddSlotEntry = (slot: SchoolTimeSlot) => {
    if (!selectedWeekday) return;
    const exists = selectedEntries.some(e => e.slot.id === slot.id);
    if (exists) {
      toast.error('Este horário já foi adicionado');
      return;
    }
    setSelectedEntries(prev => [...prev, { slot, weekday: selectedWeekday }]);
  };

  const handleRemoveEntry = (index: number) => {
    setSelectedEntries(prev => prev.filter((_, i) => i !== index));
  };

  // Professor is optional for CLASS, required for PLANNING
  const isSelectionComplete = Boolean(
    selectedSchoolId && selectedCourseId && selectedClassGroupId && selectedSubjectId &&
    (scheduleType === 'CLASS' || selectedProfessorId)
  );

  const handleSubmit = async () => {
    if (!isSelectionComplete) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (selectedEntries.length === 0) {
      toast.error('Selecione pelo menos um horário');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = selectedEntries.map(entry => ({
        professor_id: selectedProfessorId || null,
        school_id: selectedSchoolId!,
        course_id: selectedCourseId!,
        class_group_id: selectedClassGroupId!,
        subject_id: selectedSubjectId!,
        schedule_type: scheduleType,
        weekday: entry.weekday,
        start_time: entry.slot.start_time,
        end_time: entry.slot.end_time,
        school_time_slot_id: entry.slot.id,
      }));

      await onSave(data);
      handleClose();
      toast.success(`${selectedEntries.length} horário(s) cadastrado(s)`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar horários');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedSchoolId(null);
    setSelectedWeekday(null);
    setSelectedEntries([]);
    setSelectedCourseId(null);
    setSelectedClassGroupId(null);
    setSelectedSubjectId(null);
    setSelectedSubjectSemester(null);
    setSelectedProfessorId(null);
    setScheduleType('CLASS');
    onOpenChange(false);
  };

  const currentWeekdaySlots = selectedWeekday ? getSlotsByWeekday(selectedWeekday) : [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Cadastrar Horário</DialogTitle>
          <DialogDescription>
            Selecione a escola, os horários e o contexto acadêmico
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-5">
            {/* Schedule Type */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Tipo de Horário</label>
              <RadioGroup
                value={scheduleType}
                onValueChange={(v: ScheduleType) => {
                  setScheduleType(v);
                  setSelectedEntries([]);
                }}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="CLASS" id="class" />
                  <Label htmlFor="class" className="flex items-center gap-2 cursor-pointer">
                    <div className="p-1.5 rounded bg-primary/10 text-primary">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Aula</div>
                      <div className="text-xs text-muted-foreground">Ocorrências de aula</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PLANNING" id="planning" />
                  <Label htmlFor="planning" className="flex items-center gap-2 cursor-pointer">
                    <div className="p-1.5 rounded bg-amber-500/10 text-amber-600">
                      <ClipboardList className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Planejamento</div>
                      <div className="text-xs text-muted-foreground">Janela de planejamento</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Step 1: School */}
            <div className="space-y-2">
              <label className="text-sm font-medium">1. Escola</label>
              <SearchableSelect
                value={selectedSchoolId || ''}
                onValueChange={handleSchoolChange}
                placeholder="Selecione a escola"
                searchPlaceholder="Buscar escola..."
                options={schools.map(s => ({ value: s.id, label: s.nome ?? '' }))}
              />
            </div>

            {/* Step 2: Weekday + Slot */}
            {selectedSchoolId && (
              <div className="space-y-3">
                <label className="text-sm font-medium">2. Dia e Horário</label>
                
                {timeSlots.length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Esta escola não possui horários configurados. 
                      Acesse "Gerenciar Horários da Escola" para definir os slots.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAY_OPTIONS.map(({ value, label }) => {
                        const count = getSlotsByWeekday(value as Weekday).length;
                        return (
                          <Button
                            key={value}
                            variant={selectedWeekday === value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedWeekday(value as Weekday)}
                            disabled={count === 0}
                            className="gap-1.5"
                          >
                            {label.split('-')[0].trim()}
                            {count > 0 && (
                              <Badge variant="secondary" className="h-5 px-1 text-xs">{count}</Badge>
                            )}
                          </Button>
                        );
                      })}
                    </div>

                    {selectedWeekday && currentWeekdaySlots.length > 0 && (
                      <div className="grid gap-2">
                        {currentWeekdaySlots.map(slot => {
                          const isSelected = selectedEntries.some(e => e.slot.id === slot.id);
                          return (
                            <Button
                              key={slot.id}
                              variant={isSelected ? 'default' : 'outline'}
                              className="justify-start h-auto py-2 px-3"
                              onClick={() => isSelected 
                                ? handleRemoveEntry(selectedEntries.findIndex(e => e.slot.id === slot.id))
                                : handleAddSlotEntry(slot)
                              }
                            >
                              <Badge variant="outline" className="mr-2">{slot.slot_number}</Badge>
                              <span className="font-medium">{slot.slot_label || `${slot.slot_number}ª Aula`}</span>
                              <span className="ml-auto text-xs opacity-70">
                                {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                              </span>
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Selected entries summary */}
            {selectedEntries.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Horários selecionados ({selectedEntries.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedEntries.map((entry, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      {WEEKDAY_OPTIONS.find(w => w.value === entry.weekday)?.label.slice(0, 3)} {entry.slot.start_time.slice(0, 5)}-{entry.slot.end_time.slice(0, 5)}
                      <Button variant="ghost" size="icon" className="h-4 w-4 ml-1" onClick={() => handleRemoveEntry(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedSchoolId && selectedEntries.length > 0 && (
              <>
                <Separator />

                {/* Step 3-6: Course, ClassGroup, Subject, Professor */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">3. Curso</label>
                    <SearchableSelect
                      value={selectedCourseId || ''}
                      onValueChange={handleCourseChange}
                      placeholder="Selecione o curso"
                      searchPlaceholder="Buscar curso..."
                      options={courses.map(c => ({ value: c.id, label: c.nome ?? '' }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">4. Turma</label>
                    <SearchableSelect
                      value={selectedClassGroupId || ''}
                      onValueChange={setSelectedClassGroupId}
                      disabled={!selectedCourseId}
                      placeholder={!selectedCourseId ? 'Selecione o curso' : 'Selecione a turma'}
                      searchPlaceholder="Buscar turma..."
                      options={classGroups.map(cg => ({ value: cg.id, label: cg.nome ?? '' }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">5. Disciplina</label>
                      {selectedSubjectSemester && (
                        <Badge variant={selectedSubjectSemester === 'FIRST' ? 'default' : 'secondary'}>
                          {SEMESTER_LABELS[selectedSubjectSemester]}
                        </Badge>
                      )}
                    </div>
                    <SearchableSelect
                      value={selectedSubjectId || ''}
                      onValueChange={handleSubjectChange}
                      disabled={!selectedCourseId}
                      placeholder={!selectedCourseId ? 'Selecione o curso' : 'Selecione a disciplina'}
                      searchPlaceholder="Buscar disciplina..."
                      options={subjects.map(s => ({
                        value: s.id,
                        label: s.nome ?? '',
                        description: s.semester ? SEMESTER_LABELS[s.semester] : undefined,
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      6. Professor {scheduleType === 'CLASS' && <span className="text-muted-foreground text-xs">(opcional)</span>}
                    </label>
                    <SearchableSelect
                      value={selectedProfessorId || ''}
                      onValueChange={setSelectedProfessorId}
                      disabled={!selectedCourseId}
                      placeholder={!selectedCourseId ? 'Selecione o curso' : 'Selecione o professor'}
                      searchPlaceholder="Buscar professor..."
                      options={professors.map(p => ({ value: p.id, label: p.full_name ?? '' }))}
                    />
                    {scheduleType === 'CLASS' && !selectedProfessorId && selectedCourseId && (
                      <p className="text-xs text-muted-foreground">
                        O professor pode ser vinculado posteriormente
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Info alerts */}
            {selectedSubjectSemester && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  As ocorrências serão geradas apenas no{' '}
                  <strong>{SEMESTER_LABELS[selectedSubjectSemester]}</strong>.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedEntries.length === 0 || !isSelectionComplete}
            className={scheduleType === 'PLANNING' ? 'bg-amber-600 hover:bg-amber-700' : ''}
          >
            {isSubmitting ? 'Salvando...' : `Salvar ${selectedEntries.length} Horário(s)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
