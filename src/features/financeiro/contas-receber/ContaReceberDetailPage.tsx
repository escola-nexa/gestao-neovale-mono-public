import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Check, RotateCcw, XCircle, Loader2, HandCoins, RefreshCcw, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useFinancialEntry, useEntryInstallments, useEntryApprovals,
  useSubmitEntry, useApproveEntry, useReturnEntry, useCancelEntry,
} from '../contas-pagar/useContasPagar';
import { useEntryPayments } from '../contas-pagar/usePayments';
import { JustificationDialog } from '../contas-pagar/components/JustificationDialog';
import {
  RECEIVABLE_STATUS_LABEL, RECEIVABLE_STATUS_VARIANT, type ReceivableStatus,
} from './useContasReceber';
import { RegisterReceiptDialog } from './components/RegisterReceiptDialog';
import { RenegotiateDialog } from './components/RenegotiateDialog';
import { generateReceiptPdf } from './utils/receiptPdf';

const fmtBRL = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
const fmtDT = (d: string) => new Date(d).toLocaleString('pt-BR');

export default function ContaReceberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: entry, isLoading } = useFinancialEntry(id);
  const { data: installments } = useEntryInstallments(id);
  const { data: approvals } = useEntryApprovals(id);
  const { data: payments } = useEntryPayments(id);

  const submit = useSubmitEntry();
  const approve = useApproveEntry();
  const ret = useReturnEntry();
  const cancel = useCancelEntry();

  const [actionDialog, setActionDialog] = useState<null | 'return' | 'cancel'>(null);
  const [receiveInst, setReceiveInst] = useState<any>(null);
  const [renegOpen, setRenegOpen] = useState(false);

  if (isLoading || !entry) {
    return <div className="p-12 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const status = entry.status as ReceivableStatus;
  const canSubmit = status === 'draft';
  const canApprove = status === 'pending_approval';
  const canReturn = status === 'pending_approval';
  const canCancel = !['paid', 'reversed', 'cancelled', 'renegotiated'].includes(status);
  const canReceive = ['approved', 'scheduled', 'partially_paid', 'overdue'].includes(status);
  const canRenegotiate = ['approved', 'scheduled', 'partially_paid', 'overdue'].includes(status);

  return (
    <div className="container max-w-6xl py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/financeiro/contas-a-receber')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{entry.description}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant={RECEIVABLE_STATUS_VARIANT[status]}>{RECEIVABLE_STATUS_LABEL[status]}</Badge>
              {entry.document_number && <span className="text-sm text-muted-foreground">Nº {entry.document_number}</span>}
              {entry.renegotiated_from_id && (
                <Button variant="link" size="sm" className="h-auto p-0 text-xs"
                  onClick={() => navigate(`/financeiro/contas-a-receber/${entry.renegotiated_from_id}`)}>
                  ver título original
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canSubmit && (
            <Button onClick={() => submit.mutate({ entryId: id! })} disabled={submit.isPending}>
              <Send className="h-4 w-4 mr-2" /> Enviar para aprovação
            </Button>
          )}
          {canApprove && (
            <Button onClick={() => approve.mutate({ entryId: id! })} disabled={approve.isPending}>
              <Check className="h-4 w-4 mr-2" /> Aprovar
            </Button>
          )}
          {canReturn && (
            <Button variant="outline" onClick={() => setActionDialog('return')}>
              <RotateCcw className="h-4 w-4 mr-2" /> Devolver
            </Button>
          )}
          {canRenegotiate && (
            <Button variant="outline" onClick={() => setRenegOpen(true)}>
              <RefreshCcw className="h-4 w-4 mr-2" /> Renegociar
            </Button>
          )}
          {canCancel && (
            <Button variant="outline" onClick={() => setActionDialog('cancel')}>
              <XCircle className="h-4 w-4 mr-2" /> Cancelar
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Dados do título</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Info label="Cliente" value={entry.party?.name ?? '—'} />
          <Info label="Categoria" value={entry.category?.name ?? '—'} />
          <Info label="Conta" value={entry.account?.name ?? '—'} />
          <Info label="Método" value={entry.payment_method?.name ?? '—'} />
          <Info label="Competência" value={fmtDate(entry.competence_date)} />
          <Info label="Emissão" value={fmtDate(entry.issue_date)} />
          <Info label="Vencimento" value={fmtDate(entry.due_date)} />
          <Info label="Valor total" value={fmtBRL(entry.total_amount)} />
          <Info label="Parcelas" value={`${entry.installments_count}x`} />
          {entry.late_fee_percent != null && <Info label="Multa" value={`${entry.late_fee_percent}%`} />}
          {entry.daily_interest_percent != null && <Info label="Juros/dia" value={`${entry.daily_interest_percent}%`} />}
          {entry.early_discount_percent != null && <Info label="Desconto antec." value={`${entry.early_discount_percent}%`} />}
          {entry.renegotiation_reason && <div className="col-span-2 md:col-span-4"><Info label="Motivo renegociação" value={entry.renegotiation_reason} /></div>}
          {entry.notes && <div className="col-span-2 md:col-span-4"><Info label="Observações" value={entry.notes} /></div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Parcelas</CardTitle></CardHeader>
        <CardContent>
          {!installments?.length ? (
            <p className="text-sm text-muted-foreground">Parcelas são geradas após aprovação.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Recebido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installments.map((p: any) => {
                  const remaining = Number(p.amount) - Number(p.paid_amount ?? 0);
                  const canReg = canReceive && remaining > 0.005 && p.status !== 'cancelled';
                  const overdue = new Date(p.due_date + 'T00:00:00') < new Date(new Date().toDateString());
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{p.installment_number}</TableCell>
                      <TableCell className={overdue && remaining > 0 ? 'text-destructive font-medium' : ''}>
                        {fmtDate(p.due_date)}
                      </TableCell>
                      <TableCell className="text-right font-mono">{fmtBRL(p.amount)}</TableCell>
                      <TableCell className="text-right font-mono">{fmtBRL(p.paid_amount)}</TableCell>
                      <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        {canReg && (
                          <Button size="sm" variant="outline" onClick={() => setReceiveInst(p)}>
                            <HandCoins className="h-3.5 w-3.5 mr-1" /> Receber
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {!!payments?.length && (
        <Card>
          <CardHeader><CardTitle className="text-base">Recebimentos</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Conta / Método</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead className="text-right">Multa</TableHead>
                  <TableHead className="text-right">Juros</TableHead>
                  <TableHead className="text-right">Desconto</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Recibo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{fmtDate(p.payment_date)}</TableCell>
                    <TableCell className="text-sm">{[p.account?.name, p.payment_method?.name].filter(Boolean).join(' · ') || '—'}</TableCell>
                    <TableCell className="text-sm">{p.reference || '—'}</TableCell>
                    <TableCell className="text-right font-mono">{fmtBRL(p.late_fee_amount ?? 0)}</TableCell>
                    <TableCell className="text-right font-mono">{fmtBRL(p.interest_amount ?? 0)}</TableCell>
                    <TableCell className="text-right font-mono text-emerald-600">{fmtBRL(p.discount_amount ?? 0)}</TableCell>
                    <TableCell className={`text-right font-mono ${p.kind === 'reversal' ? 'text-destructive' : ''}`}>{fmtBRL(p.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => generateReceiptPdf({
                        payer_name: entry.party?.name ?? '—',
                        description: entry.description,
                        document_number: entry.document_number,
                        installment_number: installments?.find((i: any) => i.id === p.installment_id)?.installment_number,
                        total_installments: entry.installments_count,
                        payment_date: p.payment_date,
                        amount: Number(p.amount),
                        interest: Number(p.interest_amount ?? 0),
                        late_fee: Number(p.late_fee_amount ?? 0),
                        discount: Number(p.discount_amount ?? 0),
                        reference: p.reference,
                        account_name: p.account?.name ?? null,
                        payment_method: p.payment_method?.name ?? null,
                        receipt_id: p.id,
                      })}>
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
        <CardContent>
          {!approvals?.length ? (
            <p className="text-sm text-muted-foreground">Nenhum evento.</p>
          ) : (
            <ul className="space-y-3">
              {approvals.map((a: any) => (
                <li key={a.id} className="border-l-2 border-primary pl-3">
                  <div className="font-medium text-sm">{a.action}</div>
                  <div className="text-xs text-muted-foreground">{fmtDT(a.created_at)}</div>
                  {a.reason && <div className="text-sm mt-1 italic">"{a.reason}"</div>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <JustificationDialog
        open={actionDialog === 'return'} onOpenChange={(v) => !v && setActionDialog(null)}
        title="Devolver" description="Informe o que precisa ser corrigido."
        confirmLabel="Devolver" pending={ret.isPending}
        onConfirm={(reason) => ret.mutate({ entryId: id!, reason }, { onSuccess: () => setActionDialog(null) })}
      />
      <JustificationDialog
        open={actionDialog === 'cancel'} onOpenChange={(v) => !v && setActionDialog(null)}
        title="Cancelar título" destructive
        description="O título e as parcelas pendentes serão cancelados."
        confirmLabel="Cancelar título" pending={cancel.isPending}
        onConfirm={(reason) => cancel.mutate({ entryId: id!, reason }, { onSuccess: () => setActionDialog(null) })}
      />
      <RegisterReceiptDialog
        open={!!receiveInst} onOpenChange={(v) => !v && setReceiveInst(null)}
        installment={receiveInst} entry={entry}
      />
      <RenegotiateDialog
        open={renegOpen} onOpenChange={setRenegOpen} entry={entry}
        onAfterRenegotiate={(newId) => navigate(`/financeiro/contas-a-receber/${newId}`)}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
