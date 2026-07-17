import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, Calendar, Info, Lock } from 'lucide-react';
import { prePlanningsApi, PrePlanningData, CourseData, SubjectData, subjectsApi } from '@/services/supabaseApi';
import { PLANNING_TYPE_OPTIONS, PrePlanningType } from '@/types/academic';
import { planejamentoApi } from '@/features/planejamento/api';
import { useSemester, SEMESTER_LABELS } from '@/hooks/useSemester';

interface PrePlanningFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planning: PrePlanningData | null;
  courses: CourseData[];
  subjects: SubjectData[];
  onSuccess: () => void;
}

interface FormData {
  course_id: string;
  subject_id: string;
  planning_type: PrePlanningType;
  bimester_number: number | null;
  reference_month: number | null;
  reference_year: number;
  objective: string;
  competencies: string;
  contents: string;
  methodology: string;
  resources: string;
  evaluation: string;
  product: string;
  next_steps: string;
}

const emptyForm: FormData = {
  course_id: '',
  subject_id: '',
  planning_type: 'BIMESTRAL',
  bimester_number: null,
  reference_month: null,
  reference_year: new Date().getFullYear(),
  objective: '',
  competencies: '',
  contents: '',
  methodology: '',
  resources: '',
  evaluation: '',
  product: '',
  next_steps: '',
};

