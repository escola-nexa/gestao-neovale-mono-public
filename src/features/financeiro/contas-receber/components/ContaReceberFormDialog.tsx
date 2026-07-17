import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { useCreateReceivable } from '../useContasReceber';
import {
  useFinPartiesLookup, useFinCategoriesLookup, useFinAccountsLookup, useFinMethodsLookup,
} from '../../contas-pagar/useContasPagar';
import { toast } from 'sonner';

export function ContaReceberFormDialog({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [description, setDescription] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [partyId, setPartyId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [methodId, setMethodId] = useState('');
  const [competence, setCompetence] = useState(today);
  const [issue, setIssue] = useState(today);
  const [due, setDue] = useState(today);
  const [total, setTotal] = useState('');
  const [installments, setInstallments] = useState(1);
  const [notes, setNotes] = useState('');

  const [lateFee, setLateFee] = useState('');
  const [dailyInterest, setDailyInterest] = useState('');
  const [earlyDiscount, setEarlyDiscount] = useState('');
  const [earlyDays, setEarlyDays] = useState('');

  const parties = useFinPartiesLookup();
  const cats = useFinCategoriesLookup();
  const accs = useFinAccountsLookup();
  const methods = useFinMethodsLookup();
  const create = useCreateReceivable();

  const totalNum = parseFloat(total.replace(',', '.')) || 0;

  function reset() {
    setDescription(''); setDocumentNumber(''); setPartyId(''); setCategoryId('');
    setAccountId(''); setMethodId(''); setCompetence(today); setIssue(today); setDue(today);
    setTotal(''); setInstallments(1); setNotes('');
    setLateFee(''); setDailyInterest(''); setEarlyDiscount(''); setEarlyDays('');
  }

  async function submit() {
    if (!description.trim()) return toast.error('Descrição obrigatória');
    if (!totalNum || totalNum <= 0) return toast.error('Valor inválido');
    const num = (v: string) => v === '' ? null : (parseFloat(v.replace(',', '.')) || 0);
    try {
      await create.mutateAsync({
        description: description.trim(),
        document_number: documentNumber || null,
        party_id: partyId || null,
        category_id: categoryId || null,
        account_id: accountId || null,
        payment_method_id: methodId || null,
        competence_date: competence,
        issue_date: issue,
        due_date: due,
        total_amount: totalNum,
        installments_count: installments,
        notes: notes || null,
        late_fee_percent: num(lateFee),
        daily_interest_percent: num(dailyInterest),
        early_discount_percent: num(earlyDiscount),
        early_discount_days: earlyDays === '' ? null : (parseInt(earlyDays) || 0),
      });
      reset();
      onOpenChange(false);
    } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo título a receber</DialogTitle>
          <DialogDescription>Criado como rascunho. Envie para aprovação para gerar parcelas.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="dados">
          <TabsList>
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="regras">Multa / Juros / Desconto</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-4 pt-4">
            <div>
              <Label>Descrição *</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nº documento</Label>
                <Input value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} />
              </div>
              <div>
                <Label>Cliente / Pagador</Label>
                <Select value={partyId} onValueChange={setPartyId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(parties.data ?? []).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(cats.data ?? []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Conta de crédito</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(accs.data ?? []).map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Método de recebimento</Label>
                <Select value={methodId} onValueChange={setMethodId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(methods.data ?? []).map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Competência</Label>
                <Input type="date" value={competence} onChange={e => setCompetence(e.target.value)} />
              </div>
              <div>
                <Label>Emissão</Label>
                <Input type="date" value={issue} onChange={e => setIssue(e.target.value)} />
              </div>
              <div>
                <Label>Vencimento *</Label>
                <Input type="date" value={due} onChange={e => setDue(e.target.value)} />
              </div>
              <div>
                <Label>Valor total *</Label>
                <Input value={total} onChange={e => setTotal(e.target.value)} placeholder="0,00" />
              </div>
              <div>
                <Label>Parcelas</Label>
                <Input type="number" min={1} max={120} value={installments}
                  onChange={e => setInstallments(Math.max(1, parseInt(e.target.value) || 1))} />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
          </TabsContent>

          <TabsContent value="regras" className="space-y-3 pt-4">
            <p className="text-xs text-muted-foreground">
              Em branco usa o padrão configurado em Configurações Financeiras.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Multa por atraso (%)</Label>
                <Input value={lateFee} onChange={e => setLateFee(e.target.value)} placeholder="ex: 2" />
              </div>
              <div>
                <Label>Juros ao dia (%)</Label>
                <Input value={dailyInterest} onChange={e => setDailyInterest(e.target.value)} placeholder="ex: 0,033" />
              </div>
              <div>
                <Label>Desconto antecipação (%)</Label>
                <Input value={earlyDiscount} onChange={e => setEarlyDiscount(e.target.value)} placeholder="ex: 5" />
              </div>
              <div>
                <Label>Dias mínimos para desconto</Label>
                <Input value={earlyDays} onChange={e => setEarlyDays(e.target.value)} placeholder="ex: 10" />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar rascunho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
