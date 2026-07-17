import { useState, useEffect } from 'react';
import { Plus, Trash2, MapPin, Building2, ChevronDown, ChevronRight, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ApiAdapter } from '@/lib/api-adapter';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';

interface State {
  id: string;
  nome: string;
  sigla: string;
}

interface City {
  id: string;
  state_id?: string;
  stateId?: string;
  nome: string;
}

export default function EstadosCidadesPage() {
  const { organizationId, isLoading: orgLoading } = useOrganization();
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({});

  // State dialog
  const [stateDialogOpen, setStateDialogOpen] = useState(false);
  const [editingState, setEditingState] = useState<State | null>(null);
  const [stateForm, setStateForm] = useState({ nome: '', sigla: '' });
  const [savingState, setSavingState] = useState(false);

  // City dialog
  const [cityDialogOpen, setCityDialogOpen] = useState(false);
  const [cityForStateId, setCityForStateId] = useState<string | null>(null);
  const [cityForm, setCityForm] = useState({ nome: '' });
  const [savingCity, setSavingCity] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'state' | 'city'; id: string; name: string } | null>(null);

  const fetchData = async () => {
    if (!organizationId) return;
    setLoading(true);
    const [statesData, citiesData] = await Promise.all([
      ApiAdapter.locais.getStates({ organizationId }),
      ApiAdapter.locais.getCities({ organizationId }),
    ]);
    if (statesData) setStates(statesData as any[]);
    if (citiesData) setCities(citiesData as any[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [organizationId]);

  const handleSaveState = async () => {
    if (!organizationId) return;
    if (!stateForm.nome.trim() || !stateForm.sigla.trim()) {
      toast.error('Preencha nome e sigla do estado');
      return;
    }
    setSavingState(true);
    if (editingState) {
      try {
        await ApiAdapter.locais.updateState(editingState.id, { nome: stateForm.nome.trim(), sigla: stateForm.sigla.trim().toUpperCase() });
        toast.success('Estado atualizado');
      } catch (error: any) { toast.error(error.message); }
    } else {
      try {
        await ApiAdapter.locais.createState({ organization_id: organizationId, nome: stateForm.nome.trim(), sigla: stateForm.sigla.trim().toUpperCase() });
        toast.success('Estado cadastrado');
      } catch (error: any) { toast.error(error.message); }
    }
    setSavingState(false);
    setStateDialogOpen(false);
    setEditingState(null);
    setStateForm({ nome: '', sigla: '' });
    fetchData();
  };

  const handleSaveCity = async () => {
    if (!organizationId || !cityForStateId) return;
    if (!cityForm.nome.trim()) { toast.error('Preencha o nome da cidade'); return; }
    setSavingCity(true);
    try {
      await ApiAdapter.locais.createCity({ organization_id: organizationId, state_id: cityForStateId, nome: cityForm.nome.trim() });
      toast.success('Cidade cadastrada');
    } catch (error: any) { toast.error(error.message); }
    setSavingCity(false);
    setCityDialogOpen(false);
    setCityForm({ nome: '' });
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'state') {
        await ApiAdapter.locais.deleteState(deleteTarget.id);
      } else {
        await ApiAdapter.locais.deleteCity(deleteTarget.id);
      }
      toast.success(`${deleteTarget.type === 'state' ? 'Estado' : 'Cidade'} removido(a)`);
    } catch (error: any) { toast.error(error.message); }
    setDeleteTarget(null);
    fetchData();
  };

  const getCitiesForState = (stateId: string) => cities.filter(c => (c.state_id || c.stateId) === stateId);

  if (loading || orgLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Configurações' }, { label: 'Estados e Cidades' }]}
        title="Estados e Cidades"
        description="Cadastre os estados e as cidades pertencentes a cada estado"
        icon={MapPin}
        actions={
          <Button onClick={() => { setEditingState(null); setStateForm({ nome: '', sigla: '' }); setStateDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo Estado
          </Button>
        }
      />

      {states.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">Nenhum estado cadastrado</h3>
            <p className="text-sm text-muted-foreground mt-1">Comece cadastrando um estado para depois adicionar cidades.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {states.map((state) => {
            const stateCities = getCitiesForState(state.id);
            const isOpen = openStates[state.id] === true;

            return (
              <Card key={state.id} className="overflow-hidden">
                <Collapsible open={isOpen} onOpenChange={(open) => setOpenStates(prev => ({ ...prev, [state.id]: open }))}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          <Badge variant="outline" className="text-xs font-bold bg-primary/10 text-primary border-primary/30">
                            {state.sigla}
                          </Badge>
                          <CardTitle className="text-base">{state.nome}</CardTitle>
                          <Badge variant="secondary" className="text-xs">
                            <Building2 className="h-3 w-3 mr-1" />
                            {stateCities.length} cidade{stateCities.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingState(state); setStateForm({ nome: state.nome, sigla: state.sigla }); setStateDialogOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: 'state', id: state.id, name: state.nome })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 px-4">
                      <div className="ml-7 space-y-2">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-muted-foreground">Cidades cadastradas</span>
                          <Button variant="outline" size="sm" onClick={() => { setCityForStateId(state.id); setCityForm({ nome: '' }); setCityDialogOpen(true); }}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Cidade
                          </Button>
                        </div>
                        {stateCities.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic py-2">Nenhuma cidade cadastrada para este estado.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {stateCities.map((city) => (
                              <div key={city.id} className="flex items-center justify-between rounded-lg border px-3 py-2 bg-muted/20 hover:bg-muted/40 transition-colors">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-sm">{city.nome}</span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: 'city', id: city.id, name: city.nome })}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      {/* State Dialog */}
      <Dialog open={stateDialogOpen} onOpenChange={setStateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingState ? 'Editar Estado' : 'Novo Estado'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Nome do Estado *</Label>
              <Input value={stateForm.nome} onChange={(e) => setStateForm(prev => ({ ...prev, nome: e.target.value }))} placeholder="Ex: São Paulo" />
            </div>
            <div className="grid gap-2">
              <Label>Sigla *</Label>
              <Input value={stateForm.sigla} onChange={(e) => setStateForm(prev => ({ ...prev, sigla: e.target.value.toUpperCase() }))} placeholder="Ex: SP" maxLength={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveState} disabled={savingState}>
              {savingState && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingState ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* City Dialog */}
      <Dialog open={cityDialogOpen} onOpenChange={setCityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Cidade</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label>Nome da Cidade *</Label>
            <Input value={cityForm.nome} onChange={(e) => setCityForm({ nome: e.target.value })} placeholder="Ex: Campinas" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCityDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCity} disabled={savingCity}>
              {savingCity && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir {deleteTarget?.type === 'state' ? 'o estado' : 'a cidade'} <strong>{deleteTarget?.name}</strong>?
              {deleteTarget?.type === 'state' && ' Todas as cidades vinculadas serão removidas.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
