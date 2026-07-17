/**
 * Service Worker registration with strict guards.
 *
 * RULES (do NOT relax):
 *  - NEVER register inside an iframe (Lovable preview runs in iframe)
 *  - NEVER register on Lovable preview hosts (id-preview--*, lovableproject.com)
 *  - When running in preview/iframe, proactively unregister any existing SW
 *    so leftover workers from prior production sessions cannot poison the preview.
 */

const PREVIEW_HOST_PATTERNS = [
  'id-preview--',
  'lovableproject.com',
  'lovable.app/preview',
];

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isPreviewHost(): boolean {
  const host = window.location.hostname;
  const href = window.location.href;
  return PREVIEW_HOST_PATTERNS.some((p) => host.includes(p) || href.includes(p));
}

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const blocked = isInIframe() || isPreviewHost();

  if (blocked) {
    // Clean up any SW that may have been registered previously
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister().catch(() => {}));
    }).catch(() => {});
    return;
  }

  // Wait for window load so we don't compete with first paint
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);

        // Detect new SW waiting to activate → notify app
        const notify = () => {
          window.dispatchEvent(new CustomEvent('pwa-update-available', { detail: { registration: reg } }));
        };
        if (reg.waiting && navigator.serviceWorker.controller) notify();
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              notify();
            }
          });
        });

        // After SKIP_WAITING accepted, controller changes → reload once
        let reloaded = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (reloaded) return;
          reloaded = true;
          window.location.reload();
        });
      })
      .catch((err) => {
        console.warn('[SW] registration failed', err);
      });
  });
}
