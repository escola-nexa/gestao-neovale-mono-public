import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Filter, X, ChevronDown } from 'lucide-react';
import { schoolsApi, SchoolData, coursesApi, CourseData, classGroupsApi, ClassGroupData } from '@/services/supabaseApi';
import { professorsApi } from '@/features/professores/api';
import type { ProfessorData } from '@/features/professores/types';
import { useProfessorId } from '@/hooks/useProfessorId';
import { supabase } from '@/integrations/supabase/client';
import { fetchSchoolsWithCourses } from '@/lib/schoolsWithCourses';

export interface PlanningFiltersState {
  schoolId: string;
  courseId: string;
  classGroupId: string;
  professorId: string;
  startDate: string;
  endDate: string;
  status: string;
}

const PRE_PLANNING_STATUSES = [
  { value: 'GERADO', label: 'Gerado' },
  { value: 'EM_EDICAO', label: 'Em Edição' },
  { value: 'DISPONIVEL', label: 'Disponível' },
];

const TEACHER_PLANNING_STATUSES = [
  { value: 'DRAFT', label: 'Em edição' },
  { value: 'ENVIADO', label: 'Enviado para coordenação' },
  { value: 'DEVOLVIDO', label: 'Devolvido' },
  { value: 'AGUARDANDO_ASSINATURA', label: 'Aguardando assinatura do professor' },
  { value: 'AGUARDANDO_ASSINATURA_COORDENADOR', label: 'Aguardando assinatura do coordenador' },
  { value: 'ASSINADO', label: 'Assinado' },
];

const ALL_STATUSES = [
  { group: 'Pré-Planejamento', items: PRE_PLANNING_STATUSES },
  { group: 'Planejamento do Professor', items: TEACHER_PLANNING_STATUSES },
];

interface PlanningFiltersProps {
  filters: PlanningFiltersState;
  onFiltersChange: (filters: PlanningFiltersState) => void;
  showProfessorFilter?: boolean;
}

