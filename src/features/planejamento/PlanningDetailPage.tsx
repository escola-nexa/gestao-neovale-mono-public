import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, ArrowLeft, User, School, BookOpen, GraduationCap, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { planejamentoApi } from '@/features/planejamento/api';
import { coursesApi, subjectsApi, schoolsApi, classGroupsApi, CourseData, SubjectData, SchoolData, ClassGroupData } from '@/services/supabaseApi';
import { FeedbackHistory } from './components/FeedbackHistory';
import { PLANNING_TYPE_LABELS, PLANNING_STATUS_LABELS, PrePlanningType, TeacherPlanningStatus } from '@/types/academic';
import { PageHeader } from '@/components/PageHeader';
import { SubjectNameWithAnp } from '@/components/SubjectNameWithAnp';
import { useAnpSubjectMap } from '@/hooks/useAnpSubjectMap';

export default function PlanningDetailPage() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [planning, setPlanning] = useState<any>(null);
  const [course, setCourse] = useState<CourseData | null>(null);
  const [subject, setSubject] = useState<SubjectData | null>(null);
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [classGroup, setClassGroup] = useState<ClassGroupData | null>(null);
  const [professorName, setProfessorName] = useState('');
  const { data: anpMap } = useAnpSubjectMap();

  const isPrePlanning = type === 'pre-planejamento';

  useEffect(() => {
    if (id) loadData();
  }, [id, type]);

  const loadData = async () => {
    try {
      setLoading(true);
      const table = isPrePlanning ? 'pre_plannings' : 'teacher_plannings';
      const data = table === 'pre_plannings' ? await planejamentoApi.getPrePlanning(id!) : await planejamentoApi.getTeacherPlanning(id!);
      if (error) throw error;
      if (!data) {
        toast({ title: 'Planejamento não encontrado', description: 'O registro não existe ou foi removido.', variant: 'destructive' });
        navigate('/planejamento');
        return;
      }
      setPlanning(data);

      // Load related data
      const promises: Array<PromiseLike<any>> = [];
      if (data.course_id) promises.push(planejamentoApi.getEntityName('courses', data.course_id).then(name => ({ data: { nome: name } })).then(r => { if (r.data) setCourse(r.data as any); }));
      if (data.subject_id) promises.push(planejamentoApi.getEntityName('subjects', data.subject_id).then(name => ({ data: { nome: name } })).then(r => { if (r.data) setSubject(r.data as any); }));
      if (data.school_id) promises.push(planejamentoApi.getEntityName('schools', data.school_id).then(name => ({ data: { nome: name } })).then(r => { if (r.data) setSchool(r.data as any); }));
      if (data.class_group_id) promises.push(planejamentoApi.getEntityName('class_groups', data.class_group_id).then(name => ({ data: { nome: name } })).then(r => { if (r.data) setClassGroup(r.data as any); }));

      const profId = isPrePlanning ? data.professor_id : data.professor_id;
      if (profId) {
        const col = isPrePlanning ? 'id' : 'user_id';
        promises.push(planejamentoApi.getProfessorName(profId).then(name => ({ data: { full_name: name } })).then(r => { if (r.data) setProfessorName(r.data.full_name); }));
      }
      await Promise.all(promises);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar', variant: 'destructive' });
      navigate('/planejamento');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!planning) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <p>Registro não encontrado.</p>
        <Button onClick={() => navigate('/planejamento')}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        breadcrumbs={[
          { label: 'Pedagógico' },
          { label: 'Planejamento', href: '/planejamento' },
          { label: isPrePlanning ? 'Detalhes do Pré-Planejamento' : 'Detalhes do Planejamento' },
        ]}
        title={isPrePlanning ? 'Detalhes do Pré-Planejamento' : 'Detalhes do Planejamento'}
        backTo="/planejamento"
        badge={
          isPrePlanning
            ? { label: PLANNING_TYPE_LABELS[planning.planning_type as PrePlanningType] || planning.planning_type, tone: 'info' }
            : { label: PLANNING_STATUS_LABELS[planning.status as TeacherPlanningStatus] || planning.status, tone: 'default' }
        }
      />

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {professorName && (
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><User className="h-4 w-4" />Professor</div>
            <p className="font-medium">{professorName}</p>
          </CardContent></Card>
        )}
        {school && (
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><School className="h-4 w-4" />Escola</div>
            <p className="font-medium">{school.nome}</p>
          </CardContent></Card>
        )}
        {course && (
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><GraduationCap className="h-4 w-4" />Curso</div>
            <p className="font-medium">{course.nome}</p>
          </CardContent></Card>
        )}
        {subject && (
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><BookOpen className="h-4 w-4" />Disciplina</div>
            <p className="font-medium"><SubjectNameWithAnp name={subject.nome} isAnp={anpMap?.bySubject.has(subject.id)} /></p>
          </CardContent></Card>
        )}
      </div>

      {classGroup && (
        <Card><CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div><span className="text-muted-foreground">Turma:</span> <span className="font-medium ml-1">{classGroup.nome}</span></div>
            {planning.bimester_number && <div><span className="text-muted-foreground">Bimestre:</span> <span className="font-medium ml-1">{planning.bimester_number}º</span></div>}
            {isPrePlanning && <div><span className="text-muted-foreground">Ano:</span> <span className="font-medium ml-1">{planning.reference_year}</span></div>}
          </div>
        </CardContent></Card>
      )}

      <Separator />

      {/* Content */}
      <Card>
        <CardHeader><CardTitle>Conteúdo Pedagógico</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <DetailSection title="Objetivo" content={planning.objective} />
          <DetailSection title="Competências" content={planning.competencies} />
          <DetailSection title="Conteúdos" content={planning.contents} />
          <DetailSection title="Metodologia" content={planning.methodology} />
          <DetailSection title="Recursos" content={planning.resources} />
          <DetailSection title="Avaliação" content={planning.evaluation} />
          <DetailSection title="Produto/Registro" content={planning.product} />
          <DetailSection title="Próximos Passos" content={planning.next_steps} />
        </CardContent>
      </Card>

      {!isPrePlanning && planning.coordinator_feedback && (
        <Card>
          <CardHeader><CardTitle>Feedback do Coordenador</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{planning.coordinator_feedback}</p>
          </CardContent>
        </Card>
      )}

      {!isPrePlanning && planning.rejection_reason && (
        <Card className="border-destructive">
          <CardHeader><CardTitle className="text-destructive">Motivo da Rejeição</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{planning.rejection_reason}</p>
          </CardContent>
        </Card>
      )}

      {!isPrePlanning && planning.finalization_justification && (
        <Card className="border-amber-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Justificativa de Finalização sem Assinatura do Professor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{planning.finalization_justification}</p>
          </CardContent>
        </Card>
      )}

      {!isPrePlanning && <FeedbackHistory teacherPlanningId={planning.id} />}

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => navigate('/planejamento')}>Voltar</Button>
      </div>
    </div>
  );
}

function DetailSection({ title, content }: { title: string; content: string }) {
  if (!content) return null;
  return (
    <div>
      <span className="font-medium text-sm">{title}</span>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{content}</p>
    </div>
  );
}
