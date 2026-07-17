import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { substitutionApi } from '@/features/presenca-professores/substituicao/api';
import { useOrganization } from '@/hooks/useOrganization';
import { bucketTurno, type Turno, type ModelInfo, type SlotInfo, type CalendarEventInfo } from '../utils/folhaPontoPdf';
import { fetchAllPaginated } from '@/lib/supabasePagination';

export function targetSignature(t: { models: ModelInfo[]; slots: SlotInfo[] }): string {
  const m = [...t.models]
    .map((x) => `${x.weekday}|${x.slot_number ?? ''}|${x.start_time}|${x.end_time}|${x.class_mode}|${x.schedule_type}|${x.subject_id ?? ''}|${x.class_group_name ?? ''}`)
    .sort()
    .join(';');
  const s = [...t.slots]
    .map((x) => `${x.weekday}|${x.slot_number}|${x.start_time}|${x.end_time}`)
    .sort()
    .join(';');
  return `M:${m}#S:${s}`;
}

export interface FolhaPontoTarget {
  professorId: string;
  professorName: string;
  schoolId: string;
  schoolName: string;
  turno: Turno;
  models: ModelInfo[];
  slots: SlotInfo[];
  classCount: number;
}

export interface FolhaPontoBundle {
  targets: FolhaPontoTarget[];
  events: CalendarEventInfo[];
  generatedKeys: Set<string>;
  generatedSig: Record<string, string>;
}

interface Params {
  year: number;
  month: number;
  professorId?: string;
  schoolId?: string;
  enabled?: boolean;
}

