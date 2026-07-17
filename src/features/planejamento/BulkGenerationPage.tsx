import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, ArrowLeft, Calendar, CheckCircle2, XCircle, School, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { useSemester } from '@/hooks/useSemester';
import { supabase } from '@/integrations/supabase/client';
import { coursesApi, CourseData } from '@/services/supabaseApi';
import { PageHeader } from '@/components/PageHeader';
import { Sparkles } from 'lucide-react';

const BIMESTER_LABELS: Record<number, string> = {
  1: '1º Bimestre',
  2: '2º Bimestre',
  3: '3º Bimestre',
  4: '4º Bimestre',
};

interface SchoolOption {
  id: string;
  nome: string;
  alreadyGenerated: boolean;
}

interface SchoolResult {
  schoolId: string;
  schoolName: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  message?: string;
  created?: number;
  skipped?: number;
  details?: Array<{ professor_name: string; subject_name: string; week_number: number }>;
}

export default function BulkGenerationPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { organization } = useOrganization();
  const { currentSemester, semesterDateRanges } = useSemester();

  const [courseId, setCourseId] = useState('');
  const [bimester, setBimester] = useState<number | null>(null);

  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [schoolOptions, setSchoolOptions] = useState<SchoolOption[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<Set<string>>(new Set());

  const [generating, setGenerating] = useState(false);
  const [schoolResults, setSchoolResults] = useState<SchoolResult[]>([]);
  const [currentSchoolIndex, setCurrentSchoolIndex] = useState(-1);
  const [semesterBimesters, setSemesterBimesters] = useState<number[]>([]);
  const [generatedBimesters, setGeneratedBimesters] = useState<Set<number>>(new Set());
  const [loadingBimester, setLoadingBimester] = useState(false);

  // Detect semester bimesters from academic calendar
  useEffect(() => {
    const detectSemesterBimesters = async () => {
      if (!organization?.id) return;
      setLoadingBimester(true);
      try {
        const { data: calendar } = await supabase
          .from('academic_calendars')
          .select('id')
          .eq('organization_id', organization.id)
          .eq('status', 'ACTIVE')
          .maybeSingle();
        if (!calendar) { setLoadingBimester(false); return; }

        const { data: bimesters } = await supabase
          .from('academic_bimesters')
          .select('number, start_date, end_date')
          .eq('calendar_id', calendar.id)
          .order('number');
        if (!bimesters || bimesters.length === 0) { setLoadingBimester(false); return; }

        // Determine current semester based on currentSemester or date
        const today = new Date().toISOString().split('T')[0];
        const active = bimesters.find(b => today >= b.start_date && today <= b.end_date);
        const activeBimNumber = active?.number 
          || bimesters.find(b => today < b.start_date)?.number 
          || bimesters[bimesters.length - 1].number;

        // FIRST semester = bimesters 1,2; SECOND = bimesters 3,4
        const isFirstSemester = currentSemester === 'FIRST' || activeBimNumber <= 2;
        const semBims = isFirstSemester ? [1, 2] : [3, 4];
        const available = semBims.filter(n => bimesters.some(b => b.number === n));
        
        setSemesterBimesters(available);
        // Auto-select first bimester of semester
        if (available.length > 0 && !bimester) {
          setBimester(available[0]);
        }
      } finally {
        setLoadingBimester(false);
      }
    };
    detectSemesterBimesters();
    loadCourses();
  }, [organization?.id, currentSemester]);

  // Check which bimesters already have pre_plannings for the selected course
  useEffect(() => {
    const checkGeneratedBimesters = async () => {
      if (!courseId || semesterBimesters.length === 0) {
        setGeneratedBimesters(new Set());
        return;
      }
      const { data } = await supabase
        .from('pre_plannings')
        .select('bimester_number')
        .eq('course_id', courseId)
        .in('bimester_number', semesterBimesters)
        .is('deleted_at', null);
      
      const generated = new Set<number>();
      data?.forEach(p => { if (p.bimester_number) generated.add(p.bimester_number); });
      setGeneratedBimesters(generated);
    };
    checkGeneratedBimesters();
  }, [courseId, semesterBimesters]);

  // Load schools when course + bimester change
  useEffect(() => {
    if (courseId && bimester) {
      loadSchoolsForCourse(courseId, bimester);
    } else {
      setSchoolOptions([]);
      setSelectedSchoolIds(new Set());
    }
  }, [courseId, bimester]);

  const loadCourses = async () => {
    setLoadingCourses(true);
    try {
      const d = await coursesApi.getAll();
      setCourses(d.filter(c => c.status === 'ativo'));
    } finally {
      setLoadingCourses(false);
    }
  };

  const loadSchoolsForCourse = async (cId: string, bim: number) => {
    setLoadingSchools(true);
    setSelectedSchoolIds(new Set());
    try {
      // Get schools linked to this course
      const { data: courseSchools } = await supabase
        .from('course_schools')
        .select('school_id')
        .eq('course_id', cId);

      if (!courseSchools || courseSchools.length === 0) {
        setSchoolOptions([]);
        return;
      }

      const schoolIds = courseSchools.map(cs => cs.school_id);

      // Get school names
      const { data: schools } = await supabase
        .from('schools')
        .select('id, nome')
        .in('id', schoolIds)
        .eq('status', 'ativo')
        .order('nome');

      if (!schools || schools.length === 0) {
        setSchoolOptions([]);
        return;
      }

      // Check which schools already have active pre_plannings for this course+bimester
      const { data: existingPlannings } = await supabase
        .from('pre_plannings')
        .select('id, school_id')
        .eq('course_id', cId)
        .eq('bimester_number', bim)
        .is('deleted_at', null);

      // For schools with pre_plannings, check if they also have teacher_plannings linked
      const prePlanningIds = existingPlannings?.map(p => p.id) || [];
      let schoolsWithActivePlannings = new Set<string>();

      if (prePlanningIds.length > 0) {
        const { data: teacherPlannings } = await supabase
          .from('teacher_plannings')
          .select('pre_planning_id')
          .in('pre_planning_id', prePlanningIds);

        const prePlanningsWithTeacher = new Set(teacherPlannings?.map(tp => tp.pre_planning_id).filter(Boolean) || []);

        // A school is "already generated" only if it has pre_plannings WITH teacher_plannings
        existingPlannings?.forEach(p => {
          if (p.school_id && prePlanningsWithTeacher.has(p.id)) {
            schoolsWithActivePlannings.add(p.school_id);
          }
        });
      }

      const options: SchoolOption[] = schools.map(s => ({
        id: s.id,
        nome: s.nome,
        alreadyGenerated: schoolsWithActivePlannings.has(s.id),
      }));

      setSchoolOptions(options);

      // Auto-select schools that haven't been generated yet
      const autoSelect = new Set(options.filter(o => !o.alreadyGenerated).map(o => o.id));
      setSelectedSchoolIds(autoSelect);
    } finally {
      setLoadingSchools(false);
    }
  };

  const toggleSchool = (schoolId: string) => {
    setSelectedSchoolIds(prev => {
      const next = new Set(prev);
      if (next.has(schoolId)) next.delete(schoolId);
      else if (next.size < 5) next.add(schoolId);
      else {
        toast({ title: 'Máximo de 5 escolas por vez', variant: 'destructive' });
      }
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!organization?.id || !courseId || !bimester || selectedSchoolIds.size === 0) return;

    const schoolsToProcess = schoolOptions.filter(s => selectedSchoolIds.has(s.id));
    const results: SchoolResult[] = schoolsToProcess.map(s => ({
      schoolId: s.id,
      schoolName: s.nome,
      status: 'pending' as const,
    }));

    setSchoolResults(results);
    setGenerating(true);

    let totalCreated = 0;
    let totalErrors = 0;

    for (let i = 0; i < schoolsToProcess.length; i++) {
      const school = schoolsToProcess[i];
      setCurrentSchoolIndex(i);

      setSchoolResults(prev => prev.map((r, idx) =>
        idx === i ? { ...r, status: 'processing' } : r
      ));

      try {
        const response = await supabase.functions.invoke('generate-pre-plannings', {
          body: {
            organization_id: organization.id,
            course_id: courseId,
            school_id: school.id,
            bimester_number: bimester,
            reference_year: new Date().getFullYear(),
          },
        });

        if (response.error) throw new Error(response.error.message);

        if (response.data.success) {
          totalCreated += response.data.created || 0;
          setSchoolResults(prev => prev.map((r, idx) =>
            idx === i ? {
              ...r, status: 'success',
              message: `${response.data.created} semana(s) criada(s)`,
              created: response.data.created,
              skipped: response.data.skipped,
              details: response.data.details || [],
            } : r
          ));
        } else {
          totalErrors++;
          setSchoolResults(prev => prev.map((r, idx) =>
            idx === i ? { ...r, status: 'error', message: response.data.error || 'Erro desconhecido' } : r
          ));
        }
      } catch (error: any) {
        totalErrors++;
        setSchoolResults(prev => prev.map((r, idx) =>
          idx === i ? { ...r, status: 'error', message: error.message || 'Erro ao gerar' } : r
        ));
      }
    }

    setGenerating(false);
    setCurrentSchoolIndex(-1);

    if (totalCreated > 0) {
      toast({ title: `${totalCreated} semana(s) gerada(s) com sucesso!` });
    }
    if (totalErrors > 0) {
      toast({ title: `${totalErrors} escola(s) com erro`, variant: 'destructive' });
    }

    // Refresh school list and generated bimesters
    if (totalCreated > 0) {
      loadSchoolsForCourse(courseId, bimester!);
      // Re-check generated bimesters
      const { data } = await supabase
        .from('pre_plannings')
        .select('bimester_number')
        .eq('course_id', courseId)
        .in('bimester_number', semesterBimesters)
        .is('deleted_at', null);
      const generated = new Set<number>();
      data?.forEach(p => { if (p.bimester_number) generated.add(p.bimester_number); });
      setGeneratedBimesters(generated);
    }
  };

  // Build bimester options with sequential unlock logic
  const validBimesters = useMemo(() => {
    return semesterBimesters.map(num => {
      const isFirst = num === semesterBimesters[0]; // first bimester of semester
      const previousBim = num - 1;
      const canSelect = isFirst || generatedBimesters.has(previousBim);
      return {
        value: num,
        label: BIMESTER_LABELS[num] || `${num}º Bimestre`,
        disabled: !canSelect,
      };
    });
  }, [semesterBimesters, generatedBimesters]);

  const selectableSchools = schoolOptions.filter(s => !s.alreadyGenerated);
  const progressPercent = generating && schoolResults.length > 0
    ? Math.round(((currentSchoolIndex + 1) / schoolResults.length) * 100)
    : 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader
        breadcrumbs={[
          { label: 'Pedagógico' },
          { label: 'Planejamento', href: '/planejamento' },
          { label: 'Geração Semanal' },
        ]}
        title="Geração Semanal de Pré-Planejamentos"
        description="Gera automaticamente as semanas do bimestre por escola"
        icon={Sparkles}
        backTo="/planejamento"
      />

      <Card>
        <CardHeader><CardTitle>Contexto</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Curso</Label>
              <SearchableSelect
                value={courseId}
                onValueChange={(v) => { setCourseId(v); setSchoolResults([]); }}
                disabled={loadingCourses || generating}
                placeholder="Selecione o curso"
                searchPlaceholder="Buscar curso..."
                options={courses.map(c => ({ value: c.id, label: c.nome }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Bimestre</Label>
              <Select value={bimester?.toString() || ''} onValueChange={(v) => { setBimester(parseInt(v)); setSchoolResults([]); }} disabled={generating}>
                <SelectTrigger><SelectValue placeholder={loadingBimester ? 'Carregando...' : 'Selecione'} /></SelectTrigger>
                <SelectContent>
                  {validBimesters.map(b => (
                    <SelectItem key={b.value} value={b.value.toString()} disabled={b.disabled}>
                      {b.label}{b.disabled ? ' (gere o anterior primeiro)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* School selection */}
          {courseId && bimester && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <School className="h-4 w-4" />
                  Escolas vinculadas ao curso
                </Label>
                {selectedSchoolIds.size > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {selectedSchoolIds.size}/5 selecionada(s)
                  </Badge>
                )}
              </div>

              {loadingSchools ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando escolas...
                </div>
              ) : schoolOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Nenhuma escola vinculada a este curso. Vincule escolas na página de Cursos.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto rounded-lg border p-3">
                  {schoolOptions.map(school => (
                    <label
                      key={school.id}
                      className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                        school.alreadyGenerated
                          ? 'opacity-60 cursor-not-allowed bg-muted/40'
                          : 'hover:bg-accent/50 cursor-pointer'
                      }`}
                    >
                      <Checkbox
                        checked={selectedSchoolIds.has(school.id)}
                        onCheckedChange={() => toggleSchool(school.id)}
                        disabled={school.alreadyGenerated || generating}
                      />
                      <span className="text-sm flex-1">{school.nome}</span>
                      {school.alreadyGenerated && (
                        <Badge variant="secondary" className="text-[10px] h-5">
                          Já gerado
                        </Badge>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress / Results */}
      {schoolResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {generating ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Processando...</>
              ) : (
                'Resultado'
              )}
            </CardTitle>
            {generating && (
              <Progress value={progressPercent} className="h-2 mt-2" />
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {schoolResults.map((result, i) => (
              <div key={result.schoolId} className="space-y-1">
                <div className="flex items-center gap-3 py-1.5 text-sm">
                  {result.status === 'pending' && <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />}
                  {result.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  {result.status === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  {result.status === 'error' && <XCircle className="h-4 w-4 text-destructive" />}
                  <span className="flex-1">{result.schoolName}</span>
                  {result.message && (
                    <span className={`text-xs ${result.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {result.message}
                    </span>
                  )}
                </div>
                {result.status === 'success' && result.details && result.details.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="ml-7 text-xs text-muted-foreground gap-1 h-7 px-2">
                        <ChevronDown className="h-3 w-3" />
                        Ver detalhes ({result.details.length})
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-7 mt-1 rounded-md border bg-muted/30 p-3 space-y-1.5 text-xs">
                        {(() => {
                          const grouped = new Map<string, { subjects: Set<string>; weeks: Set<number> }>();
                          result.details!.forEach(d => {
                            if (!grouped.has(d.professor_name)) {
                              grouped.set(d.professor_name, { subjects: new Set(), weeks: new Set() });
                            }
                            grouped.get(d.professor_name)!.subjects.add(d.subject_name);
                            grouped.get(d.professor_name)!.weeks.add(d.week_number);
                          });
                          return Array.from(grouped.entries()).map(([prof, data]) => (
                            <div key={prof} className="flex flex-col gap-0.5">
                              <span className="font-medium text-foreground">{prof}</span>
                              <span className="text-muted-foreground">
                                {Array.from(data.subjects).join(', ')} — Semana(s) {Array.from(data.weeks).sort((a, b) => a - b).join(', ')}
                              </span>
                            </div>
                          ));
                        })()}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Alert>
        <Calendar className="h-4 w-4" />
        <AlertDescription>
          O processamento é feito escola por escola para evitar timeouts.
          Selecione até 5 escolas por vez. Escolas já lançadas aparecem desabilitadas.
        </AlertDescription>
      </Alert>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => navigate('/planejamento')} disabled={generating}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/planejamento')} disabled={generating}>Cancelar</Button>
          <Button onClick={handleGenerate} disabled={generating || !courseId || !bimester || selectedSchoolIds.size === 0}>
            {generating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando ({currentSchoolIndex + 1}/{schoolResults.length})...</>
            ) : (
              `Gerar Semanas (${selectedSchoolIds.size} escola${selectedSchoolIds.size > 1 ? 's' : ''})`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
