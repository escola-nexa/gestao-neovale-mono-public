/**
 * Prefetch das rotas mais navegadas (planejamento, frequência, notas, chat, tickets, alunos, professores)
 * Disparado quando o browser está ocioso, após o app montar.
 * Reduz drasticamente o tempo de "spinner" ao clicar pela primeira vez.
 */

type PrefetchFn = () => Promise<unknown>;

// Apenas as 3 rotas mais utilizadas — reduz competição com o carregamento inicial
const ROUTES_TO_PREFETCH: PrefetchFn[] = [
  () => import('@/features/planejamento/PlanejamentoPage'),
  () => import('@/features/frequencia/FrequenciaDashboardPage'),
  () => import('@/features/notas/NotasDashboardPage'),
];

export function prefetchCommonRoutes() {
  // Espera o load completo da página antes de iniciar prefetch
  const start = () => {
    const schedule =
      (window as any).requestIdleCallback ??
      ((cb: () => void) => setTimeout(cb, 4000));

    schedule(() => {
      // Carrega 1 chunk a cada 800ms para não saturar a rede
      ROUTES_TO_PREFETCH.forEach((load, idx) => {
        setTimeout(() => {
          load().catch(() => {
            // silencioso — prefetch é best-effort
          });
        }, idx * 800);
      });
    });
  };

  if (document.readyState === 'complete') {
    start();
  } else {
    window.addEventListener('load', start, { once: true });
  }
}
