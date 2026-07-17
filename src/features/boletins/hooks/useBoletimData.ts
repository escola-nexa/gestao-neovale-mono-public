import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface BimesterGrade {
  number: number;
  media: number | null;
  faltas: number;
}

export interface StudentSubjectData {
  subjectId: string;
  subjectName: string;
  bimesters: BimesterGrade[];
  totalFaltas: number;
  mediaFinal: number | null;
}

export interface StudentBoletimData {
  id: string;
  nome: string;
  codigoMatricula: string;
  numero: number;
  subjects: StudentSubjectData[];
}

export interface BoletimData {
  school: { nome: string; endereco: string; cidade: string };
  course: { nome: string; qualificacao: string };
  classGroup: { nome: string; anoLetivo: string };
  formativeTrack: string;
  students: StudentBoletimData[];
  emissionDate: string;
}

interface UseBoletimDataParams {
  organizationId: string | null;
  schoolId: string;
  courseId: string;
  classGroupId: string;
  bimesters: number[];
}

export function useBoletimData() {
  const [data, setData] = useState<BoletimData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async (params: UseBoletimDataParams) => {
    const { organizationId, schoolId, courseId, classGroupId, bimesters } = params;
    if (!organizationId || !schoolId || !courseId || !classGroupId || bimesters.length === 0) return;

    setIsLoading(true);
    try {
      const { boletimApi } = await import('../api');
      const data = await boletimApi.fetchBoletimData(params);
      setData(data);
    } catch (err) {
      console.error('Erro ao carregar dados do boletim:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, isLoading, fetchData };
}
