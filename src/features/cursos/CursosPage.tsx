import { useState, useEffect, useMemo } from 'react';
import { formativeTracksApi, CourseData, SchoolData, FormativeTrackData } from '@/services/supabaseApi';
import { ApiAdapter } from '@/lib/api-adapter';
import { NivelEnsino, NIVEIS_ENSINO } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, Loader2, Filter, X, Route, ChevronDown, ChevronRight, GraduationCap, School, ArrowLeft, BookOpen, Link2 } from 'lucide-react';
import FeatureGuideCard from '@/components/FeatureGuideCard';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { CourseFormDialog } from './components/CourseFormDialog';
import { PageHeader } from '@/components/PageHeader';

interface CursoFormData {
  codigo: string;
  nome: string;
  descricao: string;
  nivel_ensino: NivelEnsino;
  status: 'ativo' | 'inativo';
  formative_track_id: string | null;
  school_ids: string[];
}

const initialFormData: CursoFormData = {
  codigo: '',
  nome: '',
  descricao: '',
  nivel_ensino: 'fundamental_1',
  status: 'ativo',
  formative_track_id: null,
  school_ids: [],
};

interface Filters {
  formativeTrackId: string;
  status: string;
  courseName: string;
  schoolName: string;
}

const initialFilters: Filters = {
  formativeTrackId: '',
  status: '',
  courseName: '',
  schoolName: '',
};

