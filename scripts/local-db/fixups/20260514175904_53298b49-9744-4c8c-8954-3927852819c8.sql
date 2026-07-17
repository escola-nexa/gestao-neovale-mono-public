-- "author_id" em ticket_messages foi adicionada fora da chain (referenciada por
-- triggers desde 20260410133258 e usada em backfill aqui). Em produção é o auth
-- user id do autor da mensagem.
ALTER TABLE public.ticket_messages ADD COLUMN IF NOT EXISTS author_id uuid;
