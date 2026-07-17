import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { notasApi } from '../api';

interface GradeConfig {
  id: string;
  average_type: string;
  status: string;
  professor_id: string;
}

interface GradeActivity {
  id: string;
  grade_config_id: string;
  name: string;
  display_order: number;
  max_score: number;
}

interface StudentGrade {
  id?: string;
  grade_activity_id: string;
  student_id: string;
  score: number | null;
}

interface StudentRow {
  student_id: string;
  student_name: string;
  grades: Record<string, number | null>; // activity_id -> score
}

interface UseGradesParams {
  organizationId: string | null;
  schoolId: string;
  courseId: string;
  classGroupId: string;
  subjectId: string;
  professorId: string | null;
  bimesterNumber: number;
}

export function useGrades(params: UseGradesParams) {
  const { organizationId, schoolId, courseId, classGroupId, subjectId, professorId, bimesterNumber } = params;
  const { toast } = useToast();

  const [config, setConfig] = useState<GradeConfig | null>(null);
  const [activities, setActivities] = useState<GradeActivity[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const isReady = !!organizationId && !!classGroupId && !!subjectId && !!professorId && bimesterNumber > 0;

  // Fetch config, activities, students & grades
  const fetchAll = useCallback(async () => {
    if (!isReady) { setIsLoading(false); return; }
    setIsLoading(true);

    try {
      const result = await notasApi.fetchGrades({
        organizationId: organizationId!,
        classGroupId,
        subjectId,
        bimesterNumber
      });
      
      setConfig(result.config as GradeConfig | null);
      setActivities(result.activities as GradeActivity[]);
      setStudents(result.students as StudentRow[]);
    } catch (err: any) {
      toast({ title: 'Erro ao carregar dados', description: err.message, variant: 'destructive' });
    }

    setIsLoading(false);
  }, [isReady, organizationId, classGroupId, subjectId, bimesterNumber]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Save configuration (average_type + activities)
  const saveConfig = async (averageType: string, activityNames: string[]) => {
    if (!isReady || isSaving) return;
    setIsSaving(true);
    try {
      await notasApi.saveConfig({
        averageType,
        activityNames,
        organizationId: organizationId!,
        schoolId,
        courseId,
        classGroupId,
        subjectId,
        professorId: professorId!,
        bimesterNumber
      });
      toast({ title: 'Configuração salva com sucesso!' });
      await fetchAll();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar configuração', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // Save grades (upsert)
  const saveGrades = async (studentRows: StudentRow[]) => {
    if (!config) return;
    setIsSaving(true);
    try {
      const upserts: any[] = [];
      studentRows.forEach(row => {
        activities.forEach(act => {
          const score = row.grades[act.id];
          if (score !== undefined && score !== null) {
            upserts.push({
              grade_activity_id: act.id,
              student_id: row.student_id,
              score: score,
            });
          }
        });
      });

      await notasApi.saveGrades({ upserts });
      toast({ title: 'Notas salvas com sucesso!' });
      await fetchAll();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar notas', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // Close grades
  const closeGrades = async (studentRows: StudentRow[]) => {
    if (!config) return;
    setIsSaving(true);
    try {
      const upserts: any[] = [];
      studentRows.forEach(row => {
        activities.forEach(act => {
          const score = row.grades[act.id];
          if (score !== undefined && score !== null) {
            upserts.push({
              grade_activity_id: act.id,
              student_id: row.student_id,
              score: score,
            });
          }
        });
      });

      await notasApi.closeGrades({ configId: config.id, upserts });
      toast({ title: 'Notas fechadas com sucesso!' });
      await fetchAll();
    } catch (err: any) {
      toast({ title: 'Erro ao fechar notas', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // Update existing configuration (activities + average_type)
  const updateConfig = async (averageType: string, activityNames: string[]) => {
    if (!config || isSaving) return;
    setIsSaving(true);
    try {
      await notasApi.updateConfig({
        configId: config.id,
        averageType,
        activityNames
      });
      toast({ title: 'Configuração atualizada com sucesso!' });
      await fetchAll();
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar configuração', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    config, activities, students, isLoading, isSaving,
    saveConfig, updateConfig, saveGrades, closeGrades,
    setStudents,
  };
}
