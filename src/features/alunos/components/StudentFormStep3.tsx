import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Loader2, School, BookOpen, Users, AlertTriangle } from 'lucide-react';
import { alunosApi } from '@/features/alunos/api';

export interface EnrollmentFormData {
  schoolId: string;
  courseId: string;
  classGroupId: string;
  anoLetivo: string;
}

interface Props {
  schoolId: string;
  schoolName: string;
  enrollmentData: EnrollmentFormData;
  setEnrollmentData: (data: EnrollmentFormData) => void;
  preselectedClassGroupId?: string;
  onNoCourses?: () => void;
}

interface CourseOption { id: string; nome: string; codigo: string; }
interface ClassGroupOption { id: string; nome: string; }

export function StudentFormStep3({ schoolId, schoolName, enrollmentData, setEnrollmentData, preselectedClassGroupId, onNoCourses }: Props) {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [anoLetivo, setAnoLetivo] = useState('');
  const [isPreselected, setIsPreselected] = useState(false);
  const [hasNoCourses, setHasNoCourses] = useState(false);
  const [hasNoClassGroups, setHasNoClassGroups] = useState(false);

  // Load active calendar year + courses on mount, or auto-fill from preselected turma
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // Get active calendar year
        const calData = await alunosApi.getCalendarData(organizationId);
        
        const year = calData?.academic_year?.toString() || new Date().getFullYear().toString();
        setAnoLetivo(year);

        // If preselected class group, auto-fill everything
        if (preselectedClassGroupId) {
          const { data: cgData } = await supabase
            .from('class_groups')
            .select('id, nome, course_id, ano_letivo')
            .eq('id', preselectedClassGroupId)
            .single();

          if (cgData) {
            const { data: courseData } = await supabase
              .from('courses')
              .select('id, nome, codigo')
              .eq('id', cgData.course_id)
              .single();

            if (courseData) {
              setCourses([courseData]);
              setClassGroups([{ id: cgData.id, nome: cgData.nome }]);
              setIsPreselected(true);
              const anoFromCg = cgData.ano_letivo || year;
              setAnoLetivo(anoFromCg);
              setEnrollmentData({
                schoolId,
                anoLetivo: anoFromCg,
                courseId: cgData.course_id,
                classGroupId: cgData.id,
              });
            }
          }
          setLoading(false);
          return;
        }

        setEnrollmentData({ ...enrollmentData, schoolId, anoLetivo: year });

        // Get courses linked to this school
        const { data: csData } = await supabase
          .from('course_schools')
          .select('course_id')
          .eq('school_id', schoolId);
        
        const courseIds = (csData || []).map(c => c.course_id);
        
        if (courseIds.length > 0) {
          const { data: coursesData } = await supabase
            .from('courses')
            .select('id, nome, codigo')
            .in('id', courseIds)
            .eq('status', 'ativo')
            .order('nome');
          
          const coursesList = coursesData || [];
          setCourses(coursesList);

          if (coursesList.length === 0) {
            setHasNoCourses(true);
            onNoCourses?.();
          }

          // Auto-select if only 1 course
          if (coursesList.length === 1) {
            const cId = coursesList[0].id;
            setEnrollmentData({ ...enrollmentData, schoolId, anoLetivo: year, courseId: cId, classGroupId: '' });
            await loadClassGroups(cId, year);
          }
        } else {
          setHasNoCourses(true);
          onNoCourses?.();
        }
      } catch (e) {
        console.error('Error loading enrollment data:', e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [schoolId, preselectedClassGroupId]);

  const loadClassGroups = async (courseId: string, year: string) => {
    const { data } = await supabase
      .from('class_groups')
      .select('id, nome')
      .eq('school_id', schoolId)
      .eq('course_id', courseId)
      .eq('ano_letivo', year)
      .eq('status', 'ativo')
      .order('nome');
    
    const groups = data || [];
    setClassGroups(groups);

    // Auto-select if only 1 class
    if (groups.length === 1) {
      setEnrollmentData({
        ...enrollmentData,
        schoolId,
        anoLetivo: year,
        courseId,
        classGroupId: groups[0].id,
      });
    }
    return groups;
  };

  const handleCourseChange = async (courseId: string) => {
    setEnrollmentData({ ...enrollmentData, courseId, classGroupId: '' });
    setClassGroups([]);
    if (courseId) {
      await loadClassGroups(courseId, anoLetivo);
    }
  };

  const handleClassGroupChange = (classGroupId: string) => {
    setEnrollmentData({ ...enrollmentData, classGroupId });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando dados da matrícula...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
        <p className="text-sm text-primary font-medium">
          {isPreselected
            ? `O aluno será vinculado automaticamente à turma ${classGroups[0]?.nome || ''}.`
            : 'O aluno será automaticamente vinculado à turma selecionada abaixo.'}
        </p>
      </div>

      {/* School - read only */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <School className="h-4 w-4" /> Escola
        </Label>
        <Input value={schoolName} disabled className="bg-muted" />
      </div>

      {/* Ano Letivo - read only */}
      <div className="space-y-2">
        <Label>Ano Letivo</Label>
        <Input value={anoLetivo} disabled className="bg-muted" />
      </div>

      {/* Course */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" /> Curso {!isPreselected && '*'}
        </Label>
        {hasNoCourses ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Nenhum curso ativo vinculado a esta escola.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate(`/escolas/${schoolId}/cursos`)}>
              Ir para Cursos da Escola
            </Button>
          </div>
        ) : isPreselected ? (
          <Input value={`${courses[0]?.nome} (${courses[0]?.codigo})`} disabled className="bg-muted" />
        ) : (
          <SearchableSelect
            value={enrollmentData.courseId}
            onValueChange={handleCourseChange}
            placeholder="Selecione o curso"
            searchPlaceholder="Buscar curso..."
            options={courses.map(c => ({ value: c.id, label: `${c.nome} (${c.codigo})` }))}
          />
        )}
      </div>

      {/* Class Group */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Users className="h-4 w-4" /> Turma {!isPreselected && '*'}
        </Label>
        {isPreselected ? (
          <Input value={classGroups[0]?.nome || ''} disabled className="bg-muted" />
        ) : enrollmentData.courseId && classGroups.length === 0 ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Nenhuma turma ativa encontrada para este curso.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate(`/escolas/${schoolId}/turmas`)}>
              Ir para Turmas da Escola
            </Button>
          </div>
        ) : (
          <SearchableSelect
            value={enrollmentData.classGroupId}
            onValueChange={handleClassGroupChange}
            disabled={!enrollmentData.courseId}
            placeholder={enrollmentData.courseId ? "Selecione a turma" : "Selecione o curso primeiro"}
            searchPlaceholder="Buscar turma..."
            options={classGroups.map(cg => ({ value: cg.id, label: cg.nome }))}
          />
        )}
      </div>
    </div>
  );
}
