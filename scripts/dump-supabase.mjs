#!/usr/bin/env node
/**
 * Dump de dados do Supabase via API (autenticado como usuário do app).
 *
 * Lê todas as tabelas listadas em src/integrations/supabase/types.ts usando
 * o supabase-js com login de um usuário real (o RLS libera o que esse usuário
 * enxerga) e gera um arquivo SQL com INSERTs em supabase_dump/data_dump.sql.
 *
 * Uso:
 *   node scripts/dump-supabase.mjs
 *   (pede e-mail/senha; ou defina DUMP_USER_EMAIL / DUMP_USER_PASSWORD no .env)
 *
 * O SQL gerado usa jsonb_populate_recordset(null::tabela, ...) para que o
 * próprio Postgres converta os tipos (uuid, timestamp, arrays, jsonb etc.),
 * sem precisar adivinhar tipo de coluna aqui.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createInterface } from 'node:readline';

// ---------- .env ----------
const env = {};
for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
  if (m) env[m[1]] = m[2];
}
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY não encontrados no .env');
  process.exit(1);
}

// ---------- credenciais ----------
function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      const onData = (ch) => {
        const s = ch.toString();
        if (s === '\n' || s === '\r' || s === '') process.stdin.off('data', onData);
      };
      rl.question(question, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer); });
      rl._writeToOutput = () => {}; // não ecoa a senha
      process.stdout.write(question);
    } else {
      rl.question(question, (answer) => { rl.close(); resolve(answer); });
    }
  });
}

const email = env.DUMP_USER_EMAIL || (await ask('E-mail do usuário do sistema: '));
const password = env.DUMP_USER_PASSWORD || (await ask('Senha: ', { hidden: true }));

// ---------- login ----------
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: true },
});
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email, password });
if (authError) {
  console.error(`Falha no login: ${authError.message}`);
  process.exit(1);
}
console.log(`Logado como ${auth.user.email} (${auth.user.id})\n`);

// ---------- lista de tabelas (a partir dos types gerados) ----------
const typesSrc = readFileSync(new URL('../src/integrations/supabase/types.ts', import.meta.url), 'utf8');
const tables = [];
let inside = false;
for (const line of typesSrc.split('\n')) {
  if (/^    Tables: \{/.test(line)) { inside = true; continue; }
  if (inside && /^    \}/.test(line)) break;
  const m = inside && line.match(/^      (\w+): \{/);
  if (m) tables.push(m[1]);
}
console.log(`${tables.length} tabelas encontradas em types.ts\n`);

// ---------- dump ----------
const PAGE = 1000;        // linhas por request
const BATCH = 500;        // linhas por INSERT no SQL gerado
const sqlEscape = (s) => s.replaceAll("'", "''");

mkdirSync(new URL('../supabase_dump', import.meta.url), { recursive: true });

const parts = [
  '-- Dump de dados gerado por scripts/dump-supabase.mjs',
  `-- Origem: ${SUPABASE_URL}`,
  '-- Restaure com o schema já criado (supabase/migrations).',
  '-- session_replication_role=replica desativa triggers/FKs durante o restore',
  '-- (funciona com o role postgres do Supabase).',
  'BEGIN;',
  "SET session_replication_role = 'replica';",
  '',
];
const summary = { ok: [], empty: [], errors: [] };
let totalRows = 0;

for (const table of tables) {
  const rows = [];
  let from = 0;
  let error = null;
  for (;;) {
    const { data, error: err } = await supabase
      .from(table)
      .select('*')
      .range(from, from + PAGE - 1);
    if (err) { error = err.message; break; }
    rows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  if (error) {
    summary.errors.push(`${table}: ${error}`);
    parts.push(`-- ${table}: ERRO (${error})`, '');
    console.log(`✗ ${table}: ${error}`);
    continue;
  }
  if (rows.length === 0) {
    summary.empty.push(table);
    console.log(`- ${table}: 0 linhas`);
    continue;
  }

  summary.ok.push(`${table}: ${rows.length}`);
  totalRows += rows.length;
  parts.push(`-- ${table} (${rows.length} linhas)`);
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const json = sqlEscape(JSON.stringify(chunk));
    parts.push(
      `INSERT INTO public.${table} SELECT * FROM jsonb_populate_recordset(null::public.${table}, '${json}'::jsonb) ON CONFLICT DO NOTHING;`
    );
  }
  parts.push('');
  console.log(`✓ ${table}: ${rows.length} linhas`);
}

parts.push("SET session_replication_role = 'origin';", 'COMMIT;', '');
const outPath = new URL('../supabase_dump/data_dump.sql', import.meta.url);
writeFileSync(outPath, parts.join('\n'));

console.log('\n========== RESUMO ==========');
console.log(`Tabelas com dados: ${summary.ok.length} (${totalRows} linhas)`);
console.log(`Tabelas vazias:    ${summary.empty.length}`);
console.log(`Tabelas com erro:  ${summary.errors.length}`);
for (const e of summary.errors) console.log(`  ✗ ${e}`);
console.log(`\nArquivo gerado: supabase_dump/data_dump.sql`);
