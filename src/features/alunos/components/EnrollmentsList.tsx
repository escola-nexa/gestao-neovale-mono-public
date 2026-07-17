import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Calendar, Building2, GraduationCap, Users, MoreHorizontal, Pencil, ArrowRightLeft, XCircle } from 'lucide-react';
import { Student, Enrollment, EnrollmentStatus } from '@/types';
import { enrollmentsApiSupabase } from '@/services/supabaseApi';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { EnrollmentDialog } from './EnrollmentDialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  enrollments: Enrollment[];
  onEnroll: () => void;
  onRefresh: () => void;
}

const statusLabels: Record<EnrollmentStatus, string> = {
  ativa: 'Ativa',
  transferida: 'Transferida',
  cancelada: 'Cancelada',
};

const statusVariants: Record<EnrollmentStatus, 'default' | 'secondary' | 'destructive'> = {
  ativa: 'default',
  transferida: 'secondary',
  cancelada: 'destructive',
};

export function EnrollmentsList({ 
  open, 
  onOpenChange, 
  student, 
  enrollments, 
  onEnroll,
  onRefresh,
}: Props) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);

  const handleCancelEnrollment = async (enrollmentId: string) => {
    try {
      await enrollmentsApiSupabase.update(enrollmentId, {
        status: 'cancelada',
        data_encerramento: new Date().toISOString().split('T')[0],
      });
      toast({ title: 'Matrícula cancelada com sucesso!' });
      onRefresh();
    } catch (error: any) {
      toast({ title: error.message || 'Erro ao cancelar matrícula', variant: 'destructive' });
    }
  };

  const handleEdit = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setEditDialogOpen(true);
  };

  const handleTransfer = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setTransferDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    setEditDialogOpen(false);
    setTransferDialogOpen(false);
    setSelectedEnrollment(null);
    onRefresh();
  };

  const activeEnrollment = enrollments.find(e => e.status === 'ativa');

  const renderActions = (enrollment: Enrollment) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleEdit(enrollment)}>
          <Pencil className="mr-2 h-4 w-4" /> Editar
        </DropdownMenuItem>
        {enrollment.status === 'ativa' && (
          <>
            <DropdownMenuItem onClick={() => handleTransfer(enrollment)}>
              <ArrowRightLeft className="mr-2 h-4 w-4" /> Transferir
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleCancelEnrollment(enrollment.id)}
              className="text-destructive"
            >
              <XCircle className="mr-2 h-4 w-4" /> Cancelar
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de Matrículas</DialogTitle>
          </DialogHeader>

          {student && (
            <div className="bg-muted/50 rounded-lg p-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{student.nomeCompleto}</p>
                <p className="text-xs text-muted-foreground">
                  Código: {student.codigoMatricula}
                </p>
              </div>
              <Button size="sm" onClick={onEnroll} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Nova Matrícula
              </Button>
            </div>
          )}

          {activeEnrollment && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-primary">Matrícula Ativa</p>
                  <p className="text-sm">
                    {activeEnrollment.escola?.nome} - {activeEnrollment.curso?.nome} - {activeEnrollment.turma?.nome || 'Sem turma'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ano Letivo: {activeEnrollment.anoLetivo}
                  </p>
                </div>
                {renderActions(activeEnrollment)}
              </div>
            </div>
          )}

          {/* Desktop Table View */}
          {!isMobile ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ano Letivo</TableHead>
                  <TableHead>Escola</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Data Matrícula</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell className="font-medium">{enrollment.anoLetivo}</TableCell>
                    <TableCell>{enrollment.escola?.nome || '-'}</TableCell>
                    <TableCell>{enrollment.curso?.nome || '-'}</TableCell>
                    <TableCell>{enrollment.turma?.nome || '-'}</TableCell>
                    <TableCell>
                      {new Date(enrollment.dataMatricula).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[enrollment.status]}>
                        {statusLabels[enrollment.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {renderActions(enrollment)}
                    </TableCell>
                  </TableRow>
                ))}
                {enrollments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma matrícula encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            /* Mobile Card View */
            <div className="space-y-3">
              {enrollments.map((enrollment) => (
                <Card key={enrollment.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant={statusVariants[enrollment.status]}>
                        {statusLabels[enrollment.status]}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{enrollment.anoLetivo}</span>
                        {renderActions(enrollment)}
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{enrollment.escola?.nome || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{enrollment.curso?.nome || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{enrollment.turma?.nome || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>
                          {new Date(enrollment.dataMatricula).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      {enrollment.observacoes && (
                        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                          {enrollment.observacoes}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {enrollments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma matrícula encontrada
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <EnrollmentDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        student={student}
        enrollment={selectedEnrollment}
        mode="edit"
        onSuccess={handleDialogSuccess}
      />

      {/* Transfer Dialog */}
      <EnrollmentDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        student={student}
        enrollment={selectedEnrollment}
        mode="transfer"
        onSuccess={handleDialogSuccess}
      />
    </>
  );
}