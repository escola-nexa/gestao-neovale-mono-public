import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Hook utilitário para sincronizar filtros + paginação com a URL.
 * Use `get('chave')` para ler, `set('chave', valor)` para escrever (sem ' ' / null = remove).
 * `clear(keys)` remove um conjunto de chaves de uma vez.
 */
export function useUrlFilters(defaults: Record<string, string> = {}) {
  const [params, setParams] = useSearchParams();

  const get = useCallback(
    (key: string) => params.get(key) ?? defaults[key] ?? '',
    [params, defaults],
  );

  const set = useCallback(
    (key: string, value: string | number | null | undefined) => {
      const next = new URLSearchParams(params);
      if (value === null || value === undefined || value === '' || value === 'all') {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
      // Reset page on filter changes (unless we are setting page itself)
      if (key !== 'page') next.delete('page');
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const clear = useCallback(
    (keys: string[]) => {
      const next = new URLSearchParams(params);
      keys.forEach((k) => next.delete(k));
      next.delete('page');
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const page = Number(params.get('page') ?? '1') || 1;
  const pageSize = Number(params.get('pageSize') ?? '20') || 20;

  const setPage = useCallback(
    (p: number) => {
      const next = new URLSearchParams(params);
      if (p <= 1) next.delete('page');
      else next.set('page', String(p));
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const setPageSize = useCallback(
    (s: number) => {
      const next = new URLSearchParams(params);
      next.set('pageSize', String(s));
      next.delete('page');
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  return useMemo(
    () => ({ get, set, clear, page, pageSize, setPage, setPageSize }),
    [get, set, clear, page, pageSize, setPage, setPageSize],
  );
}

/** Aplica paginação client-side a um array. */
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
