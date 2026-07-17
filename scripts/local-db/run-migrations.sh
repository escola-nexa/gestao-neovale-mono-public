#!/usr/bin/env bash
# Aplica as migrations de supabase/migrations num Postgres local (container Docker).
# Idempotente: registra cada migration em supabase_migrations.schema_migrations e
# pula as já aplicadas. Uso:
#   CONTAINER=postgres DB=sigeo_navigator ./scripts/local-db/run-migrations.sh
set -euo pipefail

CONTAINER="${CONTAINER:-postgres}"
DB="${DB:-sigeo_navigator}"
PGUSER="${PGUSER:-postgres}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

psql_db() { docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$DB" "$@"; }

# Cria o banco se não existir
if ! docker exec "$CONTAINER" psql -U "$PGUSER" -tAc "SELECT 1 FROM pg_database WHERE datname='$DB'" | grep -q 1; then
  echo ">> criando database $DB"
  docker exec "$CONTAINER" psql -U "$PGUSER" -c "CREATE DATABASE \"$DB\""
fi

echo ">> bootstrap (shim supabase)"
psql_db -q -v ON_ERROR_STOP=1 -1 < "$ROOT/scripts/local-db/000_bootstrap.sql"

# Migrations presentes no repo mas nunca aplicadas no remoto (conflitam com a chain real)
SKIP="20260120100000_create_schools_table 20260207180100_create_notifications_table consolidated_migrations"

for f in "$ROOT"/supabase/migrations/*.sql; do
  v="$(basename "$f" .sql)"
  case " $SKIP " in *" $v "*) echo ">> $v (pulada: órfã, não existe no remoto)"; continue;; esac
  applied="$(psql_db -tAc "SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='$v'")"
  if [ "$applied" = "1" ]; then
    continue
  fi
  echo ">> $v"
  # Fixup: SQL aplicado antes da migration pra reproduzir estado criado fora da
  # chain no banco remoto (mudanças feitas direto no SQL Editor).
  fixup="$ROOT/scripts/local-db/fixups/$v.sql"
  if [ -f "$fixup" ]; then
    echo "   (fixup: $v)"
    psql_db -q -v ON_ERROR_STOP=1 -1 < "$fixup"
  fi
  # pg_net não existe no postgres:14-alpine — o bootstrap criou stubs no schema net,
  # então os statements de extensão são neutralizados aqui.
  sed -E 's/^[[:space:]]*(DROP EXTENSION IF EXISTS pg_net;|CREATE EXTENSION pg_net WITH SCHEMA extensions;)/-- [local-skip] \1/' "$f" \
    | psql_db -q -v ON_ERROR_STOP=1 -1
  psql_db -qc "INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('$v')" >/dev/null
done

echo "OK: todas as migrations aplicadas em '$DB' (container $CONTAINER)"
