import { supabase } from '@/integrations/supabase/client';
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Workflow, Plus, Pencil, Trash2, Power, Settings2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { financeiroApi } from '@/features/financeiro/api';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

type Policy = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  operation_type: string;
  min_amount: number;
  max_amount: number | null;
  category_id: string | null;
  cost_center_id: string | null;
  project_id: string | null;
  school_id: string | null;
  account_id: string | null;
  mode: 'sequential' | 'parallel';
  enforce_segregation: boolean;
  require_dual_approver: boolean;
  dual_approver_threshold: number | null;
  priority: number;
  active: boolean;
};

type Step = {
  id: string;
  policy_id: string;
  organization_id: string;
  step_order: number;
  name: string;
  approver_type: 'user' | 'role' | 'permission';
  approver_user_id: string | null;
  approver_role: 'admin' | 'coordenador' | 'professor' | 'rh' | 'financeiro' | null;
  approver_permission: string | null;
  substitute_user_id: string | null;
  substitute_until: string | null;
  min_amount: number;
  is_required: boolean;
  active: boolean;
};

const OPERATIONS = [
  { v: 'all', l: 'Todas as operações' },
  { v: 'expense', l: 'Despesa' },
  { v: 'income', l: 'Receita' },
  { v: 'payment', l: 'Pagamento' },
  { v: 'reversal', l: 'Estorno' },
  { v: 'transfer', l: 'Transferência' },
  { v: 'budget', l: 'Orçamento' },
  { v: 'period_reopen', l: 'Reabertura de período' },
];

const ROLES = [
  { v: 'admin', l: 'Admin' },
  { v: 'coordenador', l: 'Coordenador' },
  { v: 'rh', l: 'R.H.' },
  { v: 'financeiro', l: 'Financeiro' },
];

const brl = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const emptyPolicy: Partial<Policy> = {
  name: '', description: '', operation_type: 'expense',
  min_amount: 0, max_amount: null, mode: 'sequential',
  enforce_segregation: true, require_dual_approver: false,
  dual_approver_threshold: null, priority: 100, active: true,
};

