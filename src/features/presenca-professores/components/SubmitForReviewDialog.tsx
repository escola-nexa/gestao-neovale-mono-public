import { useEffect, useState } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Send, Info } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export interface SubmitReviewTarget {
  id: string;
  professorName?: string;
  referenceMonth?: number;
  referenceYear?: number;
  pending?: number;
  divergent?: number;
  status?: string;
  expectedMinutes?: number;
  confirmedMinutes?: number;
  totalEntries?: number;
}

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function fmtH(m?: number) {
  if (!m) return '0h';
  const h = Math.floor(m / 60); const r = m % 60;
  return r ? `${h}h${String(r).padStart(2,'0')}` : `${h}h`;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  target: SubmitReviewTarget | null;
  isPending: boolean;
  onConfirm: (args: { notes: string; force: boolean }) => void;
}

export function SubmitForReviewDialog({ open, onOpenChange, target, isPending, onConfirm }: Props) {
  const [notes, setNotes] = useState('');
  const pending = target?.pending || 0;
  const divergent = target?.divergent || 0;
  const totalEntries = target?.totalEntries ?? 0;
  const hasPending = pending > 0;
  const noEntries = totalEntries === 0;
  const blocked = noEntries;
  const force = hasPending; // se há pendências, exige force + nota
  const minNotesOk = !force || notes.trim().length >= 5;
  const canSubmit = !blocked && minNotesOk && !isPending;

  // Reset quando alvo muda
  useEffect(() => {
    if (open) setNotes('');
  }, [open, target?.id]);

  const exp = target?.expectedMinutes || 0;
  const conf = target?.confirmedMinutes || 0;
  const pct = exp > 0 ? Math.round((conf / exp) * 100) : 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4"/> Enviar folha para revisão
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              {target && (
                <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                  <div className="font-medium text-foreground">{target.professorName || 'Folha'}</div>
                  {target.referenceMonth != null && target.referenceYear != null && (
                    <div className="text-xs text-muted-foreground">
                      Referência: {MONTHS[target.referenceMonth-1]}/{target.referenceYear}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="secondary" className="text-[11px]">Aulas: {totalEntries}</Badge>
                    <Badge variant={hasPending ? 'destructive' : 'secondary'} className="text-[11px]">
                      Pendências: {pending}
                    </Badge>
                    <Badge variant={divergent > 0 ? 'destructive' : 'secondary'} className="text-[11px]">
                      Divergências: {divergent}
                    </Badge>
                    <Badge variant="secondary" className="text-[11px]">
                      CH {fmtH(conf)} / {fmtH(exp)} ({pct}%)
                    </Badge>
                  </div>
                </div>
              )}

              {blocked && (
                <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0"/>
                  <div className="text-xs">
                    Esta folha não possui aulas registradas. Recalcule ou regere antes de enviar para revisão.
                  </div>
                </div>
              )}

              {!blocked && hasPending && (
                <div className="flex gap-2 rounded-md border border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 p-3 text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0"/>
                  <div className="text-xs">
                    Há <strong>{pending}</strong> aula(s) pendente(s). O envio só é aceito com justificativa (mínimo 5 caracteres).
                  </div>
                </div>
              )}

              {!blocked && !hasPending && (
                <div className="flex gap-2 rounded-md border bg-muted/30 p-3 text-muted-foreground">
                  <Info className="h-4 w-4 mt-0.5 shrink-0"/>
                  <div className="text-xs">
                    Após o envio, Coordenação e R.H. serão notificados e a folha mudará para <strong>Em revisão</strong>.
                  </div>
                </div>
              )}

              {!blocked && (
                <div className="space-y-1">
                  <Label htmlFor="submit-review-notes" className="text-xs">
                    Observação {force ? <span className="text-destructive">(obrigatória)</span> : <span className="text-muted-foreground">(opcional)</span>}
                  </Label>
                  <Textarea
                    id="submit-review-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={force ? 'Justifique por que está enviando com pendências…' : 'Mensagem para a Coordenação (opcional)'}
                    rows={3}
                    className="resize-none"
                  />
                  {force && !minNotesOk && (
                    <div className="text-[11px] text-destructive">Mínimo de 5 caracteres.</div>
                  )}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canSubmit}
            onClick={(e) => {
              e.preventDefault();
              if (!canSubmit) return;
              onConfirm({ notes: notes.trim(), force });
            }}
          >
            {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Send className="h-4 w-4 mr-2"/>}
            {force ? 'Enviar mesmo assim' : 'Enviar para revisão'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
