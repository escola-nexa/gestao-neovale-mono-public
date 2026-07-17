import { useState, useEffect } from 'react';
import { disciplinasApi } from '../api';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, CheckCircle2, Trash2, Copy, FileUp } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface WeeklyContentFormProps {
  subjectId: string;
  bimesterNumber: number;
  weekNumber: number;
  weekLabel: string;
  totalWeeks?: number;
}

const FIELDS = [
  { key: 'objective', label: 'Objetivo', placeholder: 'Descreva o objetivo da semana...' },
  { key: 'competencies', label: 'Competências', placeholder: 'Liste as competências a desenvolver...' },
  { key: 'contents', label: 'Conteúdos', placeholder: 'Descreva os conteúdos a serem trabalhados...' },
  { key: 'methodology', label: 'Metodologia', placeholder: 'Descreva a metodologia de ensino...' },
  { key: 'resources', label: 'Recursos Didáticos', placeholder: 'Recursos necessários...' },
  { key: 'evaluation', label: 'Avaliação', placeholder: 'Critérios e instrumentos de avaliação...' },
  { key: 'product', label: 'Produto/Registro', placeholder: 'Produtos ou registros esperados...' },
  { key: 'next_steps', label: 'Próximos Passos', placeholder: 'Orientações para continuidade...' },
] as const;

type FieldKey = typeof FIELDS[number]['key'];

