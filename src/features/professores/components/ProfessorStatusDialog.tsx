import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, History } from 'lucide-react';
import { toast } from 'sonner';
import { professorsApi } from '../api';
import type { ProfessorData, ProfessorStatus } from '../types';
import { professoresApi } from '@/features/professores/api';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professor: ProfessorData | null;
  onSaved?: () => void;
}

const statusOptions: { value: ProfessorStatus; label: string; description: string }[] = [
  { value: 'ACTIVE', label: 'Ativo', description: 'O professor está atuando normalmente.' },
  { value: 'ON_LEAVE', label: 'Afastado', description: 'Afastamento temporário (licença, atestado, férias).' },
  { value: 'INACTIVE', label: 'Inativo', description: 'Não atua mais. Será omitido das listagens padrão.' },
];

const statusLabel = (s?: string | null) =>
  s === 'ACTIVE' ? 'Ativo' : s === 'INACTIVE' ? 'Inativo' : s === 'ON_LEAVE' ? 'Afastado' : (s || '-');

export function ProfessorStatusDialog({ open, onOpenChange, professor, onSaved }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ProfessorStatus>('ACTIVE');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (professor) {
      setStatus(professor.status);
      setReason('');
    }
  }, [professor, open]);

  const historyQuery = useQuery({
    queryKey: ['professor-status-history', professor?.id],
    enabled: !!professor?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professor_status_history')
        .select('*')
        .eq('professor_id', professor!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const statusChanged = professor && status !== professor.status;
  const reasonRequired = statusChanged; // qualquer mudança de status exige justificativa

  const handleSave = async () => {
    if (!professor) return;
    if (reasonRequired && reason.trim().length < 5) {
      toast.error('Informe uma justificativa com pelo menos 5 caracteres.');
      return;
    }
    setSaving(true);
    try {
      const previousStatus = professor.status;
      await professorsApi.update(professor.id, {
        full_name: professor.full_name,
        cpf: professor.cpf || '',
        registration_code: professor.registration_code || '',
        phone: professor.phone || '',
        specialization: professor.specialization || '',
        status,
        email: professor.email || '',
      });

      if (statusChanged) {
        const { error: histErr } = await professoresApi.client.from('professor_status_history').insert({
          organization_id: professor.organization_id,
          professor_id: professor.id,
          previous_status: previousStatus,
          new_status: status,
          reason: reason.trim(),
          changed_by_user_id: user?.id || null,
          changed_by_user_name: user?.nomeCompleto || null,
          changed_by_user_email: user?.email || null,
        });
        if (histErr) console.error('Erro ao salvar histórico de status:', histErr);
        queryClient.invalidateQueries({ queryKey: ['professor-status-history', professor.id] });
      }

      toast.success('Status atualizado');
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Erro ao atualizar status: ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const current = statusOptions.find(o => o.value === status);
  const history = historyQuery.data || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Alterar status do professor</DialogTitle>
          <DialogDescription>
            {professor ? professor.full_name : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v: ProfessorStatus) => setStatus(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {statusOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {current && (
            <p className="text-xs text-muted-foreground">{current.description}</p>
          )}

          {statusChanged && (
            <div>
              <Label>
                Justificativa <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Descreva o motivo da alteração de status (obrigatório)"
                rows={3}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground mt-1">
                A justificativa será registrada no histórico com data, hora e usuário responsável.
              </p>
            </div>
          )}

          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 mb-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm">Histórico de alterações</Label>
            </div>
            {historyQuery.isLoading ? (
              <p className="text-xs text-muted-foreground">Carregando...</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem alterações registradas.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {history.map((h: any) => (
                  <div key={h.id} className="rounded-md border p-2 text-xs space-y-0.5 bg-muted/30">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">
                        {statusLabel(h.previous_status)} → {statusLabel(h.new_status)}
                      </span>
                      <span className="text-muted-foreground">
                        {format(new Date(h.created_at), 'dd/MM/yyyy HH:mm')}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      Por: {h.changed_by_user_name || h.changed_by_user_email || '—'}
                    </div>
                    {h.reason && (
                      <div className="text-foreground/80 italic">"{h.reason}"</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
