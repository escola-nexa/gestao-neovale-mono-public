import { useState } from 'react';
import { CreateStudentDTO } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { StudentFormStep1 } from './StudentFormStep1';
import { StudentFormStep2 } from './StudentFormStep2';
import { StudentFormStep3, EnrollmentFormData } from './StudentFormStep3';

interface StudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: CreateStudentDTO;
  setFormData: (data: CreateStudentDTO) => void;
  formStep: number;
  setFormStep: (step: number) => void;
  editingId: string | null;
  saving: boolean;
  onSave: () => void;
  validateStep1: () => boolean;
  validateStep2: () => boolean;
  // New props for step 3
  schoolId?: string;
  schoolName?: string;
  enrollmentData?: EnrollmentFormData;
  setEnrollmentData?: (data: EnrollmentFormData) => void;
  validateStep3?: () => boolean;
  preselectedClassGroupId?: string;
}

export function StudentFormDialog({
  open, onOpenChange, formData, setFormData,
  formStep, setFormStep, editingId, saving, onSave,
  validateStep1, validateStep2,
  schoolId, schoolName, enrollmentData, setEnrollmentData, validateStep3,
  preselectedClassGroupId,
}: StudentFormDialogProps) {
  const [noCoursesAvailable, setNoCoursesAvailable] = useState(false);
  // 3 steps for new student inside a school, 2 steps otherwise
  const totalSteps = (schoolId && !editingId) ? 3 : 2;
  const isLastStep = formStep === totalSteps;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingId ? 'Editar Aluno' : 'Novo Aluno'} - Etapa {formStep} de {totalSteps}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-2 w-16 sm:w-24 rounded-full transition-colors ${
                formStep >= i + 1 ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step labels */}
        <div className="flex items-center justify-center gap-4 mb-2">
          {['Dados Pessoais', 'Responsáveis', ...(totalSteps === 3 ? ['Matrícula'] : [])].map((label, i) => (
            <span
              key={i}
              className={`text-xs font-medium ${
                formStep === i + 1 ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {label}
            </span>
          ))}
        </div>

        {formStep === 1 && (
          <StudentFormStep1 formData={formData} setFormData={setFormData} />
        )}

        {formStep === 2 && (
          <StudentFormStep2 formData={formData} setFormData={setFormData} />
        )}

        {formStep === 3 && schoolId && enrollmentData && setEnrollmentData && (
          <StudentFormStep3
            schoolId={schoolId}
            schoolName={schoolName || ''}
            enrollmentData={enrollmentData}
            setEnrollmentData={setEnrollmentData}
            preselectedClassGroupId={preselectedClassGroupId}
            onNoCourses={() => setNoCoursesAvailable(true)}
          />
        )}

        <div className="flex flex-col-reverse sm:flex-row justify-between gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setFormStep(formStep - 1)}
            disabled={formStep === 1}
            className="w-full sm:w-auto"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
          </Button>

          {isLastStep ? (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {formStep === 3 && noCoursesAvailable && (
                <Button
                  variant="outline"
                  onClick={onSave}
                  disabled={saving}
                  className="w-full sm:w-auto text-warning border-warning/50"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  {saving ? 'Salvando...' : 'Cadastrar sem turma'}
                </Button>
              )}
              <Button
                onClick={onSave}
                disabled={saving || (formStep === 2 && !validateStep2()) || (formStep === 3 && validateStep3 && !validateStep3() && !noCoursesAvailable)}
                className="w-full sm:w-auto"
              >
                {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setFormStep(formStep + 1)}
              disabled={formStep === 1 ? !validateStep1() : !validateStep2()}
              className="w-full sm:w-auto"
            >
              Próximo <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
