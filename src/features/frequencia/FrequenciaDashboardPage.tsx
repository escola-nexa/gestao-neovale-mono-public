import { useEffect, useState, useMemo } from 'react';
import { Paginator } from '@/components/common/Paginator';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, AlertTriangle, Users, School, BookOpen, GraduationCap, ArrowRight, CalendarDays, CheckCircle2, Clock, BarChart3 } from 'lucide-react';
import FeatureGuideCard from '@/components/FeatureGuideCard';
import { PageHeader } from '@/components/PageHeader';
import { CascadingFilterBar } from '@/components/CascadingFilterBar';
import { useProfessorCascadingFilters } from './hooks/useProfessorCascadingFilters';
import { useTodayClasses } from './hooks/useTodayClasses';
import { AbsenceAlerts, SchoolAbsenceAlerts } from './components/AbsenceAlerts';
import { TodayClassesList } from './components/TodayClassesList';
import { frequenciaApi } from './api';
import { Badge } from '@/components/ui/badge';
import { SubjectNameWithAnp } from '@/components/SubjectNameWithAnp';
import { useAnpSubjectMap } from '@/hooks/useAnpSubjectMap';
import { CurrentPeriodBadge } from '@/components/CurrentPeriodBadge';
import { SharedSlotBadge } from '@/components/SharedSlotBadge';
import { useSharedSlotMap } from '@/hooks/useSharedSlotMap';

interface ClassSubjectEntry {
  classGroupId: string;
  classGroupName: string;
  subjectId: string;
  subjectName: string;
  schoolName: string;
  courseName: string;
}

