import { useMemo, useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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
import { CalendarClock, Plus, Pencil, Trash2, Power, RotateCcw } from 'lucide-react';
import {
  FinancialPaymentTerm,
  useDeleteRegister,
  useFinancialPaymentTerms,
  useSaveRegister,
  useToggleActive,
} from './useFinancialRegisters';
import { toast } from 'sonner';

const round2 = (n: number) => Math.round(n * 100) / 100;

function distributeEqual(count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor((100 / count) * 100) / 100;
  const arr = Array(count).fill(base);
  const diff = round2(100 - arr.reduce((a, b) => a + b, 0));
  arr[0] = round2(arr[0] + diff);
  return arr;
}

function TermDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: FinancialPaymentTerm | null;
}) {
  const save = useSaveRegister<any>('financial_payment_terms', 'Condição');
  const [form, setForm] = useState<any>(
    initial ?? {
      name: '',
      code: '',
      installment_count: 1,
      first_due_days: 0,
      interval_days: 30,
      percentage_distribution: [100],
      active: true,
    },
  );

  useEffect(() => {
    setForm(
      initial ?? {
        name: '',
        code: '',
        installment_count: 1,
        first_due_days: 0,
        interval_days: 30,
        percentage_distribution: [100],
        active: true,
      },
    );
  }, [initial, open]);

  const total = useMemo(
    () => round2((form.percentage_distribution ?? []).reduce((a: number, b: number) => a + Number(b || 0), 0)),
    [form.percentage_distribution],
  );

  const changeCount = (n: number) => {
    const count = Math.max(1, Math.min(60, n || 1));
    setForm({
      ...form,
      installment_count: count,
      percentage_distribution: distributeEqual(count),
    });
  };

  const setPct = (idx: number, v: number) => {
    const next = [...form.percentage_distribution];
    next[idx] = Number(v);
    setForm({ ...form, percentage_distribution: next });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (total !== 100) {
      toast.error(`A soma dos percentuais deve ser 100% (atual: ${total}%).`);
      return;
    }
    await save.mutateAsync({
      ...form,
      code: form.code || null,
      percentage_distribution: form.percentage_distribution.map((p: number) => Number(p)),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar condição' : 'Nova condição de pagamento'}</DialogTitle>
          <DialogDescription>
            Define como uma cobrança é parcelada e quando vencem as parcelas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nome *</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Código</Label>
            <Input
              value={form.code ?? ''}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="AVISTA, D30…"
            />
          </div>
          <div>
            <Label>Parcelas *</Label>
            <Input
              type="number"
              min={1}
              max={60}
              value={form.installment_count}
              onChange={(e) => changeCount(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>1º vencimento (dias) *</Label>
            <Input
              type="number"
              min={0}
              value={form.first_due_days}
              onChange={(e) => setForm({ ...form, first_due_days: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Intervalo entre parcelas (dias) *</Label>
            <Input
              type="number"
              min={0}
              value={form.interval_days}
              onChange={(e) => setForm({ ...form, interval_days: Number(e.target.value) })}
            />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <Label>Distribuição (%)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setForm({
                    ...form,
                    percentage_distribution: distributeEqual(form.installment_count),
                  })
                }
              >
                <RotateCcw className="h-3 w-3 mr-1" /> Dividir igualmente
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {form.percentage_distribution?.map((p: number, i: number) => (
                <div key={i}>
                  <Label className="text-xs">P{i + 1}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={p}
                    onChange={(e) => setPct(i, Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
            <p
              className={
                'text-sm ' +
                (total === 100 ? 'text-emerald-600' : 'text-destructive')
              }
            >
              Soma: {total}% {total !== 100 && '— deve ser 100%'}
            </p>
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending || total !== 100}>
              {save.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CondicoesPagamentoPage() {
  const { data = [], isLoading } = useFinancialPaymentTerms();
  const toggle = useToggleActive('financial_payment_terms', 'Condição');
  const remove = useDeleteRegister('financial_payment_terms', 'Condição');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<FinancialPaymentTerm | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<FinancialPaymentTerm | null>(null);

  const filtered = useMemo(
    () =>
      data.filter((d) =>
        [d.name, d.code].filter(Boolean).some((v) => v!.toLowerCase().includes(q.toLowerCase())),
      ),
    [data, q],
  );

  return (
    <div className="space-y-6">
      <PageBreadcrumb
        items={[
          { label: 'Administração', href: '/administracao' },
          { label: 'Financeiro', href: '/administracao/financeiro' },
          { label: 'Condições de Pagamento' },
        ]}
      />
      <PageHeader
        icon={CalendarClock}
        title="Condições de Pagamento"
        description="Prazos, parcelamentos e distribuição percentual aplicáveis a lançamentos."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Nova condição
          </Button>
        }
      />
      <Card>
        <CardContent className="p-4 space-y-4">
          <Input
            placeholder="Buscar..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-sm"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead className="text-center">Parcelas</TableHead>
                <TableHead className="text-center">1º venc.</TableHead>
                <TableHead className="text-center">Intervalo</TableHead>
                <TableHead>Distribuição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Nenhuma condição cadastrada.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-muted-foreground">{t.code ?? '—'}</TableCell>
                  <TableCell className="text-center">{t.installment_count}</TableCell>
                  <TableCell className="text-center">{t.first_due_days}d</TableCell>
                  <TableCell className="text-center">{t.interval_days}d</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {(t.percentage_distribution ?? []).map((p) => `${Number(p)}%`).join(' / ')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.active ? 'default' : 'secondary'}>
                      {t.active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(t);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggle.mutate({ id: t.id, active: !t.active } as any)}
                      title={t.active ? 'Inativar' : 'Reativar'}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmDel(t)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TermDialog open={open} onOpenChange={setOpen} initial={editing} />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir condição?</AlertDialogTitle>
            <AlertDialogDescription>
              Condições já utilizadas em lançamentos serão apenas inativadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDel) remove.mutate(confirmDel.id);
                setConfirmDel(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
