import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { professoresApi } from '@/features/professores/api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Briefcase, Loader2 } from 'lucide-react';
import type { ProfessorData } from '../types';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  professors: ProfessorData[];
  onSuccess?: () => void;
}

export function SendToHiringDialog({ open, onOpenChange, professors, onSuccess }: Props) {
  const navigate = useNavigate();
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (professors.length === 0) return;
    setSubmitting(true);
    try {
      const ids = professors.map((p) => p.id);
      const { data, error } = await (supabase as any).rpc('send_professors_to_hiring', {
        _professor_ids: ids,
        _notes: notes.trim() || null,
      });
      if (error) throw error;
      const created = data?.created ?? 0;
      const skipped = data?.skipped ?? 0;
      toast.success(
        `${created} professor${created === 1 ? '' : 'es'} enviado${created === 1 ? '' : 's'} para contratação`,
        {
          description: skipped > 0 ? `${skipped} já estavam na fila ou são inválidos.` : 'Acesse R.H. › Aptos para Contratação para continuar.',
          action: {
            label: 'Abrir',
            onClick: () => navigate('/rh/aptos-contratacao'),
          },
          duration: 8000,
        },
      );
      onOpenChange(false);
      setNotes('');
      onSuccess?.();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao enviar para contratação');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-[#1B1E2C]" />
            Enviar para contratação
          </DialogTitle>
          <DialogDescription>
            Os professores selecionados serão movidos para a fila <strong>Aptos para Contratação</strong> do R.H.
            para anexo dos documentos contratuais e geração de link de assinatura.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-[#FFDA45]/10 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[#1B1E2C] mb-2">
              {professors.length} professor{professors.length === 1 ? '' : 'es'} selecionado{professors.length === 1 ? '' : 's'}
            </p>
            <ul className="max-h-40 overflow-y-auto space-y-0.5 text-sm">
              {professors.slice(0, 30).map((p) => (
                <li key={p.id} className="truncate">• {p.full_name}</li>
              ))}
              {professors.length > 30 && (
                <li className="text-xs text-muted-foreground">… e mais {professors.length - 30}</li>
              )}
            </ul>
          </div>

          <div>
            <Label htmlFor="hiring-notes">Observação (opcional)</Label>
            <Textarea
              id="hiring-notes"
              placeholder="Ex.: contratos referentes a CLT 2026, aditivo de carga horária etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              Professores que já estiverem em uma fila ativa serão ignorados automaticamente — você precisa concluir ou cancelar o envio anterior antes de reenviar.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || professors.length === 0}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Enviar para contratação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
