import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Briefcase, Plus, Pencil, Power, AlertTriangle } from 'lucide-react';
import {
  useFinancialProjects,
  useFinancialProjectSummary,
  useFinancialCostCenters,
  useFinancialParties,
  useSaveRegister,
  useToggleActive,
  type FinancialProject,
  type FinancialProjectStatus,
} from '../cadastros/useFinancialRegisters';

const currency = (v: number | null | undefined) =>
  v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_LABEL: Record<FinancialProjectStatus, string> = {
  planning: 'Planejamento',
  active: 'Ativo',
  suspended: 'Suspenso',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const STATUS_VARIANT: Record<FinancialProjectStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  planning: 'outline',
  active: 'default',
  suspended: 'secondary',
  completed: 'secondary',
  cancelled: 'destructive',
};

const CLOSED: FinancialProjectStatus[] = ['completed', 'cancelled'];

type FormState = Partial<FinancialProject> & { id?: string };

const emptyForm = (): FormState => ({
  id: undefined,
  code: '',
  name: '',
  description: '',
  start_date: '',
  end_date: '',
  budget: null,
  status: 'planning',
  responsible_user_id: null,
  customer_id: null,
  school_id: null,
  cost_center_id: null,
  active: true,
});

export default function ProjetosPage() {
  const { data: projects = [], isLoading } = useFinancialProjects();
  const { data: summaryMap } = useFinancialProjectSummary();
  const { data: costCenters = [] } = useFinancialCostCenters();
  const { data: parties = [] } = useFinancialParties();
  const save = useSaveRegister<any>('financial_projects', 'Projeto');
  const toggle = useToggleActive('financial_projects', 'Projeto');

  const customers = useMemo(
    () => parties.filter((p: any) => (p.party_types ?? []).includes('CUSTOMER') || p.party_type === 'CUSTOMER'),
    [parties],
  );

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FinancialProjectStatus | 'all'>('all');
  const [form, setForm] = useState<FormState>(emptyForm());

  const openNew = () => {
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (p: FinancialProject) => {
    setForm({ ...p });
    setOpen(true);
  };

  const submit = () => {
    const payload = {
      ...form,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      budget: form.budget === ('' as any) || form.budget == null ? null : Number(form.budget),
      customer_id: form.customer_id || null,
      cost_center_id: form.cost_center_id || null,
      responsible_user_id: form.responsible_user_id || null,
      school_id: form.school_id || null,
    };
    save.mutate(payload, { onSuccess: () => setOpen(false) });
  };

  const filtered = projects.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search && !`${p.code ?? ''} ${p.name}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageBreadcrumb
        items={[
          { label: 'Administração', href: '/administracao' },
          { label: 'Financeiro', href: '/administracao/financeiro' },
          { label: 'Projetos' },
        ]}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          icon={Briefcase}
          title="Projetos financeiros"
          description="Contratos, iniciativas e ações com orçamento próprio."
        />
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Novo projeto
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Buscar por código ou nome…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as situações</SelectItem>
                {(Object.keys(STATUS_LABEL) as FinancialProjectStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Vigência</TableHead>
                  <TableHead className="text-right">Orçamento</TableHead>
                  <TableHead className="text-right">Comprometido</TableHead>
                  <TableHead className="text-right">Realizado</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum projeto encontrado.</TableCell></TableRow>
                ) : (
                  filtered.map((p) => {
                    const s = summaryMap?.get(p.id);
                    const overBudget = s && p.budget != null && Number(s.committed) + Number(s.realized) > Number(p.budget);
                    return (
                      <TableRow key={p.id} className={!p.active ? 'opacity-60' : ''}>
                        <TableCell className="font-mono text-xs">{p.code ?? '—'}</TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-xs">{p.start_date ?? '—'} → {p.end_date ?? '—'}</TableCell>
                        <TableCell className="text-right font-mono">{currency(p.budget)}</TableCell>
                        <TableCell className="text-right font-mono">{currency(s?.committed ?? 0)}</TableCell>
                        <TableCell className="text-right font-mono">{currency(s?.realized ?? 0)}</TableCell>
                        <TableCell className={`text-right font-mono ${overBudget ? 'text-destructive font-semibold' : ''}`}>
                          {overBudget && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                          {currency(s?.balance ?? p.budget ?? 0)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                        </TableCell>
                        <TableCell className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => toggle.mutate({ id: p.id, active: !p.active })}
                          >
                            <Power className="h-4 w-4" />
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar projeto' : 'Novo projeto'}</DialogTitle>
          </DialogHeader>

          {form.id && CLOSED.includes(form.status as FinancialProjectStatus) && (
            <div className="text-xs bg-muted/50 border border-border rounded p-2 flex gap-2 items-center">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Projeto {STATUS_LABEL[form.status as FinancialProjectStatus].toLowerCase()} — não aceita novos lançamentos.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Código</Label>
              <Input value={form.code ?? ''} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div>
              <Label>Nome*</Label>
              <Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Situação</Label>
              <Select value={form.status ?? 'planning'} onValueChange={(v) => setForm({ ...form, status: v as FinancialProjectStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as FinancialProjectStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Centro de custo padrão</Label>
              <Select value={form.cost_center_id ?? '__none'} onValueChange={(v) => setForm({ ...form, cost_center_id: v === '__none' ? null : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">—</SelectItem>
                  {costCenters.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.code ? `${c.code} · ` : ''}{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cliente</Label>
              <Select value={form.customer_id ?? '__none'} onValueChange={(v) => setForm({ ...form, customer_id: v === '__none' ? null : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">—</SelectItem>
                  {customers.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.legal_name ?? c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Início</Label>
              <Input type="date" value={form.start_date ?? ''} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <Label>Fim</Label>
              <Input type="date" value={form.end_date ?? ''} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
            <div>
              <Label>Orçamento (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.budget ?? ''}
                onChange={(e) => setForm({ ...form, budget: e.target.value === '' ? null : Number(e.target.value) })}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Descrição</Label>
              <Textarea value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={save.isPending || !form.name}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
