import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, AlertTriangle, Calendar, Info, Lock } from 'lucide-react';
import { prePlanningsApi, PrePlanningData, coursesApi, CourseData, subjectsApi, SubjectData } from '@/services/supabaseApi';
import { PLANNING_TYPE_OPTIONS, PrePlanningType } from '@/types/academic';
import { planejamentoApi } from '@/features/planejamento/api';
import { useSemester, SEMESTER_LABELS } from '@/hooks/useSemester';
import { PageHeader } from '@/components/PageHeader';
import { PrePlanningMaterials } from './components/PrePlanningMaterials';

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
  course_id: '', subject_id: '', planning_type: 'BIMESTRAL',
  bimester_number: null, reference_month: null, reference_year: new Date().getFullYear(),
  objective: '', competencies: '', contents: '', methodology: '',
  resources: '', evaluation: '', product: '', next_steps: '',
};

export default function PrePlanningEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentSemester } = useSemester();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<SubjectData[]>([]);
  const [planning, setPlanning] = useState<any>(null);

  useEffect(() => {
    loadBaseData();
    if (id) loadPlanning();
  }, [id]);

  const loadBaseData = async () => {
    const [c, s] = await Promise.all([coursesApi.getAll(), subjectsApi.getAll()]);
    setCourses(c); setSubjects(s);
  };

  const loadPlanning = async () => {
    try {
      const data = await planejamentoApi.getPrePlanning(id!);
      if (error) throw error;
      setPlanning(data);
      setFormData({
        course_id: data.course_id, subject_id: data.subject_id,
        planning_type: data.planning_type as PrePlanningType,
        bimester_number: data.bimester_number, reference_month: data.reference_month,
        reference_year: data.reference_year, objective: data.objective,
        competencies: data.competencies, contents: data.contents,
        methodology: data.methodology, resources: data.resources,
        evaluation: data.evaluation, product: data.product, next_steps: data.next_steps,
      });
    } catch {
      toast({ title: 'Erro ao carregar', variant: 'destructive' });
      navigate('/planejamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (formData.course_id && currentSemester) {
      const filtered = subjects.filter(s =>
        s.course_id === formData.course_id && s.status === 'ativo' && s.semester === currentSemester
      );
      setFilteredSubjects(filtered);
    } else {
      setFilteredSubjects([]);
    }
  }, [formData.course_id, subjects, currentSemester]);

  const getValidBimesters = () => {
    if (currentSemester === 'FIRST') return [{ value: 1, label: '1º Bimestre' }, { value: 2, label: '2º Bimestre' }];
    if (currentSemester === 'SECOND') return [{ value: 3, label: '3º Bimestre' }, { value: 4, label: '4º Bimestre' }];
    return [1, 2, 3, 4].map(v => ({ value: v, label: `${v}º Bimestre` }));
  };

  const handleSave = async () => {
    if (!formData.course_id || !formData.subject_id || !formData.objective) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' }); return;
    }
    if (planning && planning.status !== 'GERADO') {
      toast({ title: 'Edição bloqueada', variant: 'destructive' }); return;
    }

    setSaving(true);
    try {
      const user = await planejamentoApi.getAuthUser();
      if (!user) throw new Error('Usuário não autenticado');
      const payload = { ...formData, created_by: user.id };

      if (planning) {
        await prePlanningsApi.update(planning.id, payload);
        toast({ title: 'Pré-planejamento atualizado!' });
      } else {
        await prePlanningsApi.create(payload);
        toast({ title: 'Pré-planejamento criado!' });
      }
      navigate('/planejamento');
    } catch (error: any) {
      toast({ title: error.message || 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const isBlocked = planning && planning.status !== 'GERADO';
  const noSubjectsAvailable = formData.course_id && filteredSubjects.length === 0;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        breadcrumbs={[
          { label: 'Pedagógico' },
          { label: 'Planejamento', href: '/planejamento' },
          { label: isNew ? 'Novo Pré-Planejamento' : 'Editar Pré-Planejamento' },
        ]}
        title={isNew ? 'Novo Pré-Planejamento' : 'Editar Pré-Planejamento'}
        description={currentSemester ? `Semestre atual: ${SEMESTER_LABELS[currentSemester]}` : undefined}
        icon={Calendar}
        backTo="/planejamento"
      />

      {isBlocked && (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription><strong>Edição bloqueada:</strong> Este planejamento já está em edição pelo professor.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader><CardTitle>Dados do Planejamento</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Alert><Info className="h-4 w-4" /><AlertDescription>Apenas disciplinas ativas do semestre atual são exibidas.</AlertDescription></Alert>

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
                disabled={!formData.course_id || !!noSubjectsAvailable}
                placeholder={!formData.course_id ? "Selecione o curso primeiro" : noSubjectsAvailable ? "Nenhuma disponível" : "Selecione..."}
                searchPlaceholder="Buscar disciplina..."
                options={filteredSubjects.map(s => ({ value: s.id, label: s.nome }))}
              />
            </div>
          </div>

          {noSubjectsAvailable && (
            <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>Nenhuma disciplina ativa para o semestre atual neste curso.</AlertDescription></Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={formData.planning_type} onValueChange={(v) => setFormData({ ...formData, planning_type: v as PrePlanningType, bimester_number: null, reference_month: null })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PLANNING_TYPE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ano *</Label>
              <Input type="number" value={formData.reference_year} onChange={(e) => setFormData({ ...formData, reference_year: parseInt(e.target.value) })} />
            </div>
            {(formData.planning_type === 'BIMESTRAL' || formData.planning_type === 'SEMESTRAL') && (
              <div className="space-y-2">
                <Label>Bimestre</Label>
                <Select value={formData.bimester_number?.toString() || ''} onValueChange={(v) => setFormData({ ...formData, bimester_number: parseInt(v) })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{getValidBimesters().map(b => <SelectItem key={b.value} value={b.value.toString()}>{b.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Campos Pedagógicos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'objective', label: 'Objetivo *', placeholder: 'Descreva os objetivos de aprendizagem...' },
            { key: 'competencies', label: 'Competências', placeholder: 'Competências a serem desenvolvidas...' },
            { key: 'contents', label: 'Conteúdos', placeholder: 'Conteúdos programáticos...' },
            { key: 'methodology', label: 'Metodologia', placeholder: 'Estratégias metodológicas...' },
            { key: 'resources', label: 'Recursos', placeholder: 'Recursos didáticos necessários...' },
            { key: 'evaluation', label: 'Avaliação', placeholder: 'Critérios e instrumentos de avaliação...' },
            { key: 'product', label: 'Produto/Registro', placeholder: 'Produtos ou registros esperados...' },
            { key: 'next_steps', label: 'Próximos Passos', placeholder: 'Orientações para continuidade...' },
          ].map(field => (
            <div key={field.key} className="space-y-2">
              <Label>{field.label}</Label>
              <Textarea
                value={(formData as any)[field.key]}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                rows={2}
                disabled={!!isBlocked}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {planning?.id && <PrePlanningMaterials prePlanningId={planning.id} />}


      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/planejamento')}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving || !!isBlocked || !!noSubjectsAvailable}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {planning ? 'Salvar' : 'Criar'}
        </Button>
      </div>
    </div>
  );
}
