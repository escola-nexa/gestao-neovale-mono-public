import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, Info, Send, RotateCcw, PenTool } from 'lucide-react';
import { teacherPlanningsApi, TeacherPlanningData, PrePlanningData } from '@/services/supabaseApi';
import { PLANNING_STATUS_LABELS, TeacherPlanningStatus } from '@/types/academic';
import { planejamentoApi } from '@/features/planejamento/api';
import { DigitalSignatureDialog } from './DigitalSignatureDialog';

interface TeacherPlanningFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planning: TeacherPlanningData | null;
  prePlanning: PrePlanningData | null;
  isCoordinator: boolean;
  onSuccess: () => void;
}

interface FormData {
  objective: string;
  competencies: string;
  contents: string;
  methodology: string;
  resources: string;
  evaluation: string;
  product: string;
  next_steps: string;
  status: TeacherPlanningStatus;
  coordinator_feedback: string;
  rejection_reason: string;
}

const emptyForm: FormData = {
  objective: '',
  competencies: '',
  contents: '',
  methodology: '',
  resources: '',
  evaluation: '',
  product: '',
  next_steps: '',
  status: 'DRAFT',
  coordinator_feedback: '',
  rejection_reason: '',
};

// Status labels for new flow
const NEW_STATUS_LABELS: Record<TeacherPlanningStatus, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Enviado', // Legacy mapping
  APPROVED: 'Assinado', // Legacy mapping
  REJECTED: 'Devolvido', // Legacy mapping
  ENVIADO: 'Enviado',
  DEVOLVIDO: 'Devolvido',
  ASSINADO: 'Assinado',
  AGUARDANDO_ASSINATURA: 'Aguardando Assinatura Professor',
  AGUARDANDO_ASSINATURA_COORDENADOR: 'Aguardando Assinatura Coordenador',
  CONCLUIDO: 'Concluído',
};

