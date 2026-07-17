import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useRenegotiateReceivable } from '../useContasReceber';
import { toast } from 'sonner';

export function RenegotiateDialog({
  open, onOpenChange, entry, onAfterRenegotiate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entry: any | null;
  onAfterRenegotiate?: (newEntryId: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [reason, setReason] = useState('');
  const [total, setTotal] = useState('');
  const [firstDue, setFirstDue] = useState(today);
  const [installments, setInstallments] = useState(1);
  const [notes, setNotes] = useState('');
  const reneg = useRenegotiateReceivable();

  if (!entry) return null;

  async function submit() {
    if (reason.trim().length < 5) return toast.error('Motivo obrigatório (mín. 5 caracteres)');
    const t = parseFloat(total.replace(',', '.')) || 0;
    if (t <= 0) return toast.error('Valor inválido');
    try {
      const newId = await reneg.mutateAsync({
        entry_id: entry.id,
        reason: reason.trim(),
        total_amount: t,
        first_due_date: firstDue,
        installments_count: installments,
        notes: notes || null,
      });
      onAfterRenegotiate?.(newId);
      onOpenChange(false);
    } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renegociar título</DialogTitle>
          <DialogDescription>
            O título atual será marcado como <strong>renegociado</strong> (histórico preservado) e um novo será criado já aprovado, vinculado ao original.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Motivo da renegociação *</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Novo valor total *</Label>
              <Input value={total} onChange={e => setTotal(e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <Label>Nº parcelas</Label>
              <Input type="number" min={1} max={120} value={installments}
                onChange={e => setInstallments(Math.max(1, parseInt(e.target.value) || 1))} />
            </div>
            <div className="col-span-2">
              <Label>Primeiro vencimento *</Label>
              <Input type="date" value={firstDue} onChange={e => setFirstDue(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Observações</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={reneg.isPending}>
            {reneg.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Renegociar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
