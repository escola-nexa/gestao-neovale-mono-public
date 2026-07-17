import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { escolasApi } from '@/features/escolas/api';
import { classGroupsApi, coursesApi, academicCalendarsApi, type ClassGroupData, type CourseData, type AcademicCalendarData } from '@/services/supabaseApi';
import { ApiAdapter } from '@/lib/api-adapter';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, BookOpen, Users, GraduationCap, Loader2, Plus, Pencil, Trash2, UserPlus, Eye } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

interface ClassGroupInfo {
  id: string;
  nome: string;
  ano_letivo: string;
  status: string;
  course: { nome: string } | null;
  studentCount?: number;
}

interface TurmaFormData {
  nome: string;
  ano_letivo: string;
  course_id: string;
  status: 'ativo' | 'inativo';
}

export default function SchoolClassGroupsPage() {
  const { schoolId } = useParams<{ schoolId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [schoolName, setSchoolName] = useState('');
  const [classGroups, setClassGroups] = useState<ClassGroupInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // CRUD state
  const [cursos, setCursos] = useState<CourseData[]>([]);
  const [calendarios, setCalendarios] = useState<AcademicCalendarData[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<ClassGroupInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<TurmaFormData>({
    nome: '',
    ano_letivo: '',
    course_id: '',
    status: 'ativo',
  });

  useEffect(() => {
    if (schoolId) loadData();
  }, [schoolId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [schoolRes, classGroupsData, coursesData, calData] = await Promise.all([
        ApiAdapter.escolas.getById(schoolId!),
        ApiAdapter.turmas.getAll(),
        ApiAdapter.cursos.getAll(),
        academicCalendarsApi.getActiveOrClosed(),
      ]);

      if (schoolRes) setSchoolName(schoolRes.nome);

      // Client-side filtering and mapping for classGroups since we are using adapter
      const filteredGroups = classGroupsData
        .filter((g: any) => g.school_id === schoolId)
        .map((g: any) => {
           // Find the course to attach the name
           const courseMatch = coursesData.find((c: any) => c.id === g.course_id);
           return {
             ...g,
             course: courseMatch ? { nome: courseMatch.nome } : null
           };
        })
        .sort((a: any, b: any) => {
          if (a.ano_letivo !== b.ano_letivo) return a.ano_letivo.localeCompare(b.ano_letivo);
          return a.nome.localeCompare(b.nome);
        });

      // Filter courses available for this school
      setCursos(coursesData.filter(c => c.school_ids?.includes(schoolId!) && c.status === 'ativo'));
      setCalendarios(calData);

      const groups = filteredGroups;

      if (groups.length > 0) {
        const groupIds = groups.map(g => g.id);
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('class_group_id')
          .in('class_group_id', groupIds)
          .eq('status', 'ativa');

        const countMap: Record<string, number> = {};
        (enrollments || []).forEach(e => {
          countMap[e.class_group_id] = (countMap[e.class_group_id] || 0) + 1;
        });

        setClassGroups(groups.map(g => ({ ...g, studentCount: countMap[g.id] || 0 })));
      } else {
        setClassGroups([]);
      }
    } catch {
      console.error('Error loading class groups');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item?: ClassGroupInfo) => {
    const activeCalendar = calendarios.find(c => c.status === 'ACTIVE');
    const defaultYear = activeCalendar?.academic_year.toString() || '';

    if (item) {
      setSelected(item);
      // We need to find the course_id from the course name
      const matchedCourse = cursos.find(c => c.nome === (item.course as any)?.nome);
      setFormData({
        nome: item.nome,
        ano_letivo: item.ano_letivo,
        course_id: matchedCourse?.id || '',
        status: item.status as 'ativo' | 'inativo',
      });
    } else {
      setSelected(null);
      setFormData({ nome: '', ano_letivo: defaultYear, course_id: '', status: 'ativo' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.course_id || !formData.ano_letivo) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...formData, school_id: schoolId! };
      if (selected) {
        await ApiAdapter.turmas.update(selected.id, payload);
        toast({ title: 'Sucesso', description: 'Turma atualizada' });
      } else {
        await ApiAdapter.turmas.create(payload);
        toast({ title: 'Sucesso', description: 'Turma criada' });
      }
      setDialogOpen(false);
      loadData();
    } catch {
      toast({ title: 'Erro', description: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await ApiAdapter.turmas.delete(selected.id);
      toast({ title: 'Sucesso', description: 'Turma removida' });
      setDeleteDialogOpen(false);
      loadData();
    } catch {
      toast({ title: 'Erro', description: 'Erro ao remover', variant: 'destructive' });
    }
  };

  // Group by ano_letivo
  const groupedByYear: Record<string, ClassGroupInfo[]> = {};
  classGroups.forEach(cg => {
    if (!groupedByYear[cg.ano_letivo]) groupedByYear[cg.ano_letivo] = [];
    groupedByYear[cg.ano_letivo].push(cg);
  });

  const sortedYears = Object.keys(groupedByYear).sort();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Escolas', href: '/escolas' },
          { label: schoolName || '...', href: `/escolas/${schoolId}` },
          { label: 'Turmas' },
        ]}
        title="Turmas"
        description={schoolName}
        backTo={`/escolas/${schoolId}`}
        badge={{ label: `${classGroups.length} turma${classGroups.length !== 1 ? 's' : ''}`, tone: 'info' }}
        actions={
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" /> Nova Turma
          </Button>
        }
      />

      {classGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <BookOpen className="mx-auto h-10 w-10 mb-3 opacity-40" />
              <p>Nenhuma turma nesta escola</p>
              <Button onClick={() => handleOpenDialog()} variant="outline" className="mt-4">
                <Plus className="mr-2 h-4 w-4" /> Cadastrar Turma
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedYears.map(year => (
            <div key={year}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="font-semibold text-base text-primary">Ano Letivo: {year}</h2>
                <div className="flex-1 border-t border-border/50" />
                <Badge variant="outline" className="text-xs">{groupedByYear[year].length} turmas</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {groupedByYear[year].map(cg => (
                  <Card key={cg.id} className="hover:shadow-sm hover:border-primary/30 transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{cg.nome}</p>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                            <GraduationCap className="h-3.5 w-3.5" />
                            <span className="truncate">{(cg.course as any)?.nome || 'Sem Curso'}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {cg.status === 'ativo' ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 mt-3 text-sm text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span><strong className="text-foreground">{cg.studentCount}</strong> alunos</span>
                      </div>
                      {/* Student shortcuts */}
                      <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/escolas/${schoolId}/alunos?turma=${cg.id}`)}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" /> Ver Alunos
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/escolas/${schoolId}/alunos?turma=${cg.id}&novo=1`)}
                        >
                          <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Adicionar
                        </Button>
                      </div>
                      {/* Management actions */}
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 text-muted-foreground"
                          onClick={() => handleOpenDialog(cg)}
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 text-destructive hover:text-destructive"
                          onClick={() => { setSelected(cg); setDeleteDialogOpen(true); }}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Excluir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected ? 'Editar Turma' : 'Nova Turma'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Curso *</Label>
              <SearchableSelect
                value={formData.course_id}
                onValueChange={(v) => setFormData({ ...formData, course_id: v })}
                placeholder="Selecione o curso..."
                searchPlaceholder="Buscar curso..."
                options={cursos.map(c => ({ value: c.id, label: c.nome }))}
              />
              {cursos.length === 0 && (
                <p className="text-xs text-amber-600">
                  Nenhum curso disponível para esta escola.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Ano Letivo *</Label>
              <Select
                value={formData.ano_letivo}
                onValueChange={(v) => setFormData({ ...formData, ano_letivo: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ano letivo..." />
                </SelectTrigger>
                <SelectContent>
                  {calendarios.map(cal => (
                    <SelectItem key={cal.id} value={cal.academic_year.toString()}>
                      {cal.academic_year} {cal.status === 'ACTIVE' && '(Ativo)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nome da Turma *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: 1º Ano A"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Status Ativo</Label>
              <Switch
                checked={formData.status === 'ativo'}
                onCheckedChange={(c) => setFormData({ ...formData, status: c ? 'ativo' : 'inativo' })}
              />
            </div>
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
              Remover a turma "{selected?.nome}"? Esta ação não pode ser desfeita.
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
