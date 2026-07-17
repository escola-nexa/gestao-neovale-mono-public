import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { useBIProfessorDocuments, ProfessorDocStatus, ProfessorStatusFilter } from '@/hooks/bi/useBIProfessorDocuments';
import { fetchAllPaginated } from '@/lib/supabasePagination';
import { REQUIRED_CATEGORIES_SET } from '@/features/professores/utils/requiredDocs';
import { toast } from 'sonner';

export type KanbanColumn = 'awaiting_link' | 'link_sent' | 'in_progress' | 'completed';

export const KANBAN_COLUMNS: { id: KanbanColumn; title: string; description: string; accent: string }[] = [
  { id: 'awaiting_link',  title: 'Aguardando envio de link externo', description: 'Sem link ativo (nunca gerado ou expirado)', accent: 'border-l-amber-500'   },
  { id: 'link_sent',      title: 'Link enviado',                     description: 'Link ativo, sem progresso documental',     accent: 'border-l-sky-500'     },
  { id: 'in_progress',    title: 'Em andamento',                     description: 'Já enviou ao menos 1 documento obrigatório', accent: 'border-l-violet-500' },
  { id: 'completed',      title: 'Finalizado',                       description: 'Documentação obrigatória completa',        accent: 'border-l-emerald-500' },
];

