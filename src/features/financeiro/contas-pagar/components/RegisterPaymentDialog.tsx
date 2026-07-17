import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useRegisterPayment, useUploadPaymentReceipt } from '../usePayments';
import { financeiroApi } from '@/features/financeiro/api';
import { useQuery } from '@tanstack/react-query';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  installment: { id: string; entry_id: string; amount: number; paid_amount: number; installment_number: number } | null;
}

export function RegisterPaymentDialog({ open, onOpenChange, installment }: Props) {
  const register = useRegisterPayment();
  const upload = useUploadPaymentReceipt();
  const fileRef = useRef<HTMLInputElement>(null);

  const remaining = installment ? Math.max(installment.amount - installment.paid_amount, 0) : 0;
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState<string | undefined>();
  const [methodId, setMethodId] = useState<string | undefined>();
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (open && installment) {
      setAmount(remaining.toFixed(2));
      setDate(new Date().toISOString().slice(0, 10));
      setReference(''); setNotes(''); setFile(null);
      setAccountId(undefined); setMethodId(undefined);
    }
  }, [open, installment?.id]);

  const accounts = useQuery({
    queryKey: ['fin-accounts-active'],
    enabled: open,
    queryFn: async () => {
      const { data } = await financeiroApi.client.from('financial_accounts').select('id, name').eq('active', true).order('name');
      return data ?? [];
    },
  });
  const methods = useQuery({
    queryKey: ['fin-methods-active'],
    enabled: open,
    queryFn: async () => {
      const { data } = await financeiroApi.client.from('financial_payment_methods').select('id, name').eq('active', true).order('name');
      return data ?? [];
    },
  });

  const submit = async () => {
    if (!installment) return;
    const value = Number(String(amount).replace(',', '.'));
    if (!value || value <= 0) return;
    const paymentId = await register.mutateAsync({
      installment_id: installment.id,
      amount: value,
      payment_date: date,
      account_id: accountId ?? null,
      payment_method_id: methodId ?? null,
      reference: reference || null,
      notes: notes || null,
    });
    if (file && paymentId) {
      await upload.mutateAsync({
        paymentId, entryId: installment.entry_id, installmentId: installment.id, file,
      });
    }
    onOpenChange(false);
  };

  const pending = register.isPending || upload.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pagamento — parcela {installment?.installment_number ?? ''}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor (saldo: R$ {remaining.toFixed(2)})</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Conta de origem</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(accounts.data ?? []).map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Método</Label>
              <Select value={methodId} onValueChange={setMethodId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(methods.data ?? []).map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Referência (E2E, doc, etc.)</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Comprovante (opcional)</Label>
            <Input ref={fileRef} type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>Cancelar</Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
