import { supabase } from '@/integrations/supabase/client';
import { useCallback, useState } from 'react';
import { escolasApi } from '@/features/escolas/api';
import { useToast } from '@/hooks/use-toast';

export interface CourseSchoolDependencies {
  professors: number;
  students: number;
  canUnlink: boolean;
}

/**
 * Hook compartilhado para gerenciar o vínculo curso↔escola na tabela `course_schools`.
 *
 * Centraliza:
 *  - link(courseId, schoolId)
 *  - unlink(courseId, schoolId)
 *  - checkDependencies(courseId, schoolId)  → usa RPC `check_course_school_dependencies`
 *
 * É usado por SchoolCoursesPage (lado escola) e CourseSchoolsPage (lado curso),
 * que têm UIs diferentes mas a mesma lógica de banco.
 */
export function useCourseSchoolLink() {
  const { toast } = useToast();
  const [savingId, setSavingId] = useState<string | null>(null);

  const link = useCallback(async (courseId: string, schoolId: string): Promise<boolean> => {
    const key = `${courseId}:${schoolId}`;
    setSavingId(key);
    try {
      const { error } = await supabase
        .from('course_schools')
        .insert({ course_id: courseId, school_id: schoolId });
      if (error) throw error;
      toast({ title: 'Vinculado', description: 'Curso e escola foram vinculados.' });
      return true;
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: e?.message || 'Falha ao vincular',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSavingId(null);
    }
  }, [toast]);

  const unlink = useCallback(async (courseId: string, schoolId: string): Promise<boolean> => {
    const key = `${courseId}:${schoolId}`;
    setSavingId(key);
    try {
      const { error } = await supabase
        .from('course_schools')
        .delete()
        .eq('course_id', courseId)
        .eq('school_id', schoolId);
      if (error) throw error;
      toast({ title: 'Desvinculado', description: 'Vínculo removido.' });
      return true;
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: e?.message || 'Falha ao desvincular',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSavingId(null);
    }
  }, [toast]);

  const checkDependencies = useCallback(
    async (courseId: string, schoolId: string): Promise<CourseSchoolDependencies> => {
      const { data, error } = await escolasApi.client.rpc('check_course_school_dependencies', {
        _school_id: schoolId,
        _course_id: courseId,
      });
      if (error) throw error;
      const row = (data && data[0]) || { professors: 0, students: 0 };
      const professors = Number(row.professors) || 0;
      const students = Number(row.students) || 0;
      return { professors, students, canUnlink: professors === 0 && students === 0 };
    },
    []
  );

  const isSaving = (courseId: string, schoolId: string) =>
    savingId === `${courseId}:${schoolId}`;

  return { link, unlink, checkDependencies, isSaving, savingId };
}
