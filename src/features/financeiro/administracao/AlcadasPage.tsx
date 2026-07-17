import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Gauge, Plus, Trash2 } from 'lucide-react';
import { financeiroApi } from '@/features/financeiro/api';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

type Limit = {
  id: string;
  user_id: string;
  permission_id: string;
  max_amount: number;
  currency: string;
  notes: string | null;
  user?: { full_name: string | null; email: string | null };
  permission?: { key: string; name: string };
};

const currency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function AlcadasPage() {
  const { organizationId } = useOrganization();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    user_id: '',
    permission_id: '',
    max_amount: 0,
    notes: '',
  });

  const { data: limits = [], isLoading } = useQuery({
    enabled: !!organizationId,
    queryKey: ['fin-approval-limits', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_approval_limits')
        .select(
          'id, user_id, permission_id, max_amount, currency, notes, user:profiles!financial_approval_limits_user_id_fkey(full_name, email), permission:financial_permissions(key, name)',
        )
        .eq('organization_id', organizationId!)
        .order('max_amount', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Limit[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-lite', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .order('full_name');
      return data ?? [];
    },
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['fin-perms-aprovar'],
    queryFn: async () => {
      const { data } = await supabase
        .from('financial_permissions')
        .select('id, key, name')
        .in('action', ['aprovar', 'pagar', 'baixar'])
        .order('key');
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.user_id || !form.permission_id || !form.max_amount) {
        throw new Error('Preencha usuário, permissão e valor.');
      }
      const payload = { ...form, organization_id: organizationId, currency: 'BRL' };
      const { error } = await financeiroApi.client.from('financial_approval_limits').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-approval-limits'] });
      toast.success('Alçada criada.');
      setOpen(false);
      setForm({ user_id: '', permission_id: '', max_amount: 0, notes: '' });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Falha ao salvar.'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await financeiroApi.client.from('financial_approval_limits').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-approval-limits'] });
      toast.success('Alçada removida.');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Falha ao remover.'),
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageBreadcrumb
        items={[
          { label: 'Administração', href: '/administracao' },
          { label: 'Financeiro', href: '/administracao/financeiro' },
          { label: 'Alçadas de Aprovação' },
        ]}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          icon={Gauge}
          title="Alçadas de Aprovação"
          description="Define o teto financeiro que cada usuário pode aprovar por permissão."
        />
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova alçada
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Permissão</TableHead>
                <TableHead className="text-right">Limite</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Carregando…
                  </TableCell>
                </TableRow>
              ) : limits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhuma alçada cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                limits.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div className="font-medium">{l.user?.full_name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{l.user?.email ?? ''}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{l.permission?.key}</TableCell>
                    <TableCell className="text-right font-mono">
                      {currency(Number(l.max_amount))}
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate">{l.notes ?? '—'}</TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => remove.mutate(l.id)}
                        disabled={remove.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova alçada</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Usuário</Label>
              <SearchableSelect
                value={form.user_id}
                onValueChange={(v) => setForm({ ...form, user_id: v })}
                options={profiles.map((p: any) => ({
                  value: p.user_id,
                  label: `${p.full_name ?? p.email} — ${p.email ?? ''}`,
                }))}
                placeholder="Selecione o usuário"
              />
            </div>
            <div>
              <Label>Permissão</Label>
              <SearchableSelect
                value={form.permission_id}
                onValueChange={(v) => setForm({ ...form, permission_id: v })}
                options={permissions.map((p: any) => ({
                  value: p.id,
                  label: `${p.name} (${p.key})`,
                }))}
                placeholder="Selecione a permissão"
              />
            </div>
            <div>
              <Label>Valor máximo (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.max_amount}
                onChange={(e) => setForm({ ...form, max_amount: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