export function PrePlanningForm({ open, onOpenChange, planning, courses, subjects, onSuccess }: PrePlanningFormProps) {
  const { toast } = useToast();
  const { currentSemester, semesterDateRanges, isLoading: semesterLoading } = useSemester();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [filteredSubjects, setFilteredSubjects] = useState<SubjectData[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectData | null>(null);

  useEffect(() => {
    if (planning) {
      setFormData({
        course_id: planning.course_id,
        subject_id: planning.subject_id,
        planning_type: planning.planning_type as PrePlanningType,
        bimester_number: planning.bimester_number,
        reference_month: planning.reference_month,
        reference_year: planning.reference_year,
        objective: planning.objective,
        competencies: planning.competencies,
        contents: planning.contents,
        methodology: planning.methodology,
        resources: planning.resources,
        evaluation: planning.evaluation,
        product: planning.product,
        next_steps: planning.next_steps,
      });
    } else {
      setFormData(emptyForm);
    }
  }, [planning, open]);

  // Filter subjects by course and current semester
  useEffect(() => {
    if (formData.course_id && currentSemester) {
      // Filter: same course, active status, and current semester
      const filtered = subjects.filter(s =>
        s.course_id === formData.course_id &&
        s.status === 'ativo' &&
        s.semester === currentSemester
      );
      setFilteredSubjects(filtered);

      // Update selected subject
      if (formData.subject_id) {
        const subject = filtered.find(s => s.id === formData.subject_id);
        setSelectedSubject(subject || null);
      }
    } else {
      setFilteredSubjects([]);
      setSelectedSubject(null);
    }
  }, [formData.course_id, formData.subject_id, subjects, currentSemester]);

  // Auto-set bimester based on current date and semester
  useEffect(() => {
    if (currentSemester && formData.planning_type === 'BIMESTRAL' && !formData.bimester_number) {
      // Set default bimester based on current semester
      if (currentSemester === 'SECOND') {
        setFormData(prev => ({ ...prev, bimester_number: 3 }));
      } else {
        // FIRST or ANNUAL defaults to 1
        setFormData(prev => ({ ...prev, bimester_number: 1 }));
      }
    }
  }, [currentSemester, formData.planning_type]);

  const getValidBimesters = () => {
    // Only show bimesters that belong to current semester
    if (currentSemester === 'FIRST') {
      return [
        { value: 1, label: '1º Bimestre' },
        { value: 2, label: '2º Bimestre' },
      ];
    } else if (currentSemester === 'SECOND') {
      return [
        { value: 3, label: '3º Bimestre' },
        { value: 4, label: '4º Bimestre' },
      ];
    } else {
      // ANNUAL or default
      return [
        { value: 1, label: '1º Bimestre' },
        { value: 2, label: '2º Bimestre' },
        { value: 3, label: '3º Bimestre' },
        { value: 4, label: '4º Bimestre' },
      ];
    }
  };

  const handleSave = async () => {
    // Validations
    if (!formData.course_id) {
      toast({ title: 'Selecione um curso', variant: 'destructive' });
      return;
    }
    if (!formData.subject_id) {
      toast({ title: 'Selecione uma disciplina', variant: 'destructive' });
      return;
    }
    if (!formData.objective) {
      toast({ title: 'Preencha o objetivo', variant: 'destructive' });
      return;
    }

    // Validate subject is in current semester
    const subject = subjects.find(s => s.id === formData.subject_id);
    if (subject && subject.semester !== currentSemester) {
      toast({
        title: 'Disciplina fora do semestre atual',
        description: `Esta disciplina pertence ao ${SEMESTER_LABELS[subject.semester]}. Não é possível criar pré-planejamento.`,
        variant: 'destructive'
      });
      return;
    }

    // Validate editing is allowed (only if status is 'GERADO')
    if (planning && planning.status !== 'GERADO') {
      toast({
        title: 'Edição bloqueada',
        description: 'Este planejamento já está em edição pelo professor. Não é possível alterar.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const payload = {
        ...formData,
        created_by: user.id,
      };

      if (planning) {
        await prePlanningsApi.update(planning.id, payload);
        toast({ title: 'Pré-planejamento atualizado!' });
      } else {
        await prePlanningsApi.create(payload);
        toast({ title: 'Pré-planejamento criado!' });
      }
      onSuccess();
    } catch (error: any) {
      toast({ title: error.message || 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const noSubjectsAvailable = formData.course_id && filteredSubjects.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{planning ? 'Editar Pré-Planejamento' : 'Novo Pré-Planejamento'}</DialogTitle>
          <DialogDescription>
            {currentSemester && (
              <span className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4" />
                Semestre atual: <Badge variant="default">{SEMESTER_LABELS[currentSemester]}</Badge>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Blocked editing alert */}
          {planning && planning.status !== 'GERADO' && (
            <Alert variant="destructive">
              <Lock className="h-4 w-4" />
              <AlertDescription>
                <strong>Edição bloqueada:</strong> Este planejamento já está em edição pelo professor.
                Não é possível alterar os dados.
              </AlertDescription>
            </Alert>
          )}

          {/* Alert about semester rule */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              O pré-planejamento herda o semestre da disciplina selecionada.
              Apenas disciplinas ativas do semestre atual são exibidas.
            </AlertDescription>
          </Alert>

          {/* Course and Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Curso *</Label>
              <SearchableSelect
                value={formData.course_id}
                onValueChange={(v) => setFormData({ ...formData, course_id: v, subject_id: '' })}
                placeholder="Selecione..."
                searchPlaceholder="Buscar curso..."
                options={courses.filter(c => c.status === 'ativo').map(c => ({ value: c.id, label: c.nome }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Disciplina *</Label>
              <SearchableSelect
                value={formData.subject_id}
                onValueChange={(v) => setFormData({ ...formData, subject_id: v })}
                disabled={!formData.course_id || noSubjectsAvailable}
                placeholder={
                  !formData.course_id
                    ? "Selecione o curso primeiro"
                    : noSubjectsAvailable
                      ? "Nenhuma disciplina disponível"
                      : "Selecione..."
                }
                searchPlaceholder="Buscar disciplina..."
                options={filteredSubjects.map(s => ({
                  value: s.id,
                  label: `${s.nome} (${s.total_classes} aulas)`,
                }))}
              />
            </div>
          </div>

          {/* Warning if no subjects available */}
          {noSubjectsAvailable && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Não há disciplinas ativas cadastradas para o {currentSemester ? SEMESTER_LABELS[currentSemester] : 'semestre atual'} neste curso.
                Cadastre disciplinas no semestre correto antes de criar o pré-planejamento.
              </AlertDescription>
            </Alert>
          )}

          {/* Selected subject info */}
          {selectedSubject && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{selectedSubject.nome}</span>
                <Badge>{SEMESTER_LABELS[selectedSubject.semester]}</Badge>
              </div>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Código: {selectedSubject.codigo}</span>
                <span>CH Semanal: {selectedSubject.carga_horaria_semanal}h</span>
                <span className="font-medium text-foreground">Total: {selectedSubject.total_classes} aulas</span>
              </div>
            </div>
          )}

          {/* Planning Type and Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Planejamento *</Label>
              <Select
                value={formData.planning_type}
                onValueChange={(v) => setFormData({ ...formData, planning_type: v as PrePlanningType, bimester_number: null, reference_month: null })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANNING_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ano de Referência *</Label>
              <Input
                type="number"
                value={formData.reference_year}
                onChange={(e) => setFormData({ ...formData, reference_year: parseInt(e.target.value) })}
              />
            </div>
            {(formData.planning_type === 'BIMESTRAL' || formData.planning_type === 'SEMESTRAL') && (
              <div className="space-y-2">
                <Label>Bimestre</Label>
                <Select
                  value={formData.bimester_number?.toString() || ''}
                  onValueChange={(v) => setFormData({ ...formData, bimester_number: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getValidBimesters().map(b => (
                      <SelectItem key={b.value} value={b.value.toString()}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {formData.planning_type === 'MENSAL' && (
              <div className="space-y-2">
                <Label>Mês</Label>
                <Select
                  value={formData.reference_month?.toString() || ''}
                  onValueChange={(v) => setFormData({ ...formData, reference_month: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {new Date(2000, i).toLocaleString('pt-BR', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* 8 Mandatory Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Objetivo *</Label>
              <Textarea
                value={formData.objective}
                onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                placeholder="Descreva os objetivos de aprendizagem..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Competências</Label>
              <Textarea
                value={formData.competencies}
                onChange={(e) => setFormData({ ...formData, competencies: e.target.value })}
                placeholder="Competências a serem desenvolvidas..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Conteúdos</Label>
              <Textarea
                value={formData.contents}
                onChange={(e) => setFormData({ ...formData, contents: e.target.value })}
                placeholder="Conteúdos programáticos..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Metodologia</Label>
              <Textarea
                value={formData.methodology}
                onChange={(e) => setFormData({ ...formData, methodology: e.target.value })}
                placeholder="Estratégias metodológicas..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Recursos</Label>
              <Textarea
                value={formData.resources}
                onChange={(e) => setFormData({ ...formData, resources: e.target.value })}
                placeholder="Recursos didáticos necessários..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Avaliação</Label>
              <Textarea
                value={formData.evaluation}
                onChange={(e) => setFormData({ ...formData, evaluation: e.target.value })}
                placeholder="Critérios e instrumentos de avaliação..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Produto/Registro</Label>
              <Textarea
                value={formData.product}
                onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                placeholder="Produtos ou registros esperados..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Próximos Passos</Label>
              <Textarea
                value={formData.next_steps}
                onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
                placeholder="Orientações para continuidade..."
                rows={2}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || noSubjectsAvailable}
            className="w-full sm:w-auto"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {planning ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
