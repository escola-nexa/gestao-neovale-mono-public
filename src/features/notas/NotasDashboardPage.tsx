import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useGradesCascadingFilters } from './hooks/useGradesCascadingFilters';
import { ClosedGradesTab } from './components/ClosedGradesTab';
import { GradesOverviewMatrix } from './components/GradesOverviewMatrix';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CascadingFilterBar, type CascadingFilterField } from '@/components/CascadingFilterBar';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  School, BookOpen, Users, GraduationCap, User, Calendar,
  ClipboardList, ArrowRight, PenLine, Lock, CheckCircle2, Loader2,
  BarChart3, AlertCircle, FileText, LayoutGrid, Settings, Calculator
} from 'lucide-react';
import FeatureGuideCard from '@/components/FeatureGuideCard';
import { PageHeader } from '@/components/PageHeader';
import { SubjectNameWithAnp } from '@/components/SubjectNameWithAnp';
import { useAnpSubjectMap } from '@/hooks/useAnpSubjectMap';
import { CurrentPeriodBadge } from '@/components/CurrentPeriodBadge';
import { SharedSlotBadge } from '@/components/SharedSlotBadge';
import { useSharedSlotMap } from '@/hooks/useSharedSlotMap';

interface SubjectEntry {
  subjectId: string;
  subjectName: string;
  professorId: string;
  professorName: string;
  schoolName: string;
  courseName: string;
  classGroupName: string;
  gradeStatus: 'none' | 'open' | 'closed';
}

import { notasApi } from './api';

