import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import {
  useCreateEntry,
  useFinPartiesLookup,
  useFinCategoriesLookup,
  useFinAccountsLookup,
  useFinMethodsLookup,
  useFinCostCentersLookup,
  useFinProjectsLookup,
  useSchoolsLookup,
} from '../useContasPagar';
import { toast } from 'sonner';

type Alloc = { cost_center_id?: string; project_id?: string; school_id?: string; amount: number };

export function ContaPagarFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [description, setDescription] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [partyId, setPartyId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [methodId, setMethodId] = useState<string>('');
  const [competence, setCompetence] = useState(today);
  const [issue, setIssue] = useState(today);
  const [due, setDue] = useState(today);
  const [total, setTotal] = useState<string>('');
  const [installments, setInstallments] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [allocs, setAllocs] = useState<Alloc[]>([]);

  const parties = useFinPartiesLookup();
  const cats = useFinCategoriesLookup();
  const accs = useFinAccountsLookup();
  const methods = useFinMethodsLookup();
  const ccs = useFinCostCentersLookup();
  const projects = useFinProjectsLookup();
  const schools = useSchoolsLookup();

  const create = useCreateEntry();
  const totalNum = parseFloat(total.replace(',', '.')) || 0;
  const allocSum = useMemo(() => allocs.reduce((s, a) => s + (a.amount || 0), 0), [allocs]);
  const allocOk = allocs.length === 0 || Math.abs(allocSum - totalNum) < 0.01;

  function reset() {
    setDescription(''); setDocumentNumber(''); setPartyId(''); setCategoryId('');
    setAccountId(''); setMethodId(''); setCompetence(today); setIssue(today); setDue(today);
    setTotal(''); setInstallments(1); setNotes(''); setAllocs([]);
  }

  async function submit() {
    if (!description.trim()) return toast.error('Descrição é obrigatória');
    if (!totalNum || totalNum <= 0) return toast.error('Valor total inválido');
    if (!allocOk) return toast.error(`Soma dos rateios (${allocSum}) deve ser igual ao total (${totalNum})`);
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
        allocations: allocs.filter(a => a.amount > 0),
      });
      reset();
      onOpenChange(false);
    } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo título a pagar</DialogTitle>
          <DialogDescription>O título é criado como rascunho. Envie para aprovação depois.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="dados">
          <TabsList>
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="rateio">Rateio</TabsTrigger>
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
                <Label>Beneficiário</Label>
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
                <Label>Conta financeira</Label>
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
                <Label>Método de pagamento</Label>
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

          <TabsContent value="rateio" className="space-y-3 pt-4">
            <p className="text-sm text-muted-foreground">
              O rateio é opcional. Se preenchido, a soma deve ser igual ao valor total do título.
            </p>
            {allocs.map((a, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-3">
                  <Label className="text-xs">Centro de custo</Label>
                  <Select value={a.cost_center_id ?? ''} onValueChange={v => {
                    const next = [...allocs]; next[i] = { ...a, cost_center_id: v || undefined }; setAllocs(next);
                  }}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {(ccs.data ?? []).map((x: any) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Projeto</Label>
                  <Select value={a.project_id ?? ''} onValueChange={v => {
                    const next = [...allocs]; next[i] = { ...a, project_id: v || undefined }; setAllocs(next);
                  }}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {(projects.data ?? []).map((x: any) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Escola</Label>
                  <Select value={a.school_id ?? ''} onValueChange={v => {
                    const next = [...allocs]; next[i] = { ...a, school_id: v || undefined }; setAllocs(next);
                  }}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {(schools.data ?? []).map((x: any) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Valor</Label>
                  <Input value={a.amount || ''} onChange={e => {
                    const next = [...allocs]; next[i] = { ...a, amount: parseFloat(e.target.value.replace(',', '.')) || 0 }; setAllocs(next);
                  }} />
                </div>
                <div className="col-span-1">
                  <Button variant="ghost" size="icon" onClick={() => setAllocs(allocs.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setAllocs([...allocs, { amount: 0 }])}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar rateio
            </Button>
            {allocs.length > 0 && (
              <div className={`text-sm font-medium ${allocOk ? 'text-emerald-600' : 'text-destructive'}`}>
                Soma rateio: {allocSum.toFixed(2)} / Total: {totalNum.toFixed(2)}
              </div>
            )}
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
