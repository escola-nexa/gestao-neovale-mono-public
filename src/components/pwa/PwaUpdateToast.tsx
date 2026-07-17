import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

/**
 * Ouve o evento 'pwa-update-available' (disparado por registerServiceWorker)
 * e mostra um toast persistente para o usuário recarregar.
 */
export function PwaUpdateToast() {
  const shownRef = useRef(false);

  useEffect(() => {
    function onUpdate(e: Event) {
      if (shownRef.current) return;
      shownRef.current = true;
      const reg = (e as CustomEvent).detail?.registration as ServiceWorkerRegistration | undefined;

      toast('Nova versão disponível', {
        description: 'Atualize para receber as últimas melhorias.',
        duration: Infinity,
        action: (
          <Button
            size="sm"
            onClick={() => {
              try {
                reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
                // controllerchange listener no registerServiceWorker faz o reload
              } catch {
                window.location.reload();
              }
            }}
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            Recarregar
          </Button>
        ),
      });
    }

    window.addEventListener('pwa-update-available', onUpdate as EventListener);
    return () => window.removeEventListener('pwa-update-available', onUpdate as EventListener);
  }, []);

  return null;
}
