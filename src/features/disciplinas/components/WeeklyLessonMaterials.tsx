import { useState, useEffect } from 'react';
import { disciplinasApi } from '../api';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, GripVertical, FileText, Image, Type, Music, Video, Loader2, Pencil, Upload, BookOpen, Eye, Download } from 'lucide-react';
import { toast } from 'sonner';

interface WeeklyLessonMaterialsProps {
  subjectId: string;
  bimesterNumber: number;
  weekNumber: number;
  readOnly?: boolean;
}

interface LessonMaterial {
  id: string;
  title: string;
  description: string | null;
  material_type: string;
  file_url: string | null;
  text_content: string | null;
  display_order: number;
}

interface FormData {
  title: string;
  description: string;
  material_type: string;
  text_content: string;
  file: File | null;
}

const emptyForm: FormData = { title: '', description: '', material_type: 'text', text_content: '', file: null };

const TYPE_CONFIG: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  pdf: { label: 'PDF', icon: FileText, color: 'text-red-500 bg-red-500/10' },
  image: { label: 'Imagem', icon: Image, color: 'text-blue-500 bg-blue-500/10' },
  text: { label: 'Texto', icon: Type, color: 'text-primary bg-primary/10' },
  audio: { label: 'Áudio', icon: Music, color: 'text-green-500 bg-green-500/10' },
  video: { label: 'Vídeo', icon: Video, color: 'text-orange-500 bg-orange-500/10' },
};

const ACCEPT_MAP: Record<string, string> = { pdf: '.pdf', image: 'image/*', audio: 'audio/*', video: 'video/*' };

