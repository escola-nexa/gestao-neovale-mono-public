import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';
import { orientacoesApi } from '../api';
import { Orientation } from '@/types/academic';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CancelOrientationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orientation: Orientation | null;
  onSuccess: () => void;
}

export function CancelOrientationDialog({
  open,
  onOpenChange,
  orientation,
  onSuccess
}: CancelOrientationDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');

  const handleCancel = async () => {
    if (!orientation) return;

    if (!reason.trim()) {
      toast({
        title: 'Justificativa obrigatória',
        description: 'Informe o motivo do cancelamento da orientação.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await orientacoesApi.cancelOrientation(orientation.id, reason.trim());

      toast({ title: 'Orientação cancelada com sucesso' });
      setReason('');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error cancelling orientation:', error);
      toast({
        title: 'Erro ao cancelar orientação',
        description: error.message || 'Ocorreu um erro.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setReason('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Cancelar Agendamento
          </DialogTitle>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertDescription>
            Você está cancelando esta orientação. Informe o motivo pelo qual a orientação não ocorreu.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">
              Justificativa do Cancelamento *
            </Label>
            <Textarea
              id="cancel-reason"
              placeholder="Explique o motivo pelo qual a orientação não ocorreu..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              disabled={loading}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              A justificativa ficará registrada no histórico da orientação.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={loading || !reason.trim()}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Cancelamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
