import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useSchoolDuplicateCount } from '../hooks/useStudentDuplicates';

interface Props {
  schoolId?: string;
}

export function DuplicatesBanner({ schoolId }: Props) {
  const count = useSchoolDuplicateCount(schoolId);
  if (!count) return null;

  return (
    <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
      <AlertTriangle className="h-4 w-4 !text-amber-600" />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <AlertTitle className="text-amber-900 dark:text-amber-100">
            {count} aluno{count > 1 ? 's' : ''} desta escola com possível duplicidade
          </AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            Encontramos alunos com mesmo Código de Matrícula ou CPF de outros registros na organização.
            Revise para evitar conflitos de matrícula e boletim.
          </AlertDescription>
        </div>
        <Button asChild size="sm" variant="outline" className="border-amber-400 bg-white text-amber-900 hover:bg-amber-100">
          <Link to={`/alunos/inconsistencias?escola=${schoolId ?? ''}`}>
            Ver inconsistências <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </Alert>
  );
}
