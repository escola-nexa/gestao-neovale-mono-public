import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { compartilhamentoApi } from '@/features/compartilhamento/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Key, Plus, Shield, AlertTriangle, Eye, EyeOff, Trash2, Power, PowerOff, HelpCircle, Lock, CalendarClock, RefreshCw } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import FeatureGuideCard from '@/components/FeatureGuideCard';

export default function KeywordsManagementPage() {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [confirmKeyword, setConfirmKeyword] = useState('');
  const [months, setMonths] = useState(3);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showKeyword, setShowKeyword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: keywords = [], isLoading } = useQuery({
    queryKey: ['quarterly-keywords', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('quarterly_keywords')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const activeKeyword = keywords.find(
    (k: any) => k.is_active && new Date(k.expires_at) > new Date() && new Date(k.starts_at) <= new Date()
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      if (keyword.trim().length < 4) throw new Error('Palavra-chave deve ter pelo menos 4 caracteres');
      if (keyword !== confirmKeyword) throw new Error('As palavras-chave não coincidem');

      // Hash via edge function
      const { data: hashResult, error: hashError } = await supabase.functions.invoke('hash-keyword', {
        body: { keyword: keyword.trim() },
      });
      if (hashError || !hashResult?.success) throw new Error(hashResult?.error || 'Erro ao gerar hash');

      const now = new Date();
      const expiresAt = addMonths(now, months);

      // Deactivate previous keywords
      await supabase
        .from('quarterly_keywords')
        .update({ is_active: false })
        .eq('organization_id', organizationId!)
        .eq('is_active', true);

      const { error } = await compartilhamentoApi.client.from('quarterly_keywords').insert({
        organization_id: organizationId!,
        keyword_hash: hashResult.hash,
        starts_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_active: true,
        created_by: user?.id || '',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Palavra-chave trimestral cadastrada com sucesso');
      setKeyword('');
      setConfirmKeyword('');
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['quarterly-keywords'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quarterly_keywords')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Palavra-chave desativada');
      queryClient.invalidateQueries({ queryKey: ['quarterly-keywords'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quarterly_keywords')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Palavra-chave excluída');
      queryClient.invalidateQueries({ queryKey: ['quarterly-keywords'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const hasExpiredOrMissing = !activeKeyword;

  return (
    <div className="space-y-4">
      <FeatureGuideCard
        title="Como usar as Palavras-Chave"
        icon={HelpCircle}
        steps={[
          { icon: Plus, title: 'Criar palavra-chave', description: 'Clique em "Nova Palavra-Chave" para cadastrar. Mínimo 4 caracteres.', color: 'blue' },
          { icon: Lock, title: 'Proteção por hash', description: 'A palavra é armazenada com criptografia SHA-256 para segurança.', color: 'green' },
          { icon: CalendarClock, title: 'Validade trimestral', description: 'Defina a validade em meses. Ao vencer, os acessos externos são bloqueados.', color: 'amber' },
          { icon: RefreshCw, title: 'Rotação automática', description: 'Ao criar uma nova, a anterior é desativada automaticamente.', color: 'purple' },
          { icon: PowerOff, title: 'Desativar manualmente', description: 'Use o botão de desativar para bloquear acessos imediatamente.', color: 'red' },
          { icon: Shield, title: 'Acesso monitorado', description: 'Toda tentativa de acesso com a palavra é registrada nos Logs.', color: 'cyan' },
        ]}
      />
      <PageHeader
        breadcrumbs={[{ label: 'Compartilhamento' }, { label: 'Palavras-Chave' }]}
        title="Palavras-Chave Trimestrais"
        description="Gerencie as palavras-chave de acesso externo"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Nova Palavra-Chave</Button>
            </DialogTrigger>
          </Dialog>
        }
      />
      <div className="hidden">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nova Palavra-Chave</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Nova Palavra-Chave</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Palavra-Chave</Label>
                <div className="relative">
                  <Input
                    type={showKeyword ? 'text' : 'password'}
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                  />
                  <button type="button" className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowKeyword(!showKeyword)}>
                    {showKeyword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>Confirmar Palavra-Chave</Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmKeyword}
                    onChange={(e) => setConfirmKeyword(e.target.value)}
                    placeholder="Repita a palavra-chave"
                  />
                  <button type="button" className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowConfirm(!showConfirm)}>
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>Validade (meses)</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={months}
                  onChange={(e) => setMonths(Number(e.target.value))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                A palavra-chave anterior será desativada automaticamente.
              </p>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="w-full"
              >
                {createMutation.isPending ? 'Salvando...' : 'Cadastrar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {hasExpiredOrMissing && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-semibold text-destructive">Atenção: Nenhuma palavra-chave ativa</p>
              <p className="text-sm text-muted-foreground">
                Os acessos externos estão bloqueados. Cadastre uma nova palavra-chave para liberá-los.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" /> Histórico de Palavras-Chave
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Cadastrada em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keywords.map((kw: any) => {
                const isExpired = new Date(kw.expires_at) < new Date();
                const isCurrentlyActive = kw.is_active && !isExpired && new Date(kw.starts_at) <= new Date();
                return (
                  <TableRow key={kw.id}>
                    <TableCell>
                      {isCurrentlyActive ? (
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                          <Shield className="h-3 w-3 mr-1" /> Ativa
                        </Badge>
                      ) : isExpired ? (
                        <Badge variant="secondary">Expirada</Badge>
                      ) : (
                        <Badge variant="outline">Inativa</Badge>
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(kw.starts_at), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                    <TableCell>{format(new Date(kw.expires_at), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                    <TableCell>{format(new Date(kw.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <div className="flex items-center justify-end gap-1">
                          {kw.is_active && !isExpired && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                                  onClick={() => deactivateMutation.mutate(kw.id)}
                                  disabled={deactivateMutation.isPending}
                                >
                                  <PowerOff className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Desativar</TooltipContent>
                            </Tooltip>
                          )}
                          <AlertDialog>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent>Excluir</TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir palavra-chave?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação é irreversível. A palavra-chave será removida permanentemente do sistema.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(kw.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                );
              })}
              {keywords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhuma palavra-chave cadastrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
