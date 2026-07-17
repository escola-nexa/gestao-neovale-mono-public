import { useEffect, useState } from 'react';
import {
  Download,
  Smartphone,
  Zap,
  Bell,
  WifiOff,
  Maximize2,
  Home,
  X,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallPrompt, isStandalone } from '@/hooks/useInstallPrompt';
import { usePwaSettings } from '@/hooks/usePwaSettings';
import { useAuth } from '@/contexts/AuthContext';

const SNOOZE_KEY = 'neovale.installPrompt.snoozedAt';
const NEVER_KEY = 'neovale.installPrompt.never';
const SHOWN_COUNT_KEY = 'neovale.installPrompt.shownCount';
const MAX_SHOWS = 20;
const SNOOZE_MINUTES = 30; // reaparece 30min após "Instalar mais tarde"

function isAndroid() {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

const BENEFITS = [
  { icon: Home, title: 'Atalho na tela inicial', desc: 'Abra com 1 toque, igual a um app nativo.' },
  { icon: Zap, title: 'Mais rápido', desc: 'Carrega instantaneamente, sem barra do navegador.' },
  { icon: Bell, title: 'Notificações push', desc: 'Receba avisos de tickets, planejamentos e mensagens.' },
  { icon: Maximize2, title: 'Tela cheia', desc: 'Mais espaço pra trabalhar, foco total no sistema.' },
  { icon: WifiOff, title: 'Funciona offline', desc: 'Conteúdo essencial disponível mesmo sem internet.' },
];

/**
 * Overlay full-screen de instalação (SOMENTE Android).
 * Mostra até 20 vezes ou até o usuário instalar, com opção "Instalar mais tarde".
 */
export function InstallAutoPrompt() {
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const { data } = usePwaSettings();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const appName = data?.short_name || data?.name || 'Neovale';
  const android = isAndroid();

  useEffect(() => {
    if (!user?.id) return;
    if (installed || isStandalone()) return;
    if (!android) return; // SOMENTE Android
    if (localStorage.getItem(NEVER_KEY) === '1') return;

    const shown = Number(localStorage.getItem(SHOWN_COUNT_KEY) ?? '0');
    if (shown >= MAX_SHOWS) return; // esgotou as 20 tentativas

    const snoozedAt = Number(localStorage.getItem(SNOOZE_KEY) ?? '0');
    const snoozedUntil = snoozedAt + SNOOZE_MINUTES * 60 * 1000;
    if (Date.now() < snoozedUntil) return;

    const t = setTimeout(async () => {
      localStorage.setItem(SHOWN_COUNT_KEY, String(shown + 1));
      // Android + prompt nativo disponível → dispara instalação automaticamente
      if (canInstall) {
        const accepted = await promptInstall();
        if (accepted) {
          localStorage.setItem(SHOWN_COUNT_KEY, String(MAX_SHOWS));
          return;
        }
        // recusou: cai no overlay com CTA/instruções
      }
      setOpen(true);
    }, 800);
    return () => clearTimeout(t);
  }, [user?.id, installed, android, canInstall, promptInstall]);

  // Lock body scroll quando aberto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const snooze = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    setOpen(false);
  };
  const install = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      // marcou como instalado: zera contador e bloqueia futuras exibições
      localStorage.setItem(SHOWN_COUNT_KEY, String(MAX_SHOWS));
      setOpen(false);
    } else {
      snooze();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-[#1B1E2C] text-white animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-title"
    >
      {/* Botão fechar */}
      <button
        onClick={snooze}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        aria-label="Fechar"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Conteúdo scrollável */}
      <div className="flex-1 overflow-y-auto px-6 pt-12 pb-6">
        <div className="mx-auto max-w-md space-y-6">
          {/* Hero */}
          <div className="text-center space-y-4">
            <div
              className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl shadow-2xl overflow-hidden"
              style={{ backgroundColor: '#FFDA45' }}
            >
              {data?.icon_url ? (
                <img src={data.icon_url} alt={appName} className="h-full w-full object-contain" />
              ) : (
                <Smartphone className="h-12 w-12 text-[#1B1E2C]" />
              )}
            </div>
            <div>
              <h1 id="install-title" className="text-2xl font-bold leading-tight">
                Instale o {appName} no seu celular
              </h1>
              <p className="mt-2 text-sm text-white/70">
                Tenha o sistema sempre à mão, como um aplicativo de verdade.
              </p>
            </div>
          </div>

          {/* Benefícios */}
          <div className="space-y-3">
            {BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10"
              >
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: '#FFDA45' }}
                >
                  <Icon className="h-5 w-5 text-[#1B1E2C]" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm">{title}</div>
                  <div className="text-xs text-white/60 mt-0.5">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Tutorial Android */}
          <div className="space-y-3 rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="text-sm font-semibold text-[#FFDA45]">
              Como instalar no Android:
            </div>
            {canInstall ? (
              <p className="text-xs text-white/70">
                Toque em <strong>Instalar agora</strong> abaixo e confirme no aviso do navegador.
              </p>
            ) : (
              <>
                <Step n={1}>
                  Toque no menu <MoreVertical className="mx-1 inline h-4 w-4" /> do seu navegador (Chrome).
                </Step>
                <Step n={2}>
                  Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.
                </Step>
                <Step n={3}>
                  Confirme tocando em <strong>Instalar</strong>.
                </Step>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer fixo com CTAs */}
      <div className="flex-shrink-0 border-t border-white/10 bg-[#1B1E2C] px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2">
        <div className="mx-auto max-w-md space-y-2">
          {canInstall && (
            <Button
              size="lg"
              className="w-full bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45]/90 font-semibold"
              onClick={install}
            >
              <Download className="w-5 h-5 mr-2" /> Instalar agora
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full text-white/80 hover:bg-white/10 hover:text-white"
            onClick={snooze}
          >
            Instalar mais tarde
          </Button>
        </div>
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
        style={{ backgroundColor: '#FFDA45', color: '#1B1E2C' }}
      >
        {n}
      </span>
      <div className="text-white/80">{children}</div>
    </div>
  );
}
