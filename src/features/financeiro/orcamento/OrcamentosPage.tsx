import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Trash2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  useBudgets, useDeleteBudget, useSaveBudget, type OverrunMode, type BudgetStatus,
} from './useOrcamento';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const STATUS_LABEL: Record<BudgetStatus, string> = {
  DRAFT: 'Rascunho', ACTIVE: 'Ativo', CLOSED: 'Encerrado',
};
const MODE_LABEL: Record<OverrunMode, string> = {
  ALERT: 'Apenas alertar',
  REQUIRE_APPROVAL: 'Exigir aprovação extra',
  BLOCK: 'Bloquear',
};

export default function OrcamentosPage() {
  const { data: budgets, isLoading } = useBudgets();
  const save = useSaveBudget();
  const del = useDeleteBudget();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    year: new Date().getFullYear(),
    month: '' as string,
    status: 'DRAFT' as BudgetStatus,
    overrun_mode: 'REQUIRE_APPROVAL' as OverrunMode,
    alert_threshold_percent: 80,
    notes: '',
  });

  const reset = () => {
    setEditingId(null);
    setForm({
      name: '', year: new Date().getFullYear(), month: '', status: 'DRAFT',
      overrun_mode: 'REQUIRE_APPROVAL', alert_threshold_percent: 80, notes: '',
    });
  };

  const submit = async () => {
    if (!form.name.trim()) return;
    await save.mutateAsync({
      id: editingId ?? undefined,
      name: form.name.trim(),
      year: Number(form.year),
      month: form.month ? Number(form.month) : null,
      status: form.status,
      overrun_mode: form.overrun_mode,
      alert_threshold_percent: Number(form.alert_threshold_percent),
      notes: form.notes || null,
    });
    setOpen(false);
    reset();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orçamentos"
        description="Planejamento orçamentário por categoria e centro de custo."
        actions={
          <Button onClick={() => { reset(); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Novo orçamento
          </Button>
        }
      />

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Excesso</TableHead>
              <TableHead className="text-right">Alerta</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
            )}
            {!isLoading && (budgets ?? []).length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum orçamento criado.</TableCell></TableRow>
            )}
            {(budgets ?? []).map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell>{b.year}{b.month ? `/${String(b.month).padStart(2, '0')}` : ' (anual)'}</TableCell>
                <TableCell><Badge variant={b.status === 'ACTIVE' ? 'default' : 'secondary'}>{STATUS_LABEL[b.status]}</Badge></TableCell>
                <TableCell>{MODE_LABEL[b.overrun_mode]}</TableCell>
                <TableCell className="text-right">{b.alert_threshold_percent}%</TableCell>
                <TableCell className="flex gap-1 justify-end">
                  <Button asChild size="icon" variant="ghost">
                    <Link to={`/financeiro/orcamentos/${b.id}`}><Eye className="h-4 w-4" /></Link>
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(b.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editingId ? 'Editar orçamento' : 'Novo orçamento'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Ano</Label>
                <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Mês (opcional)</Label>
                <Input type="number" min={1} max={12} value={form.month} placeholder="anual"
                  onChange={(e) => setForm({ ...form, month: e.target.value })} />
              </div>
              <div>
                <Label>% Alerta</Label>
                <Input type="number" min={1} max={100} value={form.alert_threshold_percent}
                  onChange={(e) => setForm({ ...form, alert_threshold_percent: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as BudgetStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Rascunho</SelectItem>
                    <SelectItem value="ACTIVE">Ativo</SelectItem>
                    <SelectItem value="CLOSED">Encerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Excesso</Label>
                <Select value={form.overrun_mode} onValueChange={(v) => setForm({ ...form, overrun_mode: v as OverrunMode })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALERT">Apenas alertar</SelectItem>
                    <SelectItem value="REQUIRE_APPROVAL">Exigir aprovação extra</SelectItem>
                    <SelectItem value="BLOCK">Bloquear</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Observações</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={save.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover orçamento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. As linhas vinculadas também serão removidas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (confirmDelete) { await del.mutateAsync(confirmDelete); setConfirmDelete(null); } }}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
