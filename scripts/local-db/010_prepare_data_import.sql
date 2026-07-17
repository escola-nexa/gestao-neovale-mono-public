-- O data_dump.sql insere com SELECT * (todas as colunas), mas o Postgres não
-- aceita INSERT em colunas geradas (GENERATED ALWAYS AS ... STORED).
-- Converte as colunas geradas em colunas normais antes do import — o valor
-- correto já vem no próprio dump.
-- Rodar ANTES de importar supabase_dump/data_dump.sql:
--   docker exec -i postgres psql -U postgres -d sigeo_navigator < scripts/local-db/010_prepare_data_import.sql

ALTER TABLE public.substitution_requests          ALTER COLUMN total_amount DROP EXPRESSION;
ALTER TABLE public.teacher_substitution_occurrences ALTER COLUMN amount     DROP EXPRESSION;
ALTER TABLE public.teacher_substitution_requests  ALTER COLUMN total_amount DROP EXPRESSION;

-- Colunas que existem só no schema local (foram removidas/alteradas em prod fora
-- da chain). O dump não traz essas chaves, jsonb_populate_recordset manda NULL
-- e violaria o NOT NULL — então relaxamos a constraint.
ALTER TABLE public.ticket_categories ALTER COLUMN is_active       DROP NOT NULL;
ALTER TABLE public.ticket_categories ALTER COLUMN updated_at      DROP NOT NULL;
ALTER TABLE public.ticket_messages   ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.ticket_messages   ALTER COLUMN sender_name     DROP NOT NULL;
ALTER TABLE public.tickets           ALTER COLUMN ticket_number   DROP NOT NULL;

-- Coluna que existe em prod mas faltava no local (adicionada fora da chain)
ALTER TABLE public.ticket_categories ADD COLUMN IF NOT EXISTS priority_default text NOT NULL DEFAULT 'baixa';

-- CHECK constraints locais ficaram desatualizadas vs. prod (ex.: tickets_status_check
-- só aceitava novo/em_andamento/..., mas prod usa aberto/em_atendimento/aguardando_escola;
-- tickets_priority_check não aceitava 'critica'). Como os dados do dump são válidos em
-- prod por definição, dropamos TODAS as CHECKs de public — as definições ficam salvas
-- em public._dropped_check_constraints para referência.
CREATE TABLE IF NOT EXISTS public._dropped_check_constraints (
  table_name text, constraint_name text, definition text, dropped_at timestamptz DEFAULT now()
);

DO $fix$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conname, c.conrelid::regclass AS tbl, pg_get_constraintdef(c.oid) AS def
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = t.relnamespace
    WHERE ns.nspname = 'public' AND c.contype = 'c'
  LOOP
    INSERT INTO public._dropped_check_constraints(table_name, constraint_name, definition)
    VALUES (r.tbl::text, r.conname, r.def);
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $fix$;
