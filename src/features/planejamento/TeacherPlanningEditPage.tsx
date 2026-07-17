import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Send, RotateCcw, PenTool, Info, Calendar, User, School, BookOpen, GraduationCap } from 'lucide-react';
import { teacherPlanningsApi, TeacherPlanningData } from '@/services/supabaseApi';
import { TeacherPlanningStatus } from '@/types/academic';
import { planejamentoApi } from '@/features/planejamento/api';
import { useAuth } from '@/contexts/AuthContext';
import { isManagerRole } from '@/lib/roles';
import { DigitalSignatureDialog } from './components/DigitalSignatureDialog';
import { FeedbackHistory } from './components/FeedbackHistory';
import { PageHeader } from '@/components/PageHeader';
import { SubjectNameWithAnp } from '@/components/SubjectNameWithAnp';
import { useAnpSubjectMap } from '@/hooks/useAnpSubjectMap';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho', PENDING: 'Enviado', APPROVED: 'Assinado',
  REJECTED: 'Devolvido', ENVIADO: 'Enviado', DEVOLVIDO: 'Devolvido', ASSINADO: 'Assinado',
  AGUARDANDO_ASSINATURA: 'Aguardando Assinatura Professor',
  AGUARDANDO_ASSINATURA_COORDENADOR: 'Aguardando Assinatura Coordenador',
};

