import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ApiAdapter } from '@/lib/api-adapter';
import { ticketsApi } from '../api';

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  content: string;
  is_done: boolean;
  position: number;
  due_date: string | null;
  assignee_id: string | null;
  done_at: string | null;
  done_by: string | null;
  created_at?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
}

export interface Checklist {
  id: string;
  ticket_id: string;
  title: string;
  position: number;
  items: ChecklistItem[];
  created_at?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
}

const tempId = () => `temp-${Math.random().toString(36).slice(2)}-${Date.now()}`;

export function useTicketChecklists(ticketId: string | null) {
  const qc = useQueryClient();
  const key = ['ticket-checklists', ticketId] as const;

  const query = useQuery({
    queryKey: key,
    enabled: !!ticketId,
    queryFn: async () => {
      if (!ticketId) return [];
      const checklists = await ApiAdapter.ticketChecklists.getByTicketId(ticketId);
      
      const ids = (checklists || []).map((c: any) => c.id);
      let items: any[] = [];
      if (ids.length) {
        items = await ApiAdapter.ticketChecklistItems.getByChecklistIds(ids);
      }
      // Resolve nomes dos criadores (itens + checklists) via profiles
      const creatorIds = Array.from(new Set([
        ...items.map(i => i.created_by).filter(Boolean),
        ...(checklists || []).map((c: any) => c.created_by).filter(Boolean),
      ]));
      const nameMap: Record<string, string> = {};
      if (creatorIds.length) {
        const profs = await ticketsApi.getProfiles(creatorIds);
        (profs || []).forEach((p: any) => { nameMap[p.user_id] = p.full_name; });
      }
      return (checklists || []).map((c: any) => ({
        ...c,
        created_by_name: c.created_by ? nameMap[c.created_by] || null : null,
        items: items
          .filter(i => i.checklist_id === c.id)
          .map(i => ({ ...i, created_by_name: i.created_by ? nameMap[i.created_by] || null : null })),
      })) as Checklist[];
    },
  });

  // ---------- Realtime: aplicar payload direto no cache (sem refetch) ----------
  useEffect(() => {
    if (!ticketId) return;

    const applyChecklistChange = (payload: any) => {
      qc.setQueryData<Checklist[]>(key, (old) => {
        const list = old ? [...old] : [];
        if (payload.eventType === 'INSERT') {
          if (list.some(c => c.id === payload.new.id)) return list;
          return [...list, { ...payload.new, items: [] }].sort((a, b) => a.position - b.position);
        }
        if (payload.eventType === 'UPDATE') {
          return list.map(c => c.id === payload.new.id ? { ...c, ...payload.new, items: c.items } : c);
        }
        if (payload.eventType === 'DELETE') {
          return list.filter(c => c.id !== payload.old.id);
        }
        return list;
      });
    };

    const applyItemChange = (payload: any) => {
      qc.setQueryData<Checklist[]>(key, (old) => {
        if (!old) return old;
        const clId = (payload.new || payload.old)?.checklist_id;
        if (!clId) return old;
        // Garante que o payload pertence a um checklist deste ticket — evita
        // que eventos de outros tickets atinjam o cache (canal sem filtro).
        if (!old.some(c => c.id === clId)) return old;
        return old.map(c => {
          if (c.id !== clId) return c;
          if (payload.eventType === 'INSERT') {
            // Dedupe estrito por id — id é gerado no cliente (UUID) e
            // reutilizado entre otimista, INSERT no banco e payload realtime.
            if (c.items.some(i => i.id === payload.new.id)) {
              // Hidrata campos servidor (ex.: timestamps) preservando o item.
              return {
                ...c,
                items: c.items.map(i =>
                  i.id === payload.new.id ? { ...i, ...payload.new } : i,
                ),
              };
            }
            return { ...c, items: [...c.items, payload.new].sort((a, b) => a.position - b.position) };
          }
          if (payload.eventType === 'UPDATE') {
            // Atualiza somente o item exato — nunca propaga is_done para outros itens.
            return {
              ...c,
              items: c.items.map(i => (i.id === payload.new.id ? { ...i, ...payload.new } : i)),
            };
          }
          if (payload.eventType === 'DELETE') {
            return { ...c, items: c.items.filter(i => i.id !== payload.old.id) };
          }
          return c;
        });
      });
    };

    const unsubscribe = ticketsApi.subscribeToChecklists(ticketId, applyChecklistChange, applyItemChange);
    return unsubscribe;
  }, [ticketId, qc]);

  // ---------- Mutations com optimistic update ----------
  const addChecklist = useMutation({
    mutationFn: async (title: string) => {
      if (!ticketId) throw new Error('ticketId required');
      const max = Math.max(0, ...(query.data || []).map(c => c.position));
      return ApiAdapter.ticketChecklists.create({ ticket_id: ticketId, title, position: max + 1 });
    },
    onMutate: async (title) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Checklist[]>(key);
      const max = Math.max(0, ...(prev || []).map(c => c.position));
      const optimistic: Checklist = {
        id: tempId(), ticket_id: ticketId!, title, position: max + 1, items: [],
      };
      qc.setQueryData<Checklist[]>(key, (old) => [...(old || []), optimistic]);
      return { prev, tempId: optimistic.id };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); },
    onSuccess: (real, _v, ctx) => {
      qc.setQueryData<Checklist[]>(key, (old) =>
        (old || []).map(c => c.id === ctx?.tempId ? { ...c, ...real, items: c.items } : c)
      );
    },
  });

  const removeChecklist = useMutation({
    mutationFn: async (checklistId: string) => {
      return ApiAdapter.ticketChecklists.delete(checklistId);
    },
    onMutate: async (checklistId) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Checklist[]>(key);
      qc.setQueryData<Checklist[]>(key, (old) => (old || []).filter(c => c.id !== checklistId));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); },
  });

  const renameChecklist = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      return ApiAdapter.ticketChecklists.update(id, { title });
    },
    onMutate: async ({ id, title }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Checklist[]>(key);
      qc.setQueryData<Checklist[]>(key, (old) =>
        (old || []).map(c => c.id === id ? { ...c, title } : c)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); },
  });

  const addItem = useMutation({
    mutationFn: async ({ id, checklistId, content, position }: { id: string; checklistId: string; content: string; position: number }) => {
      return ApiAdapter.ticketChecklistItems.create({ id, checklist_id: checklistId, content, position });
    },
    onMutate: async ({ id, checklistId, content, position }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Checklist[]>(key);
      const user = await ticketsApi.getCurrentUser();
      let creatorName: string | null = null;
      if (user?.id) {
        creatorName = user.profile?.full_name || user.email || null;
      }
      qc.setQueryData<Checklist[]>(key, (old) =>
        (old || []).map(c => {
          if (c.id !== checklistId) return c;
          // Dedupe: se já existir um item com este id (ex.: realtime chegou antes), não adiciona.
          if (c.items.some(i => i.id === id)) return c;
          const optimistic: ChecklistItem = {
            id, checklist_id: checklistId, content, is_done: false,
            position, due_date: null, assignee_id: null, done_at: null, done_by: null,
            created_at: new Date().toISOString(),
            created_by: user?.id || null,
            created_by_name: creatorName,
          };
          return { ...c, items: [...c.items, optimistic] };
        })
      );
      return { prev, optimisticId: id, checklistId, creatorName };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); },
    onSuccess: (real, _v, ctx) => {
      qc.setQueryData<Checklist[]>(key, (old) =>
        (old || []).map(c => {
          if (c.id !== ctx?.checklistId) return c;
          // Como id é o mesmo (cliente), basta hidratar com os dados do servidor.
          return {
            ...c,
            items: c.items.map(i =>
              i.id === real.id
                ? { ...i, ...real, created_by_name: i.created_by_name ?? ctx?.creatorName ?? null }
                : i,
            ),
          };
        })
      );
    },
  });

  const toggleItem = useMutation({
    mutationFn: async ({ id, is_done }: { id: string; is_done: boolean }) => {
      const user = await ticketsApi.getCurrentUser();
      return ApiAdapter.ticketChecklistItems.update(id, {
        is_done,
        done_at: is_done ? new Date().toISOString() : null,
        done_by: is_done ? user?.id : null,
      });
    },
    onMutate: async ({ id, is_done }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Checklist[]>(key);
      qc.setQueryData<Checklist[]>(key, (old) =>
        (old || []).map(c => ({ ...c, items: c.items.map(i => i.id === id ? { ...i, is_done } : i) }))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; content?: string; due_date?: string | null; assignee_id?: string | null }) => {
      return ApiAdapter.ticketChecklistItems.update(id, updates);
    },
    onMutate: async ({ id, ...updates }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Checklist[]>(key);
      qc.setQueryData<Checklist[]>(key, (old) =>
        (old || []).map(c => ({ ...c, items: c.items.map(i => i.id === id ? { ...i, ...updates } : i) }))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); },
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      return ApiAdapter.ticketChecklistItems.delete(id);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Checklist[]>(key);
      qc.setQueryData<Checklist[]>(key, (old) =>
        (old || []).map(c => ({ ...c, items: c.items.filter(i => i.id !== id) }))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); },
  });

  /** Reordena itens de um checklist persistindo o novo `position` (1-based) de cada item. */
  const reorderItems = useMutation({
    mutationFn: async ({ checklistId, orderedIds }: { checklistId: string; orderedIds: string[] }) => {
      const updates = orderedIds.map((id, idx) => ({
        id,
        checklistId,
        position: idx + 1
      }));
      return ApiAdapter.ticketChecklistItems.updatePositions(updates);
    },
    onMutate: async ({ checklistId, orderedIds }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Checklist[]>(key);
      qc.setQueryData<Checklist[]>(key, (old) =>
        (old || []).map(c => {
          if (c.id !== checklistId) return c;
          const byId = new Map(c.items.map(i => [i.id, i]));
          const reordered = orderedIds
            .map((id, idx) => {
              const item = byId.get(id);
              return item ? { ...item, position: idx + 1 } : null;
            })
            .filter(Boolean) as ChecklistItem[];
          return { ...c, items: reordered };
        })
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); },
  });

  return {
    checklists: query.data || [],
    isLoading: query.isLoading,
    addChecklist, removeChecklist, renameChecklist,
    addItem, toggleItem, updateItem, removeItem, reorderItems,
  };
}

/** Lightweight progress for board cards: { total, done } per ticket */
export function useChecklistProgress(ticketIds: string[]) {
  return useQuery({
    queryKey: ['checklist-progress', ticketIds.sort().join(',')],
    enabled: ticketIds.length > 0,
    queryFn: async () => {
      const map: Record<string, { total: number; done: number }> = {};
      if (!ticketIds.length) return map;
      
      const cls = await ApiAdapter.ticketChecklists.getByTicketIds(ticketIds);
      const clIds = (cls || []).map((c: any) => c.id);
      if (!clIds.length) return map;
      
      const items = await ApiAdapter.ticketChecklistItems.getProgress(clIds);
      
      const clToTicket: Record<string, string> = {};
      (cls || []).forEach((c: any) => { clToTicket[c.id] = c.ticket_id; });
      (items || []).forEach((i: any) => {
        const tid = clToTicket[i.checklist_id];
        if (!tid) return;
        if (!map[tid]) map[tid] = { total: 0, done: 0 };
        map[tid].total += 1;
        if (i.is_done) map[tid].done += 1;
      });
      return map;
    },
  });
}
