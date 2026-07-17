import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText } from 'lucide-react';
import { useRegisterReceipt, useCalculateCharges } from '../useContasReceber';
import { useFinAccountsLookup, useFinMethodsLookup } from '../../contas-pagar/useContasPagar';
import { toast } from 'sonner';
import { generateReceiptPdf } from '../utils/receiptPdf';

const fmtBRL = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function RegisterReceiptDialog({
  open, onOpenChange, installment, entry, onAfterReceipt,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  installment: any | null;
  entry: any | null;
  onAfterReceipt?: (paymentId: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [methodId, setMethodId] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const accs = useFinAccountsLookup();
  const methods = useFinMethodsLookup();
  const register = useRegisterReceipt();
  const { data: charges } = useCalculateCharges(installment?.id, date);

  useEffect(() => {
    if (open && installment && charges) {
      setAmount(String(Number(charges.total_due).toFixed(2)));
    }
    if (!open) {
      setDate(today); setAmount(''); setAccountId(''); setMethodId('');
      setReference(''); setNotes('');
    }
  }, [open, charges, installment]);

  if (!installment) return null;
  const remaining = Number(installment.amount) - Number(installment.paid_amount ?? 0);

  async function submit() {
    const amt = parseFloat(amount.replace(',', '.')) || 0;
    if (amt <= 0) return toast.error('Valor inválido');
    try {
      const paymentId = await register.mutateAsync({
        installment_id: installment.id,
        amount: amt,
        payment_date: date,
        account_id: accountId || null,
        payment_method_id: methodId || null,
        reference: reference || null,
        notes: notes || null,
        interest: charges?.interest ?? 0,
        late_fee: charges?.late_fee ?? 0,
        discount: charges?.discount ?? 0,
      });
      onAfterReceipt?.(paymentId);
      onOpenChange(false);
    } catch {}
  }

  function handleGenerateReceipt() {
    const amt = parseFloat(amount.replace(',', '.')) || 0;
    if (amt <= 0) return toast.error('Informe o valor antes');
    generateReceiptPdf({
      payer_name: entry?.party?.name ?? '—',
      payer_document: null,
      description: entry?.description ?? '',
      document_number: entry?.document_number,
      installment_number: installment.installment_number,
      total_installments: entry?.installments_count,
      payment_date: date,
      amount: amt,
      interest: charges?.interest ?? 0,
      late_fee: charges?.late_fee ?? 0,
      discount: charges?.discount ?? 0,
      reference,
      account_name: accs.data?.find((a: any) => a.id === accountId)?.name ?? null,
      payment_method: methods.data?.find((m: any) => m.id === methodId)?.name ?? null,
      receipt_id: crypto.randomUUID(),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar recebimento</DialogTitle>
          <DialogDescription>
            Parcela {installment.installment_number} — Saldo {fmtBRL(remaining)}
          </DialogDescription>
        </DialogHeader>

        {charges && (
          <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
            <div className="flex justify-between"><span>Saldo</span><span>{fmtBRL(charges.base_amount)}</span></div>
            {charges.days_overdue > 0 && (
              <div className="text-destructive">Em atraso há {charges.days_overdue} dia(s)</div>
            )}
            {charges.late_fee > 0 && <div className="flex justify-between"><span>+ Multa</span><span>{fmtBRL(charges.late_fee)}</span></div>}
            {charges.interest > 0 && <div className="flex justify-between"><span>+ Juros</span><span>{fmtBRL(charges.interest)}</span></div>}
            {charges.discount > 0 && <div className="flex justify-between text-emerald-600"><span>− Desconto</span><span>{fmtBRL(charges.discount)}</span></div>}
            <div className="flex justify-between font-bold border-t pt-1 mt-1">
              <span>Total devido</span><span>{fmtBRL(charges.total_due)}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Data do recebimento</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Valor recebido *</Label>
            <Input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
          </div>
          <div>
            <Label>Conta de crédito</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(accs.data ?? []).map((a: any) => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Método</Label>
            <Select value={methodId} onValueChange={setMethodId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(methods.data ?? []).map((m: any) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Referência (nº comprovante)</Label>
            <Input value={reference} onChange={e => setReference(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="ghost" onClick={handleGenerateReceipt}>
            <FileText className="h-4 w-4 mr-2" /> Gerar recibo
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={register.isPending}>
            {register.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Registrar recebimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
