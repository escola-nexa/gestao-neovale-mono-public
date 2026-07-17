import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiAdapter } from '@/lib/api-adapter';
import { toast } from 'sonner';

type StatusValue = 'aberto' | 'em_atendimento' | 'aguardando_escola' | 'resolvido' | 'cancelado';
type PriorityValue = 'baixa' | 'media' | 'alta' | 'critica';

interface UpdatePatch {
  status?: StatusValue;
  priority?: PriorityValue;
  nexa_responsible_id?: string | null;
  school_responsible_id?: string | null;
  closed_at?: string | null;
}

/**
 * Mutations centralizadas para tickets com optimistic updates e toast de "Desfazer".
 */
export function useTicketMutations() {
  const qc = useQueryClient();

  const optimisticUpdate = (ticketId: string, patch: UpdatePatch) => {
    const queries = qc.getQueriesData<any[]>({ queryKey: ['tickets'] });
    const previousList: { key: any; data: any[] }[] = [];

    queries.forEach(([key, data]) => {
      if (!Array.isArray(data)) return;
      previousList.push({ key, data });
      qc.setQueryData(key, data.map(t => t.id === ticketId ? { ...t, ...patch, updated_at: new Date().toISOString() } : t));
    });

    return () => previousList.forEach(({ key, data }) => qc.setQueryData(key, data));
  };

  const applyUpdate = async (ticketId: string, patch: UpdatePatch) => {
    await ApiAdapter.tickets.update(ticketId, patch);
  };

  const updateTicket = useMutation({
    mutationFn: async ({ ticketId, patch }: { ticketId: string; patch: UpdatePatch }) => {
      await applyUpdate(ticketId, patch);
      return { ticketId, patch };
    },
    onMutate: ({ ticketId, patch }) => ({ revert: optimisticUpdate(ticketId, patch) }),
    onError: (_err, _vars, ctx: any) => {
      ctx?.revert?.();
      toast.error('Não foi possível atualizar o ticket. Alteração revertida.');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  /** Atribui responsável Neovale (ou remove se userId=null) com toast de desfazer. */
  const assignNexa = (ticketId: string, userId: string | null, previousValue: string | null, userName?: string) => {
    updateTicket.mutate({ ticketId, patch: { nexa_responsible_id: userId } }, {
      onSuccess: () => {
        toast.success(userId ? `Atribuído a ${userName || 'usuário'}` : 'Responsável removido', {
          action: {
            label: 'Desfazer',
            onClick: () => updateTicket.mutate({ ticketId, patch: { nexa_responsible_id: previousValue } }),
          },
          duration: 5000,
        });
      },
    });
  };

  /** Muda status com toast de desfazer. Se status for 'resolvido', define closed_at. */
  const setStatus = (ticketId: string, newStatus: StatusValue, previousStatus: StatusValue, previousClosedAt: string | null) => {
    const patch: UpdatePatch = { status: newStatus };
    if (newStatus === 'resolvido' || newStatus === 'cancelado') {
      patch.closed_at = new Date().toISOString();
    } else if (previousStatus === 'resolvido' || previousStatus === 'cancelado') {
      patch.closed_at = null;
    }
    updateTicket.mutate({ ticketId, patch }, {
      onSuccess: () => {
        const labels: Record<string, string> = {
          aberto: 'Aberto', em_atendimento: 'Em Atendimento', aguardando_escola: 'Aguardando Escola',
          resolvido: 'Resolvido', cancelado: 'Cancelado',
        };
        toast.success(`Status: ${labels[newStatus]}`, {
          action: {
            label: 'Desfazer',
            onClick: () => updateTicket.mutate({ ticketId, patch: { status: previousStatus, closed_at: previousClosedAt } }),
          },
          duration: 5000,
        });
      },
    });
  };

  const setPriority = (ticketId: string, newPriority: PriorityValue, previousPriority: PriorityValue) => {
    updateTicket.mutate({ ticketId, patch: { priority: newPriority } }, {
      onSuccess: () => {
        const labels: Record<string, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' };
        toast.success(`Prioridade: ${labels[newPriority]}`, {
          action: {
            label: 'Desfazer',
            onClick: () => updateTicket.mutate({ ticketId, patch: { priority: previousPriority } }),
          },
          duration: 5000,
        });
      },
    });
  };

  /** Aplica patch em vários tickets em lote, com progresso no toast. */
  const bulkUpdate = async (ticketIds: string[], patch: UpdatePatch) => {
    if (ticketIds.length === 0) return;
    const reverts = ticketIds.map(id => optimisticUpdate(id, patch));
    const toastId = toast.loading(`Atualizando ${ticketIds.length} ticket${ticketIds.length !== 1 ? 's' : ''}...`);
    const results = await Promise.allSettled(ticketIds.map(id => applyUpdate(id, patch)));
    const fails = results.filter(r => r.status === 'rejected').length;
    qc.invalidateQueries({ queryKey: ['tickets'] });
    if (fails === 0) {
      toast.success(`${ticketIds.length} ticket${ticketIds.length !== 1 ? 's' : ''} atualizado${ticketIds.length !== 1 ? 's' : ''}`, { id: toastId });
    } else {
      reverts.forEach(r => r());
      toast.error(`Falhou em ${fails} de ${ticketIds.length} tickets — alterações revertidas`, { id: toastId });
    }
  };

  return { updateTicket, assignNexa, setStatus, setPriority, bulkUpdate };
}