export default function PoliticasAprovacaoPage() {
  const { organizationId } = useOrganization();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<Policy> | null>(null);
  const [stepsPolicy, setStepsPolicy] = useState<Policy | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const { data: policies = [], isLoading } = useQuery({
    enabled: !!organizationId,
    queryKey: ['fin-approval-policies', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_approval_policies' as any)
        .select('*')
        .eq('organization_id', organizationId!)
        .order('priority', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Policy[];
    },
  });

  const { data: profiles = [] } = useQuery({
    enabled: !!organizationId,
    queryKey: ['profiles-lite-approval', organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .eq('organization_id', organizationId!)
        .order('full_name');
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (p: Partial<Policy>) => {
      if (!p.name?.trim()) throw new Error('Nome obrigatório.');
      const payload = { ...p, organization_id: organizationId };
      if (p.id) {
        const { id, ...rest } = payload as any;
        const { error } = await supabase
          .from('financial_approval_policies' as any).update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('financial_approval_policies' as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-approval-policies'] });
      toast.success('Política salva.');
      setEditing(null);
    },
    onError: (e: any) => toast.error(e?.message ?? 'Falha.'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('financial_approval_policies' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-approval-policies'] });
      toast.success('Política excluída.');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Falha.'),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('financial_approval_policies' as any)
        .update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-approval-policies'] }),
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    return !s ? policies : policies.filter((p) => p.name.toLowerCase().includes(s));
  }, [policies, search]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageBreadcrumb items={[
        { label: 'Administração', href: '/administracao' },
        { label: 'Financeiro', href: '/administracao/financeiro' },
        { label: 'Políticas de Aprovação' },
      ]} />
      <PageHeader
        icon={Workflow}
        title="Políticas de Aprovação"
        description="Defina alçadas, etapas e regras de segregação para despesas, pagamentos, estornos e reaberturas."
        actions={
          <Button onClick={() => setEditing(emptyPolicy)}>
            <Plus className="h-4 w-4 mr-2" /> Nova política
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4 space-y-4">
          <Input
            placeholder="Buscar política…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prio.</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Operação</TableHead>
                  <TableHead>Faixa</TableHead>
                  <TableHead>Modo</TableHead>
                  <TableHead>Regras</TableHead>
                  <TableHead className="text-center">Ativa</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>}
                {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma política cadastrada.</TableCell></TableRow>}
                {filtered.map((p) => (
                  <TableRow key={p.id} className={!p.active ? 'opacity-60' : ''}>
                    <TableCell className="font-mono">{p.priority}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{OPERATIONS.find((o) => o.v === p.operation_type)?.l}</TableCell>
                    <TableCell className="text-xs">{brl(p.min_amount)} → {p.max_amount ? brl(p.max_amount) : '∞'}</TableCell>
                    <TableCell><Badge variant="outline">{p.mode === 'sequential' ? 'Sequencial' : 'Paralelo'}</Badge></TableCell>
                    <TableCell className="space-x-1">
                      {p.enforce_segregation && <Badge variant="secondary">Segregação</Badge>}
                      {p.require_dual_approver && <Badge variant="secondary">Duplo</Badge>}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={p.active} onCheckedChange={(v) => toggle.mutate({ id: p.id, active: v })} />
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => setStepsPolicy(p)} title="Etapas">
                        <Settings2 className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditing(p)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setConfirmDel(p.id)} title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Editar política */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Editar política' : 'Nova política'}</DialogTitle>
            <DialogDescription>
              O fluxo é selecionado pela maior prioridade (menor número) que atender aos critérios.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome *</Label>
                <Input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <Label>Operação</Label>
                <Select value={editing.operation_type ?? 'expense'} onValueChange={(v) => setEditing({ ...editing, operation_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OPERATIONS.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Input type="number" value={editing.priority ?? 100} onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Valor mínimo (R$)</Label>
                <Input type="number" step="0.01" value={editing.min_amount ?? 0} onChange={(e) => setEditing({ ...editing, min_amount: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Valor máximo (R$, vazio = sem teto)</Label>
                <Input type="number" step="0.01" value={editing.max_amount ?? ''} onChange={(e) => setEditing({ ...editing, max_amount: e.target.value === '' ? null : Number(e.target.value) })} />
              </div>
              <div>
                <Label>Modo</Label>
                <Select value={editing.mode ?? 'sequential'} onValueChange={(v: any) => setEditing({ ...editing, mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequential">Sequencial</SelectItem>
                    <SelectItem value="parallel">Paralelo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Limite para 2º aprovador (R$)</Label>
                <Input type="number" step="0.01" value={editing.dual_approver_threshold ?? ''} onChange={(e) => setEditing({ ...editing, dual_approver_threshold: e.target.value === '' ? null : Number(e.target.value) })} />
              </div>
              <div className="flex items-center justify-between border rounded-md p-3">
                <Label className="m-0">Impedir autoaprovação</Label>
                <Switch checked={!!editing.enforce_segregation} onCheckedChange={(v) => setEditing({ ...editing, enforce_segregation: v })} />
              </div>
              <div className="flex items-center justify-between border rounded-md p-3">
                <Label className="m-0">Sempre exigir 2º aprovador</Label>
                <Switch checked={!!editing.require_dual_approver} onCheckedChange={(v) => setEditing({ ...editing, require_dual_approver: v })} />
              </div>
              <div className="col-span-2">
                <Label>Descrição</Label>
                <Textarea rows={2} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending}>
              {save.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Etapas */}
      {stepsPolicy && (
        <StepsDialog
          policy={stepsPolicy}
          profiles={profiles as any[]}
          onClose={() => setStepsPolicy(null)}
        />
      )}

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir política?</AlertDialogTitle>
            <AlertDialogDescription>
              Lançamentos já aprovados preservam o fluxo aplicado no momento da decisão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmDel) remove.mutate(confirmDel); setConfirmDel(null); }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ============ Steps sub-component ============ */

function StepsDialog({
  policy, profiles, onClose,
}: {
  policy: Policy;
  profiles: Array<{ user_id: string; full_name: string | null; email: string | null }>;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { organizationId } = useOrganization();
  const [newStep, setNewStep] = useState<Partial<Step>>({
    name: '', step_order: 1, approver_type: 'role',
    approver_role: 'financeiro', min_amount: 0, is_required: true, active: true,
  });

  const { data: steps = [], isLoading } = useQuery({
    queryKey: ['fin-approval-steps', policy.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_approval_steps' as any)
        .select('*')
        .eq('policy_id', policy.id)
        .order('step_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Step[];
    },
  });

  const addStep = useMutation({
    mutationFn: async (s: Partial<Step>) => {
      if (!s.name?.trim()) throw new Error('Nome da etapa obrigatório.');
      const payload: any = {
        ...s,
        policy_id: policy.id,
        organization_id: organizationId,
        approver_user_id: s.approver_type === 'user' ? s.approver_user_id : null,
        approver_role: s.approver_type === 'role' ? s.approver_role : null,
        approver_permission: s.approver_type === 'permission' ? s.approver_permission : null,
      };
      const { error } = await financeiroApi.client.from('financial_approval_steps' as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-approval-steps', policy.id] });
      toast.success('Etapa adicionada.');
      setNewStep({ name: '', step_order: (steps.at(-1)?.step_order ?? 0) + 1,
        approver_type: 'role', approver_role: 'financeiro',
        min_amount: 0, is_required: true, active: true });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Falha.'),
  });

  const delStep = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await financeiroApi.client.from('financial_approval_steps' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-approval-steps', policy.id] }),
  });

  const profileOptions = profiles.map((p) => ({
    value: p.user_id,
    label: `${p.full_name ?? p.email} — ${p.email ?? ''}`,
  }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Etapas — {policy.name}</DialogTitle>
          <DialogDescription>
            Configure níveis de aprovação. Em modo {policy.mode === 'sequential' ? 'sequencial' : 'paralelo'}, {policy.mode === 'sequential' ? 'cada etapa precisa ser concluída antes da próxima.' : 'todas etapas podem aprovar em paralelo.'}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border mb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ordem</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Aprovador</TableHead>
                <TableHead>Substituto</TableHead>
                <TableHead className="text-right">A partir de</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Carregando…</TableCell></TableRow>}
              {!isLoading && steps.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Nenhuma etapa.</TableCell></TableRow>}
              {steps.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono">{s.step_order}</TableCell>
                  <TableCell>{s.name}{s.is_required && <Badge variant="outline" className="ml-2">Obrig.</Badge>}</TableCell>
                  <TableCell className="text-xs">
                    {s.approver_type === 'user' && (profiles.find((p) => p.user_id === s.approver_user_id)?.full_name ?? '—')}
                    {s.approver_type === 'role' && `Função: ${s.approver_role}`}
                    {s.approver_type === 'permission' && `Permissão: ${s.approver_permission}`}
                  </TableCell>
                  <TableCell className="text-xs">
                    {s.substitute_user_id
                      ? `${profiles.find((p) => p.user_id === s.substitute_user_id)?.full_name ?? '—'}${s.substitute_until ? ` até ${s.substitute_until}` : ''}`
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono">{brl(s.min_amount)}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => delStep.mutate(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="border rounded-md p-4 space-y-3">
          <h4 className="font-semibold text-sm">Adicionar etapa</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label>Ordem</Label>
              <Input type="number" value={newStep.step_order ?? 1} onChange={(e) => setNewStep({ ...newStep, step_order: Number(e.target.value) })} />
            </div>
            <div className="md:col-span-2">
              <Label>Nome</Label>
              <Input value={newStep.name ?? ''} onChange={(e) => setNewStep({ ...newStep, name: e.target.value })} />
            </div>
            <div>
              <Label>A partir de (R$)</Label>
              <Input type="number" step="0.01" value={newStep.min_amount ?? 0} onChange={(e) => setNewStep({ ...newStep, min_amount: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Tipo de aprovador</Label>
              <Select value={newStep.approver_type} onValueChange={(v: any) => setNewStep({ ...newStep, approver_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário específico</SelectItem>
                  <SelectItem value="role">Função</SelectItem>
                  <SelectItem value="permission">Permissão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newStep.approver_type === 'user' && (
              <div className="md:col-span-3">
                <Label>Usuário</Label>
                <SearchableSelect
                  value={newStep.approver_user_id ?? ''}
                  onValueChange={(v) => setNewStep({ ...newStep, approver_user_id: v })}
                  options={profileOptions}
                  placeholder="Selecione o usuário"
                />
              </div>
            )}
            {newStep.approver_type === 'role' && (
              <div>
                <Label>Função</Label>
                <Select value={newStep.approver_role ?? ''} onValueChange={(v: any) => setNewStep({ ...newStep, approver_role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map((r) => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {newStep.approver_type === 'permission' && (
              <div className="md:col-span-2">
                <Label>Chave da permissão</Label>
                <Input value={newStep.approver_permission ?? ''} onChange={(e) => setNewStep({ ...newStep, approver_permission: e.target.value })} placeholder="ex.: financial_approve_payment" />
              </div>
            )}
            <div>
              <Label>Substituto temporário</Label>
              <SearchableSelect
                value={newStep.substitute_user_id ?? ''}
                onValueChange={(v) => setNewStep({ ...newStep, substitute_user_id: v })}
                options={profileOptions}
                placeholder="Opcional"
              />
            </div>
            <div>
              <Label>Substituto até</Label>
              <Input type="date" value={newStep.substitute_until ?? ''} onChange={(e) => setNewStep({ ...newStep, substitute_until: e.target.value || null })} />
            </div>
            <div className="flex items-center justify-between border rounded-md p-3">
              <Label className="m-0">Obrigatória</Label>
              <Switch checked={!!newStep.is_required} onCheckedChange={(v) => setNewStep({ ...newStep, is_required: v })} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => addStep.mutate(newStep)} disabled={addStep.isPending}>
              <Plus className="h-4 w-4 mr-2" />Adicionar etapa
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
