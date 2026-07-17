import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Download, Eye, PenLine, X } from 'lucide-react';
import { ORIENTATION_TYPE_LABELS, ORIENTATION_STATUS_LABELS, type Orientation } from '@/types/academic';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrientationDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orientation: Orientation | null;
  getProfessorName: (id: string) => string;
  getSchoolName: (id?: string) => string;
  getCourseName: (id?: string) => string;
  getOrientationDate: (o: Orientation) => Date;
  getOrientationTime: (o: Orientation) => string;
  getStatusBadgeClasses: (status: string) => string;
  canProfessorSign: boolean;
  isCoordinator: boolean;
  onSign: (o: Orientation) => void;
  onGeneratePDF: (o: Orientation) => void;
}

export function OrientationDetailDialog({
  open, onOpenChange, orientation,
  getProfessorName, getSchoolName, getCourseName,
  getOrientationDate, getOrientationTime, getStatusBadgeClasses,
  canProfessorSign, isCoordinator, onSign, onGeneratePDF,
}: OrientationDetailDialogProps) {
  if (!orientation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalhes da Orientação
            <Badge variant="outline">
              {ORIENTATION_TYPE_LABELS[orientation.orientation_type as keyof typeof ORIENTATION_TYPE_LABELS]}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><span className="font-medium">Professor:</span><p className="text-muted-foreground">{getProfessorName(orientation.professor_id)}</p></div>
            <div><span className="font-medium">Escola:</span><p className="text-muted-foreground">{getSchoolName(orientation.school_id)}</p></div>
            {orientation.course_id && <div><span className="font-medium">Curso:</span><p className="text-muted-foreground">{getCourseName(orientation.course_id)}</p></div>}
            <div><span className="font-medium">Data Agendada:</span><p className="text-muted-foreground">{format(getOrientationDate(orientation), 'dd/MM/yyyy', { locale: ptBR })} — {getOrientationTime(orientation)}</p></div>
            <div><span className="font-medium">Status:</span><p><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getStatusBadgeClasses(orientation.status)}`}>{ORIENTATION_STATUS_LABELS[orientation.status as keyof typeof ORIENTATION_STATUS_LABELS] || orientation.status}</span></p></div>
          </div>
          <Separator />
          <div className="space-y-4">
            {orientation.scheduling_notes && (
              <div>
                <span className="font-medium text-sm">Observações do Agendamento</span>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{orientation.scheduling_notes}</p>
              </div>
            )}
            {orientation.description && (
              <div>
                <span className="font-medium text-sm">Descrição da Orientação</span>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{orientation.description}</p>
              </div>
            )}
            {orientation.status === 'CANCELADO' && (orientation as any).cancellation_reason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2"><X className="h-4 w-4 text-red-600" /><span className="font-medium text-sm text-red-700">Motivo do Cancelamento</span></div>
                <p className="text-sm text-red-600 whitespace-pre-wrap">{(orientation as any).cancellation_reason}</p>
              </div>
            )}
            {orientation.status === 'ASSINADO_PROFESSOR' && orientation.signature_photo_url && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span className="font-medium text-sm text-emerald-700">Assinatura Digital</span></div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium">Assinado por:</span><p className="text-muted-foreground">{getProfessorName(orientation.professor_id)}</p></div>
                    {orientation.signed_at && <div><span className="font-medium">Data e Hora:</span><p className="text-muted-foreground">{format(new Date(orientation.signed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p></div>}
                  </div>
                  <div><span className="font-medium text-sm block mb-2">Foto da Assinatura:</span><img src={orientation.signature_photo_url} alt="Foto da assinatura" className="w-full max-w-md rounded-lg border" /></div>
                </div>
              </div>
            )}
            {orientation.evidence_urls && orientation.evidence_urls.length > 0 && (
              <div>
                <span className="font-medium text-sm">Evidências ({orientation.evidence_urls.length})</span>
                <div className="mt-2 space-y-2">
                  {orientation.evidence_urls.map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline block">📎 Evidência {idx + 1}</a>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            {canProfessorSign && orientation.status === 'AGUARDANDO_ASSINATURA_PROFESSOR' && (
              <Button onClick={() => { onOpenChange(false); onSign(orientation); }} className="gap-2 bg-amber-600 hover:bg-amber-700"><PenLine className="h-4 w-4" />Assinar Orientação</Button>
            )}
            {isCoordinator && orientation.status === 'ASSINADO_PROFESSOR' && (
              <Button onClick={() => onGeneratePDF(orientation)} className="gap-2"><Download className="h-4 w-4" />Gerar PDF</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
