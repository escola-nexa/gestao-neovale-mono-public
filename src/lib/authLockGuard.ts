/**
 * Auth Lock Guard
 * ---------------
 * No navegador, o cliente Supabase já gerencia auto-refresh, lock entre abas
 * (processLock) e sincronização via storage events. Tentativas anteriores de
 * pausar/retomar manualmente o auto-refresh com `startAutoRefresh()`/
 * `stopAutoRefresh()` removem o callback interno de visibilidade e provocam
 * tempestades de refresh entre múltiplas abas.
 *
 * Mantemos apenas uma supressão seletiva do ruído de console
 * "Auth session missing!" — não-actionable durante hidratação. Nenhuma
 * intervenção no fluxo de tokens é feita aqui.
 */

let started = false;

export function installAuthLockGuard() {
  if (started) return;
  started = true;
  if (typeof window === 'undefined') return;

  const origError = console.error;
  console.error = (...args: any[]) => {
    const first = args?.[0];
    const msg = typeof first === 'string' ? first : first?.message;
    if (typeof msg === 'string' && /Auth session missing/i.test(msg)) {
      return;
    }
    origError(...args);
  };
}
