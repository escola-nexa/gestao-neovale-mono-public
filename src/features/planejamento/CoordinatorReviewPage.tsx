import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, RotateCcw, PenTool, Info, User, School, BookOpen, GraduationCap, Calendar, Lock, FileDown, Send, AlertTriangle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { isManagerRole } from '@/lib/roles';
import { teacherPlanningsApi, TeacherPlanningData, schoolsApi, coursesApi, subjectsApi, classGroupsApi, SchoolData, CourseData, SubjectData, ClassGroupData } from '@/services/supabaseApi';
import { TeacherPlanningStatus } from '@/types/academic';
import { planejamentoApi } from '@/features/planejamento/api';
import { DigitalSignatureDialog } from './components/DigitalSignatureDialog';
import { FeedbackHistory } from './components/FeedbackHistory';
import { PageHeader } from '@/components/PageHeader';
import { ClipboardCheck } from 'lucide-react';

// Status labels
const STATUS_LABELS: Record<TeacherPlanningStatus, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Enviado',
  APPROVED: 'Assinado',
  REJECTED: 'Devolvido',
  ENVIADO: 'Enviado',
  DEVOLVIDO: 'Devolvido',
  ASSINADO: 'Assinado',
  AGUARDANDO_ASSINATURA: 'Aguardando Assinatura Professor',
  AGUARDANDO_ASSINATURA_COORDENADOR: 'Aguardando Assinatura Coordenador',
  CONCLUIDO: 'Concluído',
};

interface ProfessorInfo {
  id: string;
  full_name: string;
}

