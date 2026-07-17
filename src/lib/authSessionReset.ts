import { supabase } from '@/integrations/supabase/client';
/**
 * Auth Session Reset
 * ------------------
 * Utilitários para garantir que NENHUM resíduo de uma sessão anterior do
 * Supabase permaneça no navegador antes/depois de um login. Necessário em
 * máquinas compartilhadas, onde o usuário B "herdava" momentaneamente a UI
 * do usuário A por causa de tokens persistidos em localStorage/sessionStorage
 * (chaves `sb-*`, `supabase.auth.*`, processLock, etc.).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const KEY_PREFIXES = ['sb-', 'supabase.auth.', 'supabase-auth-'];
const LEGACY_KEYS = ['supabase.auth.token'];

function shouldPurgeKey(key: string): boolean {
  if (LEGACY_KEYS.includes(key)) return true;
  return KEY_PREFIXES.some((p) => key.startsWith(p));
}

export function hardPurgeSupabaseStorage(): number {
  if (typeof window === 'undefined') return 0;
  let removed = 0;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k && shouldPurgeKey(k)) keys.push(k);
      }
      for (const k of keys) {
        try {
          storage.removeItem(k);
          removed++;
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* storage indisponível — ignora */
    }
  }
  return removed;
}

/**
 * Força o encerramento global da sessão e limpa qualquer vestígio local.
 * Best-effort: erros de rede no signOut não impedem o purge local.
 */
export async function forceGlobalSignOut(supabase: SupabaseClient): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: 'global' });
  } catch {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      /* ignore */
    }
  }
  hardPurgeSupabaseStorage();
}
