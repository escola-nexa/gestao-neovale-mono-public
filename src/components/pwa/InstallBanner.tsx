import { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallPrompt, isStandalone } from '@/hooks/useInstallPrompt';

const DISMISS_KEY = 'neovale.installBanner.dismissedAt';
const VISITS_KEY = 'neovale.installBanner.visits';
const MIN_VISITS = 3;
const SNOOZE_DAYS = 7;

export function InstallBanner() {
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (installed || isStandalone()) return;

    const visits = Number(localStorage.getItem(VISITS_KEY) ?? '0') + 1;
    localStorage.setItem(VISITS_KEY, String(visits));

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? '0');
    const snoozedUntil = dismissedAt + SNOOZE_DAYS * 24 * 60 * 60 * 1000;

    if (visits >= MIN_VISITS && Date.now() > snoozedUntil) {
      setShow(true);
    }
  }, [installed]);

  if (!show || !canInstall || installed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  const install = async () => {
    const accepted = await promptInstall();
    if (accepted) setShow(false);
    else dismiss();
  };

  return (
    <div className="mb-4 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">Instale o Neovale no seu dispositivo</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Acesso rápido pela tela inicial, com tela cheia e funcionamento offline básico.
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button size="sm" onClick={install}>
            <Download className="w-4 h-4 mr-1.5" /> Instalar
          </Button>
          <Button size="icon" variant="ghost" onClick={dismiss} aria-label="Dispensar">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
