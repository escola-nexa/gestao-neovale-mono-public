-- Em produção a coluna "attachments" (TEXT[]) foi criada fora da chain de migrations
-- (direto no SQL Editor). A migration 20260410134242 assume que ela existe pra
-- renomear/migrar pra JSONB. Reproduz o estado aqui.
ALTER TABLE public.ticket_messages ADD COLUMN IF NOT EXISTS attachments TEXT[];

-- "opened_by_id" também foi adicionada fora da chain (nenhuma migration a cria,
-- mas 20260410134242+ a referenciam em policies e triggers).
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS opened_by_id uuid;