export function useFolhaPontoTargets({ year, month, professorId, schoolId, enabled = true }: Params) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  // Realtime: qualquer mudança em grade horária / horários da escola invalida a lista
  useEffect(() => {
    if (!organizationId || !enabled) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const refetch = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['folha-ponto-targets', organizationId] });
      }, 250);
    };
    const ch = supabase
      .channel(`folha-ponto-targets-${organizationId}`)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'weekly_teaching_models' }, refetch)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'school_time_slots' }, refetch)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'folha_ponto_generated_log' }, refetch)
      .subscribe();
    return () => {
      if (t) clearTimeout(t);
      supabase.removeChannel(ch);
    };
  }, [organizationId, enabled, queryClient]);

  return useQuery<FolhaPontoBundle>({
    queryKey: ['folha-ponto-targets', organizationId, year, month, professorId || null, schoolId || null],
    enabled: !!organizationId && enabled,
    queryFn: async () => {
      // 1) Modelos semanais (CLASS + PLANNING) ATIVOS, com professor e escola ATIVOS.
      // Usa paginação para espelhar a Grade Horária: sem isso o PostgREST corta em
      // ~1000 linhas e o relatório pode perder disciplinas/CH de professores no fim
      // da lista (ex.: Jussara aparecia com 30 H/A em vez de 36 H/A).
      const models = await fetchAllPaginated<any>((from, to) => {
        let q = supabase
          .from('weekly_teaching_models')
          .select(`
            id, weekday, start_time, end_time, class_mode, schedule_type,
            professor_id, school_id, school_time_slot_id, subject_id, course_id, class_group_id,
            professors:professor_id!inner(id, full_name, status, deleted_at),
            schools:school_id!inner(id, nome, status),
            school_time_slots:school_time_slot_id(slot_number, start_time, status),
            subjects:subject_id(id, nome, carga_horaria_semanal, semester),
            courses:course_id(nome),
            class_groups:class_group_id(nome)
          `)
          .eq('organization_id', organizationId!)
          .eq('status', 'ACTIVE')
          .in('schedule_type', ['CLASS', 'PLANNING'])
          .not('professor_id', 'is', null)
          .not('school_id', 'is', null)
          .eq('professors.status', 'ACTIVE')
          .is('professors.deleted_at', null)
          .eq('schools.status', 'ativo')
          .order('school_id')
          .order('professor_id')
          .order('weekday')
          .order('start_time')
          .order('id')
          .range(from, to);
        if (professorId) q = q.eq('professor_id', professorId);
        if (schoolId) q = q.eq('school_id', schoolId);
        return q;
      });

      // Saneamento extra: descarta modelos cujo slot vinculado esteja INATIVO
      // (modelos sem slot vinculado continuam, usando o próprio start_time)
      const allModels = ((models || []) as any[]).filter((m) => {
        if (!m.professors || !m.schools) return false;
        if (m.school_time_slot_id && m.school_time_slots && m.school_time_slots.status !== 'ACTIVE') {
          return false;
        }
        return true;
      });
      const classModels = allModels.filter((m) => m.schedule_type === 'CLASS');
      const planningModels = allModels.filter((m) => m.schedule_type === 'PLANNING');

      // 2) Agrupar (professor x school x turno) — somente com CLASS
      const map = new Map<string, FolhaPontoTarget>();
      const schoolIds = new Set<string>();
      const turnoCountByProfSchool = new Map<string, Map<Turno, number>>();
      for (const m of classModels) {
        const pid = m.professor_id;
        const sid = m.school_id;
        if (!pid || !sid) continue;
        schoolIds.add(sid);
        const slotStart: string =
          m.school_time_slots?.start_time || m.start_time || '08:00:00';
        const turno = bucketTurno(slotStart);
        const psKey = `${pid}__${sid}`;
        if (!turnoCountByProfSchool.has(psKey)) turnoCountByProfSchool.set(psKey, new Map());
        const tc = turnoCountByProfSchool.get(psKey)!;
        tc.set(turno, (tc.get(turno) || 0) + 1);
        const key = `${pid}__${sid}__${turno}`;
        if (!map.has(key)) {
          map.set(key, {
            professorId: pid,
            professorName: m.professors?.full_name || '—',
            schoolId: sid,
            schoolName: m.schools?.nome || '—',
            turno,
            models: [],
            slots: [],
            classCount: 0,
          });
        }
        const tgt = map.get(key)!;
        tgt.models.push({
          weekday: m.weekday,
          slot_number: m.school_time_slots?.slot_number ?? null,
          start_time: m.start_time,
          end_time: m.end_time,
          class_mode: m.class_mode,
          schedule_type: 'CLASS',
          subject_id: m.subject_id ?? null,
          subject_name: m.subjects?.nome ?? null,
          subject_ch_semanal: m.subjects?.carga_horaria_semanal ?? null,
          subject_semester: m.subjects?.semester ?? null,
          course_name: m.courses?.nome ?? null,
          class_group_name: m.class_groups?.nome ?? null,
        });
        tgt.classCount += 1;
      }

      // 2b) PLANNING: usa o turno REAL do slot. Faz fallback para o turno
      // principal do professor naquela escola só se o turno real não tiver target.
      const order: Turno[] = ['Matutino', 'Vespertino', 'Noturno'];
      for (const m of planningModels) {
        const pid = m.professor_id;
        const sid = m.school_id;
        if (!pid || !sid) continue;
        const slotStart: string =
          m.school_time_slots?.start_time || m.start_time || '08:00:00';
        const realTurno = bucketTurno(slotStart);
        let tgt = map.get(`${pid}__${sid}__${realTurno}`);
        if (!tgt) {
          const tc = turnoCountByProfSchool.get(`${pid}__${sid}`);
          if (!tc || tc.size === 0) continue;
          let mainTurno: Turno = order[0];
          let best = -1;
          for (const t of order) {
            const c = tc.get(t) || 0;
            if (c > best) { best = c; mainTurno = t; }
          }
          tgt = map.get(`${pid}__${sid}__${mainTurno}`);
          if (!tgt) continue;
        }
        tgt.models.push({
          weekday: m.weekday,
          slot_number: m.school_time_slots?.slot_number ?? null,
          start_time: m.start_time,
          end_time: m.end_time,
          class_mode: m.class_mode,
          schedule_type: 'PLANNING',
          subject_id: m.subject_id ?? null,
          subject_name: m.subjects?.nome ?? null,
          subject_ch_semanal: m.subjects?.carga_horaria_semanal ?? null,
          subject_semester: m.subjects?.semester ?? null,
          course_name: m.courses?.nome ?? null,
          class_group_name: m.class_groups?.nome ?? null,
        });
      }

      // 3) Buscar todos os school_time_slots ACTIVE das escolas envolvidas
      let slotsByKey: Record<string, SlotInfo[]> = {};
      if (schoolIds.size > 0) {
        const { data: slots } = await supabase
          .from('school_time_slots')
          .select('school_id, weekday, slot_number, start_time, end_time')
          .eq('organization_id', organizationId!)
          .eq('status', 'ACTIVE')
          .in('school_id', Array.from(schoolIds));
        for (const s of (slots || []) as any[]) {
          const turno = bucketTurno(s.start_time);
          const k = `${s.school_id}__${turno}`;
          (slotsByKey[k] ||= []).push({
            slot_number: s.slot_number,
            weekday: s.weekday,
            start_time: s.start_time,
            end_time: s.end_time,
          });
        }
      }
      for (const tgt of map.values()) {
        tgt.slots = slotsByKey[`${tgt.schoolId}__${tgt.turno}`] || [];
      }

      // 4) Eventos do calendário do mês
      let events: CalendarEventInfo[] = [];
      const { data: cals } = await supabase
        .from('academic_calendars')
        .select('id')
        .eq('organization_id', organizationId!)
        .eq('academic_year', year);
      const calIds = (cals || []).map((c: any) => c.id);
      if (calIds.length > 0) {
        const from = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        const { data: evs } = await supabase
          .from('calendar_events')
          .select('event_date, event_type')
          .in('calendar_id', calIds)
          .gte('event_date', from)
          .lte('event_date', to);
        events = (evs || []) as CalendarEventInfo[];
      }

      const targets = Array.from(map.values()).sort((a, b) => {
        const s = a.schoolName.localeCompare(b.schoolName, 'pt-BR');
        if (s !== 0) return s;
        const t = a.turno.localeCompare(b.turno, 'pt-BR');
        if (t !== 0) return t;
        return a.professorName.localeCompare(b.professorName, 'pt-BR');
      });

      // 5) Log de folhas já geradas no mês/ano (persistido no backend)
      const generatedKeys = new Set<string>();
      const generatedSig: Record<string, string> = {};
      const { data: monthlySheets, error: monthlySheetsError } = await supabase
        .from('teacher_attendance_monthly_sheets')
        .select('professor_id')
        .eq('organization_id', organizationId!)
        .eq('reference_year', year)
        .eq('reference_month', month)
        .not('status', 'in', '(draft,cancelled)');
      if (monthlySheetsError) throw monthlySheetsError;

      const generatedProfessorIds = new Set(
        ((monthlySheets || []) as any[])
          .map((r) => r.professor_id)
          .filter(Boolean),
      );
      for (const t of targets) {
        if (!generatedProfessorIds.has(t.professorId)) continue;
        const k = `${t.professorId}__${t.schoolId}__${t.turno}`;
        generatedKeys.add(k);
        generatedSig[k] = targetSignature(t);
      }

      const { data: logRows } = await supabase
        .from('folha_ponto_generated_log')
        .select('professor_id, school_id, turno, signature')
        .eq('organization_id', organizationId!)
        .eq('year', year)
        .eq('month', month);
      for (const r of (logRows || []) as any[]) {
        const k = `${r.professor_id}__${r.school_id}__${r.turno}`;
        if (generatedKeys.has(k)) generatedSig[k] = r.signature || '';
      }

      return { targets, events, generatedKeys, generatedSig };
    },
  });
}
