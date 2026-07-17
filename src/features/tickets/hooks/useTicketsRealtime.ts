import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '../api';

/**
 * Subscreve mudanças realtime em tickets, ticket_messages e ticket_assignees
 * para a organização ativa, invalidando queries de lista, kanban, KPIs e detalhe.
 *
 * Invalidações de lista são DEBOUNCED (200ms) para coalescer rajadas — o
 * drag-and-drop do Kanban dispara várias mudanças em sequência (UPDATE de
 * kanban_list_id + kanban_position) e refetchar 3 vezes a lista inteira de
 * tickets é o que causa lentidão visual ao mover cards.
 */
export function useTicketsRealtime(organizationId: string | null, ticketId?: string) {
  const qc = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!organizationId) return;

    const invalidateLists = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['tickets'] });
        qc.invalidateQueries({ queryKey: ['tickets-with-media'] });
        qc.invalidateQueries({ queryKey: ['ticket-activity'] });
        qc.invalidateQueries({ queryKey: ['kanban-lists'] });
      }, 200);
    };

    const unsubscribe = ticketsApi.subscribeToTicketsRealtime(
      organizationId,
      (payload) => {
        invalidateLists();
        const changedId = (payload.new as any)?.id || (payload.old as any)?.id;
        if (changedId) qc.invalidateQueries({ queryKey: ['ticket', changedId] });
      },
      (payload) => {
        const tId = (payload.new as any)?.ticket_id || (payload.old as any)?.ticket_id;
        qc.invalidateQueries({ queryKey: ['ticket-activity'] });
        if (tId) {
          qc.invalidateQueries({ queryKey: ['ticket-messages', tId] });
          qc.invalidateQueries({ queryKey: ['ticket', tId] });
        }
      },
      (payload) => {
        const tId = (payload.new as any)?.ticket_id || (payload.old as any)?.ticket_id;
        if (tId) {
          qc.invalidateQueries({ queryKey: ['ticket-assignees', tId] });
          qc.invalidateQueries({ queryKey: ['ticket', tId] });
        }
        invalidateLists();
      }
    );

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      unsubscribe();
    };
  }, [organizationId, ticketId, qc]);
}
