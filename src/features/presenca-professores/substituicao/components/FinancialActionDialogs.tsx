import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  useApproveTSRPayment, useScheduleTSRPayment, useMarkTSRPaid,
  useReturnTSRForCorrection, useUploadTSRFile,
} from '../hooks/useTeacherSubstitution';

interface BaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  organizationId: string;
  onDone?: () => void;
}

const PAYMENT_METHODS = [
  'PIX', 'TED', 'DOC', 'Dinheiro', 'Cheque', 'Cartão', 'Outro',
] as const;

function handleRpcError(e: any) {
  const msg = e?.message ?? 'Falha ao executar ação.';
  toast.error(msg);
}

/* ============================ APROVAR ============================ */
const approveSchema = z.object({
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});
type ApproveValues = z.infer<typeof approveSchema>;

export function ApprovePaymentDialog({ open, onOpenChange, requestId, onDone }: BaseProps) {
  const approve = useApproveTSRPayment();
  const form = useForm<ApproveValues>({ resolver: zodResolver(approveSchema), defaultValues: { notes: '' } });

  useEffect(() => { if (!open) form.reset({ notes: '' }); }, [open]); // eslint-disable-line

  async function onSubmit(values: ApproveValues) {
    try {
      await approve.mutateAsync({ id: requestId, notes: values.notes || undefined });
      toast.success('Encaminhada para pagamento.');
      onOpenChange(false);
      onDone?.();
    } catch (e) { handleRpcError(e); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aprovar para pagamento</DialogTitle>
          <DialogDescription>
            A solicitação será marcada como <b>aprovada para pagamento</b>. A ação ficará registrada na auditoria.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <Label htmlFor="notes">Observação (opcional)</Label>
            <Textarea id="notes" rows={3} maxLength={1000} {...form.register('notes')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={approve.isPending}>
              {approve.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Aprovar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ============================ AGENDAR ============================ */
const scheduleSchema = z.object({
  scheduled_for: z.string().trim().min(1, 'Informe a data prevista'),
  payment_method: z.string().trim().min(1, 'Selecione o método').max(50),
  payment_reference: z.string().trim().max(120).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});
type ScheduleValues = z.infer<typeof scheduleSchema>;

export function SchedulePaymentDialog({ open, onOpenChange, requestId, onDone }: BaseProps) {
  const schedule = useScheduleTSRPayment();
  const form = useForm<ScheduleValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { scheduled_for: '', payment_method: 'PIX', payment_reference: '', notes: '' },
  });

  useEffect(() => { if (!open) form.reset({ scheduled_for: '', payment_method: 'PIX', payment_reference: '', notes: '' }); }, [open]); // eslint-disable-line

  async function onSubmit(values: ScheduleValues) {
    try {
      await schedule.mutateAsync({
        id: requestId,
        scheduled_for: values.scheduled_for,
        payment_method: values.payment_method,
        payment_reference: values.payment_reference || null,
        notes: values.notes || null,
      });
      toast.success('Pagamento agendado.');
      onOpenChange(false);
      onDone?.();
    } catch (e) { handleRpcError(e); }
  }

  const method = form.watch('payment_method');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar pagamento</DialogTitle>
          <DialogDescription>Defina data prevista e método. Registrado em auditoria.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="scheduled_for">Data prevista *</Label>
              <Input id="scheduled_for" type="date" {...form.register('scheduled_for')} />
              {form.formState.errors.scheduled_for && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.scheduled_for.message}</p>
              )}
            </div>
            <div>
              <Label>Método *</Label>
              <Select value={method} onValueChange={(v) => form.setValue('payment_method', v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="payment_reference">Referência (opcional)</Label>
            <Input id="payment_reference" maxLength={120} {...form.register('payment_reference')} />
          </div>
          <div>
            <Label htmlFor="sched_notes">Observação (opcional)</Label>
            <Textarea id="sched_notes" rows={2} maxLength={1000} {...form.register('notes')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={schedule.isPending}>
              {schedule.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Agendar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ============================ MARCAR PAGO ============================ */
const ALLOWED_FILES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const paidSchema = z.object({
  paid_at: z.string().trim().min(1, 'Informe a data do pagamento'),
  payment_method: z.string().trim().min(1, 'Selecione o método').max(50),
  payment_reference: z.string().trim().max(120).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});
type PaidValues = z.infer<typeof paidSchema>;

export function MarkPaidDialog({ open, onOpenChange, requestId, organizationId, onDone }: BaseProps) {
  const pay = useMarkTSRPaid();
  const upload = useUploadTSRFile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const form = useForm<PaidValues>({
    resolver: zodResolver(paidSchema),
    defaultValues: { paid_at: today, payment_method: 'PIX', payment_reference: '', notes: '' },
  });

  useEffect(() => {
    if (!open) { form.reset({ paid_at: today, payment_method: 'PIX', payment_reference: '', notes: '' }); setFile(null); }
  }, [open]); // eslint-disable-line

  const method = form.watch('payment_method');
  const busy = pay.isPending || upload.isPending;

  async function onSubmit(values: PaidValues) {
    let documentId: string | undefined;
    try {
      if (file) {
        if (!ALLOWED_FILES.includes(file.type)) { toast.error('Formato inválido. Use PDF/PNG/JPG.'); return; }
        if (file.size > MAX_FILE_BYTES) { toast.error('Arquivo acima de 10MB.'); return; }
        const res: any = await upload.mutateAsync({
          id: requestId,
          organization_id: organizationId,
          document_type: 'payment_proof',
          file,
          notes: 'Comprovante de pagamento',
        });
        documentId = res?.document_id ?? res?.id ?? res ?? undefined;
      }
      await pay.mutateAsync({
        id: requestId,
        paid_at: values.paid_at,
        payment_method: values.payment_method,
        payment_reference: values.payment_reference || null,
        payment_proof_document_id: documentId ?? null,
        notes: values.notes || null,
      });
      toast.success('Pagamento concluído.');
      onOpenChange(false);
      onDone?.();
    } catch (e) { handleRpcError(e); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar pagamento</DialogTitle>
          <DialogDescription>
            Esta ação é definitiva. Após pago, valor, horas, taxa e beneficiário ficam bloqueados para alteração.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="paid_at">Data do pagamento *</Label>
              <Input id="paid_at" type="date" {...form.register('paid_at')} />
              {form.formState.errors.paid_at && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.paid_at.message}</p>
              )}
            </div>
            <div>
              <Label>Método *</Label>
              <Select value={method} onValueChange={(v) => form.setValue('payment_method', v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="ref">Referência / nº transação (opcional)</Label>
            <Input id="ref" maxLength={120} {...form.register('payment_reference')} />
          </div>
          <div>
            <Label>Comprovante (PDF/PNG/JPG até 10MB)</Label>
            <div className="flex items-center gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/jpg"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file && <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Caso a organização exija recibo e nenhum comprovante esteja anexado anteriormente, o envio aqui é obrigatório.
            </p>
          </div>
          <div>
            <Label htmlFor="paid_notes">Observação (opcional)</Label>
            <Textarea id="paid_notes" rows={2} maxLength={1000} {...form.register('notes')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Upload className="h-4 w-4 mr-2" /> Confirmar pagamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ============================ DEVOLVER PARA CORREÇÃO ============================ */
const returnSchema = z.object({
  reason: z.string().trim().min(5, 'Justificativa obrigatória (mín. 5 caracteres).').max(1000),
});
type ReturnValues = z.infer<typeof returnSchema>;

export function ReturnForCorrectionDialog({ open, onOpenChange, requestId, onDone }: BaseProps) {
  const ret = useReturnTSRForCorrection();
  const form = useForm<ReturnValues>({ resolver: zodResolver(returnSchema), defaultValues: { reason: '' } });

  useEffect(() => { if (!open) form.reset({ reason: '' }); }, [open]); // eslint-disable-line

  async function onSubmit(values: ReturnValues) {
    try {
      await ret.mutateAsync({ id: requestId, reason: values.reason });
      toast.success('Solicitação devolvida para correção.');
      onOpenChange(false);
      onDone?.();
    } catch (e) { handleRpcError(e); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Devolver para correção</DialogTitle>
          <DialogDescription>Justifique a devolução. A informação é enviada ao substituto e fica registrada em auditoria.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <Label htmlFor="reason">Justificativa *</Label>
            <Textarea id="reason" rows={4} maxLength={1000} {...form.register('reason')} />
            {form.formState.errors.reason && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.reason.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" variant="destructive" disabled={ret.isPending}>
              {ret.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Devolver
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ============================ JUSTIFICATIVA GENÉRICA (cancelar / devolver ao R.H.) ============================ */
interface ReasonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  label?: string;
  confirmLabel?: string;
  destructive?: boolean;
  isPending?: boolean;
  onConfirm: (reason: string) => Promise<void> | void;
}

const reasonSchema = z.object({ reason: z.string().trim().min(3, 'Justificativa obrigatória.').max(1000) });

export function ReasonDialog({
  open, onOpenChange, title, description, label = 'Justificativa *',
  confirmLabel = 'Confirmar', destructive, isPending, onConfirm,
}: ReasonProps) {
  const form = useForm<{ reason: string }>({ resolver: zodResolver(reasonSchema), defaultValues: { reason: '' } });
  useEffect(() => { if (!open) form.reset({ reason: '' }); }, [open]); // eslint-disable-line

  async function onSubmit(v: { reason: string }) {
    try { await onConfirm(v.reason); onOpenChange(false); }
    catch (e) { handleRpcError(e); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <Label htmlFor="reasonGen">{label}</Label>
            <Textarea id="reasonGen" rows={4} maxLength={1000} {...form.register('reason')} />
            {form.formState.errors.reason && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.reason.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" variant={destructive ? 'destructive' : 'default'} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
