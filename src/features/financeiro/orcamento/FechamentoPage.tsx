import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, Plus } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  useClosures, useClosePeriod, useReopenPeriod,
  type ClosureScope, type ClosureStatus,
} from './useOrcamento';
import {
  useSchoolsLite, useFinancialCostCenters,
} from '@/features/financeiro/cadastros/useFinancialRegisters';

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function FechamentoPage() {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<ClosureStatus | 'ALL'>('ALL');
  const { data, isLoading } = useClosures({ year, status: statusFilter });
  const schools = useSchoolsLite();
  const cc = useFinancialCostCenters();
  const closeMut = useClosePeriod();
  const reopenMut = useReopenPeriod();

  const [closeOpen, setCloseOpen] = useState(false);
  const [closeForm, setCloseForm] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    scope: 'ORG' as ClosureScope,
    school_id: '', cost_center_id: '', notes: '',
  });

  const [reopenOpen, setReopenOpen] = useState<{ id: string } | null>(null);
  const [reopenReason, setReopenReason] = useState('');

  const submitClose = async () => {
    await closeMut.mutateAsync({
      year: closeForm.year, month: closeForm.month, scope: closeForm.scope,
      schoolId: closeForm.scope === 'SCHOOL' ? closeForm.school_id || null : null,
      costCenterId: closeForm.scope === 'COST_CENTER' ? closeForm.cost_center_id || null : null,
      notes: closeForm.notes || null,
    });
    setCloseOpen(false);
  };

  const submitReopen = async () => {
    if (!reopenOpen) return;
    if (reopenReason.trim().length < 5) return;
    await reopenMut.mutateAsync({ id: reopenOpen.id, reason: reopenReason.trim() });
    setReopenOpen(null);
    setReopenReason('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fechamento Mensal"
        description="Bloqueie alterações em períodos consolidados; reabertura exige justificativa."
        actions={
          <Button onClick={() => setCloseOpen(true)}><Plus className="mr-2 h-4 w-4" />Fechar período</Button>
        }
      />

      <div className="flex gap-3">
        <div>
          <Label className="text-xs">Ano</Label>
          <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28" />
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="CLOSED">Fechado</SelectItem>
              <SelectItem value="OPEN">Reaberto</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead>Escopo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fechado em</TableHead>
              <TableHead>Reaberto em</TableHead>
              <TableHead>Justificativa</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>}
            {!isLoading && (data ?? []).length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum fechamento neste ano.</TableCell></TableRow>
            )}
            {(data ?? []).map((c) => {
              const schoolList = (schools.data ?? []) as any[];
              const ccList = (cc.data ?? []) as any[];
              const scopeLabel = c.scope === 'ORG'
                ? 'Organização'
                : c.scope === 'SCHOOL'
                  ? `Escola: ${schoolList.find((s) => s.id === c.school_id)?.name ?? '—'}`
                  : `CC: ${ccList.find((x) => x.id === c.cost_center_id)?.name ?? '—'}`;
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{MONTHS[c.month - 1]}/{c.year}</TableCell>
                  <TableCell>{scopeLabel}</TableCell>
                  <TableCell>
                    {c.status === 'CLOSED'
                      ? <Badge variant="default" className="gap-1"><Lock className="h-3 w-3" />Fechado</Badge>
                      : <Badge variant="secondary" className="gap-1"><Unlock className="h-3 w-3" />Reaberto</Badge>}
                  </TableCell>
                  <TableCell className="text-xs">{c.closed_at ? new Date(c.closed_at).toLocaleString('pt-BR') : '—'}</TableCell>
                  <TableCell className="text-xs">{c.reopened_at ? new Date(c.reopened_at).toLocaleString('pt-BR') : '—'}</TableCell>
                  <TableCell className="text-xs max-w-xs truncate" title={c.reopen_reason ?? ''}>{c.reopen_reason ?? '—'}</TableCell>
                  <TableCell>
                    {c.status === 'CLOSED' && (
                      <Button size="sm" variant="outline" onClick={() => setReopenOpen({ id: c.id })}>
                        <Unlock className="mr-1 h-3 w-3" />Reabrir
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Close dialog */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar período</DialogTitle>
            <DialogDescription>Lançamentos com data no período ficarão bloqueados para alteração.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ano</Label>
                <Input type="number" value={closeForm.year} onChange={(e) => setCloseForm({ ...closeForm, year: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Mês</Label>
                <Select value={String(closeForm.month)} onValueChange={(v) => setCloseForm({ ...closeForm, month: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (<SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Escopo</Label>
              <Select value={closeForm.scope} onValueChange={(v) => setCloseForm({ ...closeForm, scope: v as ClosureScope })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ORG">Organização inteira</SelectItem>
                  <SelectItem value="SCHOOL">Escola específica</SelectItem>
                  <SelectItem value="COST_CENTER">Centro de custo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {closeForm.scope === 'SCHOOL' && (
              <div>
                <Label>Escola</Label>
                <Select value={closeForm.school_id} onValueChange={(v) => setCloseForm({ ...closeForm, school_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>
                    {(schools.data ?? []).map((s: any) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {closeForm.scope === 'COST_CENTER' && (
              <div>
                <Label>Centro de custo</Label>
                <Select value={closeForm.cost_center_id} onValueChange={(v) => setCloseForm({ ...closeForm, cost_center_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>
                    {(cc.data ?? []).map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Observações</Label>
              <Textarea rows={3} value={closeForm.notes} onChange={(e) => setCloseForm({ ...closeForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)}>Cancelar</Button>
            <Button onClick={submitClose} disabled={closeMut.isPending}>
              <Lock className="mr-2 h-4 w-4" />Fechar período
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen dialog */}
      <Dialog open={!!reopenOpen} onOpenChange={(o) => { if (!o) { setReopenOpen(null); setReopenReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reabrir período</DialogTitle>
            <DialogDescription>Informe uma justificativa (mínimo 5 caracteres). A ação é auditada.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label>Justificativa</Label>
            <Textarea rows={4} value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReopenOpen(null); setReopenReason(''); }}>Cancelar</Button>
            <Button onClick={submitReopen} disabled={reopenReason.trim().length < 5 || reopenMut.isPending}>
              <Unlock className="mr-2 h-4 w-4" />Reabrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
