import { Smartphone, Apple, Chrome, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { usePwaSettings } from '@/hooks/usePwaSettings';

export default function InstallPage() {
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const { data } = usePwaSettings();
  const name = data?.name ?? 'Neovale';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center space-y-3">
          <div
            className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center shadow-xl overflow-hidden"
            style={{ backgroundColor: data?.background_color ?? '#1B1E2C' }}
          >
            {data?.icon_url ? (
              <img src={data.icon_url} className="w-full h-full object-contain" alt={name} />
            ) : (
              <Smartphone className="w-12 h-12 text-primary" />
            )}
          </div>
          <h1 className="text-3xl font-bold">Instalar {name}</h1>
          <p className="text-muted-foreground">Tenha o sistema como aplicativo no seu celular.</p>
        </div>

        {installed && (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardContent className="flex items-center gap-3 py-4">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>App já instalado neste dispositivo.</span>
            </CardContent>
          </Card>
        )}

        {canInstall && !installed && (
          <Button size="lg" className="w-full" onClick={promptInstall}>
            <Smartphone className="w-5 h-5 mr-2" /> Instalar agora
          </Button>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Chrome className="w-5 h-5" /> <CardTitle className="text-base">Android / Chrome</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2 text-muted-foreground">
              <p>1. Toque no menu (⋮) do navegador.</p>
              <p>2. Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</p>
              <p>3. Confirme — pronto.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Apple className="w-5 h-5" /> <CardTitle className="text-base">iPhone / Safari</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2 text-muted-foreground">
              <p>1. Toque no botão <strong>Compartilhar</strong>.</p>
              <p>2. Selecione <strong>Adicionar à Tela de Início</strong>.</p>
              <p>3. Confirme.</p>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          O app exige conexão com internet. Os dados ficam protegidos pelo seu login.
        </p>
      </div>
    </div>
  );
}
