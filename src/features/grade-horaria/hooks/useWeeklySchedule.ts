import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { gradeHorariaApi } from '@/features/grade-horaria/api';
import { useOrganization } from '@/hooks/useOrganization';
import { useProfessorId } from '@/hooks/useProfessorId';
import { toast } from 'sonner';
import type { Weekday } from '@/types/academic';
import { weeklyTeachingModelsApi, WeeklyTeachingModelData } from '@/services/supabaseApi';
import type { SubjectSemester } from '@/hooks/useSemester';
import { fetchAllPaginated } from '@/lib/supabasePagination';

export type ScheduleType = 'CLASS' | 'PLANNING';

export interface WeeklyModelWithRelations {
  id: string;
  professor_id: string;
  school_id: string;
  course_id: string;
  class_group_id: string | null;
  subject_id: string | null;
  schedule_type: ScheduleType;
  weekday: Weekday;
  start_time: string;
  end_time: string;
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
  class_mode?: 'PRESENCIAL' | 'ANP' | null;
  observation?: string | null;
  created_at: string;
  updated_at: string;
  professor_name?: string;
  school_name?: string;
  course_name?: string;
  class_group_name?: string;
  subject_name?: string;
  subject_semester?: SubjectSemester;
  subject_ch_semanal?: number;
}

export interface CreateWeeklyModelDTO {
  professor_id?: string | null;
  school_id: string;
  course_id: string;
  class_group_id?: string | null;
  subject_id?: string | null;
  schedule_type: ScheduleType;
  weekday: Weekday;
  start_time: string;
  end_time: string;
}

export interface ClassOccurrence {
  id: string;
  weekly_model_id: string;
  occurrence_date: string;
  start_time: string;
  end_time: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
}

export type SchoolGenStatus = 'pending' | 'changed' | 'upToDate';

export interface SchoolGenerationInfo {
  schoolId: string;
  schoolName: string;
  status: SchoolGenStatus;
  totalModels: number;
  classModels: number;
  planningModels: number;
  modelsToGenerate: number;
  unassignedModels: number;
  lastGeneratedAt: string | null;
  reasons: string[];
}

/**
 * Calcula, por escola, se a grade está em dia, pendente ou com alteração.
 *
 * Critérios para "changed" (Alterada/Pendente):
 *  - Horários novos sem ocorrência;
 *  - Horários editados após a última geração;
 *  - Horários removidos que tinham ocorrências;
 *  - **Ocorrências incompletas**: a quantidade de ocorrências de um modelo é
 *    menor que o nº de dias LETIVO do calendário ativo para aquele weekday
 *    (ex.: o calendário foi expandido depois da geração).
 */
function computeSchoolGenerationStatus(
  models: WeeklyModelWithRelations[],
  occurrences: ClassOccurrence[],
  letivoByWeekday: Partial<Record<Weekday, number>>,
): Map<string, SchoolGenerationInfo> {
  const occByModel = new Map<string, { count: number; maxCreated: string }>();
  for (const o of occurrences) {
    const cur = occByModel.get(o.weekly_model_id);
    if (!cur) {
      occByModel.set(o.weekly_model_id, { count: 1, maxCreated: o.created_at });
    } else {
      cur.count += 1;
      if (o.created_at > cur.maxCreated) cur.maxCreated = o.created_at;
    }
  }

  const bySchool = new Map<string, WeeklyModelWithRelations[]>();
  for (const m of models) {
    if (!m.school_id) continue;
    const arr = bySchool.get(m.school_id) || [];
    arr.push(m);
    bySchool.set(m.school_id, arr);
  }

  const result = new Map<string, SchoolGenerationInfo>();
  bySchool.forEach((schoolModels, schoolId) => {
    const active = schoolModels.filter(m => m.status === 'ACTIVE');
    const schoolName = schoolModels.find(m => m.school_name)?.school_name || 'Escola';

    let lastGeneratedAt: string | null = null;
    let hasNew = false;
    let hasEdited = false;
    let hasDeletedWithOcc = false;
    let hasIncomplete = false;
    let totalMissing = 0;

    for (const m of schoolModels) {
      const info = occByModel.get(m.id);
      if (info) {
        if (!lastGeneratedAt || info.maxCreated > lastGeneratedAt) lastGeneratedAt = info.maxCreated;
        if (m.status !== 'ACTIVE') hasDeletedWithOcc = true;
      }
    }

    for (const m of active) {
      const info = occByModel.get(m.id);
      if (!info) {
        hasNew = true;
      } else if (lastGeneratedAt && m.updated_at > info.maxCreated) {
        hasEdited = true;
      }
    }

    let status: SchoolGenStatus;
    const reasons: string[] = [];
    if (active.length === 0 && !hasDeletedWithOcc) {
      status = 'upToDate';
    } else if (!lastGeneratedAt) {
      status = 'pending';
      reasons.push('Nunca gerada');
    } else if (hasNew || hasEdited || hasDeletedWithOcc) {
      status = 'changed';
      if (hasNew) reasons.push('Horários novos');
      if (hasEdited) reasons.push('Horários editados');
      if (hasDeletedWithOcc) reasons.push('Horários removidos');
    } else {
      status = 'upToDate';
    }


    const classModels = active.filter(m => m.schedule_type === 'CLASS').length;
    const planningModels = active.filter(m => m.schedule_type === 'PLANNING').length;
    const unassigned = active.filter(m => !m.professor_id).length;
    const modelsToGenerate = active.filter(m => !!m.professor_id).length;

    result.set(schoolId, {
      schoolId,
      schoolName,
      status,
      totalModels: active.length,
      classModels,
      planningModels,
      modelsToGenerate,
      unassignedModels: unassigned,
      lastGeneratedAt,
      reasons,
    });
  });

  return result;
}