export default function NotasDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isProfessor = user?.perfil === 'professor';
  const filters = useGradesCascadingFilters();
  const [entries, setEntries] = useState<SubjectEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const { data: anpMap } = useAnpSubjectMap();
  const sharedMap = useSharedSlotMap(
    filters.isProfessor ? (filters.professorId || null) : null,
    entries.map(e => e.subjectId),
  );

  const allFiltersReady = filters.selectedSchool && filters.selectedCourse
    && filters.selectedClassGroup && filters.selectedBimester
    && (filters.isProfessor || filters.selectedProfessor);

  useEffect(() => {
    if (!allFiltersReady) { setEntries([]); return; }

    const load = async () => {
      setLoadingEntries(true);
      const profId = filters.professorId;

      const result = await notasApi.getSubjectsWithStatus({
        schoolId: filters.selectedSchool,
        courseId: filters.selectedCourse,
        classGroupId: filters.selectedClassGroup,
        professorId: profId!,
        bimesterNumber: Number(filters.selectedBimester)
      });

      setEntries(result);
      setLoadingEntries(false);
    };
    load();
  }, [allFiltersReady, filters.selectedSchool, filters.selectedCourse, filters.selectedClassGroup, filters.selectedBimester, filters.professorId]);

  // Stats
  const totalSubjects = entries.length;
  const launched = entries.filter(e => e.gradeStatus === 'open').length;
  const closed = entries.filter(e => e.gradeStatus === 'closed').length;
  const pending = totalSubjects - launched - closed;
  const progressPercent = totalSubjects > 0 ? Math.round(((launched + closed) / totalSubjects) * 100) : 0;

  // Get context label for the current filter state
  const contextLabel = filters.selectedClassGroup
    ? filters.classGroups.find(c => c.id === filters.selectedClassGroup)?.name || ''
    : '';
  const bimesterLabel = filters.selectedBimester
    ? filters.bimesters.find(b => b.id === filters.selectedBimester)?.name || ''
    : '';

  const lancamentoContent = (
    <div className="space-y-4">
      {/* Filters */}
      <CascadingFilterBar
        fields={[
          {
            key: 'school', label: 'Escola', icon: School,
            options: filters.schools, value: filters.selectedSchool, onChange: filters.setSelectedSchool,
          },
          {
            key: 'course', label: 'Curso', icon: BookOpen,
            options: filters.courses, value: filters.selectedCourse, onChange: filters.setSelectedCourse,
            disabled: !filters.selectedSchool,
          },
          {
            key: 'classGroup', label: 'Turma', icon: Users,
            options: filters.classGroups, value: filters.selectedClassGroup, onChange: filters.setSelectedClassGroup,
            disabled: !filters.selectedCourse,
          },
          ...(!filters.isProfessor ? [{
            key: 'professor', label: 'Professor', icon: User,
            options: filters.professors, value: filters.selectedProfessor, onChange: filters.setSelectedProfessor,
            disabled: !filters.selectedClassGroup,
          } as CascadingFilterField] : []),
          {
            key: 'bimester', label: 'Bimestre', icon: Calendar,
            options: filters.bimesters, value: filters.selectedBimester, onChange: filters.setSelectedBimester,
            disabled: filters.bimesters.length === 0,
            footer: (
              <>
                {filters.isProfessor && filters.bimesters.length === 1 && filters.selectedBimester && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                    <Lock className="h-3 w-3" />
                    Bimestre definido automaticamente pela data atual
                  </p>
                )}
                {filters.isProfessor && filters.bimesters.length === 0 && filters.selectedClassGroup && (
                  <p className="text-[11px] text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    Nenhum bimestre vigente encontrado no calendário
                  </p>
                )}
              </>
            ),
          },
        ]}
      />

      {/* Loading */}
      {loadingEntries && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Carregando disciplinas...</span>
        </div>
      )}

      {/* Summary bar + Results */}
      {!loadingEntries && allFiltersReady && entries.length > 0 && (
        <>
          {/* Summary */}
          <Card className="shadow-sm border-primary/10">
            <CardContent className="py-3 px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground min-w-0">
                  <BarChart3 className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="truncate">{contextLabel} — {bimesterLabel}</span>
                </div>
                <Separator orientation="vertical" className="hidden sm:block h-5" />
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                    <span className="text-muted-foreground">{pending} pendente{pending !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                    <span className="text-muted-foreground">{launched} lançada{launched !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
                    <span className="text-muted-foreground">{closed} fechada{closed !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="sm:ml-auto flex items-center gap-2 min-w-[120px]">
                  <Progress value={progressPercent} className="h-2 flex-1" />
                  <span className="text-xs font-semibold text-muted-foreground w-8 text-right">{progressPercent}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subject list */}
          <div className="space-y-2">
            {entries.map(entry => {
              const isClosed = entry.gradeStatus === 'closed';
              const isOpen = entry.gradeStatus === 'open';

              return (
                <Card
                  key={entry.subjectId}
                  className={`transition-all duration-200 cursor-pointer group hover:shadow-md ${
                    isClosed ? 'opacity-60 hover:opacity-80' : ''
                  }`}
                  onClick={() => navigate(`/notas/lancamento/${filters.selectedClassGroup}/${entry.subjectId}/${filters.selectedBimester}`)}
                >
                  <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-4 sm:px-5">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Status indicator */}
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                        isClosed ? 'bg-muted' : isOpen ? 'bg-primary/10' : 'bg-accent'
                      }`}>
                        {isClosed ? (
                          <Lock className="h-4.5 w-4.5 text-muted-foreground" />
                        ) : isOpen ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-primary" />
                        ) : (
                          <GraduationCap className="h-4.5 w-4.5 text-muted-foreground" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">
                            <SubjectNameWithAnp name={entry.subjectName} isAnp={anpMap?.bySubject.has(entry.subjectId)} compact />
                          </span>
                          {isOpen && (
                            <Badge className="text-[10px] h-5 bg-primary/10 text-primary border-primary/20 gap-0.5 px-1.5">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Lançada
                            </Badge>
                          )}
                          {isClosed && (
                            <Badge variant="secondary" className="text-[10px] h-5 gap-0.5 px-1.5">
                              <Lock className="h-2.5 w-2.5" /> Fechada
                            </Badge>
                          )}
                          {!isOpen && !isClosed && (
                            <Badge variant="outline" className="text-[10px] h-5 gap-0.5 px-1.5 text-muted-foreground border-dashed">
                              Pendente
                            </Badge>
                          )}
                          <SharedSlotBadge others={sharedMap.get(entry.subjectId)} />
                        </div>
                        {!isProfessor && (
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="text-xs text-muted-foreground">{entry.professorName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                      {(isOpen || isClosed) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            navigate(`/boletins?turma=${filters.selectedClassGroup}&bimestre=${filters.selectedBimester}`);
                          }}
                        >
                          <FileText className="h-4 w-4" /> Boletim
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={isClosed ? 'outline' : 'default'}
                        className="gap-1.5"
                      >
                        {isClosed ? 'Visualizar' : 'Lançar'} <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {!loadingEntries && allFiltersReady && entries.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="font-medium">Nenhuma disciplina encontrada</p>
          <p className="text-sm mt-1">Tente ajustar os filtros selecionados.</p>
        </div>
      )}

      {!allFiltersReady && !loadingEntries && (
        <div className="text-center py-10 text-muted-foreground">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <ClipboardList className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <p className="font-medium text-sm">
            {isProfessor && filters.schools.length > 1
              ? 'Selecione a escola para ver suas disciplinas'
              : 'Selecione os filtros acima para visualizar as disciplinas'}
          </p>
          {isProfessor && filters.schools.length > 1 && (
            <p className="text-xs mt-1">Você possui vínculos em {filters.schools.length} escolas — selecione uma para continuar.</p>
          )}
        </div>
      )}
    </div>
  );

  // Professor: no tabs
  if (isProfessor) {
    return (
      <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
        <PageHeader
          breadcrumbs={[{ label: 'Pedagógico' }, { label: 'Lançamento de Notas' }]}
          title="Lançamento de Notas"
          description="Selecione os filtros para visualizar as disciplinas"
          icon={PenLine}
        />
        <div className="flex justify-end">
          <CurrentPeriodBadge />
        </div>
        {lancamentoContent}
      </div>
    );
  }

  // Admin/Coordenador: tabs with overview matrix
  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
      <FeatureGuideCard title="Como usar Notas" steps={[
        { icon: Settings, title: 'Configurar atividades', description: 'Defina as atividades avaliativas e suas notas máximas antes de lançar.', color: 'blue' },
        { icon: PenLine, title: 'Lançar notas', description: 'Selecione turma e disciplina para preencher as notas dos alunos.', color: 'green' },
        { icon: Lock, title: 'Fechar bimestre', description: 'Após conferir, feche o bimestre para consolidar as médias.', color: 'red' },
        { icon: Calculator, title: 'Médias automáticas', description: 'O sistema calcula as médias conforme o tipo de avaliação configurado.', color: 'purple' },
      ]} />
      <PageHeader
        breadcrumbs={[{ label: 'Pedagógico' }, { label: 'Notas' }]}
        title="Notas"
        description="Gerencie lançamentos e visualize notas fechadas"
        icon={ClipboardList}
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <LayoutGrid className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="lancamento" className="gap-1.5">
            <PenLine className="h-4 w-4" />
            Lançamento
          </TabsTrigger>
          <TabsTrigger value="fechadas" className="gap-1.5">
            <Lock className="h-4 w-4" />
            Notas Fechadas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <GradesOverviewMatrix />
        </TabsContent>

        <TabsContent value="lancamento">
          {lancamentoContent}
        </TabsContent>

        <TabsContent value="fechadas">
          <ClosedGradesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
