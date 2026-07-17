import { useState, useEffect, useCallback } from 'react';
import { globalApi } from './globalApi';
import { useOrganization } from './useOrganization';

export interface ConfigStep {
  key: string;
  label: string;
  description: string;
  count: number;
  required: boolean;
  completed: boolean;
  path: string;
  dependsOn: string[];
  order: number;
}

export interface ConfigurationStatus {
  steps: ConfigStep[];
  overallPercent: number;
  isFullyConfigured: boolean;
  loading: boolean;
  /** Returns missing prerequisite labels for a given step key */
  getMissingPrerequisites: (stepKey: string) => string[];
  /** Whether a step is blocked (has unmet prerequisites) */
  isBlocked: (stepKey: string) => boolean;
  refetch: () => Promise<void>;
}

export function useConfigurationStatus(): ConfigurationStatus {
  const { organizationId, isLoading: orgLoading } = useOrganization();
  const [steps, setSteps] = useState<ConfigStep[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!organizationId) return;
    try {
      setLoading(true);

      const data = await globalApi.getConfigurationStatus(organizationId);
      
      const counts = {
        schools: data?.schools_count ?? 0,
        tracks: data?.tracks_count ?? 0,
        courses: data?.courses_count ?? 0,
        subjects: data?.subjects_count ?? 0,
        classGroups: data?.class_groups_count ?? 0,
        professors: data?.professors_count ?? 0,
        students: data?.students_count ?? 0,
        calendars: data?.calendars_count ?? 0,
        schedule: data?.schedule_count ?? 0,
      };

      const newSteps: ConfigStep[] = [
        {
          key: 'schools',
          label: 'Escolas',
          description: 'Cadastre pelo menos uma escola para começar',
          count: counts.schools,
          required: true,
          completed: counts.schools > 0,
          path: '/escolas',
          dependsOn: [],
          order: 1,
        },
        {
          key: 'tracks',
          label: 'Itinerários Formativos',
          description: 'Defina os itinerários formativos da organização',
          count: counts.tracks,
          required: true,
          completed: counts.tracks > 0,
          path: '/itinerarios',
          dependsOn: ['schools'],
          order: 2,
        },
        {
          key: 'courses',
          label: 'Cursos',
          description: 'Crie os cursos vinculados aos itinerários',
          count: counts.courses,
          required: true,
          completed: counts.courses > 0,
          path: '/itinerarios',
          dependsOn: ['tracks'],
          order: 3,
        },
        {
          key: 'subjects',
          label: 'Disciplinas',
          description: 'Cadastre as disciplinas dos cursos',
          count: counts.subjects,
          required: true,
          completed: counts.subjects > 0,
          path: '/itinerarios',
          dependsOn: ['courses'],
          order: 4,
        },
        {
          key: 'classGroups',
          label: 'Turmas',
          description: 'Crie turmas nas escolas para cada curso',
          count: counts.classGroups,
          required: true,
          completed: counts.classGroups > 0,
          path: '/escolas',
          dependsOn: ['courses', 'schools'],
          order: 5,
        },
        {
          key: 'professors',
          label: 'Professores',
          description: 'Cadastre os professores e vincule às escolas',
          count: counts.professors,
          required: true,
          completed: counts.professors > 0,
          path: '/professores',
          dependsOn: ['schools'],
          order: 6,
        },
        {
          key: 'students',
          label: 'Alunos',
          description: 'Cadastre ou importe os alunos matriculados',
          count: counts.students,
          required: true,
          completed: counts.students > 0,
          path: '/escolas',
          dependsOn: ['classGroups'],
          order: 7,
        },
        {
          key: 'calendars',
          label: 'Calendário Acadêmico',
          description: 'Configure o calendário letivo com bimestres',
          count: counts.calendars,
          required: true,
          completed: counts.calendars > 0,
          path: '/calendario',
          dependsOn: ['schools'],
          order: 8,
        },
        {
          key: 'schedule',
          label: 'Grade Horária',
          description: 'Monte a grade horária semanal das turmas',
          count: counts.schedule,
          required: true,
          completed: counts.schedule > 0,
          path: '/grade-horaria',
          dependsOn: ['classGroups', 'subjects', 'professors', 'calendars'],
          order: 9,
        },
      ];

      setSteps(newSteps);
    } catch (err) {
      console.error('Error fetching configuration status:', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (!orgLoading && organizationId) {
      fetchStatus();
    }
  }, [orgLoading, organizationId, fetchStatus]);

  const completedCount = steps.filter((s) => s.completed).length;
  const overallPercent = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  const getMissingPrerequisites = useCallback(
    (stepKey: string): string[] => {
      const step = steps.find((s) => s.key === stepKey);
      if (!step) return [];
      return step.dependsOn
        .filter((dep) => {
          const depStep = steps.find((s) => s.key === dep);
          return depStep && !depStep.completed;
        })
        .map((dep) => {
          const depStep = steps.find((s) => s.key === dep);
          return depStep?.label ?? dep;
        });
    },
    [steps],
  );

  const isBlocked = useCallback(
    (stepKey: string): boolean => getMissingPrerequisites(stepKey).length > 0,
    [getMissingPrerequisites],
  );

  return {
    steps,
    overallPercent,
    isFullyConfigured: overallPercent === 100,
    loading: loading || orgLoading,
    getMissingPrerequisites,
    isBlocked,
    refetch: fetchStatus,
  };
}
