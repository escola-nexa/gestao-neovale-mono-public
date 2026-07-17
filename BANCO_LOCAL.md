# Banco de dados local (réplica do Supabase)

Este projeto roda em produção no Supabase. Para desenvolver com um Postgres
local (sem o stack Supabase), existe um pipeline que recria o schema via
migrations e importa os dados de produção.

**Alvo:** container Docker `postgres` (postgres:14-alpine, porta `15432`),
database `sigeo_navigator`.

## Arquivos do pipeline

| Arquivo | Papel |
|---|---|
| `scripts/local-db/run-migrations.sh` | Cria o DB (se não existir), aplica o bootstrap e roda todas as migrations em ordem |
| `scripts/local-db/000_bootstrap.sql` | Shim do ambiente Supabase: roles (`anon`/`authenticated`/`service_role`), `auth.uid()`/`auth.users`, schema `storage`, stubs de `pg_net`/`pg_cron`, publication `supabase_realtime` |
| `scripts/local-db/fixups/<versão>.sql` | Estado criado **fora** da chain de migrations em produção (colunas/tabelas feitas direto no SQL Editor). O runner aplica o fixup antes da migration correspondente |
| `scripts/local-db/010_prepare_data_import.sql` | Prepara o schema para o import: remove colunas geradas (`DROP EXPRESSION`), relaxa `NOT NULL` em colunas que só existem localmente, cria colunas que faltam e dropa as CHECK constraints desatualizadas (defs salvas em `_dropped_check_constraints`) |
| `scripts/local-db/020_populate_auth_users.sql` | Reconstrói `auth.users` a partir de `public.profiles` (a API do Supabase não exporta o schema `auth`) |
| `scripts/dump-supabase.mjs` | Exporta os dados de produção via API (login de usuário do app; RLS limita ao que esse usuário enxerga) → `supabase_dump/data_dump.sql` |

## Setup inicial (ou refresh completo)

> ⚠️ O import usa `ON CONFLICT DO NOTHING`: reimportar por cima de um banco
> existente só **acrescenta** linhas novas — não atualiza linhas alteradas nem
> remove deletadas. Para espelhar produção, recrie o banco do zero (é rápido).

```bash
# 0. (Refresh) derruba o banco atual
docker exec postgres psql -U postgres -c "DROP DATABASE sigeo_navigator WITH (FORCE)"

# 1. Exporta os dados de produção (pede e-mail/senha de um usuário do sistema,
#    ou defina DUMP_USER_EMAIL / DUMP_USER_PASSWORD no .env)
node scripts/dump-supabase.mjs

# 2. Cria o schema (bootstrap + 397 migrations + fixups)
./scripts/local-db/run-migrations.sh

# 3. Prepara o schema para receber os dados
docker exec -i postgres psql -U postgres -d sigeo_navigator < scripts/local-db/010_prepare_data_import.sql

# 4. Importa os dados (via psql ou pela IDE/DataGrip)
docker exec -i postgres psql -U postgres -d sigeo_navigator < supabase_dump/data_dump.sql

# 5. Popula auth.users a partir de profiles
docker exec -i postgres psql -U postgres -d sigeo_navigator < scripts/local-db/020_populate_auth_users.sql
```

Conexão: `postgresql://postgres@<host>:15432/sigeo_navigator`

## Gerar dump do banco local

```bash
mkdir -p supabase_dump/local
# formato custom (recomendado p/ restore)
docker exec postgres pg_dump -U postgres -d sigeo_navigator -Fc -f /tmp/sigeo.dump \
  && docker cp postgres:/tmp/sigeo.dump supabase_dump/local/sigeo_navigator_$(date +%Y%m%d).dump \
  && docker exec postgres rm /tmp/sigeo.dump
# SQL plano (p/ inspecionar)
docker exec postgres pg_dump -U postgres -d sigeo_navigator --no-owner --no-privileges \
  > supabase_dump/local/sigeo_navigator_$(date +%Y%m%d).sql
```

Restaurar em outro banco:

```bash
pg_restore -U postgres -d <novo_db> --no-owner sigeo_navigator_<data>.dump
```

O dump local é auto-contido (schema + shims + dados): para subir em outra
máquina basta o restore, sem rodar a chain de migrations.

## Avisos e pegadinhas

- **Senha dos usuários locais:** `auth.users` é reconstruída de `profiles`;
  hash de senha não é exportável de produção. Todos os usuários locais ficam
  com a senha `senha123`.
- **Tabela nova em prod:** o `dump-supabase.mjs` lista as tabelas a partir de
  `src/integrations/supabase/types.ts`. Se criarem tabela nova em produção,
  regenere o `types.ts` antes de exportar, senão ela fica de fora.
- **Drift de schema:** produção recebe mudanças direto no SQL Editor (fora das
  migrations). Se o import quebrar com coluna/constraint inexistente, compare
  as seções `Row` do `types.ts` com `information_schema.columns` do banco
  local e ajuste `010_prepare_data_import.sql` ou crie um fixup.
- **Migrations órfãs:** `20260120100000_create_schools_table`,
  `20260207180100_create_notifications_table` e `consolidated_migrations.sql`
  existem no repo mas nunca foram aplicadas no remoto — o runner já as pula
  (variável `SKIP`). Não "consertá-las".
- **Erros em lote no import:** 1 erro real aborta a transação e gera dezenas
  de falhas colaterais (`current transaction is aborted`). Analise só o
  **primeiro** erro do log.
- **`supabase_dump/` contém dados reais de produção** (e-mails, nomes etc.) —
  está no `.gitignore` e não deve ser commitado.
