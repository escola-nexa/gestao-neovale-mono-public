import { useEffect, useRef, useState } from 'react';
import { hrApi } from '../api';

interface UseDraftAutoSaveOptions {
  token: string | undefined;
  keyword: string;
  enabled: boolean;
  payload: unknown;
  diretorNome?: string;
  /** Debounce em milissegundos. Default 3000 (3s). */
  debounceMs?: number;
}

export interface AutoSaveStatus {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt: Date | null;
  error: string | null;
  saveNow: () => Promise<boolean>;
}

/**
 * Auto-save de rascunho do portal do diretor (RPC save_indication_draft).
 * - Faz debounce automático e expõe `saveNow` para o botão "Salvar" manual.
 */
export function useDraftAutoSave(opts: UseDraftAutoSaveOptions): AutoSaveStatus {
  const { token, keyword, enabled, payload, diretorNome, debounceMs = 3000 } = opts;
  const [status, setStatus] = useState<AutoSaveStatus['status']>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const inflightRef = useRef<Promise<boolean> | null>(null);

  async function persist(): Promise<boolean> {
    if (!token || !keyword || !enabled) return false;
    setStatus('saving');
    setError(null);
    try {
      const ok = await hrApi.saveIndicationDraft({
        token,
        keyword,
        payload,
        diretor_nome: diretorNome ?? null,
      });
      if (!ok) throw new Error('Não foi possível salvar o rascunho.');
      setStatus('saved');
      setLastSavedAt(new Date());
      return true;
    } catch (e: any) {
      setStatus('error');
      setError(e?.message || 'Erro ao salvar rascunho');
      return false;
    }
  }

  // debounce
  useEffect(() => {
    if (!enabled || !token || !keyword) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void persist();
    }, debounceMs);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(payload), diretorNome, enabled, token, keyword]);

  return {
    status,
    lastSavedAt,
    error,
    async saveNow() {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (inflightRef.current) return inflightRef.current;
      inflightRef.current = persist();
      const ok = await inflightRef.current;
      inflightRef.current = null;
      return ok;
    },
  };
}
