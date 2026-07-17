-- Remove auto-completar checklist quando ticket vai para 'resolvido'.
-- Bug reportado: itens marcados sem clique do usuário ao mover cartão no Kanban.
DROP TRIGGER IF EXISTS trg_complete_checklists_on_resolve ON public.tickets;
DROP FUNCTION IF EXISTS public.tg_complete_checklists_on_resolve();