export function TeacherPlanningForm({ 
  open, 
  onOpenChange, 
  planning, 
  prePlanning, 
  isCoordinator, 
  onSuccess 
}: TeacherPlanningFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);

  useEffect(() => {
    if (planning) {
      setFormData({
        objective: planning.objective,
        competencies: planning.competencies,
        contents: planning.contents,
        methodology: planning.methodology,
        resources: planning.resources,
        evaluation: planning.evaluation,
        product: planning.product,
        next_steps: planning.next_steps,
        status: planning.status as TeacherPlanningStatus,
        coordinator_feedback: planning.coordinator_feedback || '',
        rejection_reason: planning.rejection_reason || '',
      });
    } else if (prePlanning) {
      // Pre-fill from pre-planning
      setFormData({
        ...emptyForm,
        objective: prePlanning.objective,
        competencies: prePlanning.competencies,
        contents: prePlanning.contents,
        methodology: prePlanning.methodology,
        resources: prePlanning.resources,
        evaluation: prePlanning.evaluation,
        product: prePlanning.product,
        next_steps: prePlanning.next_steps,
      });
    } else {
      setFormData(emptyForm);
    }
  }, [planning, prePlanning, open]);

  // Normalize status for display (handle legacy values)
  const normalizeStatus = (status: TeacherPlanningStatus): string => {
    if (status === 'PENDING') return 'ENVIADO';
    if (status === 'APPROVED') return 'ASSINADO';
    if (status === 'REJECTED') return 'DEVOLVIDO';
    return status;
  };

  // Save as draft
  const handleSaveDraft = async () => {
    if (!formData.objective) {
      toast({ title: 'Preencha o objetivo', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const payload = {
        objective: formData.objective,
        competencies: formData.competencies,
        contents: formData.contents,
        methodology: formData.methodology,
        resources: formData.resources,
        evaluation: formData.evaluation,
        product: formData.product,
        next_steps: formData.next_steps,
        professor_id: user.id,
        pre_planning_id: prePlanning?.id || planning?.pre_planning_id || null,
        occurrence_id: prePlanning?.occurrence_id || planning?.occurrence_id || null,
        school_id: prePlanning?.school_id || planning?.school_id || null,
        course_id: prePlanning?.course_id || planning?.course_id || null,
        class_group_id: prePlanning?.class_group_id || planning?.class_group_id || null,
        subject_id: prePlanning?.subject_id || planning?.subject_id || null,
        bimester_number: prePlanning?.bimester_number || planning?.bimester_number || null,
        week_number: (prePlanning as any)?.week_number || planning?.week_number || null,
        week_start_date: (prePlanning as any)?.week_start_date || planning?.week_start_date || null,
        week_end_date: (prePlanning as any)?.week_end_date || planning?.week_end_date || null,
        class_date: (prePlanning as any)?.class_date || planning?.class_date || null,
        start_time: (prePlanning as any)?.start_time || planning?.start_time || null,
        end_time: (prePlanning as any)?.end_time || planning?.end_time || null,
        status: 'DRAFT' as TeacherPlanningStatus,
        coordinator_feedback: null,
        rejection_reason: null,
        professor_signed: false,
        coordinator_signed: false,
        finalized_at: null,
        finalization_justification: null,
      };

      if (planning) {
        await teacherPlanningsApi.update(planning.id, payload);
        toast({ title: 'Rascunho salvo!' });
      } else {
        await teacherPlanningsApi.create(payload);
        toast({ title: 'Planejamento criado como rascunho!' });
      }
      onSuccess();
    } catch (error: any) {
      toast({ title: error.message || 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Submit for coordinator review (ENVIADO status)
  const handleSubmit = async () => {
    if (!formData.objective) {
      toast({ title: 'Preencha o objetivo', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const payload = {
        objective: formData.objective,
        competencies: formData.competencies,
        contents: formData.contents,
        methodology: formData.methodology,
        resources: formData.resources,
        evaluation: formData.evaluation,
        product: formData.product,
        next_steps: formData.next_steps,
        professor_id: user.id,
        pre_planning_id: prePlanning?.id || planning?.pre_planning_id || null,
        occurrence_id: prePlanning?.occurrence_id || planning?.occurrence_id || null,
        school_id: prePlanning?.school_id || planning?.school_id || null,
        course_id: prePlanning?.course_id || planning?.course_id || null,
        class_group_id: prePlanning?.class_group_id || planning?.class_group_id || null,
        subject_id: prePlanning?.subject_id || planning?.subject_id || null,
        bimester_number: prePlanning?.bimester_number || planning?.bimester_number || null,
        week_number: (prePlanning as any)?.week_number || planning?.week_number || null,
        week_start_date: (prePlanning as any)?.week_start_date || planning?.week_start_date || null,
        week_end_date: (prePlanning as any)?.week_end_date || planning?.week_end_date || null,
        class_date: (prePlanning as any)?.class_date || planning?.class_date || null,
        start_time: (prePlanning as any)?.start_time || planning?.start_time || null,
        end_time: (prePlanning as any)?.end_time || planning?.end_time || null,
        status: 'ENVIADO' as TeacherPlanningStatus,
        coordinator_feedback: null,
        rejection_reason: null,
        professor_signed: false,
        coordinator_signed: false,
        finalized_at: null,
        finalization_justification: null,
      };

      if (planning) {
        await teacherPlanningsApi.update(planning.id, payload);
        toast({ title: 'Planejamento enviado para análise!' });
      } else {
        await teacherPlanningsApi.create(payload);
        toast({ title: 'Planejamento criado e enviado!' });
      }
      onSuccess();
    } catch (error: any) {
      toast({ title: error.message || 'Erro ao enviar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Coordinator returns planning with feedback (DEVOLVIDO status)
  const handleReturn = async () => {
    if (!planning || !formData.coordinator_feedback) {
      toast({ title: 'Informe a orientação para o professor', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await teacherPlanningsApi.update(planning.id, { 
        status: 'DEVOLVIDO' as TeacherPlanningStatus,
        coordinator_feedback: formData.coordinator_feedback,
      });
      toast({ title: 'Planejamento devolvido com orientação' });
      onSuccess();
    } catch (error: any) {
      toast({ title: error.message || 'Erro ao devolver', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Professor can edit if: no planning yet, or status is DRAFT or DEVOLVIDO
  const canEdit = !isCoordinator && (!planning || 
    planning.status === 'DRAFT' || 
    planning.status === 'DEVOLVIDO' || 
    planning.status === 'REJECTED'); // Legacy support

  // Coordinator can act when status is ENVIADO (or legacy PENDING)
  const showCoordinatorActions = isCoordinator && 
    (planning?.status === 'ENVIADO' || planning?.status === 'PENDING');

  // Professor can sign when status is ENVIADO (after coordinator analysis) or DEVOLVIDO (after fixing)
  // But in the new flow, professor signs only after their final review
  const canSign = !isCoordinator && planning && 
    (planning.status === 'DRAFT' || planning.status === 'DEVOLVIDO' || planning.status === 'REJECTED') &&
    !planning.professor_signed;

  // Is the planning finalized (signed)?
  const isFinalized = planning?.status === 'ASSINADO' || planning?.status === 'APPROVED' || planning?.professor_signed;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {planning ? 'Editar Planejamento' : 'Novo Planejamento'}
              {planning && (
                <Badge variant="outline" className="ml-2">
                  {NEW_STATUS_LABELS[planning.status as TeacherPlanningStatus] || planning.status}
                </Badge>
              )}
            </DialogTitle>
            {prePlanning?.class_date && (
              <DialogDescription className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Aula: {new Date(prePlanning.class_date).toLocaleDateString('pt-BR')}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Signed alert */}
            {isFinalized && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Este planejamento foi assinado e está imutável. Ele serve como evidência institucional.
                </AlertDescription>
              </Alert>
            )}

            {/* Coordinator feedback if returned */}
            {(planning?.status === 'DEVOLVIDO' || planning?.status === 'REJECTED') && planning.coordinator_feedback && (
              <Alert>
                <RotateCcw className="h-4 w-4" />
                <AlertDescription>
                  <strong>Orientação da Coordenação:</strong><br />
                  {planning.coordinator_feedback}
                </AlertDescription>
              </Alert>
            )}

            {/* 8 Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Objetivo *</Label>
                <Textarea 
                  value={formData.objective} 
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  placeholder="Descreva os objetivos..."
                  rows={2}
                  disabled={!canEdit || isFinalized}
                />
              </div>
              <div className="space-y-2">
                <Label>Competências</Label>
                <Textarea 
                  value={formData.competencies} 
                  onChange={(e) => setFormData({ ...formData, competencies: e.target.value })}
                  placeholder="Competências a serem desenvolvidas..."
                  rows={2}
                  disabled={!canEdit || isFinalized}
                />
              </div>
              <div className="space-y-2">
                <Label>Conteúdos</Label>
                <Textarea 
                  value={formData.contents} 
                  onChange={(e) => setFormData({ ...formData, contents: e.target.value })}
                  placeholder="Conteúdos programáticos..."
                  rows={2}
                  disabled={!canEdit || isFinalized}
                />
              </div>
              <div className="space-y-2">
                <Label>Metodologia</Label>
                <Textarea 
                  value={formData.methodology} 
                  onChange={(e) => setFormData({ ...formData, methodology: e.target.value })}
                  placeholder="Estratégias metodológicas..."
                  rows={2}
                  disabled={!canEdit || isFinalized}
                />
              </div>
              <div className="space-y-2">
                <Label>Recursos</Label>
                <Textarea 
                  value={formData.resources} 
                  onChange={(e) => setFormData({ ...formData, resources: e.target.value })}
                  placeholder="Recursos didáticos..."
                  rows={2}
                  disabled={!canEdit || isFinalized}
                />
              </div>
              <div className="space-y-2">
                <Label>Avaliação</Label>
                <Textarea 
                  value={formData.evaluation} 
                  onChange={(e) => setFormData({ ...formData, evaluation: e.target.value })}
                  placeholder="Critérios de avaliação..."
                  rows={2}
                  disabled={!canEdit || isFinalized}
                />
              </div>
              <div className="space-y-2">
                <Label>Produto/Registro</Label>
                <Textarea 
                  value={formData.product} 
                  onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                  placeholder="Produtos ou registros..."
                  rows={2}
                  disabled={!canEdit || isFinalized}
                />
              </div>
              <div className="space-y-2">
                <Label>Próximos Passos</Label>
                <Textarea 
                  value={formData.next_steps} 
                  onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
                  placeholder="Continuidade..."
                  rows={2}
                  disabled={!canEdit || isFinalized}
                />
              </div>
            </div>

            {/* Coordinator feedback input */}
            {showCoordinatorActions && (
              <div className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <Label>Orientação para o Professor (obrigatória para devolver)</Label>
                  <Textarea 
                    value={formData.coordinator_feedback} 
                    onChange={(e) => setFormData({ ...formData, coordinator_feedback: e.target.value })}
                    placeholder="Orientações, ajustes necessários, comentários..."
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              {isFinalized ? 'Fechar' : 'Cancelar'}
            </Button>
            
            {showCoordinatorActions && (
              <Button variant="secondary" onClick={handleReturn} disabled={saving} className="w-full sm:w-auto">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <RotateCcw className="mr-2 h-4 w-4" />
                Devolver com Orientação
              </Button>
            )}
            
            {canEdit && !isFinalized && (
              <>
                <Button variant="secondary" onClick={handleSaveDraft} disabled={saving} className="w-full sm:w-auto">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Rascunho
                </Button>
                <Button variant="outline" onClick={handleSubmit} disabled={saving} className="w-full sm:w-auto">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Send className="mr-2 h-4 w-4" />
                  Enviar
                </Button>
                {planning && (
                  <Button onClick={() => setSignatureDialogOpen(true)} disabled={saving} className="w-full sm:w-auto">
                    <PenTool className="mr-2 h-4 w-4" />
                    Assinar
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Digital Signature Dialog */}
      {planning && (
        <DigitalSignatureDialog
          open={signatureDialogOpen}
          onOpenChange={setSignatureDialogOpen}
          planningId={planning.id}
          onSuccess={() => {
            setSignatureDialogOpen(false);
            onSuccess();
          }}
        />
      )}
    </>
  );
}
