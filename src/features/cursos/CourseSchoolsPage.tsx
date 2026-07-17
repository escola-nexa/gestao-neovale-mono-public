import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { coursesApi, schoolsApi, CourseData, SchoolData } from '@/services/supabaseApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, School, Check, Plus, X, Search, AlertTriangle, Users, GraduationCap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCourseSchoolLink } from '@/features/escolas/hooks/useCourseSchoolLink';

interface UnlinkCheck {
  schoolId: string;
  schoolName: string;
  professorCount: number;
  studentCount: number;
  canUnlink: boolean;
  loading: boolean;
}

export default function CourseSchoolsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const trackIdFromQuery = searchParams.get('trackId');
  const { toast } = useToast();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [allSchools, setAllSchools] = useState<SchoolData[]>([]);
  const [linkedSchoolIds, setLinkedSchoolIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [unlinkDialog, setUnlinkDialog] = useState<UnlinkCheck | null>(null);
  const { link, unlink, checkDependencies, isSaving } = useCourseSchoolLink();

  useEffect(() => {
    if (courseId) loadData();
  }, [courseId]);

  const loadData = async () => {
    try {
      const [courses, schools] = await Promise.all([
        coursesApi.getAll(),
        schoolsApi.getAll(),
      ]);
      const found = courses.find(c => c.id === courseId);
      setCourse(found || null);
      setAllSchools(schools.filter(s => s.status === 'ativo'));
      setLinkedSchoolIds(found?.school_ids || []);
    } catch {
      toast({ title: 'Erro', description: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async (schoolId: string) => {
    if (!courseId) return;
    const ok = await link(courseId, schoolId);
    if (ok) setLinkedSchoolIds(prev => [...prev, schoolId]);
  };

  const handleRequestUnlink = async (schoolId: string) => {
    if (!courseId) return;
    const school = allSchools.find(s => s.id === schoolId);

    setUnlinkDialog({
      schoolId,
      schoolName: school?.nome || '',
      professorCount: 0,
      studentCount: 0,
      canUnlink: true,
      loading: true,
    });

    try {
      const dep = await checkDependencies(courseId, schoolId);
      setUnlinkDialog(prev => prev ? {
        ...prev,
        professorCount: dep.professors,
        studentCount: dep.students,
        canUnlink: dep.canUnlink,
        loading: false,
      } : null);
    } catch {
      setUnlinkDialog(prev => prev ? { ...prev, loading: false, canUnlink: false } : null);
    }
  };

  const handleConfirmUnlink = async () => {
    if (!courseId || !unlinkDialog) return;
    const target = unlinkDialog;
    setUnlinkDialog(null);
    const ok = await unlink(courseId, target.schoolId);
    if (ok) setLinkedSchoolIds(prev => prev.filter(id => id !== target.schoolId));
  };

  const linkedSchools = allSchools.filter(s => linkedSchoolIds.includes(s.id));
  const availableSchools = allSchools.filter(s => 
    !linkedSchoolIds.includes(s.id) &&
    s.nome.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Curso não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/cursos')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          ...(trackIdFromQuery
            ? [
                { label: 'Itinerários', href: '/itinerarios' },
                { label: 'Cursos', href: `/itinerarios/${trackIdFromQuery}/cursos` },
              ]
            : [{ label: 'Cursos', href: '/cursos' }]),
          { label: course.nome, href: `/cursos/${courseId}/disciplinas${trackIdFromQuery ? `?trackId=${trackIdFromQuery}` : ''}` },
          { label: 'Escolas Vinculadas' },
        ]}
        title="Vincular Escolas"
        description={`Gerencie as escolas onde o curso ${course.nome} é ofertado`}
        backTo={trackIdFromQuery ? `/itinerarios/${trackIdFromQuery}/cursos` : `/cursos/${courseId}/disciplinas`}
        badge={{
          label: `${linkedSchools.length} ${linkedSchools.length === 1 ? 'vinculada' : 'vinculadas'}`,
          tone: linkedSchools.length > 0 ? 'success' : 'default',
        }}
      />

      {/* Linked Schools */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            Escolas Vinculadas
          </CardTitle>
          <CardDescription>
            Estas escolas ofertam o curso {course.nome}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {linkedSchools.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <School className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Nenhuma escola vinculada ainda</p>
              <p className="text-xs mt-1">Vincule escolas usando a lista abaixo</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {linkedSchools.map(school => (
                <div
                  key={school.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-900"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
                      <School className="h-4 w-4 text-green-700 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm leading-snug">{school.nome}</p>
                      <p className="text-xs text-muted-foreground">{school.cidade}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRequestUnlink(school.id)}
                    disabled={courseId ? isSaving(courseId, school.id) : false}
                  >
                    {courseId && isSaving(courseId, school.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Schools */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Escolas Disponíveis
          </CardTitle>
          <CardDescription>
            Clique no botão para vincular uma escola ao curso
          </CardDescription>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar escola..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {availableSchools.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{search ? 'Nenhuma escola encontrada com este filtro' : 'Todas as escolas já estão vinculadas'}</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {availableSchools.map(school => (
                <div
                  key={school.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <School className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm leading-snug">{school.nome}</p>
                      <p className="text-xs text-muted-foreground">{school.cidade}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => handleLink(school.id)}
                    disabled={courseId ? isSaving(courseId, school.id) : false}
                  >
                    {courseId && isSaving(courseId, school.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" /> Vincular
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unlink Confirmation Dialog */}
      <AlertDialog open={!!unlinkDialog} onOpenChange={(open) => !open && setUnlinkDialog(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Desvincular Escola
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Deseja desvincular a escola <strong>{unlinkDialog?.schoolName}</strong> do curso <strong>{course.nome}</strong>?
                </p>

                {unlinkDialog?.loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
                    <span className="text-sm text-muted-foreground">Verificando dependências...</span>
                  </div>
                ) : unlinkDialog && !unlinkDialog.canUnlink ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="space-y-3">
                      <p className="font-medium">Não é possível desvincular esta escola.</p>
                      <p>Existem vínculos ativos que precisam ser removidos manualmente antes de prosseguir:</p>
                      <div className="space-y-2 mt-2">
                        {unlinkDialog.professorCount > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4" />
                            <span><strong>{unlinkDialog.professorCount}</strong> {unlinkDialog.professorCount === 1 ? 'professor vinculado' : 'professores vinculados'}</span>
                          </div>
                        )}
                        {unlinkDialog.studentCount > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <GraduationCap className="h-4 w-4" />
                            <span><strong>{unlinkDialog.studentCount}</strong> {unlinkDialog.studentCount === 1 ? 'aluno matriculado' : 'alunos matriculados'}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs mt-2">
                        Acesse as páginas de <strong>Professores</strong> e <strong>Alunos</strong> para remover os vínculos antes de desvincular a escola.
                      </p>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <Check className="h-4 w-4" />
                    <AlertDescription>
                      Nenhum professor ou aluno vinculado. A desvinculação pode ser realizada com segurança.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {unlinkDialog && !unlinkDialog.loading && unlinkDialog.canUnlink && (
              <AlertDialogAction onClick={handleConfirmUnlink} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Desvincular
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
