import { useMemo, useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
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
import { CreditCard, Plus, Pencil, Trash2, Power } from 'lucide-react';
import {
  FinancialPaymentMethod,
  useDeleteRegister,
  useFinancialAccounts,
  useFinancialPaymentMethods,
  useSaveRegister,
  useToggleActive,
} from './useFinancialRegisters';

const METHOD_TYPES = [
  { v: 'PIX', l: 'Pix' },
  { v: 'TED', l: 'TED' },
  { v: 'DOC', l: 'DOC' },
  { v: 'BOLETO', l: 'Boleto' },
  { v: 'DINHEIRO', l: 'Dinheiro' },
  { v: 'CARTAO_CREDITO', l: 'Cartão de crédito' },
  { v: 'CARTAO_DEBITO', l: 'Cartão de débito' },
  { v: 'TRANSFERENCIA', l: 'Transferência' },
  { v: 'OUTRO', l: 'Outro' },
];

function PaymentMethodDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: FinancialPaymentMethod | null;
}) {
  const save = useSaveRegister<any>('financial_payment_methods', 'Método');
  const { data: accounts = [] } = useFinancialAccounts();
  const [form, setForm] = useState<any>(
    initial ?? {
      name: '',
      code: '',
      method_type: 'PIX',
      direction: 'BOTH',
      default_account_id: null,
      requires_bank_account: false,
      requires_reference: false,
      requires_proof: false,
      supports_batch: false,
      supports_installments: false,
      settlement_days: 0,
      notes: '',
      active: true,
    },
  );
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await save.mutateAsync({ ...form, code: form.code || null });
    onOpenChange(false);
  };

  const Toggle = ({ k, label, hint }: { k: string; label: string; hint?: string }) => (
    <div className="flex items-center justify-between rounded-md border p-2">
      <div>
        <Label className="text-sm">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={!!form[k]} onCheckedChange={(v) => setForm({ ...form, [k]: v })} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar método' : 'Novo método de pagamento'}</DialogTitle>
          <DialogDescription>
            Defina como os pagamentos serão registrados (Pix, boleto, TED etc.).
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
              placeholder="PIX, BOL, TED…"
            />
          </div>
          <div>
            <Label>Tipo *</Label>
            <Select
              value={form.method_type}
              onValueChange={(v) => setForm({ ...form, method_type: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {METHOD_TYPES.map((t) => (
                  <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Direção *</Label>
            <Select
              value={form.direction ?? 'BOTH'}
              onValueChange={(v) => setForm({ ...form, direction: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BOTH">Entrada e saída</SelectItem>
                <SelectItem value="IN">Apenas recebimentos</SelectItem>
                <SelectItem value="OUT">Apenas pagamentos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Dias de liquidação</Label>
            <Input
              type="number"
              min={0}
              value={form.settlement_days ?? 0}
              onChange={(e) => setForm({ ...form, settlement_days: Number(e.target.value) })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Conta padrão</Label>
            <SearchableSelect
              value={form.default_account_id ?? ''}
              onValueChange={(v) =>
                setForm({ ...form, default_account_id: v || null })
              }
              options={[
                { value: '', label: '— Nenhuma —' },
                ...accounts.map((a) => ({ value: a.id, label: a.name })),
              ]}
              placeholder="Selecione..."
            />
          </div>
          <Toggle k="requires_bank_account" label="Exige conta bancária" />
          <Toggle k="requires_reference" label="Exige número/referência" />
          <Toggle k="requires_proof" label="Exige comprovante" hint="Bloqueia a baixa sem arquivo." />
          <Toggle k="supports_batch" label="Suporta lote / exportação bancária" />
          <Toggle k="supports_installments" label="Suporta parcelamento" />

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function MetodosPagamentoPage() {
  const { data = [], isLoading } = useFinancialPaymentMethods();
  const { data: accounts = [] } = useFinancialAccounts();
  const toggle = useToggleActive('financial_payment_methods', 'Método');
  const remove = useDeleteRegister('financial_payment_methods', 'Método');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<FinancialPaymentMethod | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<FinancialPaymentMethod | null>(null);

  const accName = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.name])),
    [accounts],
  );
  const filtered = useMemo(
    () => data.filter((d) => d.name.toLowerCase().includes(q.toLowerCase())),
    [data, q],
  );

  return (
    <div className="space-y-6">
      <PageBreadcrumb
        items={[
          { label: 'Financeiro', href: '/financeiro' },
          { label: 'Cadastros', href: '/financeiro/cadastros' },
          { label: 'Métodos de pagamento' },
        ]}
      />
      <PageHeader
        icon={CreditCard}
        title="Métodos de Pagamento"
        description="Formas de pagamento utilizadas nos lançamentos financeiros."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Novo método
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
                <TableHead>Tipo</TableHead>
                <TableHead>Conta padrão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum método cadastrado.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>
                    {METHOD_TYPES.find((t) => t.v === m.method_type)?.l ?? m.method_type}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.default_account_id ? accName.get(m.default_account_id) ?? '—' : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.active ? 'default' : 'secondary'}>
                      {m.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(m);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggle.mutate({ id: m.id, active: !m.active })}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmDel(m)}
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

      <PaymentMethodDialog open={open} onOpenChange={setOpen} initial={editing} />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir método?</AlertDialogTitle>
            <AlertDialogDescription>
              Métodos já utilizados serão apenas inativados.
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
