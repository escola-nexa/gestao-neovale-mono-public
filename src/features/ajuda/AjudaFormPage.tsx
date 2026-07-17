import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HelpCircle, Loader2, Upload, X, ArrowLeft, Save, Trash2, Youtube, FileText, Image as ImageIcon, Link as LinkIcon, Video, Star } from 'lucide-react';
import { ajudaApi } from '@/features/ajuda/api';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { CoverPicker } from '@/features/biblioteca/components/CoverPicker';
import { HELP_CATEGORIES, AUDIENCE_OPTIONS } from './constants';
import { useHelpTutorial, useHelpTutorials, useDeleteHelpTutorial } from './hooks/useHelpTutorials';
import type { HelpAudience, HelpCategory, HelpContentType } from './types';

const sb = supabase as any;

interface FormState {
  title: string;
  description: string;
  category: HelpCategory;
  feature_name: string;
  content_type: HelpContentType;
  content_url: string;
  storage_path: string | null;
  file_mime: string | null;
  file_size: number | null;
  duration_seconds: number | null;
  cover_color: string;
  cover_icon: string;
  audience: HelpAudience;
  is_featured: boolean;
}

const initial: FormState = {
  title: '', description: '', category: 'inicio', feature_name: 'Geral',
  content_type: 'video_link', content_url: '', storage_path: null,
  file_mime: null, file_size: null, duration_seconds: null,
  cover_color: 'blue', cover_icon: 'PlayCircle',
  audience: 'admin_coord_prof', is_featured: false,
};

const ACCEPT: Record<HelpContentType, string> = {
  video_upload: 'video/*',
  video_link: '',
  pdf: 'application/pdf',
  image: 'image/*',
  link: '',
};

const MAX_SIZE: Record<HelpContentType, number> = {
  video_upload: 300 * 1024 * 1024,
  video_link: 0,
  pdf: 50 * 1024 * 1024,
  image: 10 * 1024 * 1024,
  link: 0,
};

