import { useState, useEffect, useMemo } from 'react';
import { pendenciasApi } from '@/features/pendencias/api';
import { useAuth } from '@/contexts/AuthContext';
import { useProfessorId } from '@/hooks/useProfessorId';
import { useOrganization } from '@/hooks/useOrganization';

export type PendencyPriority = 'critica' | 'alta' | 'media' | 'baixa';
export type PendencyModule = 'planejamento' | 'orientacoes' | 'frequencia' | 'notas';

export interface Pendency {
  id: string;
  type: string;
  module: PendencyModule;
  description: string;
  schoolName?: string;
  classGroupName?: string;
  subjectName?: string;
  professorName?: string;
  professorId?: string;
  schoolId?: string;
  priority: PendencyPriority;
  status: string;
  dueDate?: string;
  daysOverdue?: number;
  actionUrl: string;
  actionLabel: string;
}

export interface PendencyKPIs {
  total: number;
  critical: number;
  overdue: number;
  today: number;
  resolvedRecently: number;
}

export interface PendencyFilters {
  module?: PendencyModule;
  priority?: PendencyPriority;
  schoolId?: string;
  professorId?: string;
  search?: string;
}

export function usePendencias() {
  const { user } = useAuth();
  const { professorId, isProfessor } = useProfessorId();
  const { organizationId } = useOrganization();
  const [pendencies, setPendencies] = useState<Pendency[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<PendencyFilters>({});
  const [schools, setSchools] = useState<{ id: string; nome: string }[]>([]);
  const [professors, setProfessors] = useState<{ id: string; full_name: string }[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    loadPendencies();
    loadFilterOptions();
  }, [user?.id, isProfessor, professorId, organizationId]);

  const loadFilterOptions = async () => {
    const [schoolsRes, profsRes] = await Promise.all([
      pendenciasApi.client.from('schools').select('id, nome').eq('status', 'ativo').order('nome'),
      isProfessor ? Promise.resolve({ data: [] }) :
        pendenciasApi.client.from('professors').select('id, full_name, user_id').eq('status', 'ACTIVE').is('deleted_at', null).order('full_name'),
    ]);
    setSchools(schoolsRes.data || []);
    setProfessors(profsRes.data || []);
  };

  const loadPendencies = async () => {
    setLoading(true);
    try {
      const items: Pendency[] = [];
      const today = new Date().toISOString().split('T')[0];

      if (isProfessor && professorId) {
        await loadProfessorPendencies(items, professorId, today);
      } else {
        await loadCoordinatorPendencies(items, today);
      }

      setPendencies(items);
    } catch (err) {
      console.error('Erro ao carregar pendências:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProfessorPendencies = async (items: Pendency[], profId: string, today: string) => {
    const weekdayMap: Record<number, 'SEGUNDA' | 'TERCA' | 'QUARTA' | 'QUINTA' | 'SEXTA'> = {
      1: 'SEGUNDA', 2: 'TERCA', 3: 'QUARTA', 4: 'QUINTA', 5: 'SEXTA',
    };
    const dayIndex = new Date().getDay();

    const [planningsRes, orientationsRes, modelsRes, attendanceRes] = await Promise.all([
      pendenciasApi.client.from('teacher_plannings')
        .select('id, status, bimester_number, week_number, schools:school_id(nome), class_groups:class_group_id(nome), subjects:subject_id(nome)')
        .eq('professor_id', user?.id || '')
        .in('status', ['DRAFT', 'DEVOLVIDO', 'REJECTED', 'AGUARDANDO_ASSINATURA']),
      pendenciasApi.client.from('orientations')
        .select('id, orientation_type, scheduled_date, status, schools:school_id(nome), subjects:subject_id(nome)')
        .eq('professor_id', profId)
        .in('status', ['AGUARDANDO_ASSINATURA_PROFESSOR', 'AGENDADO'])
        .is('deleted_at', null),
      dayIndex >= 1 && dayIndex <= 5 ? pendenciasApi.client.from('weekly_teaching_models')
        .select('id, class_group_id, subject_id, schools:school_id(nome), class_groups:class_group_id(nome), subjects:subject_id(nome)')
        .eq('professor_id', profId)
        .eq('weekday', weekdayMap[dayIndex])
        .eq('status', 'ACTIVE')
        .eq('schedule_type', 'CLASS') : Promise.resolve({ data: [] }),
      pendenciasApi.client.from('attendance_records')
        .select('class_group_id, subject_id')
        .eq('professor_id', profId)
        .eq('occurrence_date', today),
    ]);

    // Plannings
    for (const p of (planningsRes.data || []) as any[]) {
      const isReturned = p.status === 'DEVOLVIDO' || p.status === 'REJECTED';
      const isSign = p.status === 'AGUARDANDO_ASSINATURA';
      items.push({
        id: `plan-${p.id}`,
        type: isReturned ? 'Planejamento Devolvido' : isSign ? 'Aguardando Assinatura' : 'Planejamento em Rascunho',
        module: 'planejamento',
        description: `Bim. ${p.bimester_number || '?'} – Sem. ${p.week_number || '?'}`,
        schoolName: p.schools?.nome,
        classGroupName: p.class_groups?.nome,
        subjectName: p.subjects?.nome,
        priority: isReturned ? 'alta' : isSign ? 'alta' : 'media',
        status: isReturned ? 'Devolvido' : isSign ? 'Aguardando assinatura' : 'Rascunho',
        actionUrl: isSign ? `/planejamento/detalhe/teacher/${p.id}` : `/planejamento/editar/${p.id}`,
        actionLabel: isSign ? 'Assinar' : 'Editar',
      });
    }

    // Orientations
    for (const o of (orientationsRes.data || []) as any[]) {
      const isOverdue = o.scheduled_date && o.scheduled_date < today && o.status === 'AGENDADO';
      const isSign = o.status === 'AGUARDANDO_ASSINATURA_PROFESSOR';
      items.push({
        id: `ori-${o.id}`,
        type: isSign ? 'Orientação p/ Assinar' : isOverdue ? 'Orientação em Atraso' : 'Orientação Agendada',
        module: 'orientacoes',
        description: o.orientation_type || 'Orientação pedagógica',
        schoolName: o.schools?.nome,
        subjectName: o.subjects?.nome,
        priority: isOverdue ? 'critica' : isSign ? 'alta' : 'media',
        status: isSign ? 'Aguardando assinatura' : isOverdue ? 'Em atraso' : 'Agendado',
        dueDate: o.scheduled_date,
        daysOverdue: isOverdue ? Math.floor((Date.now() - new Date(o.scheduled_date).getTime()) / 86400000) : undefined,
        actionUrl: isSign ? `/orientacoes` : `/orientacoes/evidencia/${o.id}`,
        actionLabel: isSign ? 'Assinar' : 'Inserir Evidência',
      });
    }

    // Attendance pending today
    const attended = new Set((attendanceRes.data || []).map((r: any) => `${r.class_group_id}|${r.subject_id}`));
    for (const m of (modelsRes.data || []) as any[]) {
      const key = `${m.class_group_id}|${m.subject_id}`;
      if (!attended.has(key)) {
        items.push({
          id: `att-${m.id}`,
          type: 'Frequência Pendente',
          module: 'frequencia',
          description: 'Lançar frequência de hoje',
          schoolName: m.schools?.nome,
          classGroupName: m.class_groups?.nome,
          subjectName: m.subjects?.nome,
          priority: 'alta',
          status: 'Pendente',
          dueDate: today,
          actionUrl: `/frequencia/registro/${m.class_group_id}/${m.subject_id}`,
          actionLabel: 'Lançar',
        });
      }
    }
  };

  const loadCoordinatorPendencies = async (items: Pendency[], today: string) => {
    const [planningsReviewRes, planningsSignRes, orientationsRes, attendanceOccRes, attendanceRecRes] = await Promise.all([
      pendenciasApi.client.from('teacher_plannings')
        .select('id, status, bimester_number, week_number, professor_id, schools:school_id(nome), class_groups:class_group_id(nome), subjects:subject_id(nome)')
        .in('status', ['ENVIADO', 'PENDING'])
        .limit(200),
      pendenciasApi.client.from('teacher_plannings')
        .select('id, status, bimester_number, week_number, professor_id, schools:school_id(nome), class_groups:class_group_id(nome), subjects:subject_id(nome)')
        .in('status', ['AGUARDANDO_ASSINATURA_COORDENADOR'])
        .limit(200),
      pendenciasApi.client.from('orientations')
        .select('id, orientation_type, scheduled_date, status, schools:school_id(nome), subjects:subject_id(nome), professors:professor_id(id, full_name)')
        .in('status', ['AGENDADO', 'AGUARDANDO_ASSINATURA_PROFESSOR'])
        .is('deleted_at', null)
        .limit(200),
      pendenciasApi.client.from('annual_class_occurrences')
        .select('id, weekly_model_id, weekly_teaching_models:weekly_model_id(class_group_id, subject_id, professor_id, schools:school_id(nome), class_groups:class_group_id(nome), subjects:subject_id(nome), professors:professor_id(id, full_name))')
        .eq('occurrence_date', today)
        .eq('status', 'SCHEDULED')
        .limit(500),
      pendenciasApi.client.from('attendance_records')
        .select('class_group_id, subject_id')
        .eq('occurrence_date', today),
    ]);

    // Helper: resolve professor name from user_id via professors list
    const profNameByUserId = (userId: string) => {
      const prof = professors.find(p => (p as any).user_id === userId);
      return prof?.full_name || '';
    };

    // Plannings to review
    for (const p of (planningsReviewRes.data || []) as any[]) {
      items.push({
        id: `plan-rev-${p.id}`,
        type: 'Planejamento p/ Revisar',
        module: 'planejamento',
        description: `Bim. ${p.bimester_number || '?'} – Sem. ${p.week_number || '?'}`,
        schoolName: p.schools?.nome,
        classGroupName: p.class_groups?.nome,
        subjectName: p.subjects?.nome,
        professorName: profNameByUserId(p.professor_id),
        professorId: p.professor_id,
        priority: 'alta',
        status: 'Aguardando revisão',
        actionUrl: `/planejamento/revisar/${p.id}`,
        actionLabel: 'Revisar',
      });
    }

    // Plannings awaiting coordinator signature
    for (const p of (planningsSignRes.data || []) as any[]) {
      items.push({
        id: `plan-sign-${p.id}`,
        type: 'Planejamento p/ Assinar',
        module: 'planejamento',
        description: `Bim. ${p.bimester_number || '?'} – Sem. ${p.week_number || '?'}`,
        schoolName: p.schools?.nome,
        classGroupName: p.class_groups?.nome,
        subjectName: p.subjects?.nome,
        professorName: profNameByUserId(p.professor_id),
        professorId: p.professor_id,
        priority: 'alta',
        status: 'Aguardando assinatura',
        actionUrl: `/planejamento/detalhe/teacher/${p.id}`,
        actionLabel: 'Assinar',
      });
    }

    // Orientations
    for (const o of (orientationsRes.data || []) as any[]) {
      const isOverdue = o.scheduled_date && o.scheduled_date < today && o.status === 'AGENDADO';
      items.push({
        id: `ori-${o.id}`,
        type: isOverdue ? 'Orientação em Atraso' : 'Orientação Pendente',
        module: 'orientacoes',
        description: o.orientation_type || 'Orientação pedagógica',
        schoolName: o.schools?.nome,
        subjectName: o.subjects?.nome,
        professorName: o.professors?.full_name,
        professorId: o.professors?.id,
        priority: isOverdue ? 'critica' : 'media',
        status: isOverdue ? 'Em atraso' : o.status === 'AGUARDANDO_ASSINATURA_PROFESSOR' ? 'Aguardando professor' : 'Agendado',
        dueDate: o.scheduled_date,
        daysOverdue: isOverdue ? Math.floor((Date.now() - new Date(o.scheduled_date).getTime()) / 86400000) : undefined,
        actionUrl: `/orientacoes`,
        actionLabel: 'Ver',
      });
    }

    // Attendance pending today
    const attended = new Set((attendanceRecRes.data || []).map((r: any) => `${r.class_group_id}|${r.subject_id}`));
    for (const occ of (attendanceOccRes.data || []) as any[]) {
      const wtm = occ.weekly_teaching_models;
      if (!wtm) continue;
      const key = `${wtm.class_group_id}|${wtm.subject_id}`;
      if (!attended.has(key)) {
        items.push({
          id: `att-${occ.id}`,
          type: 'Frequência Não Lançada',
          module: 'frequencia',
          description: 'Frequência de hoje pendente',
          schoolName: wtm.schools?.nome,
          classGroupName: wtm.class_groups?.nome,
          subjectName: wtm.subjects?.nome,
          professorName: wtm.professors?.full_name,
          professorId: wtm.professors?.id,
          priority: 'media',
          status: 'Pendente',
          dueDate: today,
          actionUrl: `/frequencia`,
          actionLabel: 'Ver',
        });
      }
    }
  };

  const filteredPendencies = useMemo(() => {
    let result = [...pendencies];
    if (filters.module) result = result.filter(p => p.module === filters.module);
    if (filters.priority) result = result.filter(p => p.priority === filters.priority);
    if (filters.schoolId) {
      const school = schools.find(s => s.id === filters.schoolId);
      if (school) result = result.filter(p => p.schoolName === school.nome);
    }
    if (filters.professorId) {
      const prof = professors.find(pr => pr.id === filters.professorId);
      if (prof) result = result.filter(p => p.professorName === prof.full_name);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(p =>
        p.type.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.schoolName?.toLowerCase().includes(q) ||
        p.classGroupName?.toLowerCase().includes(q) ||
        p.subjectName?.toLowerCase().includes(q) ||
        p.professorName?.toLowerCase().includes(q)
      );
    }

    // Sort by priority
    const priorityOrder: Record<PendencyPriority, number> = { critica: 0, alta: 1, media: 2, baixa: 3 };
    result.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    return result;
  }, [pendencies, filters, schools, professors]);

  const kpis: PendencyKPIs = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      total: pendencies.length,
      critical: pendencies.filter(p => p.priority === 'critica').length,
      overdue: pendencies.filter(p => p.daysOverdue && p.daysOverdue > 0).length,
      today: pendencies.filter(p => p.dueDate === today).length,
      resolvedRecently: 0,
    };
  }, [pendencies]);

  return {
    pendencies: filteredPendencies,
    kpis,
    loading,
    filters,
    setFilters,
    schools,
    professors,
    isProfessor,
    refresh: loadPendencies,
  };
}
