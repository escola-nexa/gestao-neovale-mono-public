import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FinancialAccount,
  useSaveFinancialAccount,
} from '../useFinancialRegisters';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: FinancialAccount | null;
}

const SUBTYPES = [
  { v: 'checking', l: 'Conta corrente', t: 'BANK' },
  { v: 'savings', l: 'Poupança', t: 'BANK' },
  { v: 'investment', l: 'Conta de aplicação', t: 'BANK' },
  { v: 'cash', l: 'Caixa físico', t: 'CASH' },
  { v: 'digital_wallet', l: 'Carteira digital', t: 'WALLET' },
] as const;

const PIX_TYPES = [
  { v: 'CPF', l: 'CPF' },
  { v: 'CNPJ', l: 'CNPJ' },
  { v: 'EMAIL', l: 'E-mail' },
  { v: 'PHONE', l: 'Telefone' },
  { v: 'RANDOM', l: 'Chave aleatória' },
];

const blank = {
  name: '',
  account_subtype: 'checking',
  account_type: 'BANK',
  bank_code: '',
  bank_name: '',
  agency: '',
  branch: '',
  account_number: '',
  account_digit: '',
  pix_key: '',
  pix_key_type: null,
  initial_balance: 0,
  initial_balance_date: new Date().toISOString().slice(0, 10),
  currency: 'BRL',
  allows_negative_balance: false,
  is_reconcilable: true,
  is_default: false,
  notes: '',
  active: true,
};

export default function ContaFinanceiraDialog({ open, onOpenChange, initial }: Props) {
  const save = useSaveFinancialAccount();
  const [form, setForm] = useState<any>(initial ?? blank);

  useEffect(() => {
    setForm(initial ?? blank);
  }, [initial, open]);

  const subtypeMeta = SUBTYPES.find((s) => s.v === form.account_subtype);
  const isBank = subtypeMeta?.t === 'BANK';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      account_type: subtypeMeta?.t ?? 'BANK',
      initial_balance: Number(form.initial_balance ?? 0),
    };
    await save.mutateAsync(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar conta' : 'Nova conta'}</DialogTitle>
          <DialogDescription>
            Contas bancárias, caixas, carteiras digitais e contas de aplicação.
            O saldo atual é calculado a partir das movimentações e não pode ser editado.
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
            <Label>Tipo *</Label>
            <Select
              value={form.account_subtype ?? 'checking'}
              onValueChange={(v) => setForm({ ...form, account_subtype: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUBTYPES.map((t) => (
                  <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Moeda</Label>
            <Input
              value={form.currency ?? 'BRL'}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            />
          </div>

          {isBank && (
            <>
              <div>
                <Label>Código do banco</Label>
                <Input
                  value={form.bank_code ?? ''}
                  onChange={(e) => setForm({ ...form, bank_code: e.target.value })}
                />
              </div>
              <div>
                <Label>Banco</Label>
                <Input
                  value={form.bank_name ?? ''}
                  onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Agência</Label>
                <Input
                  value={form.agency ?? ''}
                  onChange={(e) => setForm({ ...form, agency: e.target.value, branch: e.target.value })}
                />
              </div>
              <div>
                <Label>Conta / Dígito</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.account_number ?? ''}
                    onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                  />
                  <Input
                    className="w-20"
                    placeholder="dv"
                    value={form.account_digit ?? ''}
                    onChange={(e) => setForm({ ...form, account_digit: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Tipo chave Pix</Label>
                <Select
                  value={form.pix_key_type ?? ''}
                  onValueChange={(v) => setForm({ ...form, pix_key_type: v || null })}
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {PIX_TYPES.map((p) => (
                      <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Chave Pix</Label>
                <Input
                  value={form.pix_key ?? ''}
                  onChange={(e) => setForm({ ...form, pix_key: e.target.value })}
                />
              </div>
            </>
          )}

          <div>
            <Label>Saldo inicial</Label>
            <Input
              type="number"
              step="0.01"
              disabled={!!initial}
              value={form.initial_balance ?? 0}
              onChange={(e) => setForm({ ...form, initial_balance: Number(e.target.value) })}
            />
            {initial && (
              <p className="text-xs text-muted-foreground mt-1">
                Saldo inicial é imutável após a criação.
              </p>
            )}
          </div>
          <div>
            <Label>Data do saldo inicial</Label>
            <Input
              type="date"
              disabled={!!initial}
              value={form.initial_balance_date ?? ''}
              onChange={(e) => setForm({ ...form, initial_balance_date: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label className="text-sm">Conta padrão</Label>
              <p className="text-xs text-muted-foreground">Apenas uma por organização.</p>
            </div>
            <Switch
              checked={!!form.is_default}
              onCheckedChange={(v) => setForm({ ...form, is_default: v })}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label className="text-sm">Permite saldo negativo</Label>
              <p className="text-xs text-muted-foreground">Cheque especial / cartão.</p>
            </div>
            <Switch
              checked={!!form.allows_negative_balance}
              onCheckedChange={(v) => setForm({ ...form, allows_negative_balance: v })}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
            <div>
              <Label className="text-sm">Conciliável</Label>
              <p className="text-xs text-muted-foreground">
                Aceita importação de extrato e conciliação bancária.
              </p>
            </div>
            <Switch
              checked={!!form.is_reconcilable}
              onCheckedChange={(v) => setForm({ ...form, is_reconcilable: v })}
            />
          </div>

          <div className="sm:col-span-2">
            <Label>Observações</Label>
            <Textarea
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

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