export default function AjudaFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { organizationId, userRole } = useOrganization();
  const { toast } = useToast();
  const { data: existing } = useHelpTutorial(id);
  const { data: allTutorials = [] } = useHelpTutorials();
  const deleteMut = useDeleteHelpTutorial();

  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Autocomplete suggestions
  const featureSuggestions = useMemo(() => {
    const set = new Set<string>();
    allTutorials.forEach((t) => {
      if (t.category === form.category) set.add(t.feature_name);
    });
    return Array.from(set).filter((f) => f.toLowerCase().includes(form.feature_name.toLowerCase()) && f !== form.feature_name);
  }, [allTutorials, form.category, form.feature_name]);

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title,
        description: existing.description ?? '',
        category: existing.category,
        feature_name: existing.feature_name ?? 'Geral',
        content_type: existing.content_type,
        content_url: existing.content_url ?? '',
        storage_path: existing.storage_path,
        file_mime: existing.file_mime,
        file_size: existing.file_size,
        duration_seconds: existing.duration_seconds,
        cover_color: existing.cover_color,
        cover_icon: existing.cover_icon,
        audience: existing.audience,
        is_featured: existing.is_featured,
      });
    }
  }, [existing]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));

  const handleFile = async (file: File) => {
    if (!organizationId) return;
    if (file.size > MAX_SIZE[form.content_type]) {
      toast({ title: 'Arquivo muito grande', description: `Máximo: ${(MAX_SIZE[form.content_type] / 1024 / 1024).toFixed(0)}MB`, variant: 'destructive' });
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const ext = file.name.split('.').pop();
      const path = `${organizationId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await sb.storage.from('help-content').upload(path, file, { upsert: false });
      if (error) throw error;
      // Delete old file if replacing
      if (form.storage_path) {
        await sb.storage.from('help-content').remove([form.storage_path]);
      }
      update('storage_path', path);
      update('file_mime', file.type);
      update('file_size', file.size);

      // Try to detect video duration
      if (form.content_type === 'video_upload') {
        try {
          const url = URL.createObjectURL(file);
          const v = document.createElement('video');
          v.preload = 'metadata';
          v.src = url;
          await new Promise((res) => { v.onloadedmetadata = res; });
          update('duration_seconds', Math.round(v.duration));
          URL.revokeObjectURL(url);
        } catch {}
      }
      toast({ title: 'Arquivo enviado!' });
    } catch (e: any) {
      toast({ title: 'Erro ao enviar', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      setProgress(100);
    }
  };

  const handleSubmit = async () => {
    if (!organizationId) return;
    if (!form.title.trim()) {
      toast({ title: 'Título obrigatório', variant: 'destructive' });
      return;
    }
    if (form.content_type === 'video_link' || form.content_type === 'link') {
      if (!form.content_url.trim()) {
        toast({ title: 'URL obrigatória', variant: 'destructive' });
        return;
      }
    } else if (!form.storage_path && !isEdit) {
      toast({ title: 'Faça upload do arquivo', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await ajudaApi.client.auth.getUser();
      const payload = {
        organization_id: organizationId,
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        feature_name: form.feature_name.trim() || 'Geral',
        content_type: form.content_type,
        content_url: form.content_url || null,
        storage_path: form.storage_path,
        file_mime: form.file_mime,
        file_size: form.file_size,
        duration_seconds: form.duration_seconds,
        cover_color: form.cover_color,
        cover_icon: form.cover_icon,
        audience: form.audience,
        is_featured: userRole === 'admin' ? form.is_featured : false,
        created_by: user?.id,
      };
      if (isEdit) {
        const { error } = await sb.from('help_tutorials').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await sb.from('help_tutorials').insert(payload);
        if (error) throw error;
      }
      toast({ title: isEdit ? 'Tutorial atualizado!' : 'Tutorial criado!' });
      navigate('/ajuda/gerenciar');
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Excluir este tutorial?')) return;
    await deleteMut.mutateAsync(id);
    toast({ title: 'Tutorial excluído' });
    navigate('/ajuda/gerenciar');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Central de Ajuda', href: '/ajuda' }, { label: isEdit ? 'Editar tutorial' : 'Novo tutorial' }]}
        title={isEdit ? 'Editar tutorial' : 'Novo tutorial'}
        description="Cadastre uma aula tutorial para a Central de Ajuda."
        icon={HelpCircle}
        backTo="/ajuda/gerenciar"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6 space-y-5">
            <div>
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Ex.: Como cadastrar uma turma" />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={3} placeholder="Resumo do que o usuário vai aprender..." />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Categoria *</Label>
                <Select value={form.category} onValueChange={(v) => update('category', v as HelpCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HELP_CATEGORIES.map((c) => (
                      <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative">
                <Label>Funcionalidade *</Label>
                <Input
                  value={form.feature_name}
                  onChange={(e) => update('feature_name', e.target.value)}
                  placeholder="Ex.: Lançamento de notas"
                  list="feature-suggestions"
                />
                {featureSuggestions.length > 0 && (
                  <datalist id="feature-suggestions">
                    {featureSuggestions.map((s) => <option key={s} value={s} />)}
                  </datalist>
                )}
                <p className="text-[11px] text-muted-foreground mt-1">Agrupa tutoriais dentro da categoria.</p>
              </div>
            </div>

            {/* Tipo de conteúdo */}
            <div>
              <Label>Tipo de conteúdo</Label>
              <Tabs value={form.content_type} onValueChange={(v) => update('content_type', v as HelpContentType)} className="mt-1">
                <TabsList className="grid grid-cols-5 w-full">
                  <TabsTrigger value="video_upload"><Video className="h-3.5 w-3.5 mr-1" /> Vídeo</TabsTrigger>
                  <TabsTrigger value="video_link"><Youtube className="h-3.5 w-3.5 mr-1" /> YT/Vimeo</TabsTrigger>
                  <TabsTrigger value="pdf"><FileText className="h-3.5 w-3.5 mr-1" /> PDF</TabsTrigger>
                  <TabsTrigger value="image"><ImageIcon className="h-3.5 w-3.5 mr-1" /> Imagem</TabsTrigger>
                  <TabsTrigger value="link"><LinkIcon className="h-3.5 w-3.5 mr-1" /> Link</TabsTrigger>
                </TabsList>

                <TabsContent value="video_link" className="pt-4">
                  <Label>URL do vídeo (YouTube ou Vimeo) *</Label>
                  <Input value={form.content_url} onChange={(e) => update('content_url', e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                </TabsContent>

                <TabsContent value="link" className="pt-4">
                  <Label>URL *</Label>
                  <Input value={form.content_url} onChange={(e) => update('content_url', e.target.value)} placeholder="https://..." />
                </TabsContent>

                <TabsContent value="video_upload" className="pt-4 space-y-2">
                  <UploadArea
                    accept={ACCEPT.video_upload}
                    storagePath={form.storage_path}
                    onPickFile={() => fileRef.current?.click()}
                    onClear={() => update('storage_path', null)}
                    uploading={uploading}
                    fileSize={form.file_size}
                  />
                </TabsContent>
                <TabsContent value="pdf" className="pt-4">
                  <UploadArea
                    accept={ACCEPT.pdf}
                    storagePath={form.storage_path}
                    onPickFile={() => fileRef.current?.click()}
                    onClear={() => update('storage_path', null)}
                    uploading={uploading}
                    fileSize={form.file_size}
                  />
                </TabsContent>
                <TabsContent value="image" className="pt-4">
                  <UploadArea
                    accept={ACCEPT.image}
                    storagePath={form.storage_path}
                    onPickFile={() => fileRef.current?.click()}
                    onClear={() => update('storage_path', null)}
                    uploading={uploading}
                    fileSize={form.file_size}
                  />
                </TabsContent>
              </Tabs>

              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT[form.content_type]}
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>

            {/* Duração (vídeos) */}
            {(form.content_type === 'video_upload' || form.content_type === 'video_link') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Duração (segundos)</Label>
                  <Input
                    type="number"
                    value={form.duration_seconds ?? ''}
                    onChange={(e) => update('duration_seconds', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Ex.: 320"
                  />
                </div>
              </div>
            )}

            {/* Audience */}
            <div>
              <Label>Quem pode visualizar? *</Label>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {AUDIENCE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => update('audience', o.value)}
                    className={`text-left rounded-lg border p-3 transition-colors ${
                      form.audience === o.value
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-input hover:bg-muted/50'
                    }`}
                  >
                    <div className="font-medium text-sm">{o.label}</div>
                    <div className="text-xs text-muted-foreground">{o.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {userRole === 'admin' && (
              <div className="flex items-center justify-between rounded-lg border border-amber-400/40 bg-amber-50/40 dark:bg-amber-500/5 p-3">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  <div>
                    <Label className="cursor-pointer">Destacar no hero da Central de Ajuda</Label>
                    <p className="text-[11px] text-muted-foreground">Aparecerá no banner principal.</p>
                  </div>
                </div>
                <Switch checked={form.is_featured} onCheckedChange={(v) => update('is_featured', v)} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cover picker */}
        <Card className="h-fit lg:sticky lg:top-20">
          <CardContent className="pt-6">
            <Label className="mb-3 block">Capa do tutorial</Label>
            <CoverPicker
              color={form.cover_color}
              icon={form.cover_icon}
              onColorChange={(c) => update('cover_color', c)}
              onIconChange={(i) => update('cover_icon', i)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Action bar */}
      <div className="sticky bottom-0 -mx-4 lg:-mx-8 bg-background border-t px-4 lg:px-8 py-3 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Cancelar
        </Button>
        <div className="flex items-center gap-2">
          {isEdit && (
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              <Trash2 className="h-4 w-4 mr-1.5" /> Excluir
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={saving || uploading} className="bg-[#FFDA45] hover:bg-[#FFDA45]/90 text-[#1B1E2C]">
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            {isEdit ? 'Salvar alterações' : 'Criar tutorial'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function UploadArea({
  accept, storagePath, onPickFile, onClear, uploading, fileSize,
}: { accept: string; storagePath: string | null; onPickFile: () => void; onClear: () => void; uploading: boolean; fileSize: number | null }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-input p-6 text-center space-y-3">
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Enviando...</p>
        </div>
      ) : storagePath ? (
        <div className="space-y-2">
          <FileText className="h-8 w-8 text-primary mx-auto" />
          <p className="text-sm font-medium">Arquivo enviado</p>
          {fileSize && <p className="text-xs text-muted-foreground">{(fileSize / 1024 / 1024).toFixed(1)} MB</p>}
          <div className="flex gap-2 justify-center">
            <Button size="sm" variant="outline" onClick={onPickFile}>Substituir</Button>
            <Button size="sm" variant="ghost" onClick={onClear}><X className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Arraste ou clique para enviar</p>
          <Button size="sm" type="button" onClick={onPickFile}>Selecionar arquivo</Button>
        </div>
      )}
    </div>
  );
}
