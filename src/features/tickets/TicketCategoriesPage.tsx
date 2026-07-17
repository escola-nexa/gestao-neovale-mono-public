import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiAdapter } from '@/lib/api-adapter';
import { useOrganization } from '@/hooks/useOrganization';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Tag } from 'lucide-react';
import { toast } from 'sonner';

const priorityLabels: Record<string, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica',
};

const priorityColors: Record<string, string> = {
  baixa: 'bg-muted text-muted-foreground',
  media: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  alta: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  critica: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export default function TicketCategoriesPage() {
  const navigate = useNavigate();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priorityDefault, setPriorityDefault] = useState('media');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['ticket-categories', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      return ApiAdapter.ticketCategories.getAll({ organizationId });
    },
    enabled: !!organizationId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId || !name.trim()) throw new Error('Nome obrigatório');
      if (editingId) {
        await ApiAdapter.ticketCategories.update(editingId, {
          name: name.trim(),
          description: description.trim() || null,
          priority_default: priorityDefault
        });
      } else {
        await ApiAdapter.ticketCategories.create({
          organization_id: organizationId,
          name: name.trim(),
          description: description.trim() || null,
          priority_default: priorityDefault
        });
      }
    },
    onSuccess: () => {
      toast.success(editingId ? 'Categoria atualizada!' : 'Categoria criada!');
      queryClient.invalidateQueries({ queryKey: ['ticket-categories'] });
      resetForm();
    },
    onError: () => toast.error('Erro ao salvar categoria'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await ApiAdapter.ticketCategories.delete(id);
    },
    onSuccess: () => {
      toast.success('Categoria removida');
      queryClient.invalidateQueries({ queryKey: ['ticket-categories'] });
    },
    onError: () => toast.error('Erro ao remover categoria. Pode haver tickets vinculados.'),
  });

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setPriorityDefault('media');
    setDialogOpen(false);
  };

  const handleEdit = (cat: any) => {
    setEditingId(cat.id);
    setName(cat.name);
    setDescription(cat.description || '');
    setPriorityDefault(cat.priority_default || 'media');
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Tickets', href: '/tickets' }, { label: 'Categorias' }]}
        title="Categorias de Tickets"
        description="Organize os tipos de chamados disponíveis"
        backTo="/tickets"
        actions={
          <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) resetForm(); setDialogOpen(v); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Nova Categoria</Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Nome *</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Infraestrutura" />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição opcional..." rows={3} />
                </div>
                <div>
                  <Label>Prioridade Padrão</Label>
                  <Select value={priorityDefault} onValueChange={setPriorityDefault}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Ao selecionar esta categoria, a prioridade será preenchida automaticamente.</p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                  <Button onClick={() => saveMutation.mutate()} disabled={!name.trim() || saveMutation.isPending}>
                    {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingId ? 'Salvar' : 'Criar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Tag className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">Nenhuma categoria cadastrada</p>
            <p className="text-sm">Crie categorias para organizar os tickets.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat: any) => (
            <Card key={cat.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    {cat.name}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(cat)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(cat.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {cat.description && (
                  <p className="text-sm text-muted-foreground">{cat.description}</p>
                )}
                <Badge variant="outline" className={`text-xs ${priorityColors[cat.priority_default] || ''}`}>
                  Prioridade: {priorityLabels[cat.priority_default] || cat.priority_default}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
