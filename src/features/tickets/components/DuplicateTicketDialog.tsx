import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { ticketApi } from '@/features/tickets/api';
import { ApiAdapter } from '@/lib/api-adapter';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  open: boolean;
  onClose: () => void;
  ticket: any | null;
  onDuplicated?: (newId: string) => void;
}

const COPYABLE_FIELDS = [
  'description', 'priority', 'type', 'school_id', 'category_id',
  'nexa_responsible_id', 'school_responsible_id',
  'cover_color', 'cover_url', 'kanban_list_id', 'organization_id', 'tags',
] as const;

export function DuplicateTicketDialog({ open, onClose, ticket, onDuplicated }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && ticket) setTitle(`${ticket.title} (cópia)`);
  }, [open, ticket]);

  const originalTitle = (ticket?.title || '').trim();
  const trimmed = title.trim();
  const isEmpty = trimmed.length === 0;
  const isSame = trimmed === originalTitle;
  const error = isEmpty ? 'Informe um título' : isSame ? 'O título deve ser diferente do original' : '';
  const canSubmit = !error && !loading;

  const handleDuplicate = async () => {
    if (!ticket || !user || !canSubmit) return;
    setLoading(true);
    try {
      const payload: any = { title: trimmed, status: 'aberto', opened_by_id: user.id };
      for (const f of COPYABLE_FIELDS) {
        if (ticket[f] !== undefined) payload[f] = ticket[f];
      }

      const created = await ApiAdapter.tickets.create(payload);
      if (!created || !created.id) throw new Error('Falha ao criar ticket');
      const newId = created.id;

      // Copia assignees
      try {
        const { data: assignees } = await ticketApi.getTicketAssignees(ticket.id);
        if (assignees?.length) {
          await ApiAdapter.ticketAssignees.createMany(
            assignees.map((a: any) => ({ ticket_id: newId, user_id: a.user_id }))
          );
        }
      } catch { toast.warning('Atribuições não puderam ser copiadas'); }

      // Copia etiquetas
      try {
        const { data: labels } = await ticketApi.getTicketLabels(ticket.id);
        if (labels?.length) {
          await ticketApi.insertTicketLabels(labels.map((l: any) => ({ ticket_id: newId, label_id: l.label_id })));
        }
      } catch { toast.warning('Etiquetas não puderam ser copiadas'); }

      // Copia checklists + itens (zerados)
      try {
        const { data: checklists } = await ticketApi.getTicketChecklists(ticket.id);
        for (const cl of checklists || []) {
          const newCl = await ApiAdapter.ticketChecklists.create({
            ticket_id: newId, title: cl.title, position: cl.position
          });
          if (!newCl) continue;
          const { data: items } = await ticketApi.getTicketChecklistItems(cl.id);
          if (items?.length) {
            for (const it of items) {
              await ApiAdapter.ticketChecklistItems.create({
                checklist_id: newCl.id,
                content: it.content,
                position: it.position,
                is_done: false,
                due_date: it.due_date,
                assignee_id: it.assignee_id || it.assigned_to,
              });
            }
          }
        }
      } catch { toast.warning('Checklists não puderam ser copiados'); }

      toast.success('Ticket duplicado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket'] });
      onDuplicated?.(newId);
      onClose();
    } catch (e: any) {
      toast.error('Erro ao duplicar ticket', { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicar ticket</DialogTitle>
          <DialogDescription>
            Será criado um novo ticket com os mesmos dados (etiquetas, atribuições e checklists). Mensagens, anexos e histórico não são copiados.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="dup-title">Novo título *</Label>
          <Input
            id="dup-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            disabled={loading}
            onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) handleDuplicate(); }}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleDuplicate} disabled={!canSubmit}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Duplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
