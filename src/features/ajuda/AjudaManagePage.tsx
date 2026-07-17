import { supabase } from '@/integrations/supabase/client';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit2, Eye, Plus, Search, Star, Trash2, HelpCircle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useHelpTutorials, useDeleteHelpTutorial } from './hooks/useHelpTutorials';
import { HELP_CATEGORIES, getCategoryMeta, CONTENT_TYPE_LABELS, AUDIENCE_OPTIONS } from './constants';
import { useToast } from '@/hooks/use-toast';
import { ajudaApi } from '@/features/ajuda/api';
import { useQueryClient } from '@tanstack/react-query';
import { useConfirm } from '@/hooks/useConfirm';

const sb = supabase as any;

export default function AjudaManagePage() {
  const { data: tutorials = [], isLoading } = useHelpTutorials();
  const del = useDeleteHelpTutorial();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState<string>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tutorials.filter((t) => {
      if (cat !== 'all' && t.category !== cat) return false;
      if (!q) return true;
      return t.title.toLowerCase().includes(q) || t.feature_name.toLowerCase().includes(q);
    });
  }, [tutorials, search, cat]);

  const toggleFeatured = async (id: string, current: boolean) => {
    const { error } = await sb.from('help_tutorials').update({ is_featured: !current }).eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else qc.invalidateQueries({ queryKey: ['help-tutorials'] });
  };

  const confirm = useConfirm();

  const handleDelete = async (id: string, title: string) => {
    const ok = await confirm({
      title: 'Excluir tutorial',
      description: `Excluir o tutorial "${title}"?`,
      confirmText: 'Excluir',
      variant: 'destructive',
    });
    if (!ok) return;
    await del.mutateAsync(id);
    toast({ title: 'Tutorial excluído' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Central de Ajuda', href: '/ajuda' }, { label: 'Gerenciar tutoriais' }]}
        title="Gerenciar tutoriais"
        description="Cadastre, edite e organize as aulas tutoriais da Central de Ajuda."
        icon={HelpCircle}
        backTo="/ajuda"
        actions={
          <Button asChild className="bg-[#FFDA45] hover:bg-[#FFDA45]/90 text-[#1B1E2C]">
            <Link to="/ajuda/novo"><Plus className="h-4 w-4 mr-1.5" /> Novo tutorial</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título ou funcionalidade..." className="pl-9" />
            </div>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {HELP_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tutorial</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Funcionalidade</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Visibilidade</TableHead>
                  <TableHead className="text-center">Views</TableHead>
                  <TableHead className="text-center">Destaque</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum tutorial encontrado.</TableCell></TableRow>
                ) : (
                  filtered.map((t) => {
                    const meta = getCategoryMeta(t.category);
                    const audience = AUDIENCE_OPTIONS.find((a) => a.value === t.audience);
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.title}</TableCell>
                        <TableCell><Badge variant="secondary"><meta.icon className="h-3 w-3 mr-1" /> {meta.label}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{t.feature_name}</TableCell>
                        <TableCell><Badge variant="outline">{CONTENT_TYPE_LABELS[t.content_type]}</Badge></TableCell>
                        <TableCell className="text-xs">{audience?.label}</TableCell>
                        <TableCell className="text-center font-mono text-sm">{t.view_count}</TableCell>
                        <TableCell className="text-center">
                          <Button size="icon" variant="ghost" onClick={() => toggleFeatured(t.id, t.is_featured)}>
                            <Star className={`h-4 w-4 ${t.is_featured ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground'}`} />
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" asChild>
                            <Link to={`/ajuda/watch/${t.id}`}><Eye className="h-4 w-4" /></Link>
                          </Button>
                          <Button size="icon" variant="ghost" asChild>
                            <Link to={`/ajuda/${t.id}/editar`}><Edit2 className="h-4 w-4" /></Link>
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(t.id, t.title)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
