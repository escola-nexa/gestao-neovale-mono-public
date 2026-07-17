import { useState, useEffect, useRef } from 'react';
import { Smartphone, Save, Upload, Plus, X, GripVertical, AlertTriangle, RefreshCw, Check, Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { pwaApi } from '@/features/pwa/api';
import { usePwaSettings, useUpdatePwaSettings, type PwaShortcut, type PwaSettings } from '@/hooks/usePwaSettings';

const ROUTES = [
  { url: '/dashboard', label: 'Dashboard' },
  { url: '/pendencias', label: 'Pendências' },
  { url: '/planejamento', label: 'Planejamento' },
  { url: '/orientacoes', label: 'Orientações' },
  { url: '/frequencia', label: 'Frequência' },
  { url: '/notas', label: 'Notas' },
  { url: '/boletins', label: 'Boletins' },
  { url: '/calendario', label: 'Calendário' },
  { url: '/grade-horaria', label: 'Grade Horária' },
  { url: '/biblioteca', label: 'Biblioteca' },
  { url: '/chat', label: 'Chat' },
  { url: '/tickets', label: 'Tickets' },
  { url: '/escolas', label: 'Escolas' },
  { url: '/professores', label: 'Professores' },
  { url: '/rh', label: 'R.H. - Alocação' },
  { url: '/banco-talentos', label: 'Banco de Talentos' },
  { url: '/ajuda', label: 'Central de Ajuda' },
  { url: '/meu-perfil', label: 'Meu Perfil' },
];

export default function PwaSettingsPage() {
  const { data, isLoading } = usePwaSettings();
  const update = useUpdatePwaSettings();
  const [form, setForm] = useState<PwaSettings | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [iconDims, setIconDims] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => { if (data) setForm(data); }, [data]);

  // ----- Autosave SOMENTE para "Menus visíveis por perfil" -----
  const [menuSaveStatus, setMenuSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [menuSavedAt, setMenuSavedAt] = useState<Date | null>(null);
  const menuTimerRef = useRef<number | null>(null);
  const menuLastSavedSigRef = useRef<string>('');
  const menuInitRef = useRef(false);
  const byRoleSig = JSON.stringify(form?.hidden_menu_items_by_role ?? {});

  useEffect(() => {
    if (!form) return;
    if (!menuInitRef.current) {
      menuInitRef.current = true;
      menuLastSavedSigRef.current = byRoleSig;
      return;
    }
    if (byRoleSig === menuLastSavedSigRef.current) return;
    if (menuTimerRef.current) window.clearTimeout(menuTimerRef.current);
    menuTimerRef.current = window.setTimeout(async () => {
      try {
        setMenuSaveStatus('saving');
        await update.mutateAsync({ hidden_menu_items_by_role: form.hidden_menu_items_by_role });
        menuLastSavedSigRef.current = byRoleSig;
        setMenuSavedAt(new Date());
        setMenuSaveStatus('saved');
      } catch (e: any) {
        setMenuSaveStatus('error');
        toast.error(e?.message || 'Falha ao salvar visibilidade do menu');
      }
    }, 1200);
    return () => {
      if (menuTimerRef.current) window.clearTimeout(menuTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byRoleSig]);


  if (isLoading || !form) {
    return <div className="p-6 text-muted-foreground">Carregando…</div>;
  }

  const set = <K extends keyof PwaSettings>(k: K, v: PwaSettings[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const handleIconUpload = async (file: File) => {
    // Validation: type
    const allowed = ['image/png', 'image/svg+xml', 'image/jpeg'];
    if (!allowed.includes(file.type)) {
      toast.error('Formato inválido. Use PNG, SVG ou JPEG.');
      return;
    }
    // Validation: size (max 1MB)
    if (file.size > 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 1MB.');
      return;
    }
    // Validation: dimensions (PNG/JPEG must be square and >=192px)
    if (file.type !== 'image/svg+xml') {
      try {
        const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
          img.onerror = () => reject(new Error('Imagem inválida'));
          img.src = URL.createObjectURL(file);
        });
        if (dims.w !== dims.h) {
          toast.error(`Ícone deve ser quadrado (atual: ${dims.w}×${dims.h}).`);
          return;
        }
        if (dims.w < 192) {
          toast.error(`Ícone muito pequeno (atual: ${dims.w}px). Mínimo: 192×192.`);
          return;
        }
      } catch {
        toast.error('Não foi possível validar a imagem.');
        return;
      }
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const stamp = Date.now();
      const path = `icon-${stamp}.${ext}`;
      const { error } = await pwaApi.client.storage.from('pwa-assets').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = pwaApi.client.storage.from('pwa-assets').getPublicUrl(path);
      set('icon_url', pub.publicUrl);

      // Generate multi-size PNG variants (skip for SVG — already scalable)
      const variants: Array<{ src: string; sizes: string; type: string; purpose: string }> = [];
      if (file.type !== 'image/svg+xml') {
        const sizes = [192, 256, 384, 512];
        const baseImg = await new Promise<HTMLImageElement>((res, rej) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = () => rej(new Error('img'));
          i.src = URL.createObjectURL(file);
        });
        for (const sz of sizes) {
          const canvas = document.createElement('canvas');
          canvas.width = sz; canvas.height = sz;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(baseImg, 0, 0, sz, sz);
          const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/png', 0.92));
          const variantPath = `icon-${stamp}-${sz}.png`;
          await pwaApi.client.storage.from('pwa-assets').upload(variantPath, blob, { upsert: true, contentType: 'image/png' });
          const u = pwaApi.client.storage.from('pwa-assets').getPublicUrl(variantPath).data.publicUrl;
          variants.push({ src: u, sizes: `${sz}x${sz}`, type: 'image/png', purpose: 'any' });
        }
        // Maskable: 512 with 10% safe-area padding
        const mCanvas = document.createElement('canvas');
        mCanvas.width = 512; mCanvas.height = 512;
        const mCtx = mCanvas.getContext('2d')!;
        mCtx.fillStyle = (form.background_color as string) || '#1B1E2C';
        mCtx.fillRect(0, 0, 512, 512);
        const inner = 512 * 0.8; const off = (512 - inner) / 2;
        mCtx.drawImage(baseImg, off, off, inner, inner);
        const mBlob: Blob = await new Promise((res) => mCanvas.toBlob((b) => res(b!), 'image/png', 0.92));
        const mPath = `icon-${stamp}-maskable-512.png`;
        await pwaApi.client.storage.from('pwa-assets').upload(mPath, mBlob, { upsert: true, contentType: 'image/png' });
        const mU = pwaApi.client.storage.from('pwa-assets').getPublicUrl(mPath).data.publicUrl;
        variants.push({ src: mU, sizes: '512x512', type: 'image/png', purpose: 'maskable' });
      }
      set('icons', variants as any);
      toast.success(variants.length ? `Ícone enviado + ${variants.length} variantes geradas` : 'Ícone enviado');
    } catch (e: any) {
      toast.error(e.message || 'Falha ao enviar ícone');
    } finally {
      setUploading(false);
    }
  };

  const addShortcut = () => {
    if ((form.shortcuts?.length ?? 0) >= 4) {
      toast.warning('Máximo de 4 atalhos');
      return;
    }
    set('shortcuts', [...(form.shortcuts ?? []), { name: 'Novo atalho', url: '/dashboard' }]);
  };
  const removeShortcut = (i: number) =>
    set('shortcuts', form.shortcuts.filter((_, idx) => idx !== i));
  const updateShortcut = (i: number, patch: Partial<PwaShortcut>) =>
    set('shortcuts', form.shortcuts.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const toggleHidden = (role: 'admin' | 'coordenador' | 'rh' | 'professor', url: string, hide: boolean) => {
    const byRole = { ...(form.hidden_menu_items_by_role ?? {}) };
    const cur = byRole[role] ?? [];
    byRole[role] = hide ? Array.from(new Set([...cur, url])) : cur.filter((u) => u !== url);
    set('hidden_menu_items_by_role', byRole);
  };

  const save = async () => {
    try {
      await update.mutateAsync(form);
      toast.success('Configurações do PWA salvas');
    } catch (e: any) {
      toast.error(e.message || 'Falha ao salvar');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Administração', href: '/administracao' }, { label: 'PWA' }]}
        title="App Mobile (PWA)"
        description="Configure como o app aparece quando instalado no celular dos usuários."
        icon={Smartphone}
        variant="hero"
        actions={
          <Button onClick={save} disabled={update.isPending}>
            <Save className="w-4 h-4 mr-2" /> Salvar
          </Button>
        }
      />

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Mudanças não afetam dispositivos já instalados</AlertTitle>
        <AlertDescription>
          Após o usuário adicionar o app à tela inicial, o iOS/Android congela <strong>nome,
          ícone, cores, modo de exibição e rota inicial</strong> no aparelho. Suas alterações aqui
          só aparecem em <strong>novas instalações</strong>. Para forçar todos os dispositivos a
          reinstalar como um novo app, use o botão <strong>Forçar reinstalação</strong> abaixo.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Identidade */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Identidade do App</CardTitle>
            <CardDescription>Como o app é exibido após instalado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div>
                <Label>Nome curto (ícone)</Label>
                <Input value={form.short_name} onChange={(e) => set('short_name', e.target.value)} maxLength={12} />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cor de tema</Label>
                <div className="flex gap-2">
                  <Input type="color" value={form.theme_color} onChange={(e) => set('theme_color', e.target.value)} className="w-16 p-1 h-10" />
                  <Input value={form.theme_color} onChange={(e) => set('theme_color', e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Cor de fundo (splash)</Label>
                <div className="flex gap-2">
                  <Input type="color" value={form.background_color} onChange={(e) => set('background_color', e.target.value)} className="w-16 p-1 h-10" />
                  <Input value={form.background_color} onChange={(e) => set('background_color', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Modo de exibição</Label>
                <Select value={form.display} onValueChange={(v) => set('display', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standalone">Standalone (recomendado)</SelectItem>
                    <SelectItem value="fullscreen">Tela cheia</SelectItem>
                    <SelectItem value="minimal-ui">Minimal UI</SelectItem>
                    <SelectItem value="browser">Navegador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Orientação</Label>
                <Select value={form.orientation} onValueChange={(v) => set('orientation', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Qualquer</SelectItem>
                    <SelectItem value="portrait">Retrato</SelectItem>
                    <SelectItem value="landscape">Paisagem</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Rota inicial padrão</Label>
              <Select value={form.start_url_default} onValueChange={(v) => set('start_url_default', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROUTES.map((r) => (
                    <SelectItem key={r.url} value={r.url}>{r.label} ({r.url})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Ícone + preview */}
        <Card>
          <CardHeader>
            <CardTitle>Ícone do App</CardTitle>
            <CardDescription>PNG quadrado, mínimo 512×512.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="w-32 h-32 mx-auto rounded-2xl flex items-center justify-center overflow-hidden border-2"
              style={{ backgroundColor: form.background_color }}
            >
              {form.icon_url ? (
                <img
                  src={form.icon_url}
                  alt="ícone"
                  className="w-full h-full object-contain"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    setIconDims({ w: img.naturalWidth, h: img.naturalHeight });
                  }}
                  onError={() => setIconDims(null)}
                />
              ) : (
                <Smartphone className="w-12 h-12 opacity-40" />
              )}
            </div>
            {form.icon_url && iconDims && (
              <div className="text-center text-xs">
                <span className={
                  iconDims.w === iconDims.h && iconDims.w >= 512
                    ? 'text-emerald-600 font-medium'
                    : 'text-amber-600 font-medium'
                }>
                  Tamanho real: {iconDims.w}×{iconDims.h}px
                </span>
                {iconDims.w !== iconDims.h && (
                  <div className="text-muted-foreground mt-0.5">⚠ Não é quadrado</div>
                )}
                {iconDims.w === iconDims.h && iconDims.w < 512 && (
                  <div className="text-muted-foreground mt-0.5">⚠ Menor que 512×512</div>
                )}
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/svg+xml,image/jpeg"
              hidden
              onChange={(e) => e.target.files?.[0] && handleIconUpload(e.target.files[0])}
            />
            <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload className="w-4 h-4 mr-2" /> {uploading ? 'Enviando…' : 'Enviar ícone'}
            </Button>
            <Separator />
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between"><span>Nome:</span><span className="font-medium text-foreground">{form.short_name}</span></div>
              <div className="flex justify-between"><span>Modo:</span><span className="font-medium text-foreground">{form.display}</span></div>
              <div className="flex justify-between"><span>Inicia em:</span><span className="font-medium text-foreground">{form.start_url_default}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Atalhos */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Atalhos do app</CardTitle>
              <CardDescription>Aparecem ao segurar o ícone no Android (até 4).</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={addShortcut}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {(form.shortcuts ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum atalho configurado.</p>
            )}
            {(form.shortcuts ?? []).map((sc, i) => (
              <div key={i} className="flex gap-2 items-center p-3 border rounded-lg">
                <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Input
                  className="flex-1"
                  value={sc.name}
                  onChange={(e) => updateShortcut(i, { name: e.target.value })}
                  placeholder="Nome"
                />
                <Select value={sc.url} onValueChange={(v) => updateShortcut(i, { url: v })}>
                  <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROUTES.map((r) => <SelectItem key={r.url} value={r.url}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="ghost" onClick={() => removeShortcut(i)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Screenshots */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Screenshots da loja (até 4)</CardTitle>
            <CardDescription>
              Aparecem na prévia rica de instalação no Chrome Android. Recomendado: prints reais do app, max 1MB cada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {(form.screenshots ?? []).map((sc, i) => (
                <div key={i} className="relative rounded-lg border bg-muted/40 p-2 space-y-2">
                  <img src={sc.src} alt={sc.label || `Screenshot ${i + 1}`} className="w-full h-32 object-contain rounded" />
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <Badge variant={sc.form_factor === 'wide' ? 'default' : 'secondary'} className="text-[10px]">
                      {sc.form_factor === 'wide' ? 'Desktop' : 'Mobile'}
                    </Badge>
                    <button
                      type="button"
                      className="text-destructive hover:underline text-[11px]"
                      onClick={() => set('screenshots', (form.screenshots ?? []).filter((_, idx) => idx !== i) as any)}
                    >
                      Remover
                    </button>
                  </div>
                  <button
                    type="button"
                    className="w-full text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      const next = [...(form.screenshots ?? [])];
                      next[i] = { ...next[i], form_factor: next[i].form_factor === 'wide' ? 'narrow' : 'wide' };
                      set('screenshots', next as any);
                    }}
                  >
                    Alternar form_factor
                  </button>
                </div>
              ))}
              {(form.screenshots?.length ?? 0) < 4 && (
                <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-xs text-muted-foreground hover:border-primary hover:text-primary transition">
                  <span>+ Adicionar</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 1024 * 1024) {
                        toast.error('Imagem muito grande (max 1MB).');
                        return;
                      }
                      try {
                        const dims = await new Promise<{ w: number; h: number }>((res, rej) => {
                          const img = new Image();
                          img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
                          img.onerror = () => rej(new Error('img'));
                          img.src = URL.createObjectURL(file);
                        });
                        const ext = file.name.split('.').pop() || 'png';
                        const path = `screenshot-${Date.now()}.${ext}`;
                        const { error: upErr } = await pwaApi.client.storage.from('pwa-assets').upload(path, file, { upsert: true });
                        if (upErr) throw upErr;
                        const url = pwaApi.client.storage.from('pwa-assets').getPublicUrl(path).data.publicUrl;
                        const form_factor: 'narrow' | 'wide' = dims.w > dims.h ? 'wide' : 'narrow';
                        const next = [...(form.screenshots ?? []), {
                          src: url,
                          sizes: `${dims.w}x${dims.h}`,
                          type: file.type,
                          form_factor,
                          label: `Tela ${(form.screenshots?.length ?? 0) + 1}`,
                        }];
                        set('screenshots', next as any);
                        toast.success('Screenshot adicionado');
                      } catch (err: any) {
                        toast.error(err.message || 'Falha no upload');
                      } finally {
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Visibilidade no PWA — por perfil de usuário, com autosalvar */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle>Menus visíveis no app instalado</CardTitle>
                <CardDescription>
                  Configure por perfil de usuário. Desligue itens para escondê-los no menu quando o sistema for aberto como app instalado (não afeta o navegador). As alterações são salvas automaticamente.
                </CardDescription>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 min-h-[20px]">
                {menuSaveStatus === 'saving' && (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando…</>)}
                {menuSaveStatus === 'saved' && menuSavedAt && (<><Check className="w-3.5 h-3.5 text-green-600" /> Salvo às {menuSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</>)}
                {menuSaveStatus === 'error' && (<span className="text-destructive">Erro ao salvar</span>)}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="admin">
              <TabsList className="mb-4">
                <TabsTrigger value="admin">Admin</TabsTrigger>
                <TabsTrigger value="coordenador">Coordenador</TabsTrigger>
                <TabsTrigger value="rh">R.H.</TabsTrigger>
                <TabsTrigger value="professor">Professor</TabsTrigger>
              </TabsList>
              {(['admin', 'coordenador', 'rh', 'professor'] as const).map((role) => {
                const list = form.hidden_menu_items_by_role?.[role] ?? [];
                return (
                  <TabsContent key={role} value={role} className="mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {ROUTES.map((r) => {
                        const hidden = list.includes(r.url);
                        return (
                          <div key={r.url} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium text-sm">{r.label}</div>
                              <div className="text-xs text-muted-foreground">{r.url}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {hidden && <Badge variant="secondary">Oculto</Badge>}
                              <Switch checked={!hidden} onCheckedChange={(v) => toggleHidden(role, r.url, !v)} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>


        {/* Preview do manifest */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Preview do manifest.json</CardTitle>
            <CardDescription>
              Visualize o JSON que será servido em <code>/manifest.webmanifest</code> com as
              configurações atuais do formulário (antes de salvar).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted/50 border rounded-lg p-4 text-xs overflow-auto max-h-96 font-mono">
{JSON.stringify(
  {
    id: form.manifest_id ?? 'neovale-app-v1',
    name: form.name,
    short_name: form.short_name,
    description: form.description,
    start_url: form.start_url_default,
    scope: '/',
    display: form.display,
    orientation: form.orientation,
    theme_color: form.theme_color,
    background_color: form.background_color,
    lang: 'pt-BR',
    dir: 'ltr',
    icons: [
      { src: form.icon_url || '/nexa-logo.svg', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: form.icon_url || '/nexa-logo.svg', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
    shortcuts: (form.shortcuts ?? []).slice(0, 4).map((sc) => ({
      name: sc.name,
      short_name: sc.short_name ?? sc.name,
      url: sc.url,
    })),
  },
  null,
  2,
)}
            </pre>
          </CardContent>
        </Card>

        {/* Zona de risco */}
        <Card className="lg:col-span-3 border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Zona de risco
            </CardTitle>
            <CardDescription>
              Forçar reinstalação muda a identidade do app no manifest. Dispositivos já instalados
              continuarão funcionando, mas o sistema vai oferecer instalar como um <strong>novo
              app</strong> (o usuário precisará remover o antigo manualmente).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-sm">
              <div className="text-muted-foreground">Identidade atual do manifest</div>
              <code className="font-mono text-foreground">{form.manifest_id ?? 'neovale-app-v1'}</code>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <RefreshCw className="w-4 h-4 mr-2" /> Forçar reinstalação
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Forçar reinstalação em todos os dispositivos?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso muda o ID do manifest. Os usuários verão o app atual continuar funcionando,
                    mas qualquer alteração de nome, ícone ou cores só aparecerá depois que eles
                    <strong> instalarem como novo app</strong> e removerem o antigo. Essa ação não
                    pode ser desfeita automaticamente. Tem certeza?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      const next = `neovale-app-${Date.now()}`;
                      try {
                        await update.mutateAsync({ ...form, manifest_id: next });
                        set('manifest_id', next);
                        toast.success('Identidade atualizada. Novas instalações serão tratadas como app novo.');
                      } catch (e: any) {
                        toast.error(e.message || 'Falha ao atualizar identidade');
                      }
                    }}
                  >
                    Sim, forçar reinstalação
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
