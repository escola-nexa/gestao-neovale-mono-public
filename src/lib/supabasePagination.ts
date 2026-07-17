// Builder genérico do PostgREST: precisamos apenas de algo que retorne
// `{ data, error }` quando aguardado. Tipar com PostgrestFilterBuilder
// exigiria 4-7 generics; usamos uma assinatura mínima para flexibilidade.
type SupabaseQueryAwaitable<T> = PromiseLike<{ data: T[] | null; error: any }>;

/**
 * Pagina uma query do Supabase em lotes via `.range()`.
 *
 * MOTIVO: o PostgREST do Supabase aplica um teto de ~1000 linhas por
 * resposta (server-side `max-rows`). Mesmo com `.limit(100000)` a resposta
 * é silenciosamente truncada — o que causou o bug do Kanban de Professores
 * (cards mostrando 0/16 documentos para professores cujos arquivos
 * "caíam fora" da janela de 1000 linhas).
 *
 * Use `fetchAllPaginated(builder)` em vez de `await builder` sempre que a
 * query puder retornar mais do que algumas centenas de linhas.
 */
export async function fetchAllPaginated<T>(
  buildQuery: (from: number, to: number) => SupabaseQueryAwaitable<T>,
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  // Safety stop: 200 páginas × 1000 = 200k linhas. Suficiente para qualquer
  // tabela operacional do sistema sem risco de loop infinito.
  for (let i = 0; i < 200; i++) {
    const to = from + pageSize - 1;
    const { data, error } = await buildQuery(from, to);
    if (error) throw error;
    const chunk = (data || []) as T[];
    all.push(...chunk);
    if (chunk.length < pageSize) break;
    from += pageSize;
  }
  return all;
}
