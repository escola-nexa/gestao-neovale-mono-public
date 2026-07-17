import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Check, RotateCcw, XCircle, Undo2, Paperclip, Download, Loader2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useFinancialEntry,
  useEntryInstallments,
  useEntryAllocations,
  useEntryAttachments,
  useEntryApprovals,
  useSubmitEntry,
  useApproveEntry,
  useReturnEntry,
  useCancelEntry,
  useReverseEntry,
  useUploadAttachment,
  downloadAttachment,
  STATUS_LABEL,
  STATUS_VARIANT,
} from './useContasPagar';
import { useEntryPayments, useReversePayment } from './usePayments';
import { RegisterPaymentDialog } from './components/RegisterPaymentDialog';
import { JustificationDialog } from './components/JustificationDialog';

const fmtBRL = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
const fmtDT = (d: string) => new Date(d).toLocaleString('pt-BR');

const ACTION_LABEL: Record<string, string> = {
  submitted: 'Enviado para aprovação',
  approved: 'Aprovado',
  returned: 'Devolvido para correção',
  cancelled: 'Cancelado',
  reversed: 'Estornado',
  rejected: 'Rejeitado',
};

export default function ContaPagarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: entry, isLoading } = useFinancialEntry(id);
  const { data: installments } = useEntryInstallments(id);
  const { data: allocations } = useEntryAllocations(id);
  const { data: attachments } = useEntryAttachments(id);
  const { data: approvals } = useEntryApprovals(id);

  const submit = useSubmitEntry();
  const approve = useApproveEntry();
  const ret = useReturnEntry();
  const cancel = useCancelEntry();
  const reverse = useReverseEntry();
  const upload = useUploadAttachment();

  const [actionDialog, setActionDialog] = useState<null | 'return' | 'cancel' | 'reverse'>(null);
  const [attachKind, setAttachKind] = useState('nota_fiscal');
  const [payInstallment, setPayInstallment] = useState<any>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  if (isLoading || !entry) {
    return <div className="p-12 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const canSubmit = entry.status === 'draft';
  const canApprove = entry.status === 'pending_approval';
  const canReturn = entry.status === 'pending_approval';
  const canCancel = !['paid', 'reversed', 'cancelled'].includes(entry.status);
  const canReverse = ['paid', 'partially_paid'].includes(entry.status);

  return (
    <div className="container max-w-6xl py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/financeiro/contas-a-pagar')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{entry.description}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={STATUS_VARIANT[entry.status as keyof typeof STATUS_VARIANT]}>
                {STATUS_LABEL[entry.status as keyof typeof STATUS_LABEL]}
              </Badge>
              {entry.document_number && <span className="text-sm text-muted-foreground">Nº {entry.document_number}</span>}
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
          {canCancel && (
            <Button variant="outline" onClick={() => setActionDialog('cancel')}>
              <XCircle className="h-4 w-4 mr-2" /> Cancelar
            </Button>
          )}
          {canReverse && (
            <Button variant="destructive" onClick={() => setActionDialog('reverse')}>
              <Undo2 className="h-4 w-4 mr-2" /> Estornar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Dados do título</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Beneficiário" value={entry.party?.name ?? '—'} />
            <Info label="Categoria" value={entry.category?.name ?? '—'} />
            <Info label="Conta" value={entry.account?.name ?? '—'} />
            <Info label="Método" value={entry.payment_method?.name ?? '—'} />
            <Info label="Competência" value={fmtDate(entry.competence_date)} />
            <Info label="Emissão" value={fmtDate(entry.issue_date)} />
            <Info label="Vencimento" value={fmtDate(entry.due_date)} />
            <Info label="Valor total" value={fmtBRL(entry.total_amount)} />
            <Info label="Parcelas" value={`${entry.installments_count}x`} />
            {entry.cancellation_reason && <Info label="Cancelamento" value={entry.cancellation_reason} />}
            {entry.reversal_reason && <Info label="Estorno" value={entry.reversal_reason} />}
            {entry.notes && <div className="col-span-2"><Info label="Observações" value={entry.notes} /></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Rateio</CardTitle></CardHeader>
          <CardContent>
            {!allocations?.length ? (
              <p className="text-sm text-muted-foreground">Sem rateio.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {allocations.map((a: any) => (
                  <li key={a.id} className="flex justify-between border-b pb-1">
                    <span>
                      {[a.cost_center?.name, a.project?.name, a.school?.name].filter(Boolean).join(' · ') || '—'}
                    </span>
                    <span className="font-mono">{fmtBRL(a.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

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
                  <TableHead className="text-right">Pago</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installments.map((p: any) => {
                  const remaining = Number(p.amount) - Number(p.paid_amount ?? 0);
                  const canPay = ['approved', 'scheduled', 'partially_paid', 'overdue'].includes(entry.status) && remaining > 0.005;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{p.installment_number}</TableCell>
                      <TableCell>{fmtDate(p.due_date)}</TableCell>
                      <TableCell className="text-right font-mono">{fmtBRL(p.amount)}</TableCell>
                      <TableCell className="text-right font-mono">{fmtBRL(p.paid_amount)}</TableCell>
                      <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        {canPay && (
                          <Button size="sm" variant="outline" onClick={() => setPayInstallment(p)}>
                            <Wallet className="h-3.5 w-3.5 mr-1" /> Pagar
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

      <PaymentsCard entryId={id!} />


      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Paperclip className="h-4 w-4" /> Anexos
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={attachKind} onValueChange={setAttachKind}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nota_fiscal">Nota fiscal</SelectItem>
                  <SelectItem value="contrato">Contrato</SelectItem>
                  <SelectItem value="recibo">Recibo</SelectItem>
                  <SelectItem value="comprovante">Comprovante</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
              <input
                ref={fileInput}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload.mutate({ entryId: id!, file: f, kind: attachKind });
                  if (fileInput.current) fileInput.current.value = '';
                }}
              />
              <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={upload.isPending}>
                {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar arquivo'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!attachments?.length ? (
            <p className="text-sm text-muted-foreground">Sem anexos.</p>
          ) : (
            <ul className="space-y-2">
              {attachments.map((a: any) => (
                <li key={a.id} className="flex items-center justify-between border-b pb-2 text-sm">
                  <div>
                    <div className="font-medium">{a.file_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.kind} · {fmtDT(a.created_at)}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => downloadAttachment(a.file_path, a.file_name)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico e auditoria</CardTitle></CardHeader>
        <CardContent>
          {!approvals?.length ? (
            <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
          ) : (
            <ul className="space-y-3">
              {approvals.map((a: any) => (
                <li key={a.id} className="border-l-2 border-primary pl-3">
                  <div className="font-medium text-sm">{ACTION_LABEL[a.action] ?? a.action}</div>
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
        title="Devolver para correção"
        description="Informe o que precisa ser corrigido. O título volta para rascunho."
        confirmLabel="Devolver"
        pending={ret.isPending}
        onConfirm={(reason) => ret.mutate({ entryId: id!, reason }, { onSuccess: () => setActionDialog(null) })}
      />
      <JustificationDialog
        open={actionDialog === 'cancel'} onOpenChange={(v) => !v && setActionDialog(null)}
        title="Cancelar título" destructive
        description="O título e as parcelas pendentes serão cancelados."
        confirmLabel="Cancelar título"
        pending={cancel.isPending}
        onConfirm={(reason) => cancel.mutate({ entryId: id!, reason }, { onSuccess: () => setActionDialog(null) })}
      />
      <JustificationDialog
        open={actionDialog === 'reverse'} onOpenChange={(v) => !v && setActionDialog(null)}
        title="Estornar pagamento" destructive
        description="Reverte o pagamento já efetuado. Use apenas para correção contábil."
        confirmLabel="Estornar"
        pending={reverse.isPending}
        onConfirm={(reason) => reverse.mutate({ entryId: id!, reason }, { onSuccess: () => setActionDialog(null) })}
      />
      <RegisterPaymentDialog
        open={!!payInstallment}
        onOpenChange={(v) => !v && setPayInstallment(null)}
        installment={payInstallment}
      />
    </div>
  );
}

function PaymentsCard({ entryId }: { entryId: string }) {
  const { data: payments } = useEntryPayments(entryId);
  const reverse = useReversePayment();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (!payments?.length) return null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Pagamentos</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Conta / Método</TableHead>
              <TableHead>Referência</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p: any) => {
              const isRev = p.kind === 'reversal';
              const alreadyReversed = payments.some((x: any) => x.reversal_of_id === p.id);
              return (
                <TableRow key={p.id}>
                  <TableCell>{fmtDate(p.payment_date)}</TableCell>
                  <TableCell>
                    <Badge variant={isRev ? 'destructive' : 'default'}>{isRev ? 'Estorno' : 'Pagamento'}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {[p.account?.name, p.payment_method?.name].filter(Boolean).join(' · ') || '—'}
                  </TableCell>
                  <TableCell className="text-sm">{p.reference || '—'}</TableCell>
                  <TableCell className={`text-right font-mono ${isRev ? 'text-destructive' : ''}`}>
                    {fmtBRL(p.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {!isRev && !alreadyReversed && (
                      <Button size="sm" variant="ghost" onClick={() => setConfirmId(p.id)}>
                        <Undo2 className="h-3.5 w-3.5 mr-1" /> Estornar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <JustificationDialog
          open={!!confirmId} onOpenChange={(v) => !v && setConfirmId(null)}
          title="Estornar pagamento" destructive
          description="Será criado um pagamento reverso de igual valor, mantendo o original auditável."
          confirmLabel="Estornar pagamento"
          pending={reverse.isPending}
          onConfirm={(reason) => reverse.mutate(
            { payment_id: confirmId!, reason },
            { onSuccess: () => setConfirmId(null) }
          )}
        />
      </CardContent>
    </Card>
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
