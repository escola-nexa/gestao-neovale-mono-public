import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { PageHeader } from '@/components/PageHeader';
import { compartilhamentoApi } from '@/features/compartilhamento/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, CheckCircle, XCircle, Eye, Download, Trash2, HelpCircle, Shield, Monitor, MapPin, Filter as FilterIcon } from 'lucide-react';
import FeatureGuideCard from '@/components/FeatureGuideCard';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function AccessLogsPage() {
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isAdmin = user?.perfil === 'admin';

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['external-access-logs', organizationId, statusFilter, actionFilter],
    queryFn: async () => {
      if (!organizationId) return [];
      let query = supabase
        .from('external_access_logs')
        .select('*, external_links(token, content_type, schools(nome))')
        .eq('organization_id', organizationId)
        .order('accessed_at', { ascending: false })
        .limit(200);

      if (statusFilter !== 'all') query = query.eq('access_status', statusFilter);
      if (actionFilter !== 'all') query = query.eq('action_performed', actionFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('external_access_logs')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-access-logs'] });
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} registro(s) excluído(s) com sucesso`);
    },
    onError: () => {
      toast.error('Erro ao excluir registros');
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === logs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(logs.map((l: any) => l.id)));
    }
  };

  const handleDelete = () => {
    if (selectedIds.size === 0) return;
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(Array.from(selectedIds));
    setShowDeleteDialog(false);
  };

  const statusIcon = (status: string) => {
    if (status === 'authorized') return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <XCircle className="h-4 w-4 text-destructive" />;
  };

  const actionIcon = (action: string) => {
    if (action === 'download_de_pdf') return <Download className="h-3 w-3" />;
    if (action === 'visualizacao_de_conteudo' || action === 'acesso_autorizado') return <Eye className="h-3 w-3" />;
    return null;
  };

  return (
    <div className="space-y-4">
      <FeatureGuideCard
        title="Como usar os Logs de Acesso"
        icon={HelpCircle}
        steps={[
          { icon: Eye, title: 'Monitorar acessos', description: 'Acompanhe quem acessou, quando e qual documento foi visualizado ou baixado.', color: 'blue' },
          { icon: FilterIcon, title: 'Filtrar registros', description: 'Use os filtros de status e ação para localizar eventos específicos.', color: 'green' },
          { icon: Shield, title: 'Tentativas negadas', description: 'Identifique tentativas com palavra errada, link inativo ou expirado.', color: 'red' },
          { icon: MapPin, title: 'Geolocalização', description: 'Veja a cidade de onde o acesso foi realizado para auditoria completa.', color: 'purple' },
          { icon: Monitor, title: 'Dispositivo e IP', description: 'Cada registro mostra tipo de dispositivo e endereço IP de origem.', color: 'amber' },
          { icon: Trash2, title: 'Exclusão (Admin)', description: 'Administradores podem selecionar e excluir registros antigos.', color: 'cyan' },
        ]}
      />
      <PageHeader
        breadcrumbs={[{ label: 'Compartilhamento' }, { label: 'Logs de Acesso' }]}
        title="Logs de Acesso Externo"
        description="Auditoria completa de acessos e downloads externos"
      />

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="authorized">Autorizado</SelectItem>
            <SelectItem value="denied">Negado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Ação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            <SelectItem value="acesso_autorizado">Acesso Autorizado</SelectItem>
            <SelectItem value="download_de_pdf">Download PDF</SelectItem>
            <SelectItem value="acesso_negado_palavra_errada">Palavra Errada</SelectItem>
            <SelectItem value="acesso_negado_link_inativo">Link Inativo</SelectItem>
            <SelectItem value="acesso_negado_palavra_expirada">Palavra Expirada</SelectItem>
          </SelectContent>
        </Select>

        {isAdmin && selectedIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="ml-auto"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Excluir {selectedIds.size} selecionado(s)
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Registros de Acesso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {isAdmin && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={logs.length > 0 && selectedIds.size === logs.length}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                )}
                <TableHead>Data/Hora</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Escola</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Conteúdo</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Dispositivo</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log: any) => (
                <TableRow key={log.id} data-state={selectedIds.has(log.id) ? 'selected' : undefined}>
                  {isAdmin && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(log.id)}
                        onCheckedChange={() => toggleSelect(log.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="text-xs">
                    {format(new Date(log.accessed_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {statusIcon(log.access_status)}
                      <span className="text-xs capitalize">{log.access_status}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs flex items-center gap-1 w-fit">
                      {actionIcon(log.action_performed)}
                      {log.action_performed?.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{log.external_links?.schools?.nome || '—'}</TableCell>
                  <TableCell className="text-xs">{log.city_name || '—'}</TableCell>
                  <TableCell className="text-xs capitalize">{log.content_type || '—'}</TableCell>
                  <TableCell className="text-xs font-mono">{log.ip_address || '—'}</TableCell>
                  <TableCell className="text-xs capitalize">{log.device_type || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.failure_reason?.replace(/_/g, ' ') || '—'}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 10 : 9} className="text-center text-muted-foreground py-8">
                    Nenhum registro de acesso
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedIds.size} registro(s) de acesso? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}