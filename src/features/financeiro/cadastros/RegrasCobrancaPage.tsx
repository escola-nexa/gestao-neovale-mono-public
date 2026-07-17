import { useMemo, useState } from 'react';
import { Gavel, Plus, Pencil, Trash2, Power, Calculator, Star } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { toast } from 'sonner';
import {
  ChargeCalcResult,
  FinancialChargeRule,
  useDeleteRegister,
  useFinancialChargeRules,
  useSaveRegister,
  useToggleActive,
} from './useFinancialRegisters';

const DIR = [
  { v: 'IN', l: 'Recebimentos' },
  { v: 'OUT', l: 'Pagamentos' },
  { v: 'BOTH', l: 'Ambos' },
];
const FINE_TYPES = [
  { v: 'none', l: 'Sem multa' },
  { v: 'fixed', l: 'Valor fixo (R$)' },
  { v: 'percentage', l: 'Percentual (%)' },
];
const INTEREST_TYPES = [
  { v: 'none', l: 'Sem juros' },
  { v: 'fixed', l: 'Valor fixo (R$)' },
  { v: 'percentage', l: 'Percentual sobre base (%)' },
  { v: 'daily_percentage', l: '% ao dia' },
  { v: 'monthly_percentage', l: '% ao mês' },
];
const DISCOUNT_TYPES = [
  { v: 'none', l: 'Sem desconto' },
  { v: 'fixed', l: 'Valor fixo (R$)' },
  { v: 'percentage', l: 'Percentual (%)' },
];
const BASIS = [
  { v: 'principal', l: 'Principal' },
  { v: 'principal_plus_fine', l: 'Principal + multa' },
];

const empty: Partial<FinancialChargeRule> = {
  name: '', direction: 'BOTH',
  fine_type: 'percentage', fine_value: 2,
  interest_type: 'monthly_percentage', interest_value: 1,
  discount_type: 'none', discount_value: 0,
  discount_until_days: 0, grace_period_days: 0,
  calculation_basis: 'principal', is_default: false, active: true, notes: '',
};

const brl = (n: number) =>
  (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function RegrasCobrancaPage() {
  const { data = [], isLoading } = useFinancialChargeRules();
  const save = useSaveRegister<Partial<FinancialChargeRule>>('financial_charge_rules', 'Regra de cobrança');
  const toggle = useToggleActive('financial_charge_rules', 'Regra');
  const del = useDeleteRegister('financial_charge_rules', 'Regra');

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<FinancialChargeRule>>(empty);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  // Simulador
  const [simRuleId, setSimRuleId] = useState<string | null>(null);
  const [simPrincipal, setSimPrincipal] = useState('1000');
  const [simDueDate, setSimDueDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [simResult, setSimResult] = useState<ChargeCalcResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return data;
    return data.filter((r) => r.name.toLowerCase().includes(s));
  }, [data, search]);

  function openNew() { setEditing(empty); setOpen(true); }
  function openEdit(r: FinancialChargeRule) { setEditing(r); setOpen(true); }

  async function handleSave() {
    if (!editing.name?.trim()) return;
    await save.mutateAsync(editing);
    setOpen(false);
  }

  async function runSimulation() {
    if (!simRuleId) { toast.error('Selecione uma regra.'); return; }
    setSimLoading(true);
    try {
      const { data: res, error } = await financeiroApi.client.rpc('calc_financial_charges' as any, {
        _rule_id: simRuleId,
        _principal: Number(simPrincipal || 0),
        _due_date: simDueDate,
        _reference_date: new Date().toISOString().slice(0, 10),
      });
      if (error) throw error;
      setSimResult(res as ChargeCalcResult);
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao simular.');
    } finally {
      setSimLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb items={[
        { label: 'Financeiro', href: '/financeiro' },
        { label: 'Cadastros', href: '/financeiro/cadastros' },
        { label: 'Regras de Cobrança' },
      ]} />
      <PageHeader
        title="Regras de Cobrança"
        description="Juros, multa, desconto e tolerância aplicados a contas a pagar e receber."
        icon={Gavel}
        actions={<Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nova regra</Button>}
      />

      <Card>
        <CardContent className="p-4 space-y-4">
          <Input
            placeholder="Buscar por nome…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Direção</TableHead>
                  <TableHead>Multa</TableHead>
                  <TableHead>Juros</TableHead>
                  <TableHead>Desconto</TableHead>
                  <TableHead className="text-center">Tolerância</TableHead>
                  <TableHead className="text-center">Padrão</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>}
                {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhuma regra cadastrada.</TableCell></TableRow>}
                {filtered.map((r) => (
                  <TableRow key={r.id} className={!r.active ? 'opacity-60' : ''}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{DIR.find((d) => d.v === r.direction)?.l}</TableCell>
                    <TableCell>{r.fine_type === 'none' ? '—' : `${r.fine_value}${r.fine_type === 'percentage' ? '%' : ' R$'}`}</TableCell>
                    <TableCell>{r.interest_type === 'none' ? '—' : `${r.interest_value}${r.interest_type === 'fixed' ? ' R$' : r.interest_type === 'daily_percentage' ? '% / dia' : r.interest_type === 'monthly_percentage' ? '% / mês' : '%'}`}</TableCell>
                    <TableCell>{r.discount_type === 'none' ? '—' : `${r.discount_value}${r.discount_type === 'percentage' ? '%' : ' R$'}${r.discount_until_days ? ` até ${r.discount_until_days}d` : ''}`}</TableCell>
                    <TableCell className="text-center">{r.grace_period_days} dia(s)</TableCell>
                    <TableCell className="text-center">{r.is_default && <Star className="inline h-4 w-4 text-yellow-500 fill-yellow-500" />}</TableCell>
                    <TableCell className="text-center"><Badge variant={r.active ? 'default' : 'secondary'}>{r.active ? 'Ativa' : 'Inativa'}</Badge></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => { setSimRuleId(r.id); }} title="Usar no simulador">
                        <Calculator className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => toggle.mutate({ id: r.id, active: !r.active })} title={r.active ? 'Inativar' : 'Reativar'}><Power className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setConfirmDel(r.id)} title="Excluir"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Simulador */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            <h3 className="font-semibold">Simulador de cobrança</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Regra</Label>
              <Select value={simRuleId ?? ''} onValueChange={setSimRuleId}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  {data.filter((r) => r.active).map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Principal (R$)</Label>
              <Input type="number" min={0} step="0.01" value={simPrincipal} onChange={(e) => setSimPrincipal(e.target.value)} />
            </div>
            <div>
              <Label>Vencimento</Label>
              <Input type="date" value={simDueDate} onChange={(e) => setSimDueDate(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={runSimulation} disabled={simLoading}>
                {simLoading ? 'Calculando…' : 'Simular'}
              </Button>
            </div>
          </div>
          {simResult && (
            <div className="rounded-md border p-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <div><div className="text-muted-foreground">Principal</div><div className="font-semibold">{brl(simResult.principal)}</div></div>
              <div><div className="text-muted-foreground">Multa</div><div className="font-semibold">{brl(simResult.fine)}</div></div>
              <div><div className="text-muted-foreground">Juros</div><div className="font-semibold">{brl(simResult.interest)}</div></div>
              <div><div className="text-muted-foreground">Desconto</div><div className="font-semibold text-emerald-600">- {brl(simResult.discount)}</div></div>
              <div><div className="text-muted-foreground">Total</div><div className="font-bold text-lg">{brl(simResult.total)}</div></div>
              <div className="col-span-2 md:col-span-5 text-xs text-muted-foreground">
                {simResult.days_overdue > 0
                  ? `${simResult.days_overdue} dia(s) em atraso.`
                  : simResult.days_overdue === 0 ? 'Vence hoje.' : `${Math.abs(simResult.days_overdue)} dia(s) antes do vencimento.`}
                {' '}Memória: <code className="text-xs">{JSON.stringify(simResult.memo)}</code>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog editar/criar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? 'Editar regra de cobrança' : 'Nova regra de cobrança'}</DialogTitle>
            <DialogDescription>
              Títulos já liquidados preservam a regra aplicada no momento da baixa.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome *</Label>
              <Input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div>
              <Label>Direção</Label>
              <Select value={editing.direction ?? 'BOTH'} onValueChange={(v: any) => setEditing({ ...editing, direction: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DIR.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Base de cálculo dos juros</Label>
              <Select value={editing.calculation_basis ?? 'principal'} onValueChange={(v: any) => setEditing({ ...editing, calculation_basis: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BASIS.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="col-span-2 border-t pt-3"><strong className="text-sm">Multa</strong></div>
            <div>
              <Label>Tipo</Label>
              <Select value={editing.fine_type ?? 'none'} onValueChange={(v: any) => setEditing({ ...editing, fine_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FINE_TYPES.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor</Label>
              <Input type="number" min={0} step="0.01" value={editing.fine_value ?? 0} onChange={(e) => setEditing({ ...editing, fine_value: Number(e.target.value) })} />
            </div>

            <div className="col-span-2 border-t pt-3"><strong className="text-sm">Juros</strong></div>
            <div>
              <Label>Tipo</Label>
              <Select value={editing.interest_type ?? 'none'} onValueChange={(v: any) => setEditing({ ...editing, interest_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INTEREST_TYPES.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor</Label>
              <Input type="number" min={0} step="0.0001" value={editing.interest_value ?? 0} onChange={(e) => setEditing({ ...editing, interest_value: Number(e.target.value) })} />
            </div>

            <div className="col-span-2 border-t pt-3"><strong className="text-sm">Desconto</strong></div>
            <div>
              <Label>Tipo</Label>
              <Select value={editing.discount_type ?? 'none'} onValueChange={(v: any) => setEditing({ ...editing, discount_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DISCOUNT_TYPES.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor</Label>
              <Input type="number" min={0} step="0.01" value={editing.discount_value ?? 0} onChange={(e) => setEditing({ ...editing, discount_value: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Desconto válido até (dias antes do venc.)</Label>
              <Input type="number" min={0} value={editing.discount_until_days ?? 0} onChange={(e) => setEditing({ ...editing, discount_until_days: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Carência (dias após venc.)</Label>
              <Input type="number" min={0} value={editing.grace_period_days ?? 0} onChange={(e) => setEditing({ ...editing, grace_period_days: Number(e.target.value) })} />
            </div>

            <div className="col-span-2 flex items-center justify-between border rounded-md p-3">
              <div>
                <Label className="m-0">Regra padrão da organização</Label>
                <p className="text-xs text-muted-foreground">Será sugerida ao criar novos títulos.</p>
              </div>
              <Switch checked={!!editing.is_default} onCheckedChange={(v) => setEditing({ ...editing, is_default: v })} />
            </div>

            <div className="col-span-2">
              <Label>Observações</Label>
              <Textarea rows={2} value={editing.notes ?? ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={save.isPending || !editing.name?.trim()}>
              {save.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir regra?</AlertDialogTitle>
            <AlertDialogDescription>
              Se a regra já estiver em uso, será apenas inativada para preservar a memória dos títulos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmDel) del.mutate(confirmDel); setConfirmDel(null); }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
