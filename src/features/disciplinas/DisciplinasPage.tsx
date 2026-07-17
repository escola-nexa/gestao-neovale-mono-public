import { Fragment, useState, useEffect } from 'react';
import { SubjectData, CourseData, SubjectSemester } from '@/services/supabaseApi';
import { disciplinasApi } from './api';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, Loader2, Calendar, Info, BookOpenCheck, CalendarDays, Clock, GraduationCap } from 'lucide-react';
import FeatureGuideCard from '@/components/FeatureGuideCard';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSemester, SEMESTER_OPTIONS, SEMESTER_LABELS } from '@/hooks/useSemester';
import { useSearchParams, useNavigate, useParams, useLocation } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';

interface DisciplinaFormData {
  codigo: string;
  nome: string;
  nome_boletim: string;
  descricao: string;
  carga_horaria_semanal: number;
  course_id: string;
  semester: SubjectSemester;
  status: 'ativo' | 'inativo';
}

const emptyForm: DisciplinaFormData = { 
  codigo: '', 
  nome: '', 
  nome_boletim: '',
  descricao: '', 
  carga_horaria_semanal: 4, 
  course_id: '', 
  semester: 'FIRST',
  status: 'ativo' 
};

export default function DisciplinasPage() {
  const { toast } = useToast();
  const { currentSemester, semesterDateRanges, isLoading: semesterLoading } = useSemester();
  const [searchParams] = useSearchParams();
  const { courseId: courseIdFromParams } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromSchool = (location.state as any)?.fromSchool as string | undefined;
  const fromSchoolName = (location.state as any)?.schoolName as string | undefined;
  const cursoIdFromQuery = courseIdFromParams || searchParams.get('cursoId');
  const trackIdFromQuery = searchParams.get('trackId') || (location.state as any)?.fromTrackId;
  const [disciplinas, setDisciplinas] = useState<SubjectData[]>([]);
  const [cursos, setCursos] = useState<CourseData[]>([]);
  const [anpBySubject, setAnpBySubject] = useState<Record<string, { ch_presencial: number; ch_anp: number; class_group_name: string; semester: string }[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCursoId, setFilterCursoId] = useState(cursoIdFromQuery || 'all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ativo' | 'inativo'>('all');
  const [filterSemester, setFilterSemester] = useState<'all' | SubjectSemester>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<SubjectData | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<DisciplinaFormData>(emptyForm);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { disciplinas: d, cursos: c, modalities } = await disciplinasApi.getDisciplinasData(courseIdFromParams);
      setDisciplinas(d);
      setCursos(c);
      const map: Record<string, { ch_presencial: number; ch_anp: number; class_group_name: string; semester: string }[]> = {};
      modalities.forEach((m: any) => {
        if (!map[m.subject_id]) map[m.subject_id] = [];
        map[m.subject_id].push({
          ch_presencial: m.ch_presencial,
          ch_anp: m.ch_anp,
          class_group_name: m.class_group_name,
          semester: m.semester,
        });
      });
      setAnpBySubject(map);
    } catch {
      toast({ title: 'Erro', description: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item?: SubjectData) => {
    if (item) {
      setSelected(item);
      setFormData({
        codigo: item.codigo,
        nome: item.nome,
        nome_boletim: item.nome_boletim || '',
        descricao: item.descricao || '',
        carga_horaria_semanal: item.carga_horaria_semanal,
        course_id: item.course_id,
        semester: item.semester,
        status: item.status
      });
    } else {
      setSelected(null);
      setFormData({
        ...emptyForm,
        course_id: cursoIdFromQuery || '',
        semester: currentSemester || 'FIRST'
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.course_id) {
      toast({ title: 'Erro', description: 'Curso é obrigatório', variant: 'destructive' });
      return;
    }
    if (!formData.codigo.trim()) {
      toast({ title: 'Erro', description: 'Código é obrigatório', variant: 'destructive' });
      return;
    }
    if (!formData.nome.trim()) {
      toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }
    if (!formData.nome_boletim) {
      toast({ title: 'Erro', description: 'Nome para o Boletim Escolar é obrigatório', variant: 'destructive' });
      return;
    }
    if (formData.carga_horaria_semanal <= 0) {
      toast({ title: 'Erro', description: 'Carga horária deve ser maior que zero', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
        await disciplinasApi.saveDisciplina(formData, selected?.id);
        toast({ title: 'Sucesso', description: selected ? 'Disciplina atualizada' : 'Disciplina criada' });
      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      if (error?.message?.includes('subjects_code_course_semester_unique')) {
        toast({ 
          title: 'Erro', 
          description: 'Já existe uma disciplina com este código no mesmo curso e semestre', 
          variant: 'destructive' 
        });
      } else {
        console.error('Erro ao salvar disciplina:', error?.message || error?.code || JSON.stringify(error));
        toast({ title: 'Erro', description: error?.message || 'Erro ao salvar', variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await disciplinasApi.deleteDisciplina(selected.id);
      toast({ title: 'Sucesso', description: 'Disciplina removida' });
      setDeleteDialogOpen(false);
      loadData();
    } catch {
      toast({ title: 'Erro', description: 'Erro ao remover', variant: 'destructive' });
    }
  };

  const filtered = disciplinas.filter(d => {
    const matchSearch = d.nome.toLowerCase().includes(search.toLowerCase()) ||
                        d.codigo.toLowerCase().includes(search.toLowerCase());
    const matchScoped = !courseIdFromParams || d.course_id === courseIdFromParams;
    const matchCurso = filterCursoId === 'all' || d.course_id === filterCursoId;
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    const matchSemester = filterSemester === 'all' || d.semester === filterSemester;
    return matchSearch && matchScoped && matchCurso && matchStatus && matchSemester;
  });

  // Agrupa por semestre na ordem Anual → 1º Semestre → 2º Semestre.
  const SEMESTER_ORDER: SubjectSemester[] = ['ANNUAL', 'FIRST', 'SECOND'];
  const groupedBySemester = SEMESTER_ORDER
    .map((sem) => ({
      semester: sem,
      items: filtered
        .filter((d) => d.semester === sem)
        .sort((a, b) =>
          (a.nome_boletim || a.nome).localeCompare(b.nome_boletim || b.nome, 'pt-BR'),
        ),
    }))
    .filter((g) => g.items.length > 0);

  const getSemesterRange = (semester: SubjectSemester) => {
    const range = semesterDateRanges[semester];
    if (!range) return 'Período não definido';
    const start = new Date(range.startDate + 'T00:00:00').toLocaleDateString('pt-BR');
    const end = new Date(range.endDate + 'T00:00:00').toLocaleDateString('pt-BR');
    return `${start} a ${end}`;
  };

  const selectedCourse = cursoIdFromQuery ? cursos.find(c => c.id === cursoIdFromQuery) : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      <FeatureGuideCard title="Como usar Disciplinas" steps={[
        { icon: Plus, title: 'Nova disciplina', description: 'Cadastre código, nome, carga horária semanal e semestre.', color: 'blue' },
        { icon: GraduationCap, title: 'Vincular ao curso', description: 'Cada disciplina pertence a um curso específico.', color: 'green' },
        { icon: CalendarDays, title: 'Semestralidade', description: 'Defina se a disciplina é anual, 1º ou 2º semestre.', color: 'purple' },
        { icon: Clock, title: 'Carga horária', description: 'A carga semanal é usada para calcular o total de aulas no ano.', color: 'amber' },
      ]} />
      <PageHeader
        breadcrumbs={
          cursoIdFromQuery && selectedCourse
            ? [
                ...(fromSchool
                  ? [
                      { label: 'Escolas', href: '/escolas' },
                      { label: fromSchoolName || 'Escola', href: `/escolas/${fromSchool}` },
                      { label: 'Cursos', href: `/escolas/${fromSchool}/cursos` },
                    ]
                  : trackIdFromQuery
                  ? [
                      { label: 'Itinerários', href: '/itinerarios' },
                      { label: 'Cursos', href: `/itinerarios/${trackIdFromQuery}/cursos` },
                    ]
                  : [{ label: 'Cursos', href: '/cursos' }]),
                { label: selectedCourse.nome },
                { label: 'Disciplinas' },
              ]
            : [{ label: 'Acadêmico' }, { label: 'Disciplinas' }]
        }
        title="Disciplinas"
        eyebrow={selectedCourse?.nome}
        description="Cadastro de disciplinas por curso e semestre"
        icon={BookOpenCheck}
        badge={currentSemester ? { label: SEMESTER_LABELS[currentSemester], tone: 'info' } : undefined}
        backTo={
          fromSchool
            ? `/escolas/${fromSchool}/cursos`
            : trackIdFromQuery
            ? `/itinerarios/${trackIdFromQuery}/cursos`
            : cursoIdFromQuery
            ? '/cursos'
            : undefined
        }
        actions={
          <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />Nova Disciplina
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {!courseIdFromParams && (
                <SearchableSelect
                  value={filterCursoId}
                  onValueChange={setFilterCursoId}
                  placeholder="Curso"
                  searchPlaceholder="Buscar curso..."
                  triggerClassName="w-full sm:w-[160px]"
                  options={[
                    { value: 'all', label: 'Todos os Cursos' },
                    ...cursos.map(c => ({ value: c.id, label: c.nome })),
                  ]}
                />
              )}
              <Select value={filterSemester} onValueChange={(v) => setFilterSemester(v as 'all' | SubjectSemester)}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Semestre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ANNUAL">Anual</SelectItem>
                  <SelectItem value="FIRST">1º Semestre</SelectItem>
                  <SelectItem value="SECOND">2º Semestre</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as 'all' | 'ativo' | 'inativo')}>
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {loading || semesterLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome Boletim</TableHead>
                      <TableHead>Nome da Disciplina</TableHead>
                      <TableHead>Semestre</TableHead>
                      <TableHead>CH Semanal</TableHead>
                      <TableHead>Total Aulas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhuma disciplina encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      groupedBySemester.map((group) => (
                        <Fragment key={group.semester}>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableCell colSpan={7} className="py-2">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={group.semester === currentSemester ? 'default' : 'secondary'}
                                  className="uppercase tracking-wide"
                                >
                                  {SEMESTER_LABELS[group.semester]}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {group.items.length} disciplina{group.items.length === 1 ? '' : 's'}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                          {group.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="text-sm">{item.nome_boletim || '-'}</TableCell>
                              <TableCell className="font-medium">{item.nome}</TableCell>
                              <TableCell>
                                <Badge variant={item.semester === currentSemester ? 'default' : 'outline'}>
                                  {SEMESTER_LABELS[item.semester]}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <span>{item.carga_horaria_semanal}h</span>
                                  {anpBySubject[item.id]?.length > 0 && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700 bg-amber-50 cursor-help">
                                            <Wifi className="h-3 w-3" />
                                            ANP
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                          <p className="font-semibold mb-1">Possui ANP em {anpBySubject[item.id].length} turma(s):</p>
                                          <ul className="space-y-0.5 text-xs">
                                            {anpBySubject[item.id].slice(0, 5).map((m, i) => (
                                              <li key={i}>
                                                • {m.class_group_name} ({SEMESTER_LABELS[m.semester as SubjectSemester]}): {m.ch_presencial}h pres + {m.ch_anp}h ANP
                                              </li>
                                            ))}
                                            {anpBySubject[item.id].length > 5 && <li>… e mais {anpBySubject[item.id].length - 5}</li>}
                                          </ul>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium">{item.total_classes}</span>
                                <span className="text-muted-foreground text-xs ml-1">aulas</span>
                              </TableCell>
                              <TableCell>
                                <Badge variant={item.status === 'ativo' ? 'default' : 'secondary'}>
                                  {item.status === 'ativo' ? 'Ativo' : 'Inativo'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" title="Calendário Semanal" onClick={() => navigate(`/disciplinas/${item.id}/calendario-semanal`)}>
                                    <CalendarDays className="h-4 w-4 text-primary" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => { setSelected(item); setDeleteDialogOpen(true); }}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile/Tablet Cards */}
              <div className="lg:hidden divide-y">
                {filtered.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhuma disciplina encontrada
                  </div>
                ) : (
                  groupedBySemester.map((group) => (
                    <div key={group.semester}>
                      <div className="flex items-center gap-2 bg-muted/40 px-4 py-2">
                        <Badge
                          variant={group.semester === currentSemester ? 'default' : 'secondary'}
                          className="uppercase tracking-wide"
                        >
                          {SEMESTER_LABELS[group.semester]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {group.items.length} disciplina{group.items.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="divide-y">
                        {group.items.map((item) => (
                          <div key={item.id} className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium">{item.nome}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs font-mono">{item.codigo}</Badge>
                                  <Badge variant={item.semester === currentSemester ? 'default' : 'outline'} className="text-xs">
                                    {SEMESTER_LABELS[item.semester]}
                                  </Badge>
                                </div>
                              </div>
                              <Badge variant={item.status === 'ativo' ? 'default' : 'secondary'} className="shrink-0">
                                {item.status === 'ativo' ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                              <span>{item.course?.nome || '-'}</span>
                              <span>•</span>
                              <span>{item.carga_horaria_semanal}h/sem</span>
                              {anpBySubject[item.id]?.length > 0 && (
                                <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700 bg-amber-50 text-xs">
                                  <Wifi className="h-3 w-3" />
                                  ANP em {anpBySubject[item.id].length} turma(s)
                                </Badge>
                              )}
                              <span>•</span>
                              <span className="font-medium text-foreground">{item.total_classes} aulas</span>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                              <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/disciplinas/${item.id}/calendario-semanal`)}>
                                <CalendarDays className="mr-2 h-4 w-4 text-primary" /> Calendário
                              </Button>
                              <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenDialog(item)}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                              </Button>
                              <Button variant="outline" size="sm" className="flex-1" onClick={() => { setSelected(item); setDeleteDialogOpen(true); }}>
                                <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Excluir
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog Create/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected ? 'Editar Disciplina' : 'Nova Disciplina'}</DialogTitle>
            <DialogDescription>
              Preencha os dados da disciplina. O total de aulas será calculado automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Curso *</Label>
              {cursoIdFromQuery || selected ? (
                <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {cursos.find(c => c.id === (cursoIdFromQuery || formData.course_id))?.nome || 'Curso selecionado'}
                  </span>
                  {selected && !cursoIdFromQuery && (
                    <span className="ml-auto text-xs text-muted-foreground">(bloqueado na edição)</span>
                  )}
                </div>
              ) : (
                <>
                  <Select value={formData.course_id} onValueChange={(v) => setFormData({ ...formData, course_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o curso..." />
                    </SelectTrigger>
                    <SelectContent>
                      {cursos.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Apenas cursos ativos são exibidos. Após salvar, o curso não poderá ser alterado.</p>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                  placeholder="Ex: MAT001"
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label>Semestre *</Label>
                <Select 
                  value={formData.semester} 
                  onValueChange={(v) => setFormData({ ...formData, semester: v as SubjectSemester })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEMESTER_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome da disciplina"
              />
            </div>

            <div className="space-y-2">
              <Label>Nome para o Boletim Escolar *</Label>
              <Select value={formData.nome_boletim || ''} onValueChange={(v) => setFormData({ ...formData, nome_boletim: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Projetos Empreendedores">Projetos Empreendedores</SelectItem>
                  <SelectItem value="UC 1">UC 1</SelectItem>
                  <SelectItem value="UC 2">UC 2</SelectItem>
                  <SelectItem value="UC 3">UC 3</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Este nome será utilizado na impressão dos boletins escolares.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CH Semanal (horas) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.carga_horaria_semanal}
                  onChange={(e) => setFormData({ ...formData, carga_horaria_semanal: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as 'ativo' | 'inativo' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao || ''}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição da disciplina (opcional)"
                rows={3}
              />
            </div>

            {/* Info about total classes */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Total de Aulas:</strong> Calculado automaticamente com base no calendário acadêmico 
                e nos dias letivos do {SEMESTER_LABELS[formData.semester]}.
                {semesterDateRanges[formData.semester] && (
                  <span className="block mt-1 text-xs">
                    Período: {getSemesterRange(formData.semester)}
                  </span>
                )}
              </AlertDescription>
            </Alert>

            {selected && (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm font-medium">Total de Aulas Calculado</p>
                <p className="text-2xl font-bold text-primary">{selected.total_classes} aulas</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Este valor é atualizado automaticamente quando o calendário acadêmico é alterado.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a disciplina "{selected?.nome}"?
              <br />
              <span className="text-xs">Esta ação não poderá ser desfeita.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="w-full sm:w-auto">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
