import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelName: string;
  onConfirm: (reason: string) => Promise<void> | void;
}

export function DeleteChannelDialog({ open, onOpenChange, channelName, onConfirm }: Props) {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => { if (!open) { setReason(''); setBusy(false); } }, [open]);

  const trimmed = reason.trim();
  const valid = trimmed.length >= 10;

  const handleConfirm = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await onConfirm(trimmed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Excluir canal
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-1">
              <p className="text-sm text-muted-foreground">
                Você está prestes a excluir permanentemente o canal:
              </p>
              <div className="px-3 py-2 rounded-md border border-destructive/30 bg-destructive/5">
                <span className="text-sm font-bold text-foreground">#{channelName}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Todas as mensagens, anexos, reações e membros vinculados serão removidos.
                Esta ação <strong className="text-destructive">não pode ser desfeita</strong>.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="delete-reason" className="text-xs font-semibold">
            Justificativa <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="delete-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Descreva o motivo da exclusão (mínimo 10 caracteres). Será registrado na auditoria."
            rows={3}
            className="text-sm resize-none"
            disabled={busy}
          />
          <p className="text-[11px] text-muted-foreground">
            {trimmed.length}/10 caracteres mínimos
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); handleConfirm(); }}
            disabled={busy || !valid}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy ? 'Excluindo…' : 'Confirmar exclusão'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
