import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Trash2, ArrowLeft, AlertTriangle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  useBudget, useBudgetLines, useBudgetConsumption,
  useSaveBudgetLine, useDeleteBudgetLine,
} from './useOrcamento';
import {
  useFinancialCategories, useFinancialCostCenters, useFinancialProjects, useSchoolsLite,
} from '@/features/financeiro/cadastros/useFinancialRegisters';

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0);

export default function OrcamentoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { data: budget } = useBudget(id);
  const { data: lines } = useBudgetLines(id);
  const { data: consumption } = useBudgetConsumption(id);
  const cats = useFinancialCategories();
  const cc = useFinancialCostCenters();
  const projs = useFinancialProjects();
  const schools = useSchoolsLite();

  const saveLine = useSaveBudgetLine();
  const delLine = useDeleteBudgetLine();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    category_id: '', cost_center_id: '', school_id: '', project_id: '',
    month: '', planned_amount: 0,
  });

  const totals = useMemo(() => {
    const arr = consumption ?? [];
    return {
      planned: arr.reduce((s, r) => s + Number(r.planned), 0),
      committed: arr.reduce((s, r) => s + Number(r.committed), 0),
      realized: arr.reduce((s, r) => s + Number(r.realized), 0),
      available: arr.reduce((s, r) => s + Number(r.available), 0),
    };
  }, [consumption]);

  const submit = async () => {
    if (!id || !form.category_id || !form.cost_center_id) return;
    await saveLine.mutateAsync({
      budget_id: id,
      category_id: form.category_id,
      cost_center_id: form.cost_center_id,
      school_id: form.school_id || null,
      project_id: form.project_id || null,
      month: form.month ? Number(form.month) : null,
      planned_amount: Number(form.planned_amount) || 0,
    });
    setOpen(false);
    setForm({ category_id: '', cost_center_id: '', school_id: '', project_id: '', month: '', planned_amount: 0 });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={budget?.name ?? 'Orçamento'}
        description={`${budget?.year ?? ''}${budget?.month ? `/${String(budget.month).padStart(2, '0')}` : ' (anual)'} • ${budget?.status ?? ''}`}
        actions={
          <Button variant="outline" onClick={() => nav('/financeiro/orcamentos')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Previsto</div><div className="text-xl font-semibold">{fmt(totals.planned)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Comprometido</div><div className="text-xl font-semibold">{fmt(totals.committed)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Realizado</div><div className="text-xl font-semibold">{fmt(totals.realized)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Disponível</div><div className={`text-xl font-semibold ${totals.available < 0 ? 'text-destructive' : ''}`}>{fmt(totals.available)}</div></Card>
      </div>

      <Card className="p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="font-medium">Linhas do orçamento</div>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Adicionar linha</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead>Centro de custo</TableHead>
              <TableHead>Mês</TableHead>
              <TableHead className="text-right">Previsto</TableHead>
              <TableHead className="text-right">Comprometido</TableHead>
              <TableHead className="text-right">Realizado</TableHead>
              <TableHead className="text-right">Disponível</TableHead>
              <TableHead>Consumo</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!consumption || consumption.length === 0) && (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhuma linha cadastrada.</TableCell></TableRow>
            )}
            {(consumption ?? []).map((row) => {
              const overrun = Number(row.available) < 0;
              const alert = budget && row.consumption_percent >= Number(budget.alert_threshold_percent);
              return (
                <TableRow key={row.line_id}>
                  <TableCell>{row.category_name}</TableCell>
                  <TableCell>{row.cost_center_name}</TableCell>
                  <TableCell>{row.month ? String(row.month).padStart(2, '0') : '—'}</TableCell>
                  <TableCell className="text-right">{fmt(Number(row.planned))}</TableCell>
                  <TableCell className="text-right">{fmt(Number(row.committed))}</TableCell>
                  <TableCell className="text-right">{fmt(Number(row.realized))}</TableCell>
                  <TableCell className={`text-right ${overrun ? 'text-destructive font-medium' : ''}`}>{fmt(Number(row.available))}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <Progress value={Math.min(Number(row.consumption_percent), 100)} className="h-2 flex-1" />
                      <span className="text-xs tabular-nums">{Number(row.consumption_percent).toFixed(0)}%</span>
                      {overrun && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />excedido</Badge>}
                      {!overrun && alert && <Badge variant="secondary">alerta</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => id && delLine.mutate({ id: row.line_id, budget_id: id })}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova linha</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>Categoria</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  {(cats.data ?? []).filter(c => c.nature === 'DESPESA').map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Centro de custo</Label>
              <Select value={form.cost_center_id} onValueChange={(v) => setForm({ ...form, cost_center_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  {(cc.data ?? []).map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Escola (opcional)</Label>
                <Select value={form.school_id || 'none'} onValueChange={(v) => setForm({ ...form, school_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhuma —</SelectItem>
                    {(schools.data ?? []).map((s: any) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Projeto (opcional)</Label>
                <Select value={form.project_id || 'none'} onValueChange={(v) => setForm({ ...form, project_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhum —</SelectItem>
                    {(projs.data ?? []).map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Mês (opcional)</Label>
                <Input type="number" min={1} max={12} value={form.month}
                  onChange={(e) => setForm({ ...form, month: e.target.value })} placeholder="anual" />
              </div>
              <div>
                <Label>Valor previsto</Label>
                <Input type="number" step="0.01" value={form.planned_amount}
                  onChange={(e) => setForm({ ...form, planned_amount: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={saveLine.isPending}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
