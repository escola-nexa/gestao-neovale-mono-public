import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { escolasApi } from '@/features/escolas/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/PageHeader';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { isManagerRole } from '@/lib/roles';
import { Search, Loader2, BookOpen, Link2, Plus, X, Check, AlertTriangle, Users, GraduationCap } from 'lucide-react';
import { useCourseSchoolLink } from './hooks/useCourseSchoolLink';

interface SchoolCourse {
  id: string;
  nome: string;
  codigo: string;
  nivel_ensino: string;
  status: string;
  disciplineCount: number;
}

interface AvailableCourse {
  id: string;
  nome: string;
  codigo: string;
  nivel_ensino: string;
}

interface UnlinkCheck {
  courseId: string;
  courseName: string;
  professorCount: number;
  studentCount: number;
  canUnlink: boolean;
  loading: boolean;
}

export default function SchoolCoursesPage() {
  const { schoolId } = useParams<{ schoolId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const canManage = isManagerRole(user?.perfil);

  const [courses, setCourses] = useState<SchoolCourse[]>([]);
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Link dialog state
  const [linkOpen, setLinkOpen] = useState(false);
  const [allCourses, setAllCourses] = useState<AvailableCourse[]>([]);
  const [linkSearch, setLinkSearch] = useState('');
  const [loadingAll, setLoadingAll] = useState(false);

  // Unlink dialog state
  const [unlinkDialog, setUnlinkDialog] = useState<UnlinkCheck | null>(null);

  const { link, unlink, checkDependencies, isSaving, savingId } = useCourseSchoolLink();

  useEffect(() => {
    if (schoolId) loadData();
  }, [schoolId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [schoolRes, courseLinksRes] = await Promise.all([
        escolasApi.client.from('schools').select('nome').eq('id', schoolId!).maybeSingle(),
        escolasApi.client.from('course_schools').select('course_id').eq('school_id', schoolId!),
      ]);

      if (schoolRes.data) setSchoolName(schoolRes.data.nome);

      const courseIds = (courseLinksRes.data || []).map(c => c.course_id);
      if (courseIds.length === 0) {
        setCourses([]);
        return;
      }

      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, nome, codigo, nivel_ensino, status')
        .in('id', courseIds)
        .order('nome');

      const coursesWithCounts: SchoolCourse[] = await Promise.all(
        (coursesData || []).map(async (course) => {
          const { count } = await supabase
            .from('subjects')
            .select('id', { count: 'exact', head: true })
            .eq('course_id', course.id)
            .is('deleted_at', null);
          return { ...course, disciplineCount: count || 0 };
        })
      );

      setCourses(coursesWithCounts);
    } catch (error) {
      console.error('Erro ao carregar cursos da escola:', error);
    } finally {
      setLoading(false);
    }
  };

  const openLinkDialog = async () => {
    setLinkOpen(true);
    setLoadingAll(true);
    try {
      const { data } = await supabase
        .from('courses')
        .select('id, nome, codigo, nivel_ensino, status')
        .eq('status', 'ativo')
        .order('nome');
      setAllCourses((data || []) as AvailableCourse[]);
    } catch {
      toast({ title: 'Erro', description: 'Falha ao carregar cursos disponíveis', variant: 'destructive' });
    } finally {
      setLoadingAll(false);
    }
  };

  const handleLink = async (courseId: string) => {
    if (!schoolId) return;
    const ok = await link(courseId, schoolId);
    if (ok) await loadData();
  };

  const handleRequestUnlink = async (course: SchoolCourse) => {
    if (!schoolId) return;
    setUnlinkDialog({
      courseId: course.id,
      courseName: course.nome,
      professorCount: 0,
      studentCount: 0,
      canUnlink: true,
      loading: true,
    });

    try {
      const dep = await checkDependencies(course.id, schoolId);
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
    if (!schoolId || !unlinkDialog) return;
    const target = unlinkDialog;
    setUnlinkDialog(null);
    const ok = await unlink(target.courseId, schoolId);
    if (ok) await loadData();
  };

  const nivelLabels: Record<string, string> = {
    fundamental_1: 'Fundamental I',
    fundamental_2: 'Fundamental II',
    medio: 'Médio',
    tecnico: 'Técnico',
    eja: 'EJA',
    profissional: 'Profissional',
  };

  const filtered = courses.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.codigo.toLowerCase().includes(search.toLowerCase())
  );

  const linkedIds = new Set(courses.map(c => c.id));
  const availableCourses = allCourses.filter(c =>
    !linkedIds.has(c.id) &&
    (c.nome.toLowerCase().includes(linkSearch.toLowerCase()) || c.codigo.toLowerCase().includes(linkSearch.toLowerCase()))
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Escolas', href: '/escolas' },
          { label: schoolName || 'Escola', href: `/escolas/${schoolId}` },
          { label: 'Cursos' },
        ]}
        title="Cursos da Escola"
        description={`${schoolName} · ${courses.length} curso${courses.length !== 1 ? 's' : ''} vinculado${courses.length !== 1 ? 's' : ''}`}
        backTo={`/escolas/${schoolId}`}
        actions={canManage ? (
          <Button onClick={openLinkDialog}>
            <Link2 className="mr-2 h-4 w-4" /> Vincular cursos
          </Button>
        ) : undefined}
      />

      <Card>
        <CardHeader>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar curso..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {courses.length === 0 ? 'Nenhum curso vinculado a esta escola' : 'Nenhum curso encontrado'}
              </p>
              {courses.length === 0 && canManage && (
                <Button variant="outline" size="sm" className="mt-4" onClick={openLinkDialog}>
                  <Plus className="mr-2 h-4 w-4" /> Vincular cursos agora
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Nível</TableHead>
                      <TableHead>Disciplinas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-mono text-muted-foreground">{course.codigo}</TableCell>
                        <TableCell className="font-medium">{course.nome}</TableCell>
                        <TableCell><Badge variant="outline">{nivelLabels[course.nivel_ensino] || course.nivel_ensino}</Badge></TableCell>
                        <TableCell>{course.disciplineCount}</TableCell>
                        <TableCell>
                          <Badge variant={course.status === 'ativo' ? 'default' : 'secondary'}>
                            {course.status === 'ativo' ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/cursos/${course.id}/disciplinas`, { state: { fromSchool: schoolId, schoolName } })}>
                              Ver Disciplinas
                            </Button>
                            {canManage && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleRequestUnlink(course)}
                                disabled={schoolId ? isSaving(course.id, schoolId) : false}
                                title="Desvincular curso"
                              >
                                {schoolId && isSaving(course.id, schoolId) ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile */}
              <div className="md:hidden divide-y">
                {filtered.map((course) => (
                  <div key={course.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{course.nome}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs font-mono">{course.codigo}</Badge>
                          <span className="text-xs text-muted-foreground">{nivelLabels[course.nivel_ensino] || course.nivel_ensino}</span>
                        </div>
                      </div>
                      <Badge variant={course.status === 'ativo' ? 'default' : 'secondary'} className="shrink-0">
                        {course.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{course.disciplineCount} disciplina{course.disciplineCount !== 1 ? 's' : ''}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/cursos/${course.id}/disciplinas`, { state: { fromSchool: schoolId, schoolName } })}>
                          Disciplinas
                        </Button>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRequestUnlink(course)}
                            disabled={schoolId ? isSaving(course.id, schoolId) : false}
                          >
                            {schoolId && isSaving(course.id, schoolId) ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Link courses dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" /> Vincular cursos
            </DialogTitle>
            <DialogDescription>
              Selecione os cursos que serão ofertados em <strong>{schoolName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar curso..." value={linkSearch} onChange={(e) => setLinkSearch(e.target.value)} className="pl-10" />
          </div>

          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {loadingAll ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : availableCourses.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>{linkSearch ? 'Nenhum curso encontrado' : 'Todos os cursos ativos já estão vinculados'}</p>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {availableCourses.map(course => (
                  <div key={course.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors">
                    <div className="min-w-0">
                      <p className="font-medium text-sm leading-snug">{course.nome}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs font-mono">{course.codigo}</Badge>
                        <span className="text-xs text-muted-foreground">{nivelLabels[course.nivel_ensino] || course.nivel_ensino}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="shrink-0" onClick={() => handleLink(course.id)} disabled={schoolId ? isSaving(course.id, schoolId) : false}>
                      {schoolId && isSaving(course.id, schoolId) ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Vincular</>}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlink confirmation */}
      <AlertDialog open={!!unlinkDialog} onOpenChange={(open) => !open && setUnlinkDialog(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Desvincular Curso
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Deseja desvincular o curso <strong>{unlinkDialog?.courseName}</strong> da escola <strong>{schoolName}</strong>?
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
                      <p className="font-medium">Não é possível desvincular este curso.</p>
                      <p>Existem vínculos ativos que precisam ser removidos antes de prosseguir:</p>
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
                        Remova os vínculos em <strong>Professores</strong> e <strong>Alunos</strong> antes de desvincular o curso.
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