export default function WeeklyContentForm({ subjectId, bimesterNumber, weekNumber, weekLabel, totalWeeks }: WeeklyContentFormProps) {
  const { organization } = useOrganization();
  const { user } = useAuth();
  const [values, setValues] = useState<Record<FieldKey, string>>({
    objective: '', competencies: '', contents: '', methodology: '',
    resources: '', evaluation: '', product: '', next_steps: '',
  });
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [copyingFrom, setCopyingFrom] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadTemplate();
  }, [subjectId, bimesterNumber, weekNumber, organization?.id]);

  const loadTemplate = async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const data = await disciplinasApi.getPlanningTemplate(subjectId, bimesterNumber, weekNumber, organization.id);

      if (data) {
        setExistingId(data.id);
        setValues({
          objective: data.objective || '',
          competencies: data.competencies || '',
          contents: data.contents || '',
          methodology: data.methodology || '',
          resources: data.resources || '',
          evaluation: data.evaluation || '',
          product: data.product || '',
          next_steps: data.next_steps || '',
        });
      } else {
        setExistingId(null);
        setValues({
          objective: '', competencies: '', contents: '', methodology: '',
          resources: '', evaluation: '', product: '', next_steps: '',
        });
      }
    } catch (err) {
      console.error('Error loading template:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organization?.id || !user?.id) return;
    setSaving(true);
    try {
      const payload = {
        subject_id: subjectId,
        bimester_number: bimesterNumber,
        week_number: weekNumber,
        organization_id: organization.id,
        created_by: user.id,
        ...values,
      };

      const responseData = await disciplinasApi.savePlanningTemplate(payload, existingId || undefined);
      if (responseData && !existingId) {
        setExistingId(responseData.id);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success('Conteúdo salvo com sucesso!');
    } catch (err: any) {
      console.error('Error saving template:', err);
      toast.error('Erro ao salvar: ' + (err.message || 'Tente novamente'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!organization?.id || !user?.id) return;
    setSavingTemplate(true);
    try {
      await disciplinasApi.upsertPlanningTemplate({
        organization_id: organization.id,
        subject_id: subjectId,
        bimester_number: bimesterNumber,
        week_number: weekNumber,
        created_by: user.id,
        ...values,
      });
      toast.success('Template salvo! Será aplicado nas próximas gerações de pré-planejamento.');
    } catch (err: any) {
      toast.error('Erro ao salvar template: ' + (err.message || 'Tente novamente'));
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleCopyFromWeek = async (sourceWeek: number) => {
    if (!organization?.id) return;
    setCopyingFrom(true);
    try {
      const data = await disciplinasApi.getPlanningTemplate(subjectId, bimesterNumber, sourceWeek, organization.id);

      if (data) {
        setValues({
          objective: data.objective || '',
          competencies: data.competencies || '',
          contents: data.contents || '',
          methodology: data.methodology || '',
          resources: data.resources || '',
          evaluation: data.evaluation || '',
          product: data.product || '',
          next_steps: data.next_steps || '',
        });
        toast.success(`Conteúdo copiado da Semana ${sourceWeek}`);
      } else {
        toast.error(`Semana ${sourceWeek} não possui conteúdo salvo.`);
      }
    } catch (err: any) {
      toast.error('Erro ao copiar: ' + (err.message || 'Tente novamente'));
    } finally {
      setCopyingFrom(false);
    }
  };

  const handleDelete = async () => {
    if (!existingId) return;
    setDeleting(true);
    try {
      await disciplinasApi.deletePlanningTemplate(existingId);

      setExistingId(null);
      setValues({
        objective: '', competencies: '', contents: '', methodology: '',
        resources: '', evaluation: '', product: '', next_steps: '',
      });
      toast.success('Conteúdo excluído com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + (err.message || 'Tente novamente'));
    } finally {
      setDeleting(false);
    }
  };

  const hasContent = Object.values(values).some(v => v.trim().length > 0);
  const allFilled = Object.values(values).every(v => v.trim().length > 0);
  const filledCount = Object.values(values).filter(v => v.trim().length > 0).length;

  // Build list of other weeks for copy
  const maxWeeks = totalWeeks || 20;
  const otherWeeks = Array.from({ length: maxWeeks }, (_, i) => i + 1).filter(w => w !== weekNumber);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status badge */}
      <div className="flex items-center gap-2">
        {allFilled ? (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/10">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Completo
          </Badge>
        ) : hasContent ? (
          <Badge variant="outline" className="border-amber-400/50 text-amber-600 bg-amber-50/50">
            {filledCount}/8 preenchidos
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Nenhum campo preenchido
          </Badge>
        )}
      </div>

      {/* Fields grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {FIELDS.map(field => {
          const isFilled = values[field.key].trim().length > 0;
          return (
            <div key={field.key} className={`rounded-lg border p-3 transition-colors ${isFilled ? 'border-green-200 bg-green-50/30 dark:border-green-900/30 dark:bg-green-950/10' : 'border-border bg-background'}`}>
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                {field.label}
                {isFilled && <CheckCircle2 className="h-3 w-3 text-green-500" />}
              </label>
              <Textarea
                className="min-h-[72px] text-sm resize-y border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none"
                placeholder={field.placeholder}
                value={values[field.key]}
                onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
              />
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2 pt-3 border-t">
        {/* Row 1: Excluir + Copiar */}
        <div className="flex flex-wrap items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" disabled={!existingId || deleting} className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5">
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir conteúdo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Todo o conteúdo pedagógico desta semana será apagado permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex items-center gap-1.5">
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            <Select onValueChange={(val) => handleCopyFromWeek(Number(val))} disabled={copyingFrom}>
              <SelectTrigger className="h-8 w-[170px] text-xs">
                <SelectValue placeholder={copyingFrom ? 'Copiando...' : 'Copiar de outra semana'} />
              </SelectTrigger>
              <SelectContent>
                {otherWeeks.map(w => (
                  <SelectItem key={w} value={String(w)}>Copiar da Semana {w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Template + Salvar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveAsTemplate}
            disabled={savingTemplate || !hasContent}
            className="gap-1.5"
          >
            {savingTemplate ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
            Salvar Template
          </Button>

          <Button size="sm" onClick={handleSave} disabled={saving || !hasContent} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> :
             saved ? <CheckCircle2 className="h-4 w-4 text-green-500" /> :
             <Save className="h-4 w-4" />}
            {saved ? 'Salvo!' : `Salvar Semana ${weekNumber}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