export default function TeacherPlanningEditPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const prePlanningId = searchParams.get('from_pre_planning');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isCoordinator = isManagerRole(user?.perfil);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planning, setPlanning] = useState<TeacherPlanningData | null>(null);
  const [prePlanning, setPrePlanning] = useState<any>(null);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [professorName, setProfessorName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [classDate, setClassDate] = useState<string | null>(null);
  const [classStartTime, setClassStartTime] = useState<string | null>(null);
  const [classEndTime, setClassEndTime] = useState<string | null>(null);
  const { data: anpMap } = useAnpSubjectMap();
  const isAnp = planning?.subject_id ? !!anpMap?.bySubject.has(planning.subject_id) : false;

  const [formData, setFormData] = useState({
    objective: '', competencies: '', contents: '', methodology: '',
    resources: '', evaluation: '', product: '', next_steps: '',
    coordinator_feedback: '',
  });

  useEffect(() => {
    loadData();
  }, [id, prePlanningId]);

  const loadData = async () => {
    try {
      setLoading(true);

      if (id) {
        // Editing existing teacher planning
        const data = await planejamentoApi.getTeacherPlanning(id);
        if (error) throw error;
        if (!data) {
          toast({ title: 'Planejamento não encontrado', description: 'O registro não existe ou foi removido.', variant: 'destructive' });
          navigate('/planejamento');
          return;
        }
        setPlanning(data);
        setClassDate(data.class_date || null);
        setClassStartTime(data.start_time || null);
        setClassEndTime(data.end_time || null);
        setFormData({
          objective: data.objective, competencies: data.competencies,
          contents: data.contents, methodology: data.methodology,
          resources: data.resources, evaluation: data.evaluation,
          product: data.product, next_steps: data.next_steps,
          coordinator_feedback: data.coordinator_feedback || '',
        });
        await loadRelatedData(data);
      } else if (prePlanningId) {
        // Creating from pre-planning
        const data = await planejamentoApi.getPrePlanning(prePlanningId);
        if (error) throw error;
        if (!data) {
          toast({ title: 'Pré-planejamento não encontrado', description: 'O registro de origem não existe.', variant: 'destructive' });
          navigate('/planejamento');
          return;
        }
        setPrePlanning(data);
        setClassDate(data.class_date || null);
        setClassStartTime(data.start_time || null);
        setClassEndTime(data.end_time || null);
        setFormData({
          objective: data.objective, competencies: data.competencies,
          contents: data.contents, methodology: data.methodology,
          resources: data.resources, evaluation: data.evaluation,
          product: data.product, next_steps: data.next_steps,
          coordinator_feedback: '',
        });
        await loadRelatedData(data);
      } else {
        // New empty planning
      }
    } catch (error: any) {
      toast({ title: 'Erro ao carregar', variant: 'destructive' });
      navigate('/planejamento');
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedData = async (data: any) => {
    const promises: Array<PromiseLike<any>> = [];
    if (data.school_id) promises.push(planejamentoApi.getEntityName('schools', data.school_id).then(name => ({ data: { nome: name } })).then(r => { if (r.data) setSchoolName(r.data.nome); }));
    if (data.course_id) promises.push(planejamentoApi.getEntityName('courses', data.course_id).then(name => ({ data: { nome: name } })).then(r => { if (r.data) setCourseName(r.data.nome); }));
    if (data.subject_id) promises.push(planejamentoApi.getEntityName('subjects', data.subject_id).then(name => ({ data: { nome: name } })).then(r => { if (r.data) setSubjectName(r.data.nome); }));
    const profId = data.professor_id;
    if (profId) {
      promises.push(planejamentoApi.getProfessorName(profId).then(name => ({ data: { full_name: name } })).then(r => { if (r.data) setProfessorName(r.data.full_name); }));
    }
    await Promise.all(promises);
  };

  const handleSaveDraft = async () => {
    if (!formData.objective) { toast({ title: 'Preencha o objetivo', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const authUser = await planejamentoApi.getAuthUser();
      if (!authUser) throw new Error('Usuário não autenticado');

      const payload = {
        ...formData, coordinator_feedback: null, rejection_reason: null,
        professor_id: authUser.id,
        pre_planning_id: prePlanning?.id || planning?.pre_planning_id || null,
        occurrence_id: prePlanning?.occurrence_id || planning?.occurrence_id || null,
        school_id: prePlanning?.school_id || planning?.school_id || null,
        course_id: prePlanning?.course_id || planning?.course_id || null,
        class_group_id: prePlanning?.class_group_id || planning?.class_group_id || null,
        subject_id: prePlanning?.subject_id || planning?.subject_id || null,
        bimester_number: prePlanning?.bimester_number || planning?.bimester_number || null,
        week_number: prePlanning?.week_number || planning?.week_number || null,
        week_start_date: prePlanning?.week_start_date || planning?.week_start_date || null,
        week_end_date: prePlanning?.week_end_date || planning?.week_end_date || null,
        class_date: prePlanning?.class_date || planning?.class_date || null,
        start_time: prePlanning?.start_time || planning?.start_time || null,
        end_time: prePlanning?.end_time || planning?.end_time || null,
        status: 'DRAFT' as TeacherPlanningStatus,
        professor_signed: false, coordinator_signed: false, finalized_at: null, finalization_justification: null,
      };

      if (planning) {
        await teacherPlanningsApi.update(planning.id, payload);
        toast({ title: 'Rascunho salvo!' });
      } else {
        await teacherPlanningsApi.create(payload);
        toast({ title: 'Planejamento criado como rascunho!' });
      }
      navigate('/planejamento');
    } catch (error: any) {
      toast({ title: error.message || 'Erro ao salvar', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    if (!formData.objective) { toast({ title: 'Preencha o objetivo', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const authUser = await planejamentoApi.getAuthUser();
      if (!authUser) throw new Error('Usuário não autenticado');

      const payload = {
        ...formData, coordinator_feedback: null, rejection_reason: null,
        professor_id: authUser.id,
        pre_planning_id: prePlanning?.id || planning?.pre_planning_id || null,
        occurrence_id: prePlanning?.occurrence_id || planning?.occurrence_id || null,
        school_id: prePlanning?.school_id || planning?.school_id || null,
        course_id: prePlanning?.course_id || planning?.course_id || null,
        class_group_id: prePlanning?.class_group_id || planning?.class_group_id || null,
        subject_id: prePlanning?.subject_id || planning?.subject_id || null,
        bimester_number: prePlanning?.bimester_number || planning?.bimester_number || null,
        week_number: prePlanning?.week_number || planning?.week_number || null,
        week_start_date: prePlanning?.week_start_date || planning?.week_start_date || null,
        week_end_date: prePlanning?.week_end_date || planning?.week_end_date || null,
        class_date: prePlanning?.class_date || planning?.class_date || null,
        start_time: prePlanning?.start_time || planning?.start_time || null,
        end_time: prePlanning?.end_time || planning?.end_time || null,
        status: 'ENVIADO' as TeacherPlanningStatus,
        professor_signed: false, coordinator_signed: false, finalized_at: null, finalization_justification: null,
      };

      if (planning) {
        await teacherPlanningsApi.update(planning.id, payload);
        toast({ title: 'Planejamento enviado para análise!' });
      } else {
        await teacherPlanningsApi.create(payload);
        toast({ title: 'Planejamento criado e enviado!' });
      }
      navigate('/planejamento');
    } catch (error: any) {
      toast({ title: error.message || 'Erro ao enviar', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleReturn = async () => {
    if (!planning || !formData.coordinator_feedback) {
      toast({ title: 'Informe a orientação', variant: 'destructive' }); return;
    }
    setSaving(true);
    try {
      // Save feedback history
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user!.id)
        .single();

      await planejamentoApi.addFeedback({ planning_id: id, organization_id: authUser.organization_id, created_by: authUser.id, message: revisionNote, old_status: currentStatus, new_status: 'needs_revision' });

      await teacherPlanningsApi.update(planning.id, {
        status: 'DEVOLVIDO' as TeacherPlanningStatus,
        coordinator_feedback: formData.coordinator_feedback,
      });
      toast({ title: 'Planejamento devolvido com orientação' });
      navigate('/planejamento');
    } catch (error: any) {
      toast({ title: error.message || 'Erro ao devolver', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const canEdit = !isCoordinator && (!planning || planning.status === 'DRAFT' || planning.status === 'DEVOLVIDO' || planning.status === 'REJECTED');
  const showCoordinatorActions = isCoordinator && (planning?.status === 'ENVIADO' || planning?.status === 'PENDING');
  const isFinalized = planning?.status === 'ASSINADO' || planning?.status === 'APPROVED' || (planning?.professor_signed && planning?.coordinator_signed);
  // Professor can sign when coordinator sent it for signature (AGUARDANDO_ASSINATURA)
  const canProfessorSign = !isCoordinator && planning && planning.status === 'AGUARDANDO_ASSINATURA' && !planning.professor_signed;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        breadcrumbs={[
          { label: 'Pedagógico' },
          { label: 'Planejamento', href: '/planejamento' },
          { label: planning ? 'Editar Planejamento' : 'Novo Planejamento' },
        ]}
        title={planning ? 'Editar Planejamento' : prePlanningId ? 'Novo Planejamento (a partir do pré-planejamento)' : 'Novo Planejamento'}
        backTo="/planejamento"
        badge={planning ? { label: STATUS_LABELS[planning.status] || planning.status, tone: 'default' } : undefined}
      />

      {/* Context info */}
      {(schoolName || courseName || subjectName || professorName) && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {professorName && <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><User className="h-4 w-4" />Professor</div><p className="font-medium">{professorName}</p></CardContent></Card>}
          {schoolName && <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><School className="h-4 w-4" />Escola</div><p className="font-medium">{schoolName}</p></CardContent></Card>}
          {courseName && <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><GraduationCap className="h-4 w-4" />Curso</div><p className="font-medium">{courseName}</p></CardContent></Card>}
          {subjectName && <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><BookOpen className="h-4 w-4" />Disciplina</div><p className="font-medium"><SubjectNameWithAnp name={subjectName} isAnp={isAnp} /></p></CardContent></Card>}
        </div>
      )}

      {/* Date and time info */}
      {classDate && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {new Date(classDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>
              {classStartTime && classEndTime && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">|</span>
                  <span className="text-sm font-medium">{classStartTime.slice(0, 5)} - {classEndTime.slice(0, 5)}</span>
                </div>
              )}
              {(prePlanning?.bimester_number || planning?.bimester_number) && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">|</span>
                  <Badge variant="outline" className="text-xs">{prePlanning?.bimester_number || planning?.bimester_number}º Bimestre • Semana {prePlanning?.week_number || planning?.week_number}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isFinalized && (
        <Alert><Info className="h-4 w-4" /><AlertDescription>Este planejamento foi assinado e está imutável.</AlertDescription></Alert>
      )}

      {(planning?.status === 'DEVOLVIDO' || planning?.status === 'REJECTED') && planning.coordinator_feedback && (
        <Alert><RotateCcw className="h-4 w-4" /><AlertDescription><strong>Orientação da Coordenação:</strong><br />{planning.coordinator_feedback}</AlertDescription></Alert>
      )}

      {/* Feedback History */}
      {planning && <FeedbackHistory teacherPlanningId={planning.id} />}

      {planning?.status === 'AGUARDANDO_ASSINATURA' && !planning.professor_signed && (
        <Alert className="border-blue-200 bg-blue-50">
          <PenTool className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>A coordenação aprovou seu planejamento.</strong> Assine para finalizar o documento.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader><CardTitle>Conteúdo do Planejamento</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'objective', label: 'Objetivo *', placeholder: 'Descreva os objetivos...' },
            { key: 'competencies', label: 'Competências', placeholder: 'Competências a serem desenvolvidas...' },
            { key: 'contents', label: 'Conteúdos', placeholder: 'Conteúdos programáticos...' },
            { key: 'methodology', label: 'Metodologia', placeholder: 'Estratégias metodológicas...' },
            { key: 'resources', label: 'Recursos', placeholder: 'Recursos didáticos...' },
            { key: 'evaluation', label: 'Avaliação', placeholder: 'Critérios de avaliação...' },
            { key: 'product', label: 'Produto/Registro', placeholder: 'Produtos ou registros...' },
            { key: 'next_steps', label: 'Próximos Passos', placeholder: 'Continuidade...' },
          ].map(field => (
            <div key={field.key} className="space-y-2">
              <Label>{field.label}</Label>
              <Textarea
                value={(formData as any)[field.key]}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                rows={2}
                disabled={(!canEdit && !showCoordinatorActions) || !!isFinalized}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {showCoordinatorActions && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5" />Orientação para o Professor</CardTitle>
            <CardDescription>Obrigatória para devolver o planejamento</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea value={formData.coordinator_feedback} onChange={(e) => setFormData({ ...formData, coordinator_feedback: e.target.value })} placeholder="Orientações, ajustes necessários..." rows={4} />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="outline" onClick={() => navigate('/planejamento')}>
          {isFinalized ? 'Fechar' : 'Cancelar'}
        </Button>

        {showCoordinatorActions && (
          <Button variant="secondary" onClick={handleReturn} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <RotateCcw className="mr-2 h-4 w-4" />Devolver com Orientação
          </Button>
        )}

        {canEdit && !isFinalized && (
          <>
            <Button variant="secondary" onClick={handleSaveDraft} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Rascunho
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="mr-2 h-4 w-4" />Enviar para Coordenação
            </Button>
          </>
        )}

        {canProfessorSign && (
          <Button onClick={() => setSignatureDialogOpen(true)} disabled={saving} className="gap-2">
            <PenTool className="h-4 w-4" />Assinar como Professor
          </Button>
        )}
      </div>

      {planning && (
        <DigitalSignatureDialog
          open={signatureDialogOpen}
          onOpenChange={setSignatureDialogOpen}
          planningId={planning.id}
          onSuccess={() => { setSignatureDialogOpen(false); navigate('/planejamento'); }}
        />
      )}
    </div>
  );
}
