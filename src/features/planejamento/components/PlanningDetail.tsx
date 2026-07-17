import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PrePlanningData, TeacherPlanningData, CourseData, SubjectData } from '@/services/supabaseApi';
import { PLANNING_TYPE_LABELS, PLANNING_STATUS_LABELS, PrePlanningType, TeacherPlanningStatus } from '@/types/academic';

interface PlanningDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planning: PrePlanningData | TeacherPlanningData | null;
  courses: CourseData[];
  subjects: SubjectData[];
}

export function PlanningDetail({ open, onOpenChange, planning, courses, subjects }: PlanningDetailProps) {
  if (!planning) return null;

  const isPrePlanning = 'planning_type' in planning;
  const getCourseName = (courseId: string) => courses.find(c => c.id === courseId)?.nome || '-';
  const getSubjectName = (subjectId: string) => {
    const s = subjects.find(s => s.id === subjectId);
    if (!s) return '-';
    return s.nome_boletim ? `${s.nome} (${s.nome_boletim})` : s.nome;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPrePlanning ? 'Detalhes do Pré-Planejamento' : 'Detalhes do Planejamento'}
            {isPrePlanning ? (
              <Badge variant="outline">
                {PLANNING_TYPE_LABELS[(planning as PrePlanningData).planning_type as PrePlanningType]}
              </Badge>
            ) : (
              <Badge variant="secondary">
                {PLANNING_STATUS_LABELS[(planning as TeacherPlanningData).status as TeacherPlanningStatus]}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isPrePlanning && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Curso:</span>
                <p className="text-muted-foreground">{getCourseName((planning as PrePlanningData).course_id)}</p>
              </div>
              <div>
                <span className="font-medium">Disciplina:</span>
                <p className="text-muted-foreground">{getSubjectName((planning as PrePlanningData).subject_id)}</p>
              </div>
              <div>
                <span className="font-medium">Ano:</span>
                <p className="text-muted-foreground">{(planning as PrePlanningData).reference_year}</p>
              </div>
              {(planning as PrePlanningData).bimester_number && (
                <div>
                  <span className="font-medium">Bimestre:</span>
                  <p className="text-muted-foreground">{(planning as PrePlanningData).bimester_number}º</p>
                </div>
              )}
            </div>
          )}

          <Separator />

          <div className="space-y-4">
            <DetailSection title="Objetivo" content={planning.objective} />
            <DetailSection title="Competências" content={planning.competencies} />
            <DetailSection title="Conteúdos" content={planning.contents} />
            <DetailSection title="Metodologia" content={planning.methodology} />
            <DetailSection title="Recursos" content={planning.resources} />
            <DetailSection title="Avaliação" content={planning.evaluation} />
            <DetailSection title="Produto/Registro" content={planning.product} />
            <DetailSection title="Próximos Passos" content={planning.next_steps} />
          </div>

          {!isPrePlanning && (planning as TeacherPlanningData).coordinator_feedback && (
            <>
              <Separator />
              <DetailSection 
                title="Feedback do Coordenador" 
                content={(planning as TeacherPlanningData).coordinator_feedback || ''} 
              />
            </>
          )}

          {!isPrePlanning && (planning as TeacherPlanningData).rejection_reason && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
              <span className="font-medium text-destructive">Motivo da Rejeição:</span>
              <p className="text-sm mt-1">{(planning as TeacherPlanningData).rejection_reason}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
