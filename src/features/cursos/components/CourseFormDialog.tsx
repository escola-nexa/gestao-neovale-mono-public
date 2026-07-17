import { useState, useEffect } from 'react';
import { coursesApi, CourseData, FormativeTrackData } from '@/services/supabaseApi';
import { NivelEnsino, NIVEIS_ENSINO } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Route } from 'lucide-react';

interface CursoFormData {
  codigo: string; nome: string; descricao: string;
  nivel_ensino: NivelEnsino; status: 'ativo' | 'inativo';
  formative_track_id: string | null; school_ids: string[];
}

const initialFormData: CursoFormData = {
  codigo: '', nome: '', descricao: '', nivel_ensino: 'fundamental_1',
  status: 'ativo', formative_track_id: null, school_ids: [],
};

interface CourseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: CourseData | null;
  itinerarios: FormativeTrackData[];
  onSuccess: () => void;
  contextTrackId?: string;
}

export function CourseFormDialog({ open, onOpenChange, course, itinerarios, onSuccess, contextTrackId }: CourseFormDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<CursoFormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  const activeItinerarios = itinerarios.filter(i => i.status === 'ACTIVE');

  const hasContextTrack = !!contextTrackId && !course;

  useEffect(() => {
    if (course) {
      setFormData({
        codigo: course.codigo, nome: course.nome, descricao: course.descricao || '',
        nivel_ensino: course.nivel_ensino as NivelEnsino, status: course.status,
        formative_track_id: course.formative_track_id, school_ids: course.school_ids || [],
      });
    } else {
      setFormData({
        ...initialFormData,
        formative_track_id: contextTrackId || null,
      });
    }
  }, [course, open, contextTrackId]);

  const handleSave = async () => {
    if (!formData.codigo || !formData.nome || !formData.nivel_ensino) {
      toast({ title: 'Erro', description: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (course) { await coursesApi.update(course.id, formData); toast({ title: 'Sucesso', description: 'Curso atualizado' }); }
      else { await coursesApi.create(formData); toast({ title: 'Sucesso', description: 'Curso criado' }); }
      onOpenChange(false);
      onSuccess();
    } catch (err: any) { toast({ title: 'Erro ao salvar', description: err?.message || 'Erro desconhecido', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{course ? 'Editar Curso' : 'Novo Curso'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          {!hasContextTrack && (
            <div className="space-y-2">
              <Label>Itinerário Formativo</Label>
              <SearchableSelect
                value={formData.formative_track_id || '__none__'}
                onValueChange={(v) => setFormData({ ...formData, formative_track_id: v === '__none__' ? null : v })}
                placeholder="Selecione o itinerário..."
                searchPlaceholder="Buscar itinerário..."
                options={[
                  { value: '__none__', label: 'Nenhum' },
                  ...activeItinerarios.map(it => ({ value: it.id, label: it.name })),
                ]}
              />
              <p className="text-xs text-muted-foreground">Agrupa cursos por eixo pedagógico</p>
            </div>
          )}
          {hasContextTrack && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border">
              <Route className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {activeItinerarios.find(i => i.id === contextTrackId)?.name || 'Itinerário selecionado'}
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Código *</Label><Input value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} placeholder="Ex: MAT-EF1" /></div>
            <div className="space-y-2"><Label>Nome *</Label><Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: Matemática Fundamental I" /></div>
          </div>
          <div className="space-y-2"><Label>Descrição</Label><Textarea value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} placeholder="Descrição do curso" rows={2} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nível de Ensino *</Label>
              <Select value={formData.nivel_ensino} onValueChange={(v) => setFormData({ ...formData, nivel_ensino: v as NivelEnsino })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{NIVEIS_ENSINO.map(nivel => <SelectItem key={nivel.value} value={nivel.value}>{nivel.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as 'ativo' | 'inativo' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="ativo">Ativo</SelectItem><SelectItem value="inativo">Inativo</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{course ? 'Salvar' : 'Criar Curso'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