export function useWeeklySchedule() {
  const { organization } = useOrganization();
  const { professorId, isProfessor } = useProfessorId();
  const [models, setModels] = useState<WeeklyModelWithRelations[]>([]);
  const [occurrences, setOccurrences] = useState<ClassOccurrence[]>([]);
  const [letivoByWeekday, setLetivoByWeekday] = useState<Partial<Record<Weekday, number>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [occurrencesLoaded, setOccurrencesLoaded] = useState(false);


  const fetchModels = useCallback(async (opts?: { silent?: boolean }) => {
    if (!organization?.id) return;

    const silent = opts?.silent === true;
    if (!silent) setIsLoading(true);
    try {
      const modelsData = await fetchAllPaginated<any>((from, to) => {
        let query = supabase
          .from('weekly_teaching_models')
          .select(`
            *,
            professors:professor_id (full_name, status, deleted_at),
            schools:school_id (nome, status),
            courses:course_id (nome, status),
            class_groups:class_group_id (nome, status),
            subjects:subject_id (nome, semester, carga_horaria_semanal, status, deleted_at)
          `)
          .eq('organization_id', organization.id)
          .eq('status', 'ACTIVE')
          .order('weekday')
          .order('start_time')
          .order('created_at')
          .range(from, to);

        // Backend filter for professors — only fetch their own models
        if (isProfessor && professorId) {
          query = query.eq('professor_id', professorId);
        }

        return query;
      });

      // Safeguard: only list models whose related entities are ACTIVE.
      // An ACTIVE model can reference a school/course/turma/disciplina/professor
      // that was deactivated later — those must NOT appear on the schedule.
      const isActiveRel = (rel: any, activeValue: string) => {
        if (!rel) return true; // optional relation (e.g., PLANNING sem turma/disciplina)
        if ('deleted_at' in rel && rel.deleted_at) return false;
        if ('status' in rel && rel.status && String(rel.status).toLowerCase() !== activeValue) return false;
        return true;
      };

      const enrichedModels: WeeklyModelWithRelations[] = (modelsData || [])
        .filter((m: any) =>
          isActiveRel(m.schools, 'ativo') &&
          isActiveRel(m.courses, 'ativo') &&
          isActiveRel(m.class_groups, 'ativo') &&
          isActiveRel(m.subjects, 'ativo') &&
          isActiveRel(m.professors, 'active')
        )
        .map((m: any) => ({
          ...m,
          schedule_type: m.schedule_type || 'CLASS',
          professor_name: m.professors?.full_name || '',
          school_name: m.schools?.nome || '',
          course_name: m.courses?.nome || '',
          class_group_name: m.class_groups?.nome || '',
          subject_name: m.subjects?.nome || '',
          subject_semester: m.subjects?.semester as SubjectSemester,
          subject_ch_semanal: Number(m.subjects?.carga_horaria_semanal) || 0,
        }));

      setModels(enrichedModels);
      return enrichedModels;
    } catch (error) {
      console.error('Error fetching weekly models:', error);
      if (!silent) toast.error('Erro ao carregar grade horária');
      return [];
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [organization?.id, isProfessor, professorId]);

  const fetchOccurrences = useCallback(async (modelId?: string, modelIds?: string[]) => {
    if (!organization?.id) return;

    try {
      const data = await fetchAllPaginated<ClassOccurrence>((from, to) => {
        let query = supabase
          .from('annual_class_occurrences')
          .select('*')
          .eq('organization_id', organization.id)
          .order('occurrence_date')
          .order('start_time')
          .range(from, to);

        if (modelId) {
          query = query.eq('weekly_model_id', modelId);
        } else if (modelIds && modelIds.length > 0) {
          // For professors, only fetch occurrences for their models
          query = query.in('weekly_model_id', modelIds);
        }

        return query;
      });

      setOccurrences(data);
      setOccurrencesLoaded(true);
    } catch (error) {
      console.error('Error fetching occurrences:', error);
    }
  }, [organization?.id]);

  /**
   * Conta dias LETIVO por weekday no(s) calendário(s) ATIVO(s) da organização.
   * Usado para detectar grades "incompletas" (modelo tem ocorrências, mas em
   * número menor que os dias letivos disponíveis no calendário).
   */
  const fetchLetivoByWeekday = useCallback(async () => {
    if (!organization?.id) return;
    try {
      const { data: cals, error: ce } = await supabase
        .from('academic_calendars')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('status', 'ACTIVE');
      if (ce) throw ce;
      const calIds = (cals || []).map((c: any) => c.id);
      if (calIds.length === 0) {
        setLetivoByWeekday({});
        return;
      }
      const events = await fetchAllPaginated<{ event_date: string }>((from, to) =>
        supabase
          .from('calendar_events')
          .select('event_date')
          .in('calendar_id', calIds)
          .eq('event_type', 'LETIVO')
          .range(from, to),
      );
      const map: Partial<Record<Weekday, number>> = {};
      const dowToWeekday: Record<number, Weekday> = {
        0: 'DOMINGO' as Weekday,
        1: 'SEGUNDA' as Weekday,
        2: 'TERCA' as Weekday,
        3: 'QUARTA' as Weekday,
        4: 'QUINTA' as Weekday,
        5: 'SEXTA' as Weekday,
        6: 'SABADO' as Weekday,
      };
      for (const e of events) {
        // Parse YYYY-MM-DD como data local (evita shift de fuso).
        const [y, m, d] = e.event_date.split('-').map(Number);
        const dow = new Date(y, (m || 1) - 1, d || 1).getDay();
        const wd = dowToWeekday[dow];
        if (!wd) continue;
        map[wd] = (map[wd] ?? 0) + 1;
      }
      setLetivoByWeekday(map);
    } catch (error) {
      console.error('Error fetching letivo days:', error);
    }
  }, [organization?.id]);


  useEffect(() => {
    if (organization?.id && (!isProfessor || professorId)) {
      fetchLetivoByWeekday();
      fetchModels().then((fetchedModels) => {
        // For professors, scope occurrences to their model IDs only
        if (isProfessor && professorId && fetchedModels && fetchedModels.length > 0) {
          fetchOccurrences(undefined, fetchedModels.map(m => m.id));
        } else {
          fetchOccurrences();
        }
      });
    }
  }, [organization?.id, isProfessor, professorId, fetchModels, fetchOccurrences, fetchLetivoByWeekday]);

  // Realtime: mantém Tabela/Semanal/Calendário sincronizados com Planilha,
  // Horários da Escola e Planejamento Professor sem precisar de refresh manual.
  useEffect(() => {
    if (!organization?.id) return;

    let modelsTimer: ReturnType<typeof setTimeout> | null = null;
    let occTimer: ReturnType<typeof setTimeout> | null = null;
    const refetchAll = () => {
      fetchModels({ silent: true }).then((fetchedModels) => {
        if (isProfessor && professorId && fetchedModels && fetchedModels.length > 0) {
          fetchOccurrences(undefined, fetchedModels.map(m => m.id));
        } else {
          fetchOccurrences();
        }
      });
    };
    const scheduleRefetchModels = () => {
      if (modelsTimer) clearTimeout(modelsTimer);
      modelsTimer = setTimeout(refetchAll, 250);
    };
    const scheduleRefetchOcc = () => {
      if (occTimer) clearTimeout(occTimer);
      occTimer = setTimeout(() => {
        if (isProfessor && professorId) {
          refetchAll();
        } else {
          fetchOccurrences();
        }
      }, 250);
    };

    const channel = supabase
      .channel(`grade-horaria-${organization.id}`)
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'weekly_teaching_models',
        filter: `organization_id=eq.${organization.id}`,
      }, scheduleRefetchModels)
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'school_time_slots',
        filter: `organization_id=eq.${organization.id}`,
      }, scheduleRefetchModels)
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'annual_class_occurrences',
        filter: `organization_id=eq.${organization.id}`,
      }, scheduleRefetchOcc)
      .subscribe();

    return () => {
      if (modelsTimer) clearTimeout(modelsTimer);
      if (occTimer) clearTimeout(occTimer);
      supabase.removeChannel(channel);
    };
  }, [organization?.id, isProfessor, professorId, fetchModels, fetchOccurrences]);

  const createModel = async (data: CreateWeeklyModelDTO): Promise<WeeklyModelWithRelations> => {
    if (!organization?.id) throw new Error('Organização não encontrada');

    // Validate time
    if (data.start_time >= data.end_time) {
      throw new Error('Horário de início deve ser anterior ao horário de término');
    }

    // Prepare data based on schedule type
    const insertData: any = {
      school_id: data.school_id,
      course_id: data.course_id,
      schedule_type: data.schedule_type,
      weekday: data.weekday,
      start_time: data.start_time,
      end_time: data.end_time,
      organization_id: organization.id,
      status: 'ACTIVE',
    };

    // Add professor_id if provided
    if (data.professor_id) {
      insertData.professor_id = data.professor_id;
    }

    // CLASS requires class_group and subject; PLANNING does not
    if (data.schedule_type === 'CLASS') {
      if (!data.class_group_id || !data.subject_id) {
        throw new Error('Turma e Disciplina são obrigatórios para aulas');
      }
      insertData.class_group_id = data.class_group_id;
      insertData.subject_id = data.subject_id;
    } else {
      // PLANNING: optional
      if (data.class_group_id) insertData.class_group_id = data.class_group_id;
      if (data.subject_id) insertData.subject_id = data.subject_id;
    }

    // Análise automática anti-duplicidade — barra ANTES de tentar inserir,
    // dando mensagem clara em vez do erro genérico do índice único do banco.
    const isAnp = (insertData.class_mode ?? 'PRESENCIAL') === 'ANP';
    const dupChecks: Promise<any>[] = [];
    if (data.schedule_type === 'CLASS' && insertData.class_group_id) {
      dupChecks.push(
        Promise.resolve(
          supabase
            .from('weekly_teaching_models')
            .select('id')
            .eq('status', 'ACTIVE')
            .eq('schedule_type', 'CLASS')
            .eq('school_id', insertData.school_id)
            .eq('weekday', insertData.weekday)
            .eq('start_time', insertData.start_time)
            .eq('end_time', insertData.end_time)
            .eq('class_group_id', insertData.class_group_id)
            .limit(1),
        ),
      );
    }
    if (insertData.professor_id && !isAnp) {
      dupChecks.push(
        Promise.resolve(
          supabase
            .from('weekly_teaching_models')
            .select('id')
            .eq('status', 'ACTIVE')
            .eq('school_id', insertData.school_id)
            .eq('weekday', insertData.weekday)
            .eq('start_time', insertData.start_time)
            .eq('end_time', insertData.end_time)
            .eq('professor_id', insertData.professor_id)
            .or('class_mode.is.null,class_mode.eq.PRESENCIAL')
            .limit(1),
        ),
      );
    }
    if (dupChecks.length > 0) {
      const results = await Promise.all(dupChecks);
      const turmaDup = data.schedule_type === 'CLASS' && results[0]?.data?.length > 0;
      const profIdx = data.schedule_type === 'CLASS' && insertData.class_group_id ? 1 : 0;
      const profDup = insertData.professor_id && !isAnp && results[profIdx]?.data?.length > 0;
      if (turmaDup) {
        throw new Error('Duplicidade: já existe uma aula nesta turma, dia e horário. Remova a aula existente antes de cadastrar outra.');
      }
      if (profDup) {
        throw new Error('Duplicidade: este professor já está alocado neste dia e horário nesta escola. Marque como ANP se for não-presencial ou escolha outro horário.');
      }
    }

    const { data: model, error } = await supabase
      .from('weekly_teaching_models')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      const msg = String(error.message ?? '');
      if (msg.includes('uniq_wtm_class_slot')) {
        throw new Error('Duplicidade: já existe uma aula nesta turma, dia e horário.');
      }
      if (msg.includes('uniq_wtm_teacher_slot')) {
        throw new Error('Duplicidade: este professor já está alocado neste dia e horário nesta escola.');
      }
      if (msg.includes('Conflito de horário') || msg.includes('compromisso')) {
        throw new Error('Conflito de horário: Professor já possui compromisso neste horário');
      }
      throw error;
    }

    await fetchModels();
    return model as WeeklyModelWithRelations;
  };

  const updateModel = async (id: string, data: Partial<CreateWeeklyModelDTO>): Promise<void> => {
    const { error } = await supabase
      .from('weekly_teaching_models')
      .update(data)
      .eq('id', id);

    if (error) {
      if (error.message.includes('Conflito de horário') || error.message.includes('compromisso')) {
        throw new Error('Conflito de horário: Professor já possui compromisso neste horário');
      }
      throw error;
    }

    await fetchModels();
  };

  const deleteModel = async (id: string): Promise<void> => {
    // First delete related occurrences
    await supabase
      .from('annual_class_occurrences')
      .delete()
      .eq('weekly_model_id', id);

    const { error } = await supabase
      .from('weekly_teaching_models')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await fetchModels();
    await fetchOccurrences();
    toast.success('Horário excluído com sucesso');
  };

  /**
   * Bulk delete: removes many weekly models in a single round-trip per chunk
   * (two queries — occurrences then models — using `.in('id', ids)`), avoiding
   * the N×fetchModels / N×toast pattern of looping `deleteModel`.
   *
   * Returns { ok, fail } so the UI can report a precise summary.
   */
  const bulkDeleteModels = async (ids: string[]): Promise<{ ok: number; fail: number }> => {
    if (!ids.length) return { ok: 0, fail: 0 };

    // Chunk to stay safely under PostgREST URL/parameter limits for very large selections.
    const CHUNK = 200;
    let ok = 0;
    let fail = 0;

    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      try {
        const { error: occErr } = await supabase
          .from('annual_class_occurrences')
          .delete()
          .in('weekly_model_id', slice);
        if (occErr) throw occErr;

        const { error: modErr } = await supabase
          .from('weekly_teaching_models')
          .delete()
          .in('id', slice);
        if (modErr) throw modErr;

        ok += slice.length;
      } catch (e) {
        fail += slice.length;
      }
    }

    await Promise.all([fetchModels(), fetchOccurrences()]);
    return { ok, fail };
  };

  const generateOccurrences = async (modelId: string, semesterFilter?: 'FIRST' | 'SECOND' | 'ANNUAL'): Promise<number> => {
    if (!organization?.id) throw new Error('Organização não encontrada');

    // Get the model details
    const model = models.find(m => m.id === modelId);
    if (!model) throw new Error('Modelo não encontrado');

    // Validate professor is assigned
    if (!model.professor_id) {
      throw new Error('Não é possível gerar aulas para horários sem professor alocado. Vincule um professor primeiro.');
    }

    // Get active calendar
    const { data: calendar } = await supabase
      .from('academic_calendars')
      .select('id')
      .eq('organization_id', organization.id)
      .eq('status', 'ACTIVE')
      .single();

    if (!calendar) throw new Error('Nenhum calendário acadêmico ativo encontrado');

    // Determine bimesters based on semester filter or subject semester
    let bimesterNumbers: number[] = [1, 2, 3, 4]; // default: full year
    let semesterLabel = 'ano letivo (todos os bimestres)';

    // Use semester filter if provided; otherwise fall back to subject semester
    const effectiveSemester = semesterFilter || (model.schedule_type === 'CLASS' ? model.subject_semester : undefined);

    if (effectiveSemester === 'FIRST') {
      bimesterNumbers = [1, 2];
      semesterLabel = '1º semestre (1º e 2º bimestres)';
    } else if (effectiveSemester === 'SECOND') {
      bimesterNumbers = [3, 4];
      semesterLabel = '2º semestre (3º e 4º bimestres)';
    } else if (model.subject_id && !semesterFilter) {
      // Fetch from DB only if no filter and model has subject
      const { data: subject } = await supabase
        .from('subjects')
        .select('semester')
        .eq('id', model.subject_id)
        .single();

      if (subject) {
        if (subject.semester === 'FIRST') {
          bimesterNumbers = [1, 2];
          semesterLabel = '1º semestre (1º e 2º bimestres)';
        } else if (subject.semester === 'SECOND') {
          bimesterNumbers = [3, 4];
          semesterLabel = '2º semestre (3º e 4º bimestres)';
        }
      }
    }

    console.log('Generating occurrences for bimesters:', bimesterNumbers);
    const { data: bimesters } = await supabase
      .from('academic_bimesters')
      .select('start_date, end_date')
      .eq('calendar_id', calendar.id)
      .in('number', bimesterNumbers)
      .order('number');

    if (!bimesters || bimesters.length === 0) {
      throw new Error(
        `Bimestres não configurados para o ${semesterLabel}. ` +
        `Configure os bimestres ${bimesterNumbers.join(', ')} no Calendário Acadêmico.`
      );
    }

    // Calculate date range
    const startDate = bimesters.reduce((min, b) => b.start_date < min ? b.start_date : min, bimesters[0].start_date);
    const endDate = bimesters.reduce((max, b) => b.end_date > max ? b.end_date : max, bimesters[0].end_date);

    // Get LETIVO days in the range
    const { data: letivoDays } = await supabase
      .from('calendar_events')
      .select('event_date')
      .eq('calendar_id', calendar.id)
      .eq('event_type', 'LETIVO')
      .gte('event_date', startDate)
      .lte('event_date', endDate);

    if (!letivoDays || letivoDays.length === 0) {
      throw new Error(
        `Nenhum dia letivo encontrado para o ${semesterLabel} no período de ${startDate} a ${endDate}. ` +
        `Cadastre dias letivos no Calendário Acadêmico.`
      );
    }

    // Map weekday to JS day (0=Sun, 1=Mon, etc)
    const weekdayMap: Record<Weekday, number> = {
      SEGUNDA: 1,
      TERCA: 2,
      QUARTA: 3,
      QUINTA: 4,
      SEXTA: 5,
    };

    const targetDayOfWeek = weekdayMap[model.weekday];

    // Filter dates that match the weekday
    const validDates = letivoDays
      .filter(ld => {
        const date = new Date(ld.event_date + 'T12:00:00');
        return date.getDay() === targetDayOfWeek;
      })
      .map(ld => ld.event_date);

    if (validDates.length === 0) {
      const weekdayLabel = {
        SEGUNDA: 'segunda-feira',
        TERCA: 'terça-feira',
        QUARTA: 'quarta-feira',
        QUINTA: 'quinta-feira',
        SEXTA: 'sexta-feira',
      }[model.weekday] || model.weekday;

      // semesterLabel already defined above

      throw new Error(
        `Nenhum dia letivo de ${weekdayLabel} encontrado no ${semesterLabel} (${startDate} a ${endDate}). ` +
        `Existem ${letivoDays.length} dias letivos no período, mas nenhum cai em ${weekdayLabel}.`
      );
    }

    // Delete existing occurrences for this model
    await supabase
      .from('annual_class_occurrences')
      .delete()
      .eq('weekly_model_id', modelId);

    // Create new occurrences (copy planning observation if any)
    const occurrencesToCreate = validDates.map(date => ({
      organization_id: organization.id,
      weekly_model_id: modelId,
      occurrence_date: date,
      start_time: model.start_time,
      end_time: model.end_time,
      status: 'SCHEDULED' as const,
      observation: model.observation ?? null,
    }));


    const { error } = await supabase
      .from('annual_class_occurrences')
      .insert(occurrencesToCreate);

    if (error) throw error;

    await fetchOccurrences();
    return validDates.length;
  };

  const generateAllOccurrences = async (
    semesterFilter?: 'FIRST' | 'SECOND' | 'ANNUAL',
    options?: {
      onlyPending?: boolean;
      schoolIds?: string[];
      onProgress?: (info: {
        current: number;
        total: number;
        schoolName: string;
        itemLabel: string;
        typeLabel: 'Aula' | 'Planejamento';
      }) => void;
    }
  ): Promise<{ successClasses: number; successPlannings: number; errors: string[]; skipped: number; schoolsProcessed: number }> => {
    const onlyPending = options?.onlyPending ?? true;
    const schoolIdsFilter = options?.schoolIds && options.schoolIds.length > 0
      ? new Set(options.schoolIds)
      : null;
    const results = { successClasses: 0, successPlannings: 0, errors: [] as string[], skipped: 0, schoolsProcessed: 0 };

    const activeModels = models.filter(m => m.status === 'ACTIVE');

    // Filter CLASS models by semester if specified
    let eligibleModels = activeModels;
    if (semesterFilter && semesterFilter !== 'ANNUAL') {
      eligibleModels = activeModels.filter(m => {
        if (m.schedule_type === 'PLANNING') return true;
        if (!m.subject_semester) return true;
        if (m.subject_semester === 'ANNUAL') return true;
        return m.subject_semester === semesterFilter;
      });
    }

    // Filtra por escolas pendentes/alteradas (passadas pelo caller) ou,
    // se onlyPending=true sem schoolIds, calcula aqui as escolas elegíveis.
    let targetSchoolIds = schoolIdsFilter;
    if (!targetSchoolIds && onlyPending) {
      const computed = computeSchoolGenerationStatus(models, occurrences, letivoByWeekday);
      targetSchoolIds = new Set(
        Array.from(computed.values())
          .filter(s => s.status !== 'upToDate')
          .map(s => s.schoolId)
      );
    }

    if (targetSchoolIds) {
      const before = eligibleModels.length;
      eligibleModels = eligibleModels.filter(m => targetSchoolIds!.has(m.school_id));
      results.skipped = before - eligibleModels.length;
    }

    const modelsWithProfessor = eligibleModels.filter(m => m.professor_id);
    const modelsWithoutProfessor = eligibleModels.filter(m => !m.professor_id);

    if (modelsWithoutProfessor.length > 0) {
      const names = modelsWithoutProfessor.map(m => m.subject_name || 'Horário sem disciplina').slice(0, 5);
      results.errors.push(`${modelsWithoutProfessor.length} horário(s) sem professor alocado: ${names.join(', ')}${modelsWithoutProfessor.length > 5 ? '...' : ''}`);
    }

    results.schoolsProcessed = new Set(modelsWithProfessor.map(m => m.school_id)).size;
    console.log(`Gerando para ${modelsWithProfessor.length} modelos em ${results.schoolsProcessed} escola(s) (semestre: ${semesterFilter || 'TODOS'})`);

    const total = modelsWithProfessor.length;
    if (total === 0) {
      console.log('Nenhum modelo para gerar.');
      return results;
    }
    if (!organization?.id) {
      results.errors.push('Organização não encontrada');
      return results;
    }

    // -------- FAST PATH (batch) --------
    // Em vez de chamar generateOccurrences (que faz ~5 SELECTs + DELETE + INSERT
    // + fetchOccurrences POR modelo), pré-carregamos calendário/bimestres/dias
    // letivos UMA vez e fazemos DELETE/INSERT em lote.
    try {
      // 1) Calendário ativo
      const { data: calendar, error: calErr } = await supabase
        .from('academic_calendars')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('status', 'ACTIVE')
        .maybeSingle();
      if (calErr) throw calErr;
      if (!calendar) throw new Error('Nenhum calendário acadêmico ativo encontrado');

      // 2) Todos os bimestres
      const { data: bimesters, error: bimErr } = await supabase
        .from('academic_bimesters')
        .select('number, start_date, end_date')
        .eq('calendar_id', calendar.id)
        .order('number');
      if (bimErr) throw bimErr;
      const bimesterMap = new Map<number, { start_date: string; end_date: string }>();
      (bimesters ?? []).forEach(b => bimesterMap.set(b.number, { start_date: b.start_date, end_date: b.end_date }));

      // 3) Dias LETIVO do ano todo, agrupados por dia da semana
      const allBims = Array.from(bimesterMap.values());
      const letivoByWeekday = new Map<number, string[]>();
      if (allBims.length > 0) {
        const yearStart = allBims.reduce((m, b) => b.start_date < m ? b.start_date : m, allBims[0].start_date);
        const yearEnd = allBims.reduce((m, b) => b.end_date > m ? b.end_date : m, allBims[0].end_date);
        const { data: letivoDays, error: letErr } = await supabase
          .from('calendar_events')
          .select('event_date')
          .eq('calendar_id', calendar.id)
          .eq('event_type', 'LETIVO')
          .gte('event_date', yearStart)
          .lte('event_date', yearEnd);
        if (letErr) throw letErr;
        (letivoDays ?? []).forEach(ld => {
          const dow = new Date(ld.event_date + 'T12:00:00').getDay();
          const arr = letivoByWeekday.get(dow) ?? [];
          arr.push(ld.event_date);
          letivoByWeekday.set(dow, arr);
        });
      }

      const weekdayMap: Record<Weekday, number> = {
        SEGUNDA: 1, TERCA: 2, QUARTA: 3, QUINTA: 4, SEXTA: 5,
      };

      // 4) Monta linhas a inserir
      type Row = {
        organization_id: string;
        weekly_model_id: string;
        occurrence_date: string;
        start_time: string;
        end_time: string;
        status: 'SCHEDULED';
        observation: string | null;
      };
      const allRows: Row[] = [];
      const modelIdsToReset: string[] = [];
      let current = 0;

      for (const model of modelsWithProfessor) {
        const typeLabel: 'Aula' | 'Planejamento' = model.schedule_type === 'CLASS' ? 'Aula' : 'Planejamento';
        const schoolName = model.school_name || 'Escola';
        const itemLabel = model.subject_name || model.professor_name || 'Horário';
        const modelLabel = `${schoolName} · ${itemLabel}`;
        current += 1;
        try {
          options?.onProgress?.({ current, total, schoolName, itemLabel, typeLabel });
        } catch { /* ignore */ }

        try {
          let bimNumbers: number[] = [1, 2, 3, 4];
          const eff = semesterFilter || (model.schedule_type === 'CLASS' ? model.subject_semester : undefined);
          if (eff === 'FIRST') bimNumbers = [1, 2];
          else if (eff === 'SECOND') bimNumbers = [3, 4];

          const dow = weekdayMap[model.weekday];
          const candidateDates = (letivoByWeekday.get(dow) ?? []).filter(d =>
            bimNumbers.some(n => {
              const b = bimesterMap.get(n);
              return b && d >= b.start_date && d <= b.end_date;
            })
          );

          modelIdsToReset.push(model.id);
          for (const d of candidateDates) {
            allRows.push({
              organization_id: organization.id,
              weekly_model_id: model.id,
              occurrence_date: d,
              start_time: model.start_time,
              end_time: model.end_time,
              status: 'SCHEDULED',
              observation: model.observation ?? null,
            });
          }
          if (model.schedule_type === 'PLANNING') results.successPlannings += candidateDates.length;
          else results.successClasses += candidateDates.length;
        } catch (err: any) {
          results.errors.push(`${modelLabel} (${typeLabel}): ${err?.message ?? String(err)}`);
        }
      }

      // 5) DELETE em chunks de 500 ids (em paralelo)
      const chunk = <T,>(arr: T[], size: number) =>
        Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

      await Promise.all(
        chunk(modelIdsToReset, 500).map(ids =>
          gradeHorariaApi.client.from('annual_class_occurrences').delete().in('weekly_model_id', ids)
            .then(({ error }) => { if (error) throw error; })
        )
      );

      // 6) INSERT em chunks de 1000 (em paralelo, concorrência 4)
      const insertChunks = chunk(allRows, 1000);
      const CONCURRENCY = 4;
      for (let i = 0; i < insertChunks.length; i += CONCURRENCY) {
        await Promise.all(
          insertChunks.slice(i, i + CONCURRENCY).map(rows =>
            gradeHorariaApi.client.from('annual_class_occurrences').insert(rows)
              .then(({ error }) => { if (error) throw error; })
          )
        );
      }

      // 7) Refetch UMA única vez
      await fetchOccurrences();
    } catch (err: any) {
      console.error('Falha no batch generate:', err);
      results.errors.push(`Falha no processamento em lote: ${err?.message ?? String(err)}`);
    }

    console.log(`Resultado: ${results.successClasses} aulas + ${results.successPlannings} planejamentos, ${results.errors.length} erros`);
    return results;
  };

  const updateObservation = async (modelId: string, observation: string | null): Promise<void> => {
    const trimmed = observation && observation.trim() ? observation.trim() : null;

    const { error: modelErr } = await supabase
      .from('weekly_teaching_models')
      .update({ observation: trimmed })
      .eq('id', modelId);
    if (modelErr) throw modelErr;

    // Propaga para todas as ocorrências já geradas deste planejamento
    const { error: occErr } = await supabase
      .from('annual_class_occurrences')
      .update({ observation: trimmed })
      .eq('weekly_model_id', modelId);
    if (occErr) throw occErr;

    setModels(prev => prev.map(m => (m.id === modelId ? { ...m, observation: trimmed } : m)));
    setOccurrences(prev => prev.map(o => (o.weekly_model_id === modelId ? { ...o, observation: trimmed } as any : o)));
  };

  // Filter models by type
  const classModels = models.filter(m => m.schedule_type === 'CLASS');
  const planningModels = models.filter(m => m.schedule_type === 'PLANNING');

  const occurrenceModelIds = useMemo(
    () => new Set(occurrences.map(o => o.weekly_model_id)),
    [occurrences]
  );

  const schoolGenerationStatus = useMemo(
    () => occurrencesLoaded
      ? computeSchoolGenerationStatus(models, occurrences, letivoByWeekday)
      : new Map<string, SchoolGenerationInfo>(),
    [models, occurrences, occurrencesLoaded, letivoByWeekday]
  );


  const pendingGenerationSchools = useMemo(
    () => Array.from(schoolGenerationStatus.values()).filter(s => s.status !== 'upToDate'),
    [schoolGenerationStatus]
  );

  const pendingGenerationModels = useMemo(() => {
    const schoolIds = new Set(pendingGenerationSchools.map(s => s.schoolId));
    return models.filter(m =>
      m.status === 'ACTIVE' &&
      !!m.professor_id &&
      schoolIds.has(m.school_id)
    );
  }, [models, pendingGenerationSchools]);

  return {
    models,
    classModels,
    planningModels,
    occurrences,
    isLoading,
    pendingGenerationModels,
    pendingGenerationSchools,
    schoolGenerationStatus,
    createModel,
    updateModel,
    deleteModel,
    bulkDeleteModels,
    generateOccurrences,
    generateAllOccurrences,
    updateObservation,
    refetch: (opts?: { silent?: boolean }) => fetchModels({ silent: opts?.silent !== false }),
    refetchOccurrences: fetchOccurrences,
  };
}

