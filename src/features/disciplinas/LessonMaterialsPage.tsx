import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { disciplinasApi } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Trash2, GripVertical, FileText, Image, Type, Music, Video, Loader2, Pencil, Upload } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

interface LessonMaterial {
  id: string;
  organization_id: string;
  subject_id: string;
  title: string;
  description: string | null;
  material_type: 'pdf' | 'image' | 'text' | 'audio' | 'video';
  file_url: string | null;
  text_content: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface MaterialFormData {
  title: string;
  description: string;
  material_type: 'pdf' | 'image' | 'text' | 'audio' | 'video';
  text_content: string;
  file: File | null;
}

const emptyForm: MaterialFormData = {
  title: '',
  description: '',
  material_type: 'text',
  text_content: '',
  file: null,
};

const MATERIAL_TYPE_CONFIG = {
  pdf: { label: 'PDF', icon: FileText, color: 'text-red-500 bg-red-500/10' },
  image: { label: 'Imagem', icon: Image, color: 'text-blue-500 bg-blue-500/10' },
  text: { label: 'Texto', icon: Type, color: 'text-primary bg-primary/10' },
  audio: { label: 'Áudio', icon: Music, color: 'text-green-500 bg-green-500/10' },
  video: { label: 'Vídeo', icon: Video, color: 'text-orange-500 bg-orange-500/10' },
};

export default function LessonMaterialsPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { organization } = useOrganization();

