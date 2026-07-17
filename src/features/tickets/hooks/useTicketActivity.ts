import { useQuery } from '@tanstack/react-query';
import { ticketsApi } from '../api';

export interface TicketActivityMessage {
  text: string;
  authorId: string | null;
  createdAt: string;
  isInternal: boolean;
  attachments: number;
}

/** Alias legado para compatibilidade com importes antigos. */
export type TicketActivityLastMessage = TicketActivityMessage;

export interface TicketActivity {
  messages: number;
  attachments: number;
  lastMessageAt: string | null;
  /** Última mensagem (atalho — equivale a recentMessages[0]). */
  lastMessage: TicketActivityMessage | null;
  /** Até 2 mensagens mais recentes, da mais nova para a mais antiga. */
  recentMessages: TicketActivityMessage[];
}

/**
 * Busca em batch contadores de mensagens, anexos, última atividade e as
 * 2 mensagens mais recentes (preview) por ticket. Evita N+1 fazendo uma
 * única query e agregando em memória.
 */
export function useTicketActivity(ticketIds: string[]) {
  const key = ticketIds.slice().sort().join(',');
  return useQuery({
    queryKey: ['ticket-activity', key],
    queryFn: async () => {
      const map = new Map<string, TicketActivity>();
      if (ticketIds.length === 0) return map;
      const data = await ticketsApi.getTicketActivityMessages(ticketIds);
      (data || []).forEach((m: any) => {
        const cur = map.get(m.ticket_id) || {
          messages: 0,
          attachments: 0,
          lastMessageAt: null,
          lastMessage: null,
          recentMessages: [] as TicketActivityMessage[],
        };
        cur.messages += 1;
        const atts = Array.isArray(m.attachments) ? m.attachments.length : 0;
        cur.attachments += atts;
        const entry: TicketActivityMessage = {
          text: m.message || '',
          authorId: m.author_id || null,
          createdAt: m.created_at,
          isInternal: !!m.is_internal_note,
          attachments: atts,
        };
        // Mantém apenas as 2 mais recentes (mais nova primeiro).
        cur.recentMessages = [entry, ...cur.recentMessages].slice(0, 2);
        cur.lastMessage = cur.recentMessages[0];
        cur.lastMessageAt = cur.lastMessage.createdAt;
        map.set(m.ticket_id, cur);
      });
      return map;
    },
    enabled: ticketIds.length > 0,
    staleTime: 30_000,
  });
}
