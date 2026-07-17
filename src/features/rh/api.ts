import { supabase, API_PROVIDER } from '@/integrations/supabase/client';
import { nestApi } from '@/lib/api-adapter';
import type {
  HrSettings,
  HrSubjectUcpOverride,
  HrAllocationPlan,
  HrAllocationItem,
  HrPeriod,
  HrPlanStatus,
} from './types';
import type { UcpType } from './lib/classifyUCP';

async function getOrgId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');
  const { data, error } = await supabase
    .from('user_roles')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Organização não encontrada');
  return data.organization_id;
}

export interface CreatePlanInput {
  school_id: string;
  course_id: string;
  periodo: HrPeriod;
  ano_letivo: string;
  qtd_turmas: number;
  teto_ch_semanal: number;
  notes?: string | null;
  items: Array<{
    subject_id: string;
    class_group_id: string;
    ucp_type: UcpType;
    aulas: number;
    vaga_label?: string | null;
    professor_id?: string | null;
  }>;
}

export const hrApi = {
  // ===== Settings =====
  async getSettings(): Promise<HrSettings | null> {
    const orgId = await getOrgId();
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get(`/rh/settings`, { params: { organization_id: orgId } });
      return data;
    } else {
      const { data, error } = await supabase
        .from('hr_settings')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();
      if (error) throw error;
      return data as HrSettings | null;
    }
  },

  async upsertSettings(payload: Partial<Omit<HrSettings, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>): Promise<HrSettings> {
    const orgId = await getOrgId();
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.post(`/rh/settings`, { organization_id: orgId, ...payload });
      return data;
    } else {
      const existing = await this.getSettings();
      if (existing) {
        const { data, error } = await supabase
          .from('hr_settings')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .maybeSingle();
        if (error) throw error;
        return data as HrSettings;
      }
      const { data, error } = await supabase
        .from('hr_settings')
        .insert({ organization_id: orgId, ...payload })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as HrSettings;
    }
  },

  // ===== UCP Overrides =====
  async listOverrides(): Promise<HrSubjectUcpOverride[]> {
    const orgId = await getOrgId();
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get(`/rh/overrides`, { params: { organization_id: orgId } });
      return data;
    } else {
      const { data, error } = await supabase
        .from('hr_subject_ucp_overrides')
        .select('*')
        .eq('organization_id', orgId);
      if (error) throw error;
      return (data || []) as HrSubjectUcpOverride[];
    }
  },

  async setOverride(subjectId: string, ucp: UcpType): Promise<void> {
    const orgId = await getOrgId();
    const { data: { user } } = await supabase.auth.getUser();
    if (API_PROVIDER === 'nestjs') {
      await nestApi.post(`/rh/overrides`, {
        organization_id: orgId,
        subject_id: subjectId,
        ucp_type: ucp,
        updated_by: user?.id ?? null,
      });
    } else {
      const { error } = await supabase
        .from('hr_subject_ucp_overrides')
        .upsert(
          {
            organization_id: orgId,
            subject_id: subjectId,
            ucp_type: ucp,
            updated_by: user?.id ?? null,
          },
          { onConflict: 'subject_id' },
        );
      if (error) throw error;
    }
  },

  async clearOverride(subjectId: string): Promise<void> {
    if (API_PROVIDER === 'nestjs') {
      await nestApi.delete(`/rh/overrides/${subjectId}`);
    } else {
      const { error } = await supabase
        .from('hr_subject_ucp_overrides')
        .delete()
        .eq('subject_id', subjectId);
      if (error) throw error;
    }
  },

  // ===== Plans =====
  async listPlans(): Promise<HrAllocationPlan[]> {
    const orgId = await getOrgId();
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get(`/rh/plans`, { params: { organization_id: orgId } });
      return data;
    } else {
      const { data, error } = await supabase
        .from('hr_allocation_plans')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as HrAllocationPlan[];
    }
  },

  async getPlan(id: string): Promise<HrAllocationPlan | null> {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get(`/rh/plans/${id}`);
      return data;
    } else {
      const { data, error } = await supabase
        .from('hr_allocation_plans')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as HrAllocationPlan | null;
    }
  },

  async listItems(planId: string): Promise<HrAllocationItem[]> {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get(`/rh/plans/${planId}/items`);
      return data;
    } else {
      const { data, error } = await supabase
        .from('hr_allocation_items')
        .select('*')
        .eq('plan_id', planId)
        .order('vaga_label', { ascending: true });
      if (error) throw error;
      return (data || []) as HrAllocationItem[];
    }
  },

  async createPlan(input: CreatePlanInput): Promise<HrAllocationPlan> {
    const orgId = await getOrgId();
    const { data: { user } } = await supabase.auth.getUser();

    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.post(`/rh/plans`, { organization_id: orgId, created_by: user?.id, ...input });
      return data;
    } else {
      const { data: plan, error: planErr } = await supabase
        .from('hr_allocation_plans')
        .insert({
          organization_id: orgId,
          school_id: input.school_id,
          course_id: input.course_id,
          periodo: input.periodo,
          ano_letivo: input.ano_letivo,
          qtd_turmas: input.qtd_turmas,
          teto_ch_semanal: input.teto_ch_semanal,
          notes: input.notes ?? null,
          status: 'DRAFT',
          created_by: user?.id ?? null,
        })
        .select()
        .maybeSingle();
      if (planErr) throw planErr;
      if (!plan) throw new Error('Falha ao criar plano');

      if (input.items.length) {
        const rows = input.items.map((it) => ({
          plan_id: plan.id,
          organization_id: orgId,
          subject_id: it.subject_id,
          class_group_id: it.class_group_id,
          ucp_type: it.ucp_type,
          aulas: it.aulas,
          vaga_label: it.vaga_label ?? null,
          professor_id: it.professor_id ?? null,
          origem: 'SUGERIDO' as const,
          status: 'PENDENTE' as const,
        }));
        const { error: itemsErr } = await supabase.from('hr_allocation_items').insert(rows);
        if (itemsErr) throw itemsErr;
      }

      return plan as HrAllocationPlan;
    }
  },

  async updateItem(itemId: string, patch: Partial<HrAllocationItem>): Promise<void> {
    if (API_PROVIDER === 'nestjs') {
      await nestApi.patch(`/rh/items/${itemId}`, patch);
    } else {
      const { error } = await supabase
        .from('hr_allocation_items')
        .update(patch)
        .eq('id', itemId);
      if (error) throw error;
    }
  },

  async deletePlan(planId: string): Promise<void> {
    if (API_PROVIDER === 'nestjs') {
      await nestApi.delete(`/rh/plans/${planId}`);
    } else {
      // Itens caem em cascade caso a FK seja ON DELETE CASCADE; senão, apaga antes:
      await supabase.from('hr_allocation_items').delete().eq('plan_id', planId);
      const { error } = await supabase.from('hr_allocation_plans').delete().eq('id', planId);
      if (error) throw error;
    }
  },

  async setPlanStatus(planId: string, status: HrPlanStatus): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (API_PROVIDER === 'nestjs') {
      await nestApi.patch(`/rh/plans/${planId}/status`, { status, user_id: user?.id });
    } else {
      const patch: Record<string, unknown> = { status };
      if (status === 'PUBLISHED') {
        patch.published_by = user?.id ?? null;
        patch.published_at = new Date().toISOString();
      }
      const { error } = await supabase.from('hr_allocation_plans').update(patch).eq('id', planId);
      if (error) throw error;
    }
  },

  // Lista professores vinculados a uma escola+curso (para atribuir nos itens)
  async listEligibleProfessors(schoolId: string, courseId: string) {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get(`/rh/eligible-professors`, { params: { schoolId, courseId } });
      return data;
    } else {
      const { data, error } = await supabase
        .from('professor_school_courses')
        .select('professor_id, professors:professor_id(id, nome_completo)')
        .eq('school_id', schoolId)
        .eq('course_id', courseId)
        .eq('status', 'ACTIVE');
      if (error) throw error;
      return (data || [])
        .map((r: any) => r.professors)
        .filter(Boolean) as { id: string; nome_completo: string }[];
    }
  },

  // Publica os itens de um plano em weekly_teaching_models. Itens sem professor são pulados.
  async publishToGrade(planId: string): Promise<{ published: number; skipped: number }> {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.post(`/rh/plans/${planId}/publish`);
      return data;
    } else {
      const orgId = await getOrgId();
      const plan = await this.getPlan(planId);
      if (!plan) throw new Error('Plano não encontrado');
      if (plan.status === 'PUBLISHED') throw new Error('Plano já publicado');

      const items = await this.listItems(planId);
      const ready = items.filter((i) => i.professor_id && i.weekday && i.school_time_slot_id);
      const skipped = items.length - ready.length;

      let published = 0;
      for (const it of ready) {
        // Buscar horário do slot para preencher start/end
        const { data: slot } = await supabase
          .from('school_time_slots')
          .select('start_time, end_time')
          .eq('id', it.school_time_slot_id!)
          .maybeSingle();
        if (!slot) continue;

        const { data: model, error: modelErr } = await supabase
          .from('weekly_teaching_models')
          .insert({
            organization_id: orgId,
            school_id: plan.school_id,
            course_id: plan.course_id,
            class_group_id: it.class_group_id,
            subject_id: it.subject_id,
            professor_id: it.professor_id!,
            school_time_slot_id: it.school_time_slot_id!,
            weekday: it.weekday as any,
            start_time: slot.start_time,
            end_time: slot.end_time,
            schedule_type: 'CLASS' as any,
            status: 'ACTIVE' as any,
          })
          .select('id')
          .maybeSingle();
        if (modelErr) throw modelErr;

        await supabase
          .from('hr_allocation_items')
          .update({ status: 'PUBLICADO', weekly_teaching_model_id: model?.id ?? null })
          .eq('id', it.id);
        published++;
      }

      await this.setPlanStatus(planId, 'PUBLISHED');
      return { published, skipped };
    }
  },

  // ===== Carga Horária (Workload) =====
  // Soma a carga semanal (em minutos) por professor a partir de weekly_teaching_models ACTIVE.
  async listWorkload(): Promise<Array<{
    professor_id: string;
    nome_completo: string;
    aulas_count: number;
    minutos_semana: number;
    horas_semana: number;
    schools: string[];
    schoolsDetail: Array<{ school_id: string | null; school_name: string; aulas: number; minutos: number }>;
  }>> {
    const orgId = await getOrgId();
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get(`/rh/workload`, { params: { organization_id: orgId } });
      return data;
    } else {
      // 1) professores ativos da org
      const { data: profs, error: pErr } = await supabase
        .from('professors')
        .select('id, full_name')
        .eq('organization_id', orgId)
        .eq('status', 'ACTIVE')
        .is('deleted_at', null);
      if (pErr) throw pErr;

      // 2) modelos ativos
      const { data: models, error: mErr } = await supabase
        .from('weekly_teaching_models')
        .select('professor_id, school_id, start_time, end_time, schools:school_id(nome)')
        .eq('organization_id', orgId)
        .eq('status', 'ACTIVE');
      if (mErr) throw mErr;

      type SchoolAgg = { school_id: string | null; school_name: string; aulas: number; minutos: number };
      const byProf = new Map<string, { aulas: number; minutos: number; bySchool: Map<string, SchoolAgg> }>();
      for (const m of models ?? []) {
        if (!m.professor_id) continue;
        const [sh, sm] = String(m.start_time).split(':').map(Number);
        const [eh, em] = String(m.end_time).split(':').map(Number);
        const mins = Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
        const cur = byProf.get(m.professor_id) ?? { aulas: 0, minutos: 0, bySchool: new Map<string, SchoolAgg>() };
        cur.aulas += 1;
        cur.minutos += mins;
        const sid = (m as any).school_id ?? null;
        const sname = (m as any).schools?.nome ?? '—';
        const key = sid ?? `__${sname}`;
        const sAgg = cur.bySchool.get(key) ?? { school_id: sid, school_name: sname, aulas: 0, minutos: 0 };
        sAgg.aulas += 1;
        sAgg.minutos += mins;
        cur.bySchool.set(key, sAgg);
        byProf.set(m.professor_id, cur);
      }

      return (profs ?? []).map((p) => {
        const w = byProf.get(p.id) ?? { aulas: 0, minutos: 0, bySchool: new Map<string, SchoolAgg>() };
        const detail = Array.from(w.bySchool.values()).sort((a, b) => b.aulas - a.aulas);
        return {
          professor_id: p.id,
          nome_completo: p.full_name,
          aulas_count: w.aulas,
          minutos_semana: w.minutos,
          // hora-aula: 1 aula = 1 hora-aula (não converte minutos → decimal)
          horas_semana: w.aulas,
          schools: detail.map((s) => s.school_name),
          schoolsDetail: detail,
        };
      });
    }
  },

  // ===== Indicação -> Banco de Talentos =====
  async convertIndicationToTalent(indicationId: string): Promise<{ talent_id: string }> {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.post(`/rh/indications/${indicationId}/convert`);
      return data;
    } else {
      const orgId = await getOrgId();
      const { data: { user } } = await supabase.auth.getUser();

      const { data: ind, error: indErr } = await supabase
        .from('hr_school_indications' as any)
        .select('*')
        .eq('id', indicationId)
        .maybeSingle();
      if (indErr) throw indErr;
      if (!ind) throw new Error('Indicação não encontrada');
      const tel = ((ind as any).candidato_telefone ?? '').toString().trim();
      if (!tel) throw new Error('Indicação sem telefone — campo obrigatório no Banco de Talentos.');

      // Mapeia período -> talent_period (enums idênticos: MANHA/TARDE/NOITE)
      const periodo = (ind as any).periodo as string | null;
      const free_periods = periodo ? [periodo] : [];

      const email = ((ind as any).candidato_email ?? '').toString().trim() || null;

      const { data: talent, error: tErr } = await supabase
        .from('talent_pool_candidates')
        .insert({
          organization_id: orgId,
          full_name: (ind as any).candidato_nome,
          email,
          phone: tel,
          phone_is_whatsapp: false,
          free_periods: free_periods as any,
          free_weekdays: [],
          formation_area: (ind as any).candidato_disciplinas ?? null,
          notes: `Originado de indicação da escola por ${(ind as any).indicado_por_nome ?? 'diretor'}.${(ind as any).observacoes ? '\n\n' + (ind as any).observacoes : ''}`,
          created_by: user?.id ?? null,
        })
        .select('id')
        .maybeSingle();
      if (tErr) throw tErr;
      if (!talent) throw new Error('Falha ao criar candidato');

      await supabase
        .from('hr_school_indications' as any)
        .update({ status: 'CONVERTIDA', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('id', indicationId);

      return { talent_id: talent.id };
    }
  },

  // ===== Cobertura curricular (R.H. → Alocar) =====
  // Para uma escola+curso+ano, retorna cada turma com:
  //  - demanda_h (Σ subjects.carga_horaria_semanal)
  //  - alocado_h (Σ horas dos modelos ACTIVE da turma)
  //  - cobertura por disciplina (subject_id -> horas alocadas)
  //  - pendências (subjects com alocado < demandado)
  //  - modelos sem professor (vagas a atribuir)
  async getCurriculumCoverage(input: {
    school_id: string;
    course_id: string;
    ano_letivo: string;
  }): Promise<{
    subjects: Array<{ id: string; nome: string; carga_horaria_semanal: number }>;
    turmas: Array<{
      id: string;
      nome: string;
      demanda_h: number;
      alocado_h: number;
      cobertura: Array<{
        subject_id: string;
        nome: string;
        demanda_h: number;
        alocado_h: number;
        pendente_h: number;
      }>;
      modelos_sem_professor: Array<{
        id: string;
        weekday: string;
        start_time: string;
        end_time: string;
        subject_id: string | null;
        subject_name: string | null;
      }>;
    }>;
    totals: { demanda_h: number; alocado_h: number; pendente_h: number; turmas: number };
  }> {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get(`/rh/curriculum-coverage`, { params: input });
      return data;
    } else {
      const orgId = await getOrgId();

      const [subjRes, cgRes] = await Promise.all([
        supabase
          .from('subjects')
          .select('id, nome, carga_horaria_semanal')
          .eq('course_id', input.course_id)
          .eq('status', 'ativo')
          .is('deleted_at', null)
          .order('nome'),
        supabase
          .from('class_groups')
          .select('id, nome')
          .eq('school_id', input.school_id)
          .eq('course_id', input.course_id)
          .eq('ano_letivo', input.ano_letivo)
          .eq('status', 'ativo')
          .order('nome'),
      ]);
      if (subjRes.error) throw subjRes.error;
      if (cgRes.error) throw cgRes.error;

      const subjects = (subjRes.data ?? []) as Array<{ id: string; nome: string; carga_horaria_semanal: number }>;
      const turmas = (cgRes.data ?? []) as Array<{ id: string; nome: string }>;
      const subjectById = new Map(subjects.map((s) => [s.id, s]));

      if (turmas.length === 0) {
        return {
          subjects,
          turmas: [],
          totals: { demanda_h: 0, alocado_h: 0, pendente_h: 0, turmas: 0 },
        };
      }

      // Modelos ACTIVE de todas as turmas dessa escola+curso
      const turmaIds = turmas.map((t) => t.id);
      const { data: models, error: mErr } = await supabase
        .from('weekly_teaching_models')
        .select('id, class_group_id, subject_id, professor_id, weekday, start_time, end_time, subjects:subject_id(nome)')
        .eq('organization_id', orgId)
        .eq('school_id', input.school_id)
        .eq('course_id', input.course_id)
        .in('class_group_id', turmaIds)
        .eq('status', 'ACTIVE');
      if (mErr) throw mErr;

      // (removido minutesOf — agora contamos aulas, não minutos)

      type Bucket = { aulas: number; sem_prof: typeof models };
      // Hora-aula: contamos aulas (slots) por turma+disciplina, não minutos.
      // subjects.carga_horaria_semanal já está em hora-aula (= nº de aulas/sem).
      const byTurmaSubject = new Map<string, Map<string, number>>(); // turma -> subject -> aulas
      const semProfPorTurma = new Map<string, NonNullable<typeof models>>();

      for (const m of models ?? []) {
        if (!m.class_group_id) continue;
        const inner = byTurmaSubject.get(m.class_group_id) ?? new Map<string, number>();
        if (m.subject_id) inner.set(m.subject_id, (inner.get(m.subject_id) ?? 0) + 1);
        byTurmaSubject.set(m.class_group_id, inner);

        if (!m.professor_id) {
          const arr = semProfPorTurma.get(m.class_group_id) ?? ([] as any);
          arr.push(m);
          semProfPorTurma.set(m.class_group_id, arr);
        }
      }

      let totalDemanda = 0;
      let totalAlocado = 0;

      const turmasOut = turmas.map((t) => {
        const subjectAlloc = byTurmaSubject.get(t.id) ?? new Map<string, number>();
        const cobertura = subjects.map((s) => {
          const alocado_h = subjectAlloc.get(s.id) ?? 0; // nº de aulas alocadas (inteiro)
          const demanda_h = s.carga_horaria_semanal || 0; // nº de aulas demandadas
          const pendente_h = Math.max(0, demanda_h - alocado_h);
          return { subject_id: s.id, nome: s.nome, demanda_h, alocado_h, pendente_h };
        });
        const demanda_h = subjects.reduce((sum, s) => sum + (s.carga_horaria_semanal || 0), 0);
        const alocado_h = cobertura.reduce((sum, c) => sum + c.alocado_h, 0);
        totalDemanda += demanda_h;
        totalAlocado += alocado_h;
        const semProf = (semProfPorTurma.get(t.id) ?? []).map((m: any) => ({
          id: m.id,
          weekday: m.weekday,
          start_time: m.start_time,
          end_time: m.end_time,
          subject_id: m.subject_id,
          subject_name: m.subjects?.nome ?? subjectById.get(m.subject_id)?.nome ?? null,
        }));
        return {
          id: t.id,
          nome: t.nome,
          demanda_h,
          alocado_h,
          cobertura,
          modelos_sem_professor: semProf,
        };
      });

      return {
        subjects,
        turmas: turmasOut,
        totals: {
          demanda_h: totalDemanda,
          alocado_h: totalAlocado,
          pendente_h: Math.max(0, totalDemanda - totalAlocado),
          turmas: turmas.length,
        },
      };
    }
  },

  // ===== Indicações: lista por contexto (escola/curso) =====
  async listIndicationsByContext(input: { school_id?: string; course_id?: string; status?: string[] }) {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get(`/rh/indications`, { params: input });
      return data;
    } else {
      let q = supabase
        .from('hr_school_indications' as any)
        .select('*, schools:school_id(nome), courses:course_id(nome), indication_class:indication_class_id(nome, turno)')
        .order('created_at', { ascending: false });
      if (input.school_id) q = q.eq('school_id', input.school_id);
      if (input.course_id) q = q.eq('course_id', input.course_id);
      if (input.status?.length) q = q.in('status', input.status as any);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    }
  },

  async deleteIndication(id: string): Promise<void> {
    if (API_PROVIDER === 'nestjs') {
      await nestApi.delete(`/rh/indications/${id}`);
    } else {
      const { error } = await supabase.from('hr_school_indications' as any).delete().eq('id', id);
      if (error) throw error;
    }
  },

  async getIndication(id: string): Promise<any> {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get(`/rh/indications/${id}`);
      return data;
    } else {
      const { data, error } = await supabase
        .from('hr_school_indications' as any)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
  },

  async assignProfessorToVaga(wtmId: string, professorId: string | null): Promise<void> {
    if (API_PROVIDER === 'nestjs') {
      await nestApi.patch(`/weekly_teaching_models/${wtmId}`, { professor_id: professorId });
    } else {
      const { error } = await supabase
        .from('weekly_teaching_models')
        .update({ professor_id: professorId })
        .eq('id', wtmId);
      if (error) throw error;
    }
  },

  // ===== Indicação -> Vaga (slot) =====
  async assignIndicationToVaga(input: {
    indication_id: string;
    weekly_teaching_model_id: string;
    professor_id: string;
  }): Promise<void> {
    if (API_PROVIDER === 'nestjs') {
      await nestApi.post(`/rh/indications/assign-vaga`, input);
    } else {
      const { data, error } = await supabase.rpc('assign_indication_to_vaga' as any, {
        p_indication_id: input.indication_id,
        p_weekly_teaching_model_id: input.weekly_teaching_model_id,
        p_professor_id: input.professor_id,
      });
      if (error) throw error;
      const r = data as any;
      if (!r?.success) throw new Error(r?.error || 'Falha ao atribuir');
    }
  },

  async setIndicationStatus(id: string, status: 'PENDENTE' | 'EM_ANALISE' | 'APROVADA' | 'RECUSADA' | 'CONVERTIDA' | 'ALOCADA', motivo?: string): Promise<void> {
    if (API_PROVIDER === 'nestjs') {
      await nestApi.patch(`/rh/indications/${id}/status`, { status, motivo });
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const patch: Record<string, unknown> = {
        status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      };
      if (status === 'RECUSADA') patch.motivo_recusa = motivo ?? null;
      const { error } = await supabase
        .from('hr_school_indications' as any)
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    }
  },

  // ===== Contratação (Hiring) =====
  async listHiringCandidates(): Promise<any[]> {
    const orgId = await getOrgId();
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get(`/rh/hiring-candidates`, { params: { organization_id: orgId } });
      return data;
    } else {
      const { data: candidates, error } = await supabase
        .from('hr_hiring_candidates' as any)
        .select('id, status, sent_at, notes, sent_by, professor_id')
        .eq('organization_id', orgId)
        .order('sent_at', { ascending: false });
      if (error) throw error;
      const cs = (candidates as any[]) || [];
      const profIds = Array.from(new Set(cs.map(c => c.professor_id)));
      const sentByIds = Array.from(new Set(cs.map(c => c.sent_by).filter(Boolean)));

      const [profsRes, profilesRes, countsRes, linksRes, logsRes] = await Promise.all([
        profIds.length ? supabase.from('professors').select('id, full_name, cpf').in('id', profIds) : Promise.resolve({ data: [] as any[] }),
        sentByIds.length ? supabase.from('profiles').select('user_id, full_name').in('user_id', sentByIds) : Promise.resolve({ data: [] as any[] }),
        supabase.rpc('get_hiring_candidate_doc_counts' as any, { _organization_id: orgId }),
        supabase.from('external_links').select('id, token, is_active, expires_at, created_at, scope_json').eq('content_type', 'professor_contratacao').eq('organization_id', orgId).order('created_at', { ascending: false }),
        supabase.from('external_access_logs').select('external_link_id, access_type, pdf_downloaded, created_at').eq('document_origin_type', 'professor_contratacao'),
      ]);
      const profMap = new Map<string, any>(((profsRes.data || []) as any[]).map(p => [p.id, p]));
      const profileMap = new Map<string, string>(((profilesRes.data || []) as any[]).map(p => [p.user_id, p.full_name]));
      const countsMap = new Map<string, { originals: number; signed: number }>();
      ((countsRes.data || []) as any[]).forEach((c: any) => countsMap.set(c.candidate_id, { originals: c.originals, signed: c.signed }));
      const linkByCandidate = new Map<string, any>();
      ((linksRes.data || []) as any[]).forEach((l: any) => {
        const cid = l.scope_json?.candidate_id;
        if (cid && !linkByCandidate.has(cid)) linkByCandidate.set(cid, l);
      });

      const viewByLink = new Map<string, string>();
      const downloadByLink = new Map<string, string>();
      ((logsRes.data || []) as any[]).forEach((log: any) => {
        if (!log.external_link_id) return;
        const t = log.created_at;
        if (!viewByLink.has(log.external_link_id) || viewByLink.get(log.external_link_id)! < t) {
          viewByLink.set(log.external_link_id, t);
        }
        if (log.pdf_downloaded) {
          if (!downloadByLink.has(log.external_link_id) || downloadByLink.get(log.external_link_id)! < t) {
            downloadByLink.set(log.external_link_id, t);
          }
        }
      });

      return cs.map((c: any) => {
        const link = linkByCandidate.get(c.id) || null;
        return {
          id: c.id,
          status: c.status,
          sent_at: c.sent_at,
          notes: c.notes,
          professor: profMap.get(c.professor_id) || null,
          sent_by_label: c.sent_by ? (profileMap.get(c.sent_by) || null) : null,
          originals: countsMap.get(c.id)?.originals || 0,
          signed: countsMap.get(c.id)?.signed || 0,
          link,
          lastView: link ? (viewByLink.get(link.id) || null) : null,
          lastDownload: link ? (downloadByLink.get(link.id) || null) : null,
        };
      });
    }
  },

  async generateExternalLinkForHiring(candidateId: string, professorId: string, professorName: string): Promise<{ url: string; expiresAt: string }> {
    const orgId = await getOrgId();
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.post(`/rh/hiring-candidates/${candidateId}/generate-link`, { professor_id: professorId, organization_id: orgId });
      return data;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: bind } = await supabase
        .from('professor_school_courses')
        .select('school_id')
        .eq('professor_id', professorId)
        .limit(1)
        .maybeSingle();
      let schoolId = bind?.school_id as string | undefined;
      if (!schoolId) {
        const { data: anySchool } = await supabase
          .from('schools').select('id').eq('organization_id', orgId).limit(1).maybeSingle();
        schoolId = anySchool?.id;
      }
      if (!schoolId) throw new Error('Nenhuma escola cadastrada na organização.');
      const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
      const { data: ins, error } = await supabase.from('external_links').insert({
        organization_id: orgId,
        school_id: schoolId,
        created_by: user?.id || '',
        content_type: 'professor_contratacao',
        scope_json: { professor_id: professorId, candidate_id: candidateId },
        token,
        is_active: true,
        starts_at: new Date().toISOString(),
        expires_at: expiresAt,
      }).select('id').maybeSingle();
      if (error) throw error;
      await supabase.from('hr_hiring_audit_logs' as any).insert({
        organization_id: orgId,
        candidate_id: candidateId,
        professor_id: professorId,
        actor_user_id: user?.id || null,
        event: 'EXTERNAL_LINK_CREATED',
        payload: { link_id: ins?.id, token },
      });
      const url = `https://nexa-gestao.lovable.app/acesso-externo/${token}`;
      return { url, expiresAt };
    }
  },

  async revokeExternalLink(linkId: string, candidateId: string, professorId: string): Promise<void> {
    const orgId = await getOrgId();
    if (API_PROVIDER === 'nestjs') {
      await nestApi.post(`/rh/hiring-candidates/${candidateId}/revoke-link`, { link_id: linkId });
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('external_links')
        .update({ is_active: false })
        .eq('id', linkId);
      if (error) throw error;
      await supabase.from('hr_hiring_audit_logs' as any).insert({
        organization_id: orgId,
        candidate_id: candidateId,
        professor_id: professorId || null,
        actor_user_id: user?.id || null,
        event: 'EXTERNAL_LINK_REVOKED',
        payload: { link_id: linkId },
      });
    }
  },

  async cancelHiringCandidate(candidateId: string, reason: string): Promise<void> {
    if (API_PROVIDER === 'nestjs') {
      await nestApi.post(`/rh/hiring-candidates/${candidateId}/cancel`, { reason });
    } else {
      const { error } = await supabase.rpc('cancel_hiring_candidate' as any, { _candidate_id: candidateId, _reason: reason });
      if (error) throw error;
    }
  },

  async getHiringCandidateDetail(candidateId: string): Promise<{ candidate: any; professor: any; documents: any[]; links: any[]; audit: any[] } | null> {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get(`/rh/hiring-candidates/${candidateId}`);
      return data;
    } else {
      const { data: cand } = await supabase
        .from('hr_hiring_candidates' as any)
        .select('*')
        .eq('id', candidateId)
        .maybeSingle();
      if (!cand) return null;

      const [profRes, docsRes, linksRes, auditRes] = await Promise.all([
        supabase.from('professors').select('id, full_name, cpf, email, phone, registration_code').eq('id', (cand as any).professor_id).maybeSingle(),
        supabase.from('hr_hiring_documents' as any).select('*').eq('candidate_id', candidateId).is('deleted_at', null).order('uploaded_at', { ascending: true }),
        supabase.from('external_links').select('*').eq('content_type', 'professor_contratacao').contains('scope_json' as any, { candidate_id: candidateId }).order('created_at', { ascending: false }),
        supabase.from('hr_hiring_audit_logs' as any).select('*').eq('candidate_id', candidateId).order('created_at', { ascending: false }),
      ]);
      return {
        candidate: cand,
        professor: profRes.data || null,
        documents: (docsRes.data || []) as any[],
        links: (linksRes.data || []) as any[],
        audit: (auditRes.data || []) as any[],
      };
    }
  },

  async removeHiringDocument(documentId: string, candidateId: string, professorId: string | null, fileName: string): Promise<void> {
    const orgId = await getOrgId();
    if (API_PROVIDER === 'nestjs') {
      await nestApi.delete(`/rh/hiring-candidates/${candidateId}/documents/${documentId}`, { data: { file_name: fileName } });
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('hr_hiring_documents' as any).update({ deleted_at: new Date().toISOString() }).eq('id', documentId);
      if (error) throw error;
      await supabase.from('hr_hiring_audit_logs' as any).insert({
        organization_id: orgId,
        candidate_id: candidateId,
        professor_id: professorId,
        actor_user_id: user?.id || null,
        event: 'DOC_REMOVED',
        payload: { document_id: documentId, file_name: fileName },
      });
    }
  },

  // ===== Utilitários de Consulta (Lookups) =====
  async listSchools(): Promise<Array<{ id: string; nome: string }>> {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get('/schools', { params: { status: 'ativo' } });
      return data;
    } else {
      const { data, error } = await supabase.from('schools').select('id, nome').eq('status', 'ativo').order('nome');
      if (error) throw error;
      return data || [];
    }
  },

  async listCoursesBySchool(schoolId: string): Promise<Array<{ id: string; nome: string }>> {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get('/courses', { params: { schoolId } });
      return data;
    } else {
      const { data, error } = await supabase
        .from('school_courses')
        .select('course_id')
        .eq('school_id', schoolId);
      if (error) throw error;
      if (!data?.length) return [];
      const courseIds = data.map((r: any) => r.course_id);
      const { data: coursesData, error: err } = await supabase.from('courses').select('id, nome').in('id', courseIds).order('nome');
      if (err) throw err;
      return coursesData || [];
    }
  },

  async listClassGroups(schoolId: string, courseId: string, anoLetivo: string): Promise<Array<{ id: string; nome: string }>> {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get('/class_groups', { params: { schoolId, courseId, anoLetivo, status: 'ativo' } });
      return data;
    } else {
      const { data, error } = await supabase
        .from('class_groups')
        .select('id, nome')
        .eq('school_id', schoolId)
        .eq('course_id', courseId)
        .eq('ano_letivo', anoLetivo)
        .eq('status', 'ativo')
        .order('nome');
      if (error) throw error;
      return data || [];
    }
  },

  async listSubjects(courseId: string): Promise<Array<{ id: string; nome: string; carga_horaria_semanal: number }>> {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get('/subjects', { params: { courseId, status: 'ativo' } });
      return data;
    } else {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, nome, carga_horaria_semanal')
        .eq('course_id', courseId)
        .eq('status', 'ativo')
        .is('deleted_at', null)
        .order('nome');
      if (error) throw error;
      return data || [];
    }
  },

  async listAllSubjects(): Promise<Array<{ id: string; nome: string; carga_horaria_semanal: number; course_nome: string }>> {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get('/rh/subjects/all');
      return data;
    } else {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, nome, carga_horaria_semanal, courses(nome)')
        .is('deleted_at', null)
        .order('nome');
      if (error) throw error;
      return (data || []).map((s: any) => ({
        id: s.id,
        nome: s.nome,
        carga_horaria_semanal: s.carga_horaria_semanal,
        course_nome: s.courses?.nome ?? '—',
      }));
    }
  },

  async listTimeSlots(schoolId: string): Promise<Array<{ id: string; slot_number: number; slot_label: string; start_time: string; end_time: string; weekday: string }>> {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get('/school_time_slots', { params: { schoolId, status: 'ativo' } });
      return data;
    } else {
      const { data, error } = await supabase
        .from('school_time_slots')
        .select('id, slot_number, slot_label, start_time, end_time, weekday')
        .eq('school_id', schoolId)
        .eq('status', 'ativo')
        .order('slot_number');
      if (error) throw error;
      return data || [];
    }
  },

  async saveIndicationDraft(payload: {
    token: string;
    keyword: string;
    payload: any;
    diretor_nome: string | null;
  }): Promise<boolean> {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.post('/rh/indications/draft', payload);
      return data?.ok === true;
    } else {
      const { data, error } = await supabase.rpc('save_indication_draft', {
        p_token: payload.token,
        p_keyword: payload.keyword,
        p_payload: payload.payload,
        p_diretor_nome: payload.diretor_nome,
      });
      if (error) throw error;
      return (data as any)?.ok === true;
    }
  },

  async getTeacherShiftWorkload(organizationId: string, professorIds: string[]): Promise<any[]> {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get('/rh/teacher-shift-workload', { params: { organizationId, professorIds: professorIds.join(',') } });
      return data;
    } else {
      const { data, error } = await supabase
        .from('professor_school_courses')
        .select('professor_id, workload_morning_hours, workload_afternoon_hours, workload_night_hours, schools:school_id(nome)')
        .eq('organization_id', organizationId)
        .eq('status', 'ACTIVE')
        .in('professor_id', professorIds);
      if (error) throw error;
      return data || [];
    }
  },

  async listHiringDocuments(candidateId: string): Promise<any[]> {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get(`/rh/hiring-candidates/${candidateId}/documents`);
      return data;
    } else {
      const { data, error } = await supabase
        .from('hr_hiring_documents' as any)
        .select('id, doc_kind, title, file_name, file_path, uploaded_at, kind, parent_document_id, external_ip')
        .eq('candidate_id', candidateId)
        .is('deleted_at', null)
        .order('uploaded_at', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  },

  async createHiringDocument(doc: any): Promise<void> {
    const orgId = await getOrgId();
    if (API_PROVIDER === 'nestjs') {
      await nestApi.post(`/rh/hiring-candidates/${doc.candidate_id}/documents`, doc);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from('hr_hiring_documents' as any).insert({
        ...doc,
        uploaded_by: user?.id || null,
      });
      if (insErr) throw insErr;
      await supabase.from('hr_hiring_audit_logs' as any).insert({
        organization_id: doc.organization_id || orgId,
        candidate_id: doc.candidate_id,
        professor_id: doc.professor_id,
        actor_user_id: user?.id || null,
        event: 'DOC_ADDED',
        payload: { document_id: doc.id, title: doc.title, doc_kind: doc.doc_kind, file_name: doc.file_name },
      });
    }
  },

  async listTalentPoolCandidates(): Promise<any[]> {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get('/rh/talents');
      return data;
    } else {
      const { data, error } = await supabase
        .from('talent_pool_candidates')
        .select('id, full_name, formation_area, phone, email, classification')
        .order('full_name')
        .limit(200);
      if (error) throw error;
      return data || [];
    }
  },

  subscribeToHiringCandidates(organizationId: string, callback: () => void) {
    if (API_PROVIDER === 'nestjs') {
      const interval = setInterval(callback, 30000);
      return () => clearInterval(interval);
    } else {
      const ch = supabase
        .channel(`hiring-candidates-${organizationId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_hiring_candidates', filter: `organization_id=eq.${organizationId}` }, callback)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_hiring_documents', filter: `organization_id=eq.${organizationId}` }, callback)
        .subscribe();
      return () => { supabase.removeChannel(ch); };
    }
  },

  async getBranding(organizationId: string) {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get(`/organizations/${organizationId}/branding`);
      return data;
    } else {
      const { data } = await supabase
        .from('branding_settings')
        .select('logo_url, icon_url')
        .eq('organization_id', organizationId)
        .maybeSingle();
      return data;
    }
  },
};