export default function WeeklyLessonMaterials({ subjectId, bimesterNumber, weekNumber, readOnly = false }: WeeklyLessonMaterialsProps) {
  const { organization } = useOrganization();
  const [materials, setMaterials] = useState<LessonMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<LessonMaterial | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [previewMaterial, setPreviewMaterial] = useState<LessonMaterial | null>(null);

  useEffect(() => {
    if (organization?.id) loadMaterials();
  }, [organization?.id, subjectId, bimesterNumber, weekNumber]);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const { materials } = await disciplinasApi.getLessonMaterials(subjectId, bimesterNumber, weekNumber);
      setMaterials(materials as LessonMaterial[]);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const openDialog = (item?: LessonMaterial) => {
    if (item) {
      setSelected(item);
      setFormData({ title: item.title, description: item.description || '', material_type: item.material_type, text_content: item.text_content || '', file: null });
    } else {
      setSelected(null);
      setFormData(emptyForm);
    }
    setDialogOpen(true);
  };

  const uploadFile = async (file: File): Promise<string> => {
    return await disciplinasApi.uploadMaterialFile(subjectId, file);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !organization?.id) return;
    setSaving(true);
    try {
      let fileUrl = selected?.file_url || null;
      if (formData.file) fileUrl = await uploadFile(formData.file);

      const payload = {
        organization_id: organization.id,
        subject_id: subjectId,
        bimester_number: bimesterNumber,
        week_number: weekNumber,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        material_type: formData.material_type,
        file_url: formData.material_type !== 'text' ? fileUrl : null,
        text_content: formData.text_content.trim() || null,
        display_order: selected ? selected.display_order : materials.length,
      };

      await disciplinasApi.saveLessonMaterial(payload, selected?.id);
      setDialogOpen(false);
      toast.success(selected ? 'Material atualizado!' : 'Material adicionado!');
      loadMaterials();
    } catch (err: any) {
      toast.error('Erro: ' + (err.message || 'Tente novamente'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await disciplinasApi.deleteLessonMaterial(selected.id);
      toast.success('Material removido');
      setDeleteDialogOpen(false);
      loadMaterials();
    } catch {
      toast.error('Erro ao remover');
    }
  };

  const handleDragStart = (idx: number) => setDraggedIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDragEnd = async () => {
    if (draggedIdx === null || dragOverIdx === null || draggedIdx === dragOverIdx) {
      setDraggedIdx(null); setDragOverIdx(null); return;
    }
    const newMats = [...materials];
    const [moved] = newMats.splice(draggedIdx, 1);
    newMats.splice(dragOverIdx, 0, moved);
    setMaterials(newMats);
    setDraggedIdx(null); setDragOverIdx(null);
    try {
      await disciplinasApi.reorderMaterials(newMats);
    } catch {
      toast.error('Erro ao reordenar');
      loadMaterials();
    }
  };

  const needsFile = formData.material_type !== 'text';

  if (loading) {
    return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-blue-500/10 flex items-center justify-center">
            <BookOpen className="h-3.5 w-3.5 text-blue-600" />
          </div>
          Aulas Planejadas
          {materials.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 rounded-full">{materials.length}</Badge>
          )}
        </h4>
        {!readOnly && (
          <Button size="sm" variant="outline" onClick={() => openDialog()} className="rounded-lg text-xs h-8">
            <Plus className="h-3.5 w-3.5 mr-1" /> Novo Material
          </Button>
        )}
      </div>

      {materials.length === 0 ? (
        <div className="border-2 border-dashed border-muted-foreground/15 rounded-xl p-8 text-center">
          <div className="h-10 w-10 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">Nenhum material cadastrado para esta semana.</p>
          {!readOnly && (
            <Button size="sm" variant="ghost" className="mt-3 text-xs text-primary" onClick={() => openDialog()}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar primeiro material
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {materials.map((m, idx) => {
            const config = TYPE_CONFIG[m.material_type] || TYPE_CONFIG.text;
            const Icon = config.icon;
            return (
              <Card
                key={m.id}
                draggable={!readOnly}
                onDragStart={!readOnly ? () => handleDragStart(idx) : undefined}
                onDragOver={!readOnly ? (e) => handleDragOver(e, idx) : undefined}
                onDragEnd={!readOnly ? handleDragEnd : undefined}
                className={`transition-all ${!readOnly ? 'cursor-grab active:cursor-grabbing' : ''} rounded-lg ${
                  draggedIdx === idx ? 'opacity-50 scale-[0.98]' : ''
                } ${dragOverIdx === idx ? 'border-primary shadow-sm' : 'hover:border-primary/20'}`}
              >
                <CardContent className="flex items-center gap-3 p-3">
                  {!readOnly && <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0" />}
                  <div className={`rounded-lg p-2 shrink-0 ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{m.title}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0 rounded-md">{config.label}</Badge>
                    </div>
                    {m.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{m.description}</p>}
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    {(m.file_url || m.text_content) && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" title="Visualizar" onClick={() => setPreviewMaterial(m)}>
                        <Eye className="h-3.5 w-3.5 text-blue-600" />
                      </Button>
                    )}
                    {m.file_url && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" title="Abrir/Baixar em nova aba" onClick={() => {
                        window.open(m.file_url!, '_blank', 'noopener,noreferrer');
                      }}>
                        <Download className="h-3.5 w-3.5 text-green-600" />
                      </Button>
                    )}
                    {!readOnly && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => openDialog(m)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => { setSelected(m); setDeleteDialogOpen(true); }}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected ? 'Editar Material' : 'Novo Material'}</DialogTitle>
            <DialogDescription>Cadastre materiais para organizar o conteúdo desta semana.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={formData.material_type} onValueChange={(v) => setFormData({ ...formData, material_type: v, file: null })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return <SelectItem key={key} value={key}><span className="flex items-center gap-2"><Icon className="h-4 w-4" />{cfg.label}</span></SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Ex: Introdução ao tema" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Breve descrição" />
            </div>
            {needsFile && (
              <div className="space-y-2">
                <Label>Arquivo ({TYPE_CONFIG[formData.material_type]?.label}) *</Label>
                <div className="border-2 border-dashed border-primary/20 rounded-xl p-6 text-center hover:border-primary/40 transition-colors">
                  <input type="file" accept={ACCEPT_MAP[formData.material_type]} onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })} className="hidden" id={`file-upload-${bimesterNumber}-${weekNumber}`} />
                  <label htmlFor={`file-upload-${bimesterNumber}-${weekNumber}`} className="cursor-pointer">
                    <Upload className="h-8 w-8 text-primary/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">{formData.file ? formData.file.name : 'Clique para enviar'}</p>
                  </label>
                </div>
                {selected?.file_url && !formData.file && <p className="text-xs text-muted-foreground">Arquivo atual mantido.</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label>Conteúdo em Texto {formData.material_type === 'text' ? '*' : '(opcional)'}</Label>
              <Textarea value={formData.text_content} onChange={(e) => setFormData({ ...formData, text_content: e.target.value })} placeholder="Digite o conteúdo..." rows={4} />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview */}
      <Dialog open={!!previewMaterial} onOpenChange={(open) => !open && setPreviewMaterial(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewMaterial && (() => {
                const cfg = TYPE_CONFIG[previewMaterial.material_type] || TYPE_CONFIG.text;
                const Ic = cfg.icon;
                return <><Ic className="h-5 w-5" /> {previewMaterial.title}</>;
              })()}
            </DialogTitle>
            <DialogDescription>{previewMaterial?.description || 'Visualização do material'}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {previewMaterial?.file_url && previewMaterial.material_type === 'pdf' && (
              <div className="space-y-2">
                <iframe
                  src={`${previewMaterial.file_url}#view=FitH&toolbar=1`}
                  title={previewMaterial.title}
                  className="w-full h-[60vh] rounded-lg border bg-white"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Se o PDF não carregar acima,{' '}
                  <button className="text-primary underline" onClick={() => window.open(previewMaterial.file_url!, '_blank', 'noopener,noreferrer')}>
                    abra em nova aba
                  </button>
                  .
                </p>
              </div>
            )}
            {previewMaterial?.file_url && previewMaterial.material_type === 'image' && (
              <img src={previewMaterial.file_url} alt={previewMaterial.title} className="max-w-full max-h-[60vh] rounded-lg mx-auto object-contain" />
            )}
            {previewMaterial?.file_url && previewMaterial.material_type === 'audio' && (
              <audio controls className="w-full" src={previewMaterial.file_url} />
            )}
            {previewMaterial?.file_url && previewMaterial.material_type === 'video' && (
              <video controls className="w-full max-h-[60vh] rounded-lg" src={previewMaterial.file_url} />
            )}
            {previewMaterial?.text_content && (
              <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm">{previewMaterial.text_content}</div>
            )}
            {previewMaterial?.file_url && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => window.open(previewMaterial.file_url!, '_blank', 'noopener,noreferrer')}>
                  <Eye className="h-4 w-4 mr-2" /> Abrir em nova aba
                </Button>
                <Button onClick={() => window.open(previewMaterial.file_url!, '_blank', 'noopener,noreferrer')}>
                  <Download className="h-4 w-4 mr-2" /> Baixar Arquivo
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Remover "{selected?.title}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