export function PlanningFilters({ filters, onFiltersChange, showProfessorFilter = true }: PlanningFiltersProps) {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroupData[]>([]);
  const [professors, setProfessors] = useState<ProfessorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const { professorId, isProfessor, isLoading: isProfessorLoading } = useProfessorId();

  // Store professor bindings for filtering
  const [professorBindings, setProfessorBindings] = useState<{ school_id: string; course_id: string }[]>([]);

  useEffect(() => {
    if (isProfessorLoading) return;
    loadInitialData();
  }, [isProfessorLoading, professorId]);

  useEffect(() => {
    if (isProfessorLoading) return;
    if (filters.schoolId) {
      loadCoursesBySchool(filters.schoolId);
    } else if (isProfessor && professorBindings.length > 0) {
      // Show only courses from bindings
      loadCoursesFromBindings();
    } else {
      loadAllCourses();
    }
  }, [filters.schoolId, professorBindings]);

  useEffect(() => {
    if (filters.schoolId && filters.courseId) {
      loadClassGroups(filters.schoolId, filters.courseId);
    } else {
      setClassGroups([]);
    }
  }, [filters.schoolId, filters.courseId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      if (isProfessor && professorId) {
        // Load professor bindings first
        const { data: bindings } = await supabase
          .from('professor_school_courses')
          .select('school_id, course_id')
          .eq('professor_id', professorId)
          .eq('status', 'ACTIVE')
          .not('course_id', 'is', null);

        const activeBindings = bindings || [];
        setProfessorBindings(activeBindings);

        // Get unique school IDs from bindings
        const schoolIds = [...new Set(activeBindings.map(b => b.school_id))];
        const courseIds = [...new Set(activeBindings.map(b => b.course_id).filter((x): x is string => !!x))];

        // Load only bound schools
        const allSchools = await schoolsApi.getAll();
        const filteredSchools = allSchools.filter(s => schoolIds.includes(s.id));
        setSchools(filteredSchools);

        // Load only bound courses
        const allCourses = await coursesApi.getAll();
        const filteredCourses = allCourses.filter(c => courseIds.includes(c.id));
        setCourses(filteredCourses);
      } else {
        // Admin/coordinator: load everything (escolas só com cursos vinculados)
        const [schoolsData, coursesData, professorsData] = await Promise.all([
          fetchSchoolsWithCourses<SchoolData>({ select: '*', onlyActive: false }),
          coursesApi.getAll(),
          professorsApi.getAll(),
        ]);
        setSchools(schoolsData);
        setCourses(coursesData);
        setProfessors(professorsData);
      }
    } catch (error) {
      console.error('Error loading filter data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllCourses = async () => {
    try {
      const coursesData = await coursesApi.getAll();
      setCourses(coursesData);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadCoursesFromBindings = async () => {
    try {
      const courseIds = [...new Set(professorBindings.map(b => b.course_id))];
      const allCourses = await coursesApi.getAll();
      setCourses(allCourses.filter(c => courseIds.includes(c.id)));
    } catch (error) {
      console.error('Error loading courses from bindings:', error);
    }
  };

  const loadCoursesBySchool = async (schoolId: string) => {
    try {
      if (isProfessor && professorBindings.length > 0) {
        // Filter courses by school from bindings
        const courseIdsForSchool = professorBindings
          .filter(b => b.school_id === schoolId)
          .map(b => b.course_id);
        const uniqueCourseIds = [...new Set(courseIdsForSchool)];
        const allCourses = await coursesApi.getAll();
        setCourses(allCourses.filter(c => uniqueCourseIds.includes(c.id)));
      } else {
        const coursesData = await coursesApi.getBySchool(schoolId);
        setCourses(coursesData);
      }
    } catch (error) {
      console.error('Error loading courses by school:', error);
    }
  };

  const loadClassGroups = async (schoolId: string, courseId: string) => {
    try {
      const allGroups = await classGroupsApi.getAll();
      let filtered = allGroups.filter(
        (g) => g.school_id === schoolId && g.course_id === courseId
      );

      // For professors, further filter by class groups they actually teach
      if (isProfessor && professorId) {
        const { data: teachingModels } = await supabase
          .from('weekly_teaching_models')
          .select('class_group_id')
          .eq('professor_id', professorId)
          .eq('school_id', schoolId)
          .eq('course_id', courseId)
          .eq('status', 'ACTIVE')
          .eq('schedule_type', 'CLASS');

        if (teachingModels) {
          const classGroupIds = [...new Set(teachingModels.map(m => m.class_group_id).filter(Boolean))];
          filtered = filtered.filter(g => classGroupIds.includes(g.id));
        }
      }

      setClassGroups(filtered);
    } catch (error) {
      console.error('Error loading class groups:', error);
    }
  };

  const handleChange = (field: keyof PlanningFiltersState, value: string) => {
    const newFilters = { ...filters, [field]: value === 'all' ? '' : value };
    
    // Reset dependent fields
    if (field === 'schoolId') {
      newFilters.courseId = '';
      newFilters.classGroupId = '';
    }
    if (field === 'courseId') {
      newFilters.classGroupId = '';
    }
    
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    onFiltersChange({
      schoolId: '',
      courseId: '',
      classGroupId: '',
      professorId: '',
      startDate: '',
      endDate: '',
      status: '',
    });
  };

  const activeFilterCount = Object.values(filters).filter((v) => v !== '').length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="shadow-sm overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Filter className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold">Filtros</span>
              {activeFilterCount > 0 && (
                <Badge className="h-5 px-1.5 text-[10px] font-bold bg-primary">{activeFilterCount} ativo{activeFilterCount !== 1 ? 's' : ''}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); clearFilters(); }} className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              )}
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 border-t">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 pt-4">
              {/* Escola */}
              <div className="space-y-1.5">
                <Label htmlFor="school" className="text-xs font-medium text-muted-foreground">Escola</Label>
                <SearchableSelect
                  id="school"
                  value={filters.schoolId || 'all'}
                  onValueChange={(value) => handleChange('schoolId', value)}
                  disabled={loading}
                  placeholder="Todas"
                  searchPlaceholder="Buscar escola..."
                  triggerClassName="h-9"
                  options={[
                    { value: 'all', label: 'Todas' },
                    ...schools.map(s => ({ value: s.id, label: s.nome })),
                  ]}
                />
              </div>

              {/* Curso */}
              <div className="space-y-1.5">
                <Label htmlFor="course" className="text-xs font-medium text-muted-foreground">Curso</Label>
                <SearchableSelect
                  id="course"
                  value={filters.courseId || 'all'}
                  onValueChange={(value) => handleChange('courseId', value)}
                  disabled={loading}
                  placeholder="Todos"
                  searchPlaceholder="Buscar curso..."
                  triggerClassName="h-9"
                  options={[
                    { value: 'all', label: 'Todos' },
                    ...courses.map(c => ({ value: c.id, label: c.nome })),
                  ]}
                />
              </div>

              {/* Turma */}
              <div className="space-y-1.5">
                <Label htmlFor="classGroup" className="text-xs font-medium text-muted-foreground">Turma</Label>
                <SearchableSelect
                  id="classGroup"
                  value={filters.classGroupId || 'all'}
                  onValueChange={(value) => handleChange('classGroupId', value)}
                  disabled={loading || !filters.schoolId || !filters.courseId}
                  placeholder={!filters.schoolId || !filters.courseId ? 'Selecione escola e curso' : 'Todas'}
                  searchPlaceholder="Buscar turma..."
                  triggerClassName="h-9"
                  options={[
                    { value: 'all', label: 'Todas' },
                    ...classGroups.map(g => ({ value: g.id, label: g.nome })),
                  ]}
                />
              </div>

              {/* Professor - only for coordinators/admins */}
              {showProfessorFilter && !isProfessor && (
                <div className="space-y-1.5">
                  <Label htmlFor="professor" className="text-xs font-medium text-muted-foreground">Professor</Label>
                  <SearchableSelect
                    id="professor"
                    value={filters.professorId || 'all'}
                    onValueChange={(value) => handleChange('professorId', value)}
                    disabled={loading}
                    placeholder="Todos"
                    searchPlaceholder="Buscar professor..."
                    triggerClassName="h-9"
                    options={[
                      { value: 'all', label: 'Todos' },
                      ...professors.map(p => ({ value: p.id, label: p.full_name })),
                    ]}
                  />
                </div>
              )}

              {/* Data Início */}
              <div className="space-y-1.5">
                <Label htmlFor="startDate" className="text-xs font-medium text-muted-foreground">Data Início</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className="h-9"
                />
              </div>

              {/* Data Fim */}
              <div className="space-y-1.5">
                <Label htmlFor="endDate" className="text-xs font-medium text-muted-foreground">Data Fim</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  className="h-9"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-xs font-medium text-muted-foreground">Status</Label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value) => handleChange('status', value)}
                >
                  <SelectTrigger id="status" className="h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {ALL_STATUSES.map((group) => (
                      group.items.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