export default function FrequenciaDashboardPage() {
  const navigate = useNavigate();
  const {
    schools, courses, classGroups, subjects,
    selectedSchool, selectedCourse, selectedClassGroup, selectedSubject,
    setSelectedSchool, setSelectedCourse, setSelectedClassGroup, setSelectedSubject,
    isProfessor, professorId,
  } = useProfessorCascadingFilters();

  const { todayClasses, isLoading: todayLoading } = useTodayClasses();

  const [entries, setEntries] = useState<ClassSubjectEntry[]>([]);
  const [attendanceDoneKeys, setAttendanceDoneKeys] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('chamada');
  const [entriesPage, setEntriesPage] = useState(1);
  const [entriesPageSize, setEntriesPageSize] = useState(20);
  useEffect(() => { setEntriesPage(1); }, [entries.length]);
  const paginatedEntries = useMemo(
    () => entries.slice((entriesPage - 1) * entriesPageSize, entriesPage * entriesPageSize),
    [entries, entriesPage, entriesPageSize],
  );
  const { data: anpMap } = useAnpSubjectMap();
  const sharedMap = useSharedSlotMap(
    isProfessor ? professorId : null,
    entries.map(e => e.subjectId),
  );

  // Load entries when filters set
  useEffect(() => {
    if (!selectedSchool) { setEntries([]); return; }

    const load = async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const result = await frequenciaApi.getClassesForDashboard({
        schoolId: selectedSchool,
        courseId: selectedCourse || undefined,
        classGroupId: selectedClassGroup || undefined,
        subjectId: selectedSubject || undefined,
        isProfessor,
        professorId: professorId || undefined,
        todayStr
      });

      setEntries(result.entries);
      setAttendanceDoneKeys(new Set(result.doneKeys));
    };
    load();
  }, [selectedSchool, selectedCourse, selectedClassGroup, selectedSubject, isProfessor, professorId]);

  const filtersActive = !!selectedSchool;

  return (
    <div className="space-y-4 sm:space-y-6">
      <FeatureGuideCard title="Como usar Frequência" steps={[
        { icon: ClipboardList, title: 'Lançar presença', description: 'Selecione a turma e disciplina, depois registre a frequência dos alunos.', color: 'blue' },
        { icon: CalendarDays, title: 'Aulas de hoje', description: 'Veja todas as aulas do dia e quais já tiveram frequência lançada.', color: 'green' },
        { icon: AlertTriangle, title: 'Alertas de faltas', description: 'Alunos com faltas excessivas são destacados automaticamente.', color: 'red' },
        { icon: BarChart3, title: 'Resumo por turma', description: 'Acompanhe a taxa de presença por turma e disciplina.', color: 'purple' },
      ]} />
      <PageHeader
        breadcrumbs={[{ label: 'Pedagógico' }, { label: 'Frequência' }]}
        title="Frequência"
        description="Gerencie a frequência dos alunos nas suas turmas."
        icon={ClipboardList}
      />

      {/* P1: For professor, show today's classes inline at the top — no separate tab */}
      {isProfessor && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Minhas Aulas Hoje</h2>
            </div>
            <CurrentPeriodBadge />
          </div>
          <TodayClassesList classes={todayClasses} isLoading={todayLoading} />
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="chamada" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5">
            <ClipboardList className="h-4 w-4" /> {isProfessor ? 'Todas as Turmas' : 'Lançar Chamada'}
          </TabsTrigger>
          <TabsTrigger value="alertas" className="data-[state=active]:bg-destructive/90 data-[state=active]:text-destructive-foreground gap-1.5">
            <AlertTriangle className="h-4 w-4" /> Alertas de Faltas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chamada" className="mt-4 space-y-4">
          {/* Filters */}
          <CascadingFilterBar
            fields={[
              {
                key: 'school', label: 'Escola', icon: School,
                options: schools, value: selectedSchool, onChange: setSelectedSchool,
              },
              {
                key: 'course', label: 'Curso', icon: GraduationCap,
                options: courses, value: selectedCourse, onChange: setSelectedCourse,
                disabled: !selectedSchool,
              },
              {
                key: 'classGroup', label: 'Turma', icon: Users,
                options: classGroups, value: selectedClassGroup, onChange: setSelectedClassGroup,
                disabled: !selectedCourse,
              },
              {
                key: 'subject', label: 'Disciplina', icon: BookOpen,
                options: subjects, value: selectedSubject, onChange: setSelectedSubject,
                disabled: !selectedClassGroup,
              },
            ]}
            resultCount={filtersActive ? entries.length : undefined}
            resultLabel={`turma${entries.length !== 1 ? 's' : ''} encontrada${entries.length !== 1 ? 's' : ''}`}
          />

          {/* Entries list */}
          {!selectedSchool ? (
            <Card className="border-dashed border-2 border-muted-foreground/20">
              <CardContent className="py-16 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <School className="h-8 w-8 text-primary/60" />
                </div>
                <p className="text-lg font-semibold text-foreground mb-1">Selecione uma escola</p>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Use os filtros acima para encontrar suas turmas e disciplinas.
                </p>
              </CardContent>
            </Card>
          ) : entries.length === 0 ? (
            <Card className="border-dashed border-2 border-muted-foreground/20">
              <CardContent className="py-16 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <p className="text-lg font-semibold text-foreground mb-1">Nenhuma turma encontrada</p>
                <p className="text-sm text-muted-foreground">Ajuste os filtros para encontrar suas turmas.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {paginatedEntries.map(e => {
                const isDone = attendanceDoneKeys.has(`${e.classGroupId}-${e.subjectId}`);
                return (
                  <Card
                    key={`${e.classGroupId}-${e.subjectId}`}
                    className={`group hover:shadow-md transition-all duration-200 cursor-pointer ${
                      isDone ? 'border-emerald-200 bg-emerald-50/30' : 'hover:border-primary/40'
                    }`}
                    onClick={() => navigate(`/frequencia/registro/${e.classGroupId}/${e.subjectId}`)}
                  >
                    <CardContent className="flex items-center justify-between py-4 px-5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                          isDone ? 'bg-emerald-100' : 'bg-primary/10 group-hover:bg-primary/20'
                        }`}>
                          {isDone
                            ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            : <BookOpen className="h-5 w-5 text-primary" />
                          }
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground truncate">{e.classGroupName}</p>
                            <Badge
                              variant={isDone ? 'default' : 'outline'}
                              className={`text-[10px] px-1.5 py-0 h-5 shrink-0 ${
                                isDone
                                  ? 'bg-emerald-600 hover:bg-emerald-600 text-white border-0'
                                  : 'text-amber-600 border-amber-300 bg-amber-50'
                              }`}
                            >
                              {isDone ? 'Feita hoje' : 'Pendente'}
                            </Badge>
                            <SharedSlotBadge others={sharedMap.get(e.subjectId)} />
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            <SubjectNameWithAnp name={e.subjectName} isAnp={anpMap?.bySubject.has(e.subjectId)} compact /> • {e.courseName} • {e.schoolName}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={isDone ? 'outline' : 'default'}
                        className="shrink-0 gap-1.5 group-hover:gap-2 transition-all"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          navigate(`/frequencia/registro/${e.classGroupId}/${e.subjectId}`);
                        }}
                      >
                        <ClipboardList className="h-4 w-4" />
                        <span className="hidden sm:inline">{isDone ? 'Revisar' : 'Chamada'}</span>
                        <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          {entries.length > entriesPageSize && (
            <Paginator
              page={entriesPage}
              pageSize={entriesPageSize}
              total={entries.length}
              onPageChange={setEntriesPage}
              onPageSizeChange={setEntriesPageSize}
              itemLabel="turmas"
              className="mt-3"
            />
          )}
        </TabsContent>

        {/* P2: Alerts tab now works at school level OR with turma+disciplina */}
        <TabsContent value="alertas" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Painel de Alertas de Faltas
              </CardTitle>
              <CardDescription>
                {selectedClassGroup && selectedSubject
                  ? 'Alunos com percentual de faltas próximo ou acima de 25% na turma/disciplina selecionada'
                  : selectedSchool
                    ? 'Ranking de alunos com mais faltas na escola selecionada (selecione turma e disciplina para detalhes)'
                    : 'Selecione ao menos uma escola nos filtros da aba "Lançar Chamada" para ver os alertas'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedClassGroup && selectedSubject ? (
                <AbsenceAlerts classGroupId={selectedClassGroup} subjectId={selectedSubject} />
              ) : selectedSchool ? (
                <SchoolAbsenceAlerts schoolId={selectedSchool} />
              ) : (
                <div className="py-8 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                    <AlertTriangle className="h-8 w-8 text-destructive/60" />
                  </div>
                  <p className="text-lg font-semibold text-foreground mb-1">Selecione uma escola</p>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Use os filtros na aba "Lançar Chamada" para selecionar uma escola e visualizar os alertas.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