export default function CoordinatorReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const isCoordinator = isManagerRole(user?.perfil);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planning, setPlanning] = useState<TeacherPlanningData | null>(null);
  const [professor, setProfessor] = useState<ProfessorInfo | null>(null);
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [course, setCourse] = useState<CourseData | null>(null);
  const [subject, setSubject] = useState<SubjectData | null>(null);
  const [classGroup, setClassGroup] = useState<ClassGroupData | null>(null);
  const [signatures, setSignatures] = useState<any[]>([]);
  
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [justificationDialogOpen, setJustificationDialogOpen] = useState(false);
  const [finalizationJustification, setFinalizationJustification] = useState('');
  
  // Editable fields
  const [formData, setFormData] = useState({
    objective: '',
    competencies: '',
    contents: '',
    methodology: '',
    resources: '',
    evaluation: '',
    product: '',
    next_steps: '',
    coordinator_feedback: '',
  });

  useEffect(() => {
    if (id) {
      loadPlanning();
    }
  }, [id]);

  const loadPlanning = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      // Fetch planning
      const planningData = await planejamentoApi.getTeacherPlanning(id);
      
      if (!planningData) throw new Error('Planejamento não encontrado');
      setPlanning(planningData);
      
      // Set form data
      setFormData({
        objective: planningData.objective || '',
        competencies: planningData.competencies || '',
        contents: planningData.contents || '',
        methodology: planningData.methodology || '',
        resources: planningData.resources || '',
        evaluation: planningData.evaluation || '',
        product: planningData.product || '',
        next_steps: planningData.next_steps || '',
        coordinator_feedback: planningData.coordinator_feedback || '',
      });
      
      // Fetch related data in parallel
      const fetchProfessor = async () => {
        if (planningData.professor_id) {
          const data = await planejamentoApi.getProfessorByUserId(planningData.professor_id);
          if (data) setProfessor(data);
        }
      };
      
      const fetchSchool = async () => {
        if (planningData.school_id) {
          const data = await schoolsApi.getById(planningData.school_id);
          if (data) setSchool(data);
        }
      };
      
      const fetchCourse = async () => {
        if (planningData.course_id) {
          const data = await coursesApi.getById(planningData.course_id);
          if (data) setCourse(data);
        }
      };
      
      const fetchSubject = async () => {
        if (planningData.subject_id) {
          const data = await subjectsApi.getById(planningData.subject_id);
          if (data) setSubject(data);
        }
      };
      
      const fetchClassGroup = async () => {
        if (planningData.class_group_id) {
          const data = await classGroupsApi.getById(planningData.class_group_id);
          if (data) setClassGroup(data);
        }
      };
      
      const fetchSignatures = async () => {
        const data = await planejamentoApi.getSignatures(id!);
        
        if (data && data.length > 0) {
          // Load profile names for each signature
          const enriched = await Promise.all(data.map(async (sig) => {
            const profile = await planejamentoApi.getProfile(sig.user_id);
            return { ...sig, user_name: profile?.full_name || 'Usuário' };
          }));
          setSignatures(enriched);
        }
      };

      await Promise.all([
        fetchProfessor(),
        fetchSchool(),
        fetchCourse(),
        fetchSubject(),
        fetchClassGroup(),
        fetchSignatures(),
      ]);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar planejamento', description: error.message, variant: 'destructive' });
      navigate('/planejamento');
    } finally {
      setLoading(false);
    }
  };

  // Check if planning is finalized (signed)
  const isFinalized = planning?.status === 'ASSINADO' || planning?.status === 'APPROVED' || (planning?.coordinator_signed && planning?.professor_signed);

  // Coordinator can always act unless the planning is finalized
  const canCoordinatorAct = isCoordinator && !isFinalized;

  // Coordinator can sign (to finalize) when professor already signed
  const canCoordinatorSign = isCoordinator && !isFinalized && 
    planning?.professor_signed && !planning?.coordinator_signed;

  // Coordinator can send for professor signature when professor hasn't signed yet and status is not already awaiting
  const canSendForSignature = canCoordinatorAct && !planning?.professor_signed && planning?.status !== 'AGUARDANDO_ASSINATURA';

  // Can finalize with pending (without professor signature) - only after sent for signature
  const canFinalizeWithPending = canCoordinatorAct && !planning?.professor_signed && planning?.status === 'AGUARDANDO_ASSINATURA';

  // Save changes (editing fields)
  const handleSaveChanges = async () => {
    if (!planning) return;
    
    setSaving(true);
    try {
      await teacherPlanningsApi.update(planning.id, {
        objective: formData.objective,
        competencies: formData.competencies,
        contents: formData.contents,
        methodology: formData.methodology,
        resources: formData.resources,
        evaluation: formData.evaluation,
        product: formData.product,
        next_steps: formData.next_steps,
      });
      toast({ title: 'Alterações salvas!' });
      loadPlanning();
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Return to professor with feedback
  const handleReturn = async () => {
    if (!planning || !formData.coordinator_feedback.trim()) {
      toast({ title: 'Informe a orientação para o professor', variant: 'destructive' });
      return;
    }
    
    setSaving(true);
    try {
      // Save feedback history record
      const profile = await planejamentoApi.getProfile(user!.id);

      await planejamentoApi.addFeedback({
        teacher_planning_id: planning.id,
        organization_id: planning.organization_id,
        coordinator_id: user!.id,
        coordinator_name: profile?.full_name || 'Coordenador',
        feedback: formData.coordinator_feedback,
        action: 'DEVOLVIDO',
      });

      await teacherPlanningsApi.update(planning.id, {
        status: 'DEVOLVIDO' as TeacherPlanningStatus,
        coordinator_feedback: formData.coordinator_feedback,
        objective: formData.objective,
        competencies: formData.competencies,
        contents: formData.contents,
        methodology: formData.methodology,
        resources: formData.resources,
        evaluation: formData.evaluation,
        product: formData.product,
        next_steps: formData.next_steps,
      });
      toast({ title: 'Planejamento devolvido com orientação' });
      navigate('/planejamento');
    } catch (error: any) {
      toast({ title: 'Erro ao devolver', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Send planning for professor signature (AGUARDANDO_ASSINATURA)
  const handleSendForSignature = async () => {
    if (!planning) return;
    setSaving(true);
    try {
      await teacherPlanningsApi.update(planning.id, {
        status: 'AGUARDANDO_ASSINATURA' as TeacherPlanningStatus,
        // Also save any content changes
        objective: formData.objective,
        competencies: formData.competencies,
        contents: formData.contents,
        methodology: formData.methodology,
        resources: formData.resources,
        evaluation: formData.evaluation,
        product: formData.product,
        next_steps: formData.next_steps,
      });
      toast({ title: 'Planejamento enviado para assinatura do professor' });
      navigate('/planejamento');
    } catch (error: any) {
      toast({ title: 'Erro ao enviar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Generate PDF
  const handleGeneratePDF = useCallback(() => {
    if (!planning) return;

    const sections = [
      { title: 'Objetivo', content: planning.objective },
      { title: 'Competências', content: planning.competencies },
      { title: 'Conteúdos', content: planning.contents },
      { title: 'Metodologia', content: planning.methodology },
      { title: 'Recursos', content: planning.resources },
      { title: 'Avaliação', content: planning.evaluation },
      { title: 'Produto/Registro', content: planning.product },
      { title: 'Próximos Passos', content: planning.next_steps },
    ];

    const profSig = signatures.find(s => s.signature_type === 'PROFESSOR');
    const coordSig = signatures.find(s => s.signature_type === 'COORDINATOR');

    const sigBox = (sig: any, label: string, role: string) => {
      if (!sig) return `<div class="sig-box"><div class="sig-label">${label}</div><div style="color:#999;">Pendente</div></div>`;
      return `<div class="sig-box">
        <div class="sig-label">${label}</div>
        ${sig.photo_url ? `<img src="${sig.photo_url}" style="width:120px;height:90px;object-fit:cover;border-radius:4px;margin:8px 0;" />` : ''}
        <div style="font-weight:600;">${sig.user_name || '-'}</div>
        <div style="color:#666;font-size:10px;">${role}</div>
        <div class="sig-check">✓ Assinado em ${new Date(sig.signed_at).toLocaleString('pt-BR')}</div>
      </div>`;
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html><head><meta charset="utf-8">
      <title>Planejamento Pedagógico</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        h1 { font-size: 20px; text-align: center; margin-bottom: 8px; }
        .subtitle { text-align: center; color: #666; margin-bottom: 24px; font-size: 12px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 24px; border: 1px solid #ddd; padding: 12px; border-radius: 4px; }
        .info-item { font-size: 12px; }
        .info-label { color: #666; }
        .info-value { font-weight: 600; }
        .section { margin-bottom: 16px; }
        .section-title { font-size: 13px; font-weight: 600; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-bottom: 6px; }
        .section-content { font-size: 12px; white-space: pre-wrap; line-height: 1.5; }
        .signatures { margin-top: 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .sig-box { border: 1px solid #ddd; padding: 12px; border-radius: 4px; font-size: 11px; text-align: center; }
        .sig-label { font-weight: 600; margin-bottom: 4px; }
        .sig-check { color: green; margin-top: 4px; }
        .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #999; }
      </style></head><body>
      <h1>Planejamento Pedagógico</h1>
      <div class="subtitle">Documento assinado digitalmente</div>
      <div class="info-grid">
        <div class="info-item"><span class="info-label">Professor: </span><span class="info-value">${professor?.full_name || '-'}</span></div>
        <div class="info-item"><span class="info-label">Escola: </span><span class="info-value">${school?.nome || '-'}</span></div>
        <div class="info-item"><span class="info-label">Curso: </span><span class="info-value">${course?.nome || '-'}</span></div>
        <div class="info-item"><span class="info-label">Disciplina: </span><span class="info-value">${subject?.nome || '-'}</span></div>
        <div class="info-item"><span class="info-label">Turma: </span><span class="info-value">${classGroup?.nome || '-'}</span></div>
        <div class="info-item"><span class="info-label">Bimestre: </span><span class="info-value">${planning.bimester_number ? planning.bimester_number + 'º' : '-'}</span></div>
        ${planning.class_date ? `<div class="info-item"><span class="info-label">Data da Aula: </span><span class="info-value">${new Date(planning.class_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span></div>` : ''}
        ${planning.start_time && planning.end_time ? `<div class="info-item"><span class="info-label">Horário: </span><span class="info-value">${planning.start_time?.toString().slice(0, 5)} - ${planning.end_time?.toString().slice(0, 5)}</span></div>` : ''}
      </div>
      ${sections.map(s => s.content ? `<div class="section"><div class="section-title">${s.title}</div><div class="section-content">${s.content}</div></div>` : '').join('')}
      ${(planning as any).finalization_justification ? `<div class="section" style="border:1px solid #f59e0b;padding:12px;border-radius:4px;background:#fffbeb;"><div class="section-title" style="color:#92400e;">⚠ Justificativa de Finalização sem Assinatura do Professor</div><div class="section-content">${(planning as any).finalization_justification}</div></div>` : ''}
      <div class="signatures">
        ${sigBox(profSig, 'Assinatura do Professor', 'Professor')}
        ${sigBox(coordSig, 'Assinatura do Coordenador', 'Coordenador')}
      </div>
      <div class="footer">Gerado em ${new Date().toLocaleString('pt-BR')} • Este documento é uma evidência institucional</div>
      </body></html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => printWindow.print();
    }
  }, [planning, professor, school, course, subject, classGroup, signatures]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!planning) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <p>Planejamento não encontrado.</p>
        <Button onClick={() => navigate('/planejamento')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Pedagógico' },
          { label: 'Planejamento', href: '/planejamento' },
          { label: 'Revisão' },
        ]}
        title="Revisão do Planejamento"
        description="Analise, edite e aprove ou devolva o planejamento"
        icon={ClipboardCheck}
        backTo="/planejamento"
        badge={{
          label: STATUS_LABELS[planning.status as TeacherPlanningStatus] || planning.status,
          tone: isFinalized ? 'success' : 'default',
        }}
      />

      {/* Finalized Alert */}
      {isFinalized && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Este planejamento foi <strong>assinado em {planning.finalized_at ? new Date(planning.finalized_at).toLocaleString('pt-BR') : '-'}</strong> e está imutável. Ele serve como evidência institucional.
          </AlertDescription>
        </Alert>
      )}

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <User className="h-4 w-4" />
              Professor
            </div>
            <p className="font-medium">{professor?.full_name || '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <School className="h-4 w-4" />
              Escola
            </div>
            <p className="font-medium">{school?.nome || '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <GraduationCap className="h-4 w-4" />
              Curso
            </div>
            <p className="font-medium">{course?.nome || '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <BookOpen className="h-4 w-4" />
              Disciplina
            </div>
            <p className="font-medium">{subject?.nome || '-'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Info */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 text-sm">
            {classGroup && (
              <div>
                <span className="text-muted-foreground">Turma:</span>
                <span className="ml-2 font-medium">{classGroup.nome}</span>
              </div>
            )}
            {planning.bimester_number && (
              <div>
                <span className="text-muted-foreground">Bimestre:</span>
                <span className="ml-2 font-medium">{planning.bimester_number}º</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Criado em:</span>
              <span className="ml-2 font-medium">{new Date(planning.created_at).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Content Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Conteúdo do Planejamento</CardTitle>
          <CardDescription>
            {isFinalized ? 'Visualização do planejamento finalizado' : 'Revise e edite conforme necessário'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Objetivo *</Label>
            <Textarea 
              value={formData.objective} 
              onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
              rows={3}
              disabled={isFinalized}
            />
          </div>
          <div className="space-y-2">
            <Label>Competências</Label>
            <Textarea 
              value={formData.competencies} 
              onChange={(e) => setFormData({ ...formData, competencies: e.target.value })}
              rows={3}
              disabled={isFinalized}
            />
          </div>
          <div className="space-y-2">
            <Label>Conteúdos</Label>
            <Textarea 
              value={formData.contents} 
              onChange={(e) => setFormData({ ...formData, contents: e.target.value })}
              rows={3}
              disabled={isFinalized}
            />
          </div>
          <div className="space-y-2">
            <Label>Metodologia</Label>
            <Textarea 
              value={formData.methodology} 
              onChange={(e) => setFormData({ ...formData, methodology: e.target.value })}
              rows={3}
              disabled={isFinalized}
            />
          </div>
          <div className="space-y-2">
            <Label>Recursos</Label>
            <Textarea 
              value={formData.resources} 
              onChange={(e) => setFormData({ ...formData, resources: e.target.value })}
              rows={2}
              disabled={isFinalized}
            />
          </div>
          <div className="space-y-2">
            <Label>Avaliação</Label>
            <Textarea 
              value={formData.evaluation} 
              onChange={(e) => setFormData({ ...formData, evaluation: e.target.value })}
              rows={2}
              disabled={isFinalized}
            />
          </div>
          <div className="space-y-2">
            <Label>Produto/Registro</Label>
            <Textarea 
              value={formData.product} 
              onChange={(e) => setFormData({ ...formData, product: e.target.value })}
              rows={2}
              disabled={isFinalized}
            />
          </div>
          <div className="space-y-2">
            <Label>Próximos Passos</Label>
            <Textarea 
              value={formData.next_steps} 
              onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
              rows={2}
              disabled={isFinalized}
            />
          </div>
        </CardContent>
      </Card>

      {/* Coordinator Feedback Section */}
      {isCoordinator && !isFinalized && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Orientação para o Professor
            </CardTitle>
            <CardDescription>
              Obrigatória para devolver o planejamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea 
              value={formData.coordinator_feedback} 
              onChange={(e) => setFormData({ ...formData, coordinator_feedback: e.target.value })}
              placeholder="Escreva orientações, ajustes necessários ou comentários..."
              rows={4}
            />
          </CardContent>
        </Card>
      )}

      {/* Previous feedback display */}
      {planning.coordinator_feedback && !isCoordinator && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Orientação da Coordenação:</strong><br />
            {planning.coordinator_feedback}
          </AlertDescription>
        </Alert>
      )}

      {/* Feedback History */}
      <FeedbackHistory teacherPlanningId={planning.id} />

      {/* Finalization Justification Display */}
      {(planning as any).finalization_justification && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <strong>Justificativa de Finalização sem Assinatura do Professor:</strong><br />
            {(planning as any).finalization_justification}
          </AlertDescription>
        </Alert>
      )}

      {/* Signatures Display */}
      {signatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Assinaturas Digitais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {signatures.map((sig) => (
                <div key={sig.id} className="border rounded-lg p-4 text-center space-y-2">
                  {sig.photo_url && (
                    <img 
                      src={sig.photo_url} 
                      alt="Foto da assinatura" 
                      className="w-32 h-24 object-cover rounded mx-auto"
                    />
                  )}
                  <p className="font-medium text-sm">{sig.user_name}</p>
                  <Badge variant="outline" className="text-xs">
                    {sig.signature_type === 'PROFESSOR' ? 'Professor' : 'Coordenador'}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Assinado em {new Date(sig.signed_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="outline" onClick={() => navigate('/planejamento')}>
          Voltar
        </Button>
        
        {canCoordinatorAct && (
          <>
            <Button variant="secondary" onClick={handleSaveChanges} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
            <Button variant="outline" onClick={handleReturn} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <RotateCcw className="mr-2 h-4 w-4" />
              Devolver com Orientação
            </Button>
            {canSendForSignature && (
              <Button onClick={handleSendForSignature} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                Enviar para Assinatura do Professor
              </Button>
            )}
            {canCoordinatorSign && (
              <Button onClick={() => setSignatureDialogOpen(true)} disabled={saving}>
                <PenTool className="mr-2 h-4 w-4" />
                Assinar e Finalizar
              </Button>
            )}
            {canFinalizeWithPending && (
              <Button onClick={() => setJustificationDialogOpen(true)} disabled={saving} variant="destructive">
                <PenTool className="mr-2 h-4 w-4" />
                Finalizar com Pendência
              </Button>
            )}
          </>
        )}

        {isFinalized && (
          <Button variant="outline" onClick={handleGeneratePDF} className="gap-2">
            <FileDown className="h-4 w-4" />
            Gerar PDF
          </Button>
        )}
      </div>

      {/* Signature Dialog */}
      {planning && (
        <DigitalSignatureDialog
          open={signatureDialogOpen}
          onOpenChange={setSignatureDialogOpen}
          planningId={planning.id}
          signatureType="COORDINATOR"
          onSuccess={async () => {
            // If finalizing with pending, save justification
            if (finalizationJustification.trim()) {
              await planejamentoApi.updateTeacherPlanning(planning.id, {
                finalization_justification: finalizationJustification,
              });
            }
            setSignatureDialogOpen(false);
            setFinalizationJustification('');
            loadPlanning();
          }}
        />
      )}

      {/* Justification Dialog for Finalizar com Pendência */}
      <AlertDialog open={justificationDialogOpen} onOpenChange={setJustificationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Finalizar sem Assinatura do Professor
            </AlertDialogTitle>
            <AlertDialogDescription>
              O professor ainda não assinou este planejamento. Informe a justificativa para finalizar sem a assinatura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label>Justificativa *</Label>
            <Textarea
              value={finalizationJustification}
              onChange={(e) => setFinalizationJustification(e.target.value)}
              placeholder="Informe o motivo da finalização sem assinatura do professor..."
              rows={4}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setFinalizationJustification(''); }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!finalizationJustification.trim()}
              onClick={() => {
                setJustificationDialogOpen(false);
                setSignatureDialogOpen(true);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Continuar para Assinatura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
  );
}