export default function CursosPage() {
  const { toast } = useToast();
  const [cursos, setCursos] = useState<CourseData[]>([]);
  const [escolas, setEscolas] = useState<SchoolData[]>([]);
  const [itinerarios, setItinerarios] = useState<FormativeTrackData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<CourseData | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CursoFormData>(initialFormData);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { trackId } = useParams<{ trackId?: string }>();
  // Support both route param and query param for backwards compatibility
  const itinerarioParam = trackId || searchParams.get('itinerario');

  useEffect(() => {
    if (itinerarioParam) {
      setFilters(prev => ({ ...prev, formativeTrackId: itinerarioParam }));
      setShowFilters(true);
    }
  }, [itinerarioParam]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { 
      const [c, e, i] = await Promise.all([
        ApiAdapter.cursos.getAll(), 
        ApiAdapter.escolas.getAll(),
        formativeTracksApi.getAll()
      ]); 
      setCursos(c); 
      setEscolas(e.filter(x => x.status === 'ativo')); 
      setItinerarios(i);
      // Expand all groups by default
      const groupIds = new Set(i.map(it => it.id));
      groupIds.add('sem-itinerario');
      setExpandedGroups(groupIds);
    } 
    catch { toast({ title: 'Erro', description: 'Erro ao carregar dados', variant: 'destructive' }); } 
    finally { setLoading(false); }
  };

  const handleOpenDialog = (item?: CourseData) => {
    if (item) { 
      setSelected(item); 
      setFormData({ 
        codigo: item.codigo,
        nome: item.nome, 
        descricao: item.descricao || '',
        nivel_ensino: item.nivel_ensino as NivelEnsino,
        status: item.status,
        formative_track_id: item.formative_track_id,
        school_ids: item.school_ids || [],
      }); 
    } else { 
      setSelected(null); 
      setFormData(initialFormData); 
    }
    setDialogOpen(true);
  };

  const handleToggleEscola = (escolaId: string) => {
    setFormData(prev => ({
      ...prev,
      school_ids: prev.school_ids.includes(escolaId)
        ? prev.school_ids.filter(id => id !== escolaId)
        : [...prev.school_ids, escolaId]
    }));
  };

  const handleSave = async () => {
    if (!formData.codigo || !formData.nome || !formData.nivel_ensino) { 
      toast({ title: 'Erro', description: 'Preencha os campos obrigatórios', variant: 'destructive' }); 
      return; 
    }
    setSaving(true);
    try {
      if (selected) { 
        await ApiAdapter.cursos.update(selected.id, formData); 
        toast({ title: 'Sucesso', description: 'Curso atualizado' }); 
      } else { 
        await ApiAdapter.cursos.create(formData); 
        toast({ title: 'Sucesso', description: 'Curso criado' }); 
      }
      setDialogOpen(false); 
      loadData();
    } catch { toast({ title: 'Erro', description: 'Erro ao salvar', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try { 
      await ApiAdapter.cursos.delete(selected.id); 
      toast({ title: 'Sucesso', description: 'Curso removido' }); 
      setDeleteDialogOpen(false); 
      loadData(); 
    }
    catch { toast({ title: 'Erro', description: 'Erro ao remover', variant: 'destructive' }); }
  };

  const getNivelLabel = (nivel: string) => {
    return NIVEIS_ENSINO.find(n => n.value === nivel)?.label || nivel;
  };

  const getEscolasNomes = (schoolIds: string[]) => {
    return schoolIds.map(id => escolas.find(e => e.id === id)?.nome || '').filter(Boolean);
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Apply filters
  const filtered = useMemo(() => {
    return cursos.filter(c => {
      // Filter by formative track
      if (filters.formativeTrackId) {
        if (filters.formativeTrackId === 'sem-itinerario') {
          if (c.formative_track_id) return false;
        } else {
          if (c.formative_track_id !== filters.formativeTrackId) return false;
        }
      }
      
      // Filter by status
      if (filters.status && c.status !== filters.status) return false;
      
      // Filter by course name
      if (filters.courseName && !c.nome.toLowerCase().includes(filters.courseName.toLowerCase())) return false;
      
      // Filter by school name
      if (filters.schoolName) {
        const courseSchoolNames = getEscolasNomes(c.school_ids || []);
        const hasMatchingSchool = courseSchoolNames.some(name => 
          name.toLowerCase().includes(filters.schoolName.toLowerCase())
        );
        if (!hasMatchingSchool) return false;
      }
      
      return true;
    });
  }, [cursos, filters, escolas]);

  // Group courses by formative track
  const groupedCourses = useMemo(() => {
    const groups: Record<string, { track: FormativeTrackData | null; courses: CourseData[] }> = {};
    
    // Initialize groups for all itinerarios
    itinerarios.forEach(it => {
      groups[it.id] = { track: it, courses: [] };
    });
    groups['sem-itinerario'] = { track: null, courses: [] };
    
    // Distribute courses
    filtered.forEach(course => {
      const groupId = course.formative_track_id || 'sem-itinerario';
      if (!groups[groupId]) {
        groups[groupId] = { track: null, courses: [] };
      }
      groups[groupId].courses.push(course);
    });
    
    // Return only groups with courses
    return Object.entries(groups)
      .filter(([_, group]) => group.courses.length > 0)
      .sort((a, b) => {
        if (a[0] === 'sem-itinerario') return 1;
        if (b[0] === 'sem-itinerario') return -1;
        return (a[1].track?.name || '').localeCompare(b[1].track?.name || '');
      });
  }, [filtered, itinerarios]);

  const activeFiltersCount = Object.values(filters).filter(v => v !== '').length;
  const clearFilters = () => setFilters(initialFilters);

  const activeItinerarios = itinerarios.filter(i => i.status === 'ACTIVE');
  const selectedItinerario = itinerarioParam ? itinerarios.find(i => i.id === itinerarioParam) : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      <FeatureGuideCard title="Como usar Cursos" steps={[
        { icon: Plus, title: 'Criar curso', description: 'Clique em "Novo Curso" e defina nome, código, nível de ensino e itinerário.', color: 'blue' },
        { icon: Link2, title: 'Vincular a escolas', description: 'Associe o curso às escolas onde será oferecido.', color: 'green' },
        { icon: BookOpen, title: 'Gerenciar disciplinas', description: 'Acesse o curso para ver e cadastrar disciplinas vinculadas.', color: 'purple' },
        { icon: Filter, title: 'Filtrar por itinerário', description: 'Use os filtros para localizar cursos por itinerário ou nível.', color: 'amber' },
      ]} />
      <PageHeader
        breadcrumbs={
          itinerarioParam && selectedItinerario
            ? [
                { label: 'Itinerários Formativos', href: '/itinerarios' },
                { label: selectedItinerario.name },
                { label: 'Cursos' },
              ]
            : [{ label: 'Acadêmico' }, { label: 'Cursos' }]
        }
        title="Gestão de Cursos"
        eyebrow={selectedItinerario?.name}
        description="Cadastro e gerenciamento de cursos por itinerário formativo"
        icon={GraduationCap}
        backTo={itinerarioParam ? '/itinerarios' : undefined}
        actions={
          <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />Novo Curso
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl sm:text-3xl font-bold text-primary">{cursos.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Ativos</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-600">{cursos.filter(c => c.status === 'ativo').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Itinerários</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600">{itinerarios.filter(i => i.status === 'ACTIVE').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="pt-6">
            <Button 
              variant={showFilters ? "secondary" : "outline"} 
              onClick={() => setShowFilters(!showFilters)}
              className="w-full"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">{activeFiltersCount}</Badge>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Itinerário Formativo</Label>
              <SearchableSelect
                value={filters.formativeTrackId || "all"}
                onValueChange={(v) => setFilters({ ...filters, formativeTrackId: v === "all" ? "" : v })}
                placeholder="Todos"
                searchPlaceholder="Buscar itinerário..."
                options={[
                  { value: 'all', label: 'Todos' },
                  { value: 'sem-itinerario', label: 'Sem Itinerário' },
                  ...itinerarios.map(it => ({ value: it.id, label: it.name })),
                ]}
              />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Status</Label>
              <Select 
                  value={filters.status || "all"} 
                  onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Nome do Curso</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar..." 
                    value={filters.courseName} 
                    onChange={(e) => setFilters({ ...filters, courseName: e.target.value })} 
                    className="pl-10" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Nome da Escola</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar..." 
                    value={filters.schoolName} 
                    onChange={(e) => setFilters({ ...filters, schoolName: e.target.value })} 
                    className="pl-10" 
                  />
                </div>
              </div>
            </div>
            {activeFiltersCount > 0 && (
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" /> Limpar filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Courses grouped by formative track */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : groupedCourses.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum curso encontrado
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedCourses.map(([groupId, { track, courses }]) => (
            <Card key={groupId}>
              <Collapsible open={expandedGroups.has(groupId)} onOpenChange={() => toggleGroup(groupId)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {expandedGroups.has(groupId) ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <Route className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <h2 className="text-lg font-semibold">
                          {track?.name || 'Sem Itinerário Formativo'}
                        </h2>
                        {track?.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{track.description}</p>
                        )}
                      </div>
                      <Badge variant="secondary">{courses.length} cursos</Badge>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="p-0 sm:p-6 pt-0">
                    {/* Desktop Table */}
                    <div className="hidden lg:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Curso</TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead>Nível de Ensino</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-24">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {courses.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.nome}</TableCell>
                              <TableCell><Badge variant="outline">{item.codigo}</Badge></TableCell>
                              <TableCell>{getNivelLabel(item.nivel_ensino)}</TableCell>
                              <TableCell>
                                <Badge variant={item.status === 'ativo' ? 'default' : 'secondary'}>
                                  {item.status === 'ativo' ? 'Ativo' : 'Inativo'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => navigate(`/cursos/${item.id}/disciplinas${itinerarioParam ? `?trackId=${itinerarioParam}` : ''}`)} title="Ver Disciplinas">
                                    <GraduationCap className="h-4 w-4 mr-1" /> Disciplinas
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => navigate(`/cursos/${item.id}/escolas${itinerarioParam ? `?trackId=${itinerarioParam}` : ''}`)} title="Vincular Escolas">
                                    <School className="h-4 w-4 mr-1" /> Escolas
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
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile/Tablet Cards */}
                    <div className="lg:hidden divide-y">
                      {courses.map((item) => (
                        <div key={item.id} className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{item.nome}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">{item.codigo}</Badge>
                                <Badge variant={item.status === 'ativo' ? 'default' : 'secondary'} className="text-xs">
                                  {item.status === 'ativo' ? 'Ativo' : 'Inativo'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{getNivelLabel(item.nivel_ensino)}</p>
                          <div className="flex flex-wrap gap-2 pt-2">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/cursos/${item.id}/disciplinas${itinerarioParam ? `?trackId=${itinerarioParam}` : ''}`)}>
                              <GraduationCap className="mr-2 h-4 w-4" /> Disciplinas
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/cursos/${item.id}/escolas${itinerarioParam ? `?trackId=${itinerarioParam}` : ''}`)}>
                              <School className="mr-2 h-4 w-4" /> Escolas
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
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}

      <CourseFormDialog open={dialogOpen} onOpenChange={setDialogOpen} course={selected} itinerarios={itinerarios} onSuccess={loadData} contextTrackId={itinerarioParam || undefined} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Remover o curso "{selected?.nome}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
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
