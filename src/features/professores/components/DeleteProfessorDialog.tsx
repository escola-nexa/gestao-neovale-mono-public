import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ProfessorData } from '../types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professor: ProfessorData | null;
  onConfirm: () => Promise<void> | void;
}

export function DeleteProfessorDialog({ open, onOpenChange, professor, onConfirm }: Props) {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmText('');
      setDeleting(false);
    }
  }, [open]);

  const expected = professor?.full_name?.trim() || '';
  const matches = confirmText.trim().toLowerCase() === expected.toLowerCase() && expected.length > 0;

  const handleConfirm = async () => {
    if (!matches) return;
    setDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center">Excluir professor permanentemente?</AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-2">
            <span className="block">
              Você está prestes a excluir <strong className="text-foreground">{professor?.full_name}</strong>.
            </span>
            <span className="block text-xs">
              Esta ação remove o cadastro do professor, seus vínculos com escolas e cursos, e o acesso ao sistema.
              Os registros históricos (planejamentos, frequências, notas) serão preservados.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="confirm-name" className="text-xs text-muted-foreground">
            Para confirmar, digite o nome completo do professor:
          </Label>
          <Input
            id="confirm-name"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={expected}
            autoComplete="off"
            disabled={deleting}
          />
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!matches || deleting}>
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir definitivamente
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
