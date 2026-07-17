import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formativeTracksApi, FormativeTrackData, coursesApi } from '@/services/supabaseApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, Loader2, Route, BookOpen, MoreVertical, GraduationCap, Settings } from 'lucide-react';
import FeatureGuideCard from '@/components/FeatureGuideCard';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PageHeader } from '@/components/PageHeader';

interface FormData {
  name: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
}

const initialFormData: FormData = {
  name: '',
  description: '',
  status: 'ACTIVE',
};

export default function ItinerariosPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [itinerarios, setItinerarios] = useState<FormativeTrackData[]>([]);
  const [courseCountMap, setCourseCountMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<FormativeTrackData | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { 
      const [data, courses] = await Promise.all([
        formativeTracksApi.getAll(),
        coursesApi.getAll(),
      ]);
      setItinerarios(data);
      const countMap: Record<string, number> = {};
      courses.forEach(c => {
        const key = c.formative_track_id || '';
        if (key) countMap[key] = (countMap[key] || 0) + 1;
      });
      setCourseCountMap(countMap);
    } 
    catch { toast({ title: 'Erro', description: 'Erro ao carregar dados', variant: 'destructive' }); } 
    finally { setLoading(false); }
  };

  const handleOpenDialog = (item?: FormativeTrackData) => {
    if (item) { 
      setSelected(item); 
      setFormData({ 
        name: item.name,
        description: item.description || '',
        status: item.status,
      }); 
    } else { 
      setSelected(null); 
      setFormData(initialFormData); 
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) { 
      toast({ title: 'Erro', description: 'Preencha o nome do itinerário', variant: 'destructive' }); 
      return; 
    }
    setSaving(true);
    try {
      if (selected) { 
        await formativeTracksApi.update(selected.id, formData); 
        toast({ title: 'Sucesso', description: 'Itinerário atualizado' }); 
      } else { 
        await formativeTracksApi.create(formData); 
        toast({ title: 'Sucesso', description: 'Itinerário criado' }); 
      }
      setDialogOpen(false); 
      loadData();
    } catch (err: any) { 
      const message = err?.message?.includes('unique') 
        ? 'Já existe um itinerário com este nome' 
        : 'Erro ao salvar';
      toast({ title: 'Erro', description: message, variant: 'destructive' }); 
    }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try { 
      await formativeTracksApi.delete(selected.id); 
      toast({ title: 'Sucesso', description: 'Itinerário removido' }); 
      setDeleteDialogOpen(false); 
      loadData(); 
    }
    catch { toast({ title: 'Erro', description: 'Erro ao remover. Verifique se não há cursos vinculados.', variant: 'destructive' }); }
  };

  const filtered = itinerarios.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <FeatureGuideCard title="Como usar Itinerários Formativos" steps={[
        { icon: Plus, title: 'Criar itinerário', description: 'Defina nome e descrição do itinerário formativo.', color: 'blue' },
        { icon: GraduationCap, title: 'Vincular cursos', description: 'Acesse os cursos do itinerário para gerenciar a grade curricular.', color: 'green' },
        { icon: Settings, title: 'Ativar/Desativar', description: 'Altere o status conforme necessidade acadêmica.', color: 'purple' },
        { icon: BookOpen, title: 'Ver cursos vinculados', description: 'Clique no itinerário para ver todos os cursos associados.', color: 'amber' },
      ]} />
      <PageHeader
        breadcrumbs={[{ label: 'Acadêmico' }, { label: 'Itinerários Formativos' }]}
        title="Itinerários Formativos"
        description="Eixos pedagógicos que organizam os cursos"
        icon={Route}
        actions={
          <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />Novo Itinerário
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl sm:text-3xl font-bold text-primary">{itinerarios.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Ativos</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-600">{itinerarios.filter(i => i.status === 'ACTIVE').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="pl-10" 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table/Cards */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Itinerários Cadastrados</h2>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {loading ? (
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
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Cursos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-muted-foreground max-w-md truncate">
                          {item.description || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{courseCountMap[item.id] || 0}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {item.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="default" size="sm" onClick={() => navigate(`/itinerarios/${item.id}/cursos`)}>
                              <BookOpen className="mr-1 h-4 w-4" /> Cursos
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenDialog(item)}>
                                  <Pencil className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => { setSelected(item); setDeleteDialogOpen(true); }}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum itinerário encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile/Tablet Cards */}
              <div className="lg:hidden divide-y">
                {filtered.map((item) => (
                  <div key={item.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{item.name}</p>
                      <Badge variant={item.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs mt-1">
                          {item.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Badge variant="outline" className="text-xs mt-1 ml-1">
                          {courseCountMap[item.id] || 0} cursos
                        </Badge>
                      </div>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button variant="default" size="sm" className="flex-1" onClick={() => navigate(`/itinerarios/${item.id}/cursos`)}>
                        <BookOpen className="mr-2 h-4 w-4" /> Cursos
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(item)}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => { setSelected(item); setDeleteDialogOpen(true); }}>
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhum itinerário encontrado
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected ? 'Editar Itinerário' : 'Novo Itinerário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                placeholder="Ex: Ciências da Natureza e Suas Tecnologias"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea 
                value={formData.description} 
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                placeholder="Descrição do itinerário formativo"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData({ ...formData, status: v as 'ACTIVE' | 'INACTIVE' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Ativo</SelectItem>
                  <SelectItem value="INACTIVE">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selected ? 'Salvar' : 'Criar Itinerário'}
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
              Remover o itinerário "{selected?.name}"? Esta ação não pode ser desfeita e só é possível se não houver cursos vinculados.
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
