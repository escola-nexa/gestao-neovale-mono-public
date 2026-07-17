import { supabase } from '@/integrations/supabase/client';
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Upload, Image as ImageIcon, Sparkles, Info, RotateCcw } from 'lucide-react';
import { configApi } from '@/features/configuracoes/api';
import { useBranding } from '@/hooks/useBranding';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { Palette } from 'lucide-react';

const ICON_MAX_KB = 200;
const LOGO_MAX_KB = 500;
const ICON_RECOMMENDED = '512×512 px (PNG ou SVG, fundo transparente)';
const LOGO_RECOMMENDED = '800×200 px (PNG ou SVG, fundo transparente)';

export default function BrandingSettingsPage() {
  const { user } = useAuth();
  const { branding, organizationId, reload } = useBranding();
  const [displayName, setDisplayName] = useState(branding.display_name);
  const [subtitle, setSubtitle] = useState(branding.subtitle);
  const [iconUrl, setIconUrl] = useState<string | null>(branding.icon_url);
  const [logoUrl, setLogoUrl] = useState<string | null>(branding.logo_url);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const iconRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  // Sync when branding loads
  useEffect(() => {
    setDisplayName(branding.display_name);
    setSubtitle(branding.subtitle);
    setIconUrl(branding.icon_url);
    setLogoUrl(branding.logo_url);
  }, [branding]);

  const isAdmin = user?.perfil === 'admin';

  const handleIconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > ICON_MAX_KB * 1024) {
      toast.error(`Ícone muito grande. Máximo ${ICON_MAX_KB} KB.`);
      return;
    }
    setIconFile(file);
    setIconUrl(URL.createObjectURL(file));
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > LOGO_MAX_KB * 1024) {
      toast.error(`Logotipo muito grande. Máximo ${LOGO_MAX_KB} KB.`);
      return;
    }
    setLogoFile(file);
    setLogoUrl(URL.createObjectURL(file));
  };

  const uploadFile = async (file: File, kind: 'icon' | 'logo'): Promise<string> => {
    const ext = file.name.split('.').pop() || 'png';
    const path = `${organizationId}/${kind}-${Date.now()}.${ext}`;
    const publicUrl = await configApi.uploadBrandingImage(path, file);
    
    return publicUrl;
  };

  const handleSave = async () => {
    if (!organizationId) return;
    setSaving(true);
    try {
      let finalIcon = branding.icon_url;
      let finalLogo = branding.logo_url;

      if (iconFile) finalIcon = await uploadFile(iconFile, 'icon');
      if (logoFile) finalLogo = await uploadFile(logoFile, 'logo');

      const { error } = await supabase
        .from('branding_settings')
        .upsert({
          organization_id: organizationId,
          display_name: displayName.trim() || 'Neovale',
          subtitle: subtitle.trim() || 'Gestão Acadêmica',
          icon_url: finalIcon,
          logo_url: finalLogo,
        }, { onConflict: 'organization_id' });

      

      toast.success('Configurações de marca salvas. Recarregue a página para aplicar em todo o sistema.');
      setIconFile(null);
      setLogoFile(null);
      await reload();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDisplayName('Neovale');
    setSubtitle('Gestão Acadêmica');
    setIconUrl(null);
    setLogoUrl(null);
    setIconFile(null);
    setLogoFile(null);
  };

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Alert variant="destructive">
          <AlertTitle>Acesso restrito</AlertTitle>
          <AlertDescription>
            Apenas administradores podem alterar as configurações de marca.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Configurações' }, { label: 'Marca e identidade' }]}
        title="Marca e identidade visual"
        description="Personalize o nome, o logotipo e o ícone que aparecem no menu lateral, na tela de login e nos relatórios."
        icon={Palette}
      />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Tamanhos recomendados</AlertTitle>
        <AlertDescription className="space-y-1 mt-2">
          <p>• <strong>Ícone (símbolo)</strong>: {ICON_RECOMMENDED} — usado no menu lateral. Máx {ICON_MAX_KB} KB.</p>
          <p>• <strong>Logotipo (horizontal)</strong>: {LOGO_RECOMMENDED} — usado em relatórios e tela de login. Máx {LOGO_MAX_KB} KB.</p>
          <p>• Use imagens com <strong>fundo transparente</strong> (PNG/SVG) para melhor adaptação aos temas.</p>
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Texto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Texto da marca
            </CardTitle>
            <CardDescription>Aparece ao lado do ícone no menu lateral.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Nome do sistema</Label>
              <Input
                id="display_name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={32}
                placeholder="Neovale"
              />
              <p className="text-xs text-muted-foreground">Até 32 caracteres.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtítulo</Label>
              <Input
                id="subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                maxLength={48}
                placeholder="Gestão Acadêmica"
              />
              <p className="text-xs text-muted-foreground">Até 48 caracteres.</p>
            </div>
          </CardContent>
        </Card>

        {/* Pré-visualização da sidebar */}
        <Card>
          <CardHeader>
            <CardTitle>Pré-visualização</CardTitle>
            <CardDescription>Como ficará no cabeçalho do menu lateral.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl bg-sidebar p-5 border border-sidebar-border">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {iconUrl ? (
                    <img src={iconUrl} alt="Ícone" className="h-full w-full object-contain" />
                  ) : (
                    <Sparkles className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div>
                  <h2 className="font-extrabold text-sidebar-foreground text-lg leading-none">
                    {displayName || 'Neovale'}
                  </h2>
                  <p className="text-[10px] text-sidebar-foreground/40 font-medium tracking-widest uppercase mt-0.5">
                    {subtitle || 'Gestão Acadêmica'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ícone */}
        <Card>
          <CardHeader>
            <CardTitle>Ícone (símbolo)</CardTitle>
            <CardDescription>Quadrado, exibido no menu lateral. {ICON_RECOMMENDED}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-xl bg-muted flex items-center justify-center overflow-hidden border">
                {iconUrl ? (
                  <img src={iconUrl} alt="Ícone atual" className="h-full w-full object-contain" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <Button variant="outline" onClick={() => iconRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Escolher ícone
              </Button>
              <input
                ref={iconRef}
                type="file"
                accept="image/png,image/svg+xml,image/jpeg,image/webp"
                className="hidden"
                onChange={handleIconSelect}
              />
            </div>
          </CardContent>
        </Card>

        {/* Logotipo */}
        <Card>
          <CardHeader>
            <CardTitle>Logotipo (horizontal)</CardTitle>
            <CardDescription>Usado em relatórios e tela de login. {LOGO_RECOMMENDED}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-20 w-40 rounded-xl bg-muted flex items-center justify-center overflow-hidden border">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logotipo atual" className="h-full w-full object-contain p-2" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <Button variant="outline" onClick={() => logoRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Escolher logotipo
              </Button>
              <input
                ref={logoRef}
                type="file"
                accept="image/png,image/svg+xml,image/jpeg,image/webp"
                className="hidden"
                onChange={handleLogoSelect}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <Button variant="ghost" onClick={handleReset} disabled={saving}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Restaurar padrão
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar alterações'
          )}
        </Button>
      </div>
    </div>
  );
}