  const [materials, setMaterials] = useState<LessonMaterial[]>([]);
  const [subjectName, setSubjectName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<LessonMaterial | null>(null);
  const [formData, setFormData] = useState<MaterialFormData>(emptyForm);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  useEffect(() => {
    if (subjectId) loadData();
  }, [subjectId]);

  const loadData = async () => {
    try {
      const { subject, materials: mats } = await disciplinasApi.getLessonMaterials(subjectId!);
      if (subject) {
        setSubjectName(subject.nome);
        setCourseName((subject as any).courses?.nome || '');
      }
      setMaterials((mats || []) as LessonMaterial[]);
    } catch {
      toast({ title: 'Erro', description: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item?: LessonMaterial) => {
    if (item) {
      setSelected(item);
      setFormData({
        title: item.title,
        description: item.description || '',
        material_type: item.material_type,
        text_content: item.text_content || '',
        file: null,
      });
    } else {
      setSelected(null);
      setFormData(emptyForm);
    }
    setDialogOpen(true);
  };

  const uploadFile = async (file: File): Promise<string> => {
    return await disciplinasApi.uploadMaterialFile(subjectId!, file);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({ title: 'Erro', description: 'Título é obrigatório', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (!organization?.id) throw new Error('Organização não encontrada');

      let fileUrl = selected?.file_url || null;

      if (formData.file) {
        fileUrl = await uploadFile(formData.file);
      }

      const payload = {
        organization_id: organization.id,
        subject_id: subjectId!,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        material_type: formData.material_type,
        file_url: formData.material_type !== 'text' ? fileUrl : null,
        text_content: formData.text_content.trim() || null,
        display_order: selected ? selected.display_order : materials.length,
      };

      await disciplinasApi.saveLessonMaterial(payload, selected?.id);
      toast({ title: 'Sucesso', description: selected ? 'Material atualizado' : 'Material adicionado' });
      setDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await disciplinasApi.deleteLessonMaterial(selected.id);
      toast({ title: 'Sucesso', description: 'Material removido' });
      setDeleteDialogOpen(false);
      loadData();
    } catch {
      toast({ title: 'Erro', description: 'Erro ao remover', variant: 'destructive' });
    }
  };

  const handleDragStart = (idx: number) => setDraggedIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const handleDragEnd = async () => {
    if (draggedIdx === null || dragOverIdx === null || draggedIdx === dragOverIdx) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    const newMaterials = [...materials];
    const [moved] = newMaterials.splice(draggedIdx, 1);
    newMaterials.splice(dragOverIdx, 0, moved);

    setMaterials(newMaterials);
    setDraggedIdx(null);
    setDragOverIdx(null);

    // Persist order
    try {
      await disciplinasApi.reorderMaterials(newMaterials);
    } catch {
      toast({ title: 'Erro', description: 'Erro ao reordenar', variant: 'destructive' });
      loadData();
    }
  };

  const needsFile = formData.material_type !== 'text';
  const acceptMap: Record<string, string> = {
    pdf: '.pdf',
    image: 'image/*',
    audio: 'audio/*',
    video: 'video/*',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Cursos', href: '/cursos' },
          { label: courseName || '...', href: subjectId ? undefined : '/cursos' },
          { label: subjectName || '...', href: subjectId ? `/disciplinas/${subjectId}/calendario-semanal` : undefined },
          { label: 'Aulas Planejadas' },
        ]}
        title="Aulas Planejadas"
        description={`${subjectName}${courseName ? ` • ${courseName}` : ''}`}
        backTo={subjectId ? `/disciplinas/${subjectId}/calendario-semanal` : '/cursos'}
        actions={
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />Novo Material
          </Button>
        }
      />

      {/* Materials list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : materials.length === 0 ? (
        <Card className="border-dashed border-2 border-primary/20">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum material cadastrado</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Adicione PDFs, imagens, textos, áudios ou vídeos para organizar o conteúdo das aulas.
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />Adicionar Material
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {materials.map((m, idx) => {
            const config = MATERIAL_TYPE_CONFIG[m.material_type];
            const Icon = config.icon;
            const isDragging = draggedIdx === idx;
            const isDragOver = dragOverIdx === idx;

            return (
              <Card
                key={m.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`transition-all duration-200 cursor-grab active:cursor-grabbing ${
                  isDragging ? 'opacity-50 scale-[0.98]' : ''
                } ${isDragOver ? 'border-primary shadow-md shadow-primary/10' : 'hover:border-primary/30'}`}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <GripVertical className="h-5 w-5 text-muted-foreground/50 shrink-0" />
                  <div className={`rounded-lg p-2.5 shrink-0 ${config.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium truncate">{m.title}</p>
                      <Badge variant="outline" className="text-xs shrink-0">{config.label}</Badge>
                    </div>
                    {m.description && (
                      <p className="text-sm text-muted-foreground truncate">{m.description}</p>
                    )}
                    {m.material_type === 'text' && m.text_content && (
                      <p className="text-sm text-muted-foreground truncate mt-1">{m.text_content}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(m)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setSelected(m); setDeleteDialogOpen(true); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Material Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected ? 'Editar Material' : 'Novo Material'}</DialogTitle>
            <DialogDescription>
              Cadastre materiais para organizar o conteúdo das aulas planejadas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Material *</Label>
              <Select
                value={formData.material_type}
                onValueChange={(v) => setFormData({ ...formData, material_type: v as any, file: null })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MATERIAL_TYPE_CONFIG).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />{cfg.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Introdução ao tema"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Breve descrição do material"
              />
            </div>

            {needsFile && (
              <div className="space-y-2">
                <Label>Arquivo ({MATERIAL_TYPE_CONFIG[formData.material_type].label}) *</Label>
                <div className="border-2 border-dashed border-primary/20 rounded-lg p-6 text-center hover:border-primary/40 transition-colors">
                  <input
                    type="file"
                    accept={acceptMap[formData.material_type]}
                    onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 text-primary/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {formData.file ? formData.file.name : 'Clique ou arraste para enviar'}
                    </p>
                  </label>
                </div>
                {selected?.file_url && !formData.file && (
                  <p className="text-xs text-muted-foreground">Arquivo atual mantido. Envie novo para substituir.</p>
                )}
              </div>
            )}

            {/* Text content - always available */}
            <div className="space-y-2">
              <Label>Conteúdo em Texto {formData.material_type === 'text' ? '*' : '(opcional)'}</Label>
              <Textarea
                value={formData.text_content}
                onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
                placeholder="Digite o conteúdo textual..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o material "{selected?.title}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="w-full sm:w-auto">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