export interface KanbanLabel {
  id: string;
  name: string;
  color: 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

export const PRESET_LABELS: KanbanLabel[] = [
  { id: 'urgente',          name: 'Urgente',           color: 'red'    },
  { id: 'prioridade-alta',  name: 'Prioridade Alta',   color: 'yellow' },
  { id: 'bloqueado',        name: 'Bloqueado',         color: 'gray'   },
  { id: 'aguardando-resp',  name: 'Aguardando Resposta', color: 'blue' },
  { id: 'doc-atrasada',     name: 'Documentação Atrasada', color: 'purple' },
  { id: 'ok',               name: 'OK',                color: 'green'  },
];

interface KanbanStateRow {
  professor_id: string;
  manual_column: KanbanColumn | null;
  description: string | null;
  labels: KanbanLabel[];
  last_moved_at: string | null;
  last_moved_by: string | null;
}

export type LinkStatus = 'none' | 'expired' | 'active';

export interface KanbanCard extends ProfessorDocStatus {
  has_link: boolean;            // link ativo válido
  link_id: string | null;
  link_expires_at: string | null;
  link_status: LinkStatus;      // 'none' | 'expired' | 'active'
  has_started: boolean;         // ≥1 arquivo obrigatório enviado
  auto_column: KanbanColumn;
  effective_column: KanbanColumn;
  manual_override: boolean;
  manual_diverges: boolean;     // auto != manual
  description: string | null;
  labels: KanbanLabel[];
  last_moved_at: string | null;
}

// Constante removida: as queries agora usam paginação via fetchAllPaginated
// para evitar o teto server-side de ~1000 linhas do PostgREST.

/**
 * Regra simétrica:
 *  - completed: 100% dos arquivos obrigatórios enviados (is_complete=true).
 *  - awaiting_link: sem link ativo (nunca teve OU expirou).
 *  - in_progress: tem link ativo + ≥1 arquivo OBRIGATÓRIO enviado (parcial).
 *  - link_sent: tem link ativo + 0 arquivos obrigatórios enviados.
 *
 * "Começar" = enviar pelo menos 1 documento obrigatório (mesma base que define
 * "completo"), evitando assimetrias (campo textual aleatório não promove).
 */
function computeAutoColumn(card: { has_link: boolean; has_started: boolean; is_complete: boolean }): KanbanColumn {
  if (card.is_complete) return 'completed';
  if (!card.has_link) return 'awaiting_link';
  if (!card.has_started) return 'link_sent';
  return 'in_progress';
}

export function useProfessorsKanban(options: { statusFilter?: ProfessorStatusFilter } = {}) {
  const statusFilter = options.statusFilter ?? 'ACTIVE';
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const docsQuery = useBIProfessorDocuments({ statusFilter });

  const kanbanQuery = useQuery({
    queryKey: ['professors-kanban', organizationId, statusFilter],
    queryFn: async (): Promise<KanbanCard[]> => {
      if (!organizationId) return [];
      const docs = docsQuery.data || [];
      if (docs.length === 0) return [];
      const profIds = docs.map(d => d.professor_id);
      const nowIso = new Date().toISOString();

      // 1) TODOS os links de documentos do professor (ativos OU expirados),
      //    paginado para evitar truncamento server-side.
      const links = await fetchAllPaginated<{
        id: string; scope_json: any; expires_at: string | null; is_active: boolean; content_type: string;
      }>((from, to) => supabase
        .from('external_links')
        .select('id, scope_json, expires_at, is_active, content_type')
        .eq('organization_id', organizationId)
        .eq('content_type', 'documentos_professor')
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })
        .range(from, to) as any,
      );

      const activeByProf = new Map<string, { id: string; expires_at: string }>();
      const anyByProf = new Set<string>();
      links.forEach((l) => {
        const pid = l.scope_json?.professor_id;
        if (!pid || !profIds.includes(pid)) return;
        anyByProf.add(pid);
        const isActive = l.is_active && l.expires_at && new Date(l.expires_at) > new Date(nowIso);
        if (isActive) {
          const cur = activeByProf.get(pid);
          if (!cur || new Date(l.expires_at!) > new Date(cur.expires_at)) {
            activeByProf.set(pid, { id: l.id, expires_at: l.expires_at! });
          }
        }
      });

      // 2) Arquivos enviados (paginado por organização).
      const files = await fetchAllPaginated<{ professor_id: string; category: string }>(
        (from, to) => supabase
          .from('professor_document_files' as any)
          .select('professor_id, category')
          .eq('organization_id', organizationId)
          .order('professor_id', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to) as any,
      );
      const profIdSet = new Set(profIds);
      const requiredFilesByProf = new Map<string, Set<string>>();
      files.forEach((f) => {
        if (!profIdSet.has(f.professor_id)) return;
        if (!REQUIRED_CATEGORIES_SET.has(f.category)) return;
        if (!requiredFilesByProf.has(f.professor_id)) requiredFilesByProf.set(f.professor_id, new Set());
        requiredFilesByProf.get(f.professor_id)!.add(f.category);
      });

      // 3. Estado manual.
      const { data: states } = await supabase
        .from('professor_kanban_state')
        .select('professor_id, manual_column, description, labels, last_moved_at, last_moved_by')
        .eq('organization_id', organizationId)
        .in('professor_id', profIds);
      const stateByProf = new Map<string, KanbanStateRow>();
      (states || []).forEach((s: any) => stateByProf.set(s.professor_id, {
        professor_id: s.professor_id,
        manual_column: s.manual_column,
        description: s.description,
        labels: Array.isArray(s.labels) ? s.labels : [],
        last_moved_at: s.last_moved_at,
        last_moved_by: s.last_moved_by,
      }));

      // 4. Combinar.
      return docs.map(d => {
        const link = activeByProf.get(d.professor_id);
        const has_link = !!link;
        const had_link = anyByProf.has(d.professor_id);
        const link_status: LinkStatus = has_link ? 'active' : (had_link ? 'expired' : 'none');
        const reqUploaded = requiredFilesByProf.get(d.professor_id)?.size ?? 0;
        // Defesa em profundidade: se o BI hook contou diferente, há divergência
        // de leitura (paginação truncada, RLS, etc.). Avisamos no console e
        // adotamos o MAIOR valor para nunca empurrar um card de volta para
        // "Link enviado" quando, de fato, há documento entregue.
        const biUploaded = (d as any).required_uploaded ?? 0;
        if (biUploaded !== reqUploaded) {
          // eslint-disable-next-line no-console
          console.warn('[Kanban] Divergência de contagem para professor', d.professor_id, { kanban: reqUploaded, bi: biUploaded });
        }
        const effectiveUploaded = Math.max(reqUploaded, biUploaded);
        const has_started = effectiveUploaded > 0;
        const auto_column = computeAutoColumn({ has_link, has_started, is_complete: d.is_complete });
        const state = stateByProf.get(d.professor_id);
        const manual_override = !!state?.manual_column;
        const effective_column: KanbanColumn = state?.manual_column ?? auto_column;
        const manual_diverges = manual_override && state!.manual_column !== auto_column;
        return {
          ...d,
          has_link,
          link_id: link?.id ?? null,
          link_expires_at: link?.expires_at ?? null,
          link_status,
          has_started,
          auto_column,
          effective_column,
          manual_override,
          manual_diverges,
          description: state?.description ?? null,
          labels: state?.labels ?? [],
          last_moved_at: state?.last_moved_at ?? null,
        } as KanbanCard;
      });
    },
    enabled: !!organizationId && !!docsQuery.data,
  });

  // 5. Realtime: atualiza quando professor preenche pelo link externo,
  //    quando admin gera/revoga link ou quando alguém move o card.
  useEffect(() => {
    if (!organizationId) return;
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['professors-kanban', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['bi-professor-documents', organizationId] });
    };
    const channel = supabase
      .channel(`kanban-prof-${organizationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'professor_document_files', filter: `organization_id=eq.${organizationId}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'professor_documents', filter: `organization_id=eq.${organizationId}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'external_links', filter: `organization_id=eq.${organizationId}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'professor_kanban_state', filter: `organization_id=eq.${organizationId}` }, invalidate)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [organizationId, queryClient]);

  const upsert = useMutation({
    mutationFn: async (payload: {
      professor_id: string;
      manual_column?: KanbanColumn | null;
      description?: string | null;
      labels?: KanbanLabel[];
    }) => {
      if (!organizationId) throw new Error('Organização não encontrada');
      const row: any = {
        professor_id: payload.professor_id,
        organization_id: organizationId,
      };
      if (payload.manual_column !== undefined) {
        row.manual_column = payload.manual_column;
        row.last_moved_by = user?.id ?? null;
        row.last_moved_at = new Date().toISOString();
      }
      if (payload.description !== undefined) row.description = payload.description;
      if (payload.labels !== undefined) row.labels = payload.labels;

      const { error } = await supabase
        .from('professor_kanban_state')
        .upsert(row, { onConflict: 'professor_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professors-kanban'] });
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao salvar card'),
  });

  return {
    cards: kanbanQuery.data || [],
    isLoading: docsQuery.isLoading || kanbanQuery.isLoading,
    refetch: kanbanQuery.refetch,
    upsert,
  };
}
