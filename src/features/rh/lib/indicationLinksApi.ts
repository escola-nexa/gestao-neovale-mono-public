import { supabase, API_PROVIDER } from '@/integrations/supabase/client';
import { nestApi } from '@/lib/api-adapter';

export interface SchoolIndicationLink {
  link_id: string;
  school_id: string;
  school_nome: string;
  qtd_cursos: number;
  token: string;
  keyword: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  /** @deprecated use `qtd_aulas` (mesmo valor — total de slots/disciplinas preenchidas). */
  qtd_indicacoes: number;
  qtd_turmas: number;
  /** Professores indicados DISTINTOS (por e-mail/telefone). */
  qtd_professores: number;
  /** Total de aulas/slots preenchidos (1 linha por disciplina/horário). */
  qtd_aulas: number;
  /** Indicações com status APROVADA. */
  qtd_aprovadas?: number;
  /** Indicações com status PENDENTE ou EM_ANALISE. */
  qtd_pendentes?: number;
  /** Indicações com status RECUSADA. */
  qtd_recusadas?: number;
  /** Quando preenchido, indica que a grade horária já foi materializada a partir das indicações. */
  materialized_at?: string | null;
  materialized_ano_letivo?: string | null;
  /** Quando preenchido, o diretor já enviou as indicações da escola. */
  submitted_at?: string | null;
}

export interface LinkInfoSubject {
  id: string;
  /** Já vem como Nome Boletim (com fallback para o nome cadastrado). */
  nome: string;
  carga_horaria_semanal: number | null;
  /** 'FIRST' | 'SECOND' | 'ANNUAL' — apenas FIRST e ANNUAL são retornados pela RPC. */
  semester?: string | null;
}

export interface LinkInfoCourse {
  id: string;
  nome: string;
  codigo: string | null;
  subjects: LinkInfoSubject[];
}

export interface GradeCompletenessResult {
  ok: boolean;
  school_id: string;
  course_id: string;
  ano_letivo: string;
  total_missing_classes: number;
  total_incomplete_classes: number;
  total_subjects_missing: number;
  missing_classes: Array<{ course_id: string; class_group_id: string; class_name: string }>;
  incomplete_classes: Array<{
    indication_class_id: string;
    class_name: string;
    subjects_missing: number;
    total_missing_ch: number;
    missing_subjects: Array<{
      subject_id: string;
      subject_name: string;
      ch_required: number;
      ch_indicated: number;
      ch_missing: number;
    }> | null;
  }>;
}

export interface RegraFixaPayload {
  pem: number;
  uci: number;
  ucii: number;
  uciii: number;
  total_por_turma: number;
}

export interface LinkInfoPayload {
  link_id: string;
  organization_id: string;
  school: { id: string; nome: string; codigo: string | null; cidade: string | null };
  courses: LinkInfoCourse[];
  teto_ch_professor: number;
  regra_fixa?: RegraFixaPayload;
}

export interface GradePreview {
  turmas_a_criar: number;
  turmas_existentes: number;
  slots_a_criar: number;
  slots_existentes: number;
  aulas_a_criar: number;
  aulas_ignoradas: number;
  slot_warnings: Array<{ indication_id: string; candidato: string; label: string; reason: string }>;
  subject_warnings: Array<{ indication_id: string; candidato: string; subject_id: string; subject_nome: string; reason: string }>;
  conflicts: Array<{ indication_id: string; candidato: string; professor_id: string; weekday: string; conflict_school: string; conflict_start: string; conflict_end: string }>;
}

export const indicationLinksApi = {
  async list(): Promise<SchoolIndicationLink[]> {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get('/rh/indications/links');
      return data;
    } else {
      const { data, error } = await supabase.rpc('list_school_indication_links');
      if (error) throw error;
      return (data || []) as unknown as SchoolIndicationLink[];
    }
  },

  async generateBatch(schoolIds: string[], expiresAt?: string | null) {
    const { data, error } = await supabase.rpc('generate_school_indication_links', {
      p_school_ids: schoolIds,
      p_expires_at: expiresAt ?? null,
    });
    if (error) throw error;
    const rows = (data || []) as Array<{
      out_school_id: string;
      out_link_id: string;
      out_token: string;
      out_keyword: string | null;
      out_created: boolean;
    }>;
    return rows.map((r) => ({
      school_id: r.out_school_id,
      link_id: r.out_link_id,
      token: r.out_token,
      keyword: r.out_keyword,
      created: r.out_created,
    }));
  },

  async toggleActive(linkId: string, isActive: boolean) {
    const { error } = await supabase
      .from('external_links')
      .update({ is_active: isActive })
      .eq('id', linkId);
    if (error) throw error;
  },

  async deleteLink(linkId: string, motivo: string) {
    const { data, error } = await supabase.rpc('delete_school_indication_link', {
      p_link_id: linkId,
      p_motivo: motivo,
    } as any);
    if (error) throw error;
    return data as {
      indications: number;
      classes: number;
      logs: number;
      allocation_items_unlinked: number;
    };
  },

  async reopen(linkId: string, motivo: string) {
    const { data, error } = await supabase.rpc('reopen_school_indication', {
      p_link_id: linkId,
      p_motivo: motivo,
    } as any);
    if (error) throw error;
    return data as { ok: boolean; link_id: string; token: string; reopened_at: string };
  },

  async materializeGrade(
    linkId: string,
    anoLetivo: string,
    generateOccurrences: boolean = false,
    subjectBimesterFilter?: Array<{ subject_id: string; bimester: number; enabled: boolean }>,
    semesterScope: 'ALL' | 'FIRST' | 'SECOND' = 'ALL',
    planningFilter?: Array<{ professor_id: string; enabled: boolean; count?: number | null }>,
  ) {
    const { data, error } = await supabase.rpc('materialize_grade_from_indications', {
      p_link_id: linkId,
      p_ano_letivo: anoLetivo,
      p_generate_occurrences: generateOccurrences,
      ...(subjectBimesterFilter ? { p_subject_bimester_filter: subjectBimesterFilter } : {}),
      p_semester_scope: semesterScope,
      ...(planningFilter ? { p_planning_filter: planningFilter } : {}),
    } as any);
    if (error) throw error;
    return data as {
      classes_upserted: number;
      slots_upserted: number;
      models_upserted: number;
      aulas_ignoradas: number;
      occurrences_created: number;
      occurrences_skipped_by_filter?: number;
      semester_scope?: 'ALL' | 'FIRST' | 'SECOND';
      planning_created?: number;
      planning_deficit?: number;
      planning_breakdown?: Array<{
        professor_id: string;
        professor_nome: string;
        target: number;
        created: number;
        skipped_reason: string | null;
      }>;
      motivos: Array<{ indication_id: string; reason: string; [k: string]: any }>;
      materialized_at: string;
      ano_letivo: string;
    };
  },

  async checkGradeCompleteness(linkId: string): Promise<GradeCompletenessResult> {
    const { data, error } = await supabase.rpc('check_link_grade_completeness' as any, {
      p_link_id: linkId,
    } as any);
    if (error) throw error;
    return data as unknown as GradeCompletenessResult;
  },

  async previewGrade(linkId: string): Promise<GradePreview> {
    const { data, error } = await supabase.rpc('preview_grade_from_indications', {
      p_link_id: linkId,
    } as any);
    if (error) throw error;
    return data as unknown as GradePreview;
  },

  async unmaterializeGrade(linkId: string, motivo: string) {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.post(`/rh/indications/${linkId}/unmaterialize`, { motivo });
      return data;
    } else {
      const { data, error } = await supabase.rpc('unmaterialize_grade_from_indications' as any, {
        p_link_id: linkId,
        p_reason: motivo,
      });
      if (error) throw error;
      return data;
    }
  },

  /**
   * @deprecated A palavra-chave válida é sempre a Palavra-Chave Trimestral ativa
   * (cadastrada em Compartilhamento → Palavras-Chave). Esta função foi mantida
   * apenas por compatibilidade e não tem mais efeito.
   */
  async regenerateKeyword(_linkId: string): Promise<string> {
    throw new Error(
      'A palavra-chave dos links externos é sempre a Palavra-Chave Trimestral ativa. Cadastre/atualize em Compartilhamento → Palavras-Chave.',
    );
  },

  async listSchoolTeachers(
    token: string,
    keyword: string,
    courseId: string,
  ): Promise<Array<{ id: string; nome_completo: string; telefone: string; formacao: string; email: string; vinculado_ao_curso: boolean; cursos_vinculados: string[] | null }>> {
    const { data, error } = await supabase.rpc('get_school_indication_teachers', {
      p_token: token,
      p_keyword: keyword,
      p_course_id: courseId,
    } as any);
    if (error) throw error;
    return (data ?? []) as any;
  },

  async getLinkInfo(token: string, keyword: string): Promise<LinkInfoPayload> {
    const { data, error } = await supabase.rpc('get_school_indication_link_info', {
      p_token: token,
      p_keyword: keyword,
    });
    if (error) throw error;
    const payload = data as unknown as { error?: string } & LinkInfoPayload;
    if (payload?.error) throw new Error(payload.error);
    return payload;
  },

  async submitFull(
    token: string,
    keyword: string,
    courseId: string,
    classes: Array<{ nome: string; turno: 'manha' | 'tarde' | 'noite'; qtd: number }>,
    indications: Array<{
      class_index: number;
      nome: string;
      telefone: string;
      email: string;
      formacao?: string;
      /** Quando true, indica que o professor foi selecionado da lista interna da escola
       *  (telefone pode estar ausente — não bloqueia o envio). */
      from_school?: boolean;
      // Legado (regra fixa PEM/UCI/UCII/UCIII) — opcional
      funcao?: 'PEM' | 'UCI' | 'UCII' | 'UCIII';
      // Novo fluxo (grade horária do Portal do Diretor)
      disciplinas?: string[];
      grade?: {
        subject_id: string;
        subject_nome: string;
        weekday: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
        time_slot_label: string | null;
        turno: 'manha' | 'tarde' | 'noite';
      };
    }>,
    indicadoPorNome?: string,
  ) {
    const { data, error } = await supabase.rpc('submit_school_indication_full', {
      p_token: token,
      p_keyword: keyword,
      p_course_id: courseId,
      p_classes: classes,
      p_indications: indications,
      p_indicado_por_nome: indicadoPorNome ?? null,
    } as any);
    if (error) throw error;
    return data as { ok: boolean; classes: number; indications: number };
  },

  async saveDraft(token: string, keyword: string, payload: unknown, diretorNome?: string) {
    const { data, error } = await supabase.rpc('save_indication_draft', {
      p_token: token,
      p_keyword: keyword,
      p_payload: payload as any,
      p_diretor_nome: diretorNome ?? null,
    });
    if (error) throw error;
    return data as { ok: boolean; updated_at: string };
  },

  async getCourseSubjectBoletimOptions(linkId: string): Promise<Array<{
    course_id: string;
    course_nome: string;
    boletim_key: string;
    boletim_nome: string;
    carga_horaria_semanal: number;
    first_subject_id: string | null;
    second_subject_id: string | null;
    annual_subject_id: string | null;
    has_first: boolean;
    has_second: boolean;
    has_annual: boolean;
  }>> {
    const { data, error } = await supabase.rpc('get_course_subject_boletim_options', {
      p_link_id: linkId,
    } as any);
    if (error) throw error;
    return (data ?? []) as any;
  },

  async setIndicationGradeSubject(indicationId: string, boletimKey: string) {
    const { data, error } = await supabase.rpc('set_indication_grade_subject', {
      p_indication_id: indicationId,
      p_boletim_key: boletimKey,
    } as any);
    if (error) throw error;
    return data as any;
  },

  async loadDraft(token: string, keyword: string) {
    const { data, error } = await supabase.rpc('load_indication_draft', {
      p_token: token,
      p_keyword: keyword,
    });
    if (error) throw error;
    return data as
      | { found: false }
      | { found: true; payload: any; diretor_nome: string | null; updated_at: string }
      | { error: string };
  },

  /**
   * Verifica se algum dos candidatos já está alocado em OUTRA escola da organização
   * em horário sobreposto. Usado pela modal de conflito do portal externo.
   */
  async checkExternalConflicts(
    token: string,
    keyword: string,
    candidates: Array<{
      slot_id: string;
      teacher_name: string;
      teacher_phone: string;
      weekday: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
      start_time: string;
      end_time: string;
    }>,
  ): Promise<Array<{
    slot_id: string;
    teacher_name: string;
    weekday: string;
    start_time: string;
    end_time: string;
    conflicts: Array<{
      professor_id: string;
      professor_name: string;
      school_id: string;
      school_name: string;
      class_group_id: string | null;
      class_name: string | null;
      subject_id: string | null;
      subject_name: string | null;
      weekday: string;
      start_time: string;
      end_time: string;
      overlap_start: string;
      overlap_end: string;
      schedule_type: string;
    }>;
  }>> {
    if (!candidates.length) return [];
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.post('/rh/indications/external-conflicts', { token, keyword, candidates });
      return data;
    } else {
      const { data, error } = await supabase.rpc('check_teacher_external_conflicts', {
        p_token: token,
        p_keyword: keyword,
        p_candidates: candidates as any,
      } as any);
      if (error) throw error;
      const payload = data as { error?: string; conflicts?: any[] } | null;
      if (payload?.error) throw new Error(payload.error);
      return (payload?.conflicts ?? []) as any;
    }
  },

  async getExternalContext(token: string) {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get(`/rh/external/context/${token}`);
      return data;
    } else {
      const { data, error } = await supabase.rpc('get_indication_school_context' as any, { p_token: token });
      if (error) throw error;
      return data;
    }
  },

  async getExternalLinkInfo(token: string) {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get(`/rh/external/info/${token}`);
      return data;
    } else {
      const { data, error } = await supabase.rpc('get_indication_link_info' as any, { p_token: token });
      if (error) throw error;
      return data;
    }
  },

  async submitExternalIndication(token: string, keyword: string, payload: any) {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.post(`/rh/external/submit`, { token, keyword, payload });
      return data;
    } else {
      const { data, error } = await supabase.rpc('submit_school_indication' as any, { p_token: token, p_keyword: keyword, p_payload: payload });
      if (error) throw error;
      return data;
    }
  },

  async listActiveSchoolsWithCourses() {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get('/rh/indications/active-schools');
      return data;
    } else {
      const { data: links, error: linksErr } = await supabase
        .from('course_schools')
        .select('school_id, courses!inner(id, status)')
        .eq('courses.status', 'ativo');
      if (linksErr) throw linksErr;

      const schoolIdsWithCourses = Array.from(
        new Set((links ?? []).map((l: any) => l.school_id).filter(Boolean)),
      );
      if (schoolIdsWithCourses.length === 0) return [];

      const { data, error } = await supabase
        .from('schools')
        .select('id, nome, codigo, status')
        .eq('status', 'ativo')
        .in('id', schoolIdsWithCourses)
        .order('nome');
      if (error) throw error;
      return data ?? [];
    }
  },

  async getConferirData(linkId: string) {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get(`/rh/indications/${linkId}/conferir`);
      return data;
    } else {
      const [{ data: classes }, { data: indics }] = await Promise.all([
        supabase
          .from('hr_indication_classes')
          .select('id, course_id, nome, turno')
          .eq('external_link_id', linkId)
          .order('nome'),
        supabase
          .from('hr_school_indications')
          .select('id, external_link_id, course_id, indication_class_id, candidato_nome, candidato_email, candidato_telefone, candidato_formacao, candidato_grade, status, motivo_recusa')
          .eq('external_link_id', linkId),
      ]);
      const courseIds = Array.from(new Set([
        ...((classes ?? []).map((c: any) => c.course_id)),
        ...((indics ?? []).map((i: any) => i.course_id).filter(Boolean)),
      ]));
      const { data: courses } = courseIds.length
        ? await supabase.from('courses').select('id, nome').in('id', courseIds)
        : { data: [] as any[] };
      const courseMap = new Map<string, string>();
      (courses ?? []).forEach((c: any) => courseMap.set(c.id, c.nome));
      return {
        classes: (classes ?? []),
        indications: (indics ?? []),
        courseMap,
      };
    }
  },

  async getAnpSubjects(subjectIds: string[], classIds: string[]) {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.post(`/rh/indications/anp-subjects`, { subjectIds, classIds });
      const set = new Set<string>();
      (data ?? []).forEach((r: any) => set.add(`${r.class_group_id}:${r.subject_id}`));
      return set;
    } else {
      const { data, error } = await supabase
        .from('class_subject_modality')
        .select('class_group_id, subject_id')
        .in('subject_id', subjectIds)
        .in('class_group_id', classIds)
        .gt('ch_anp', 0);
      if (error) throw error;
      const set = new Set<string>();
      (data ?? []).forEach((r: any) => set.add(`${r.class_group_id}:${r.subject_id}`));
      return set;
    }
  },

  async setIndicationAnp(id: string, isAnp: boolean, currentGrade: any) {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.patch(`/rh/indications/${id}/anp`, { isAnp, currentGrade });
      return data;
    } else {
      const next = {
        ...(currentGrade || {}),
        is_anp: isAnp,
        class_mode: isAnp ? 'ANP' : 'PRESENCIAL',
      };
      const { error } = await supabase
        .from('hr_school_indications')
        .update({ candidato_grade: next })
        .eq('id', id);
      if (error) throw error;
    }
  },

  async getLinkOrganizationId(linkId: string): Promise<string | null> {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get(`/rh/indications/${linkId}/organization`);
      return data?.organization_id || null;
    } else {
      const { data } = await supabase
        .from('external_links').select('organization_id').eq('id', linkId).maybeSingle();
      return (data as any)?.organization_id || null;
    }
  },

  async getSubjectsSemester(subjectIds: string[]) {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.post(`/rh/indications/subjects-semester`, { subjectIds });
      return data;
    } else {
      const { data } = await supabase
        .from('subjects').select('id, semester').in('id', subjectIds);
      return data || [];
    }
  },

  async getSeedFromMaterializedGrade(linkId: string): Promise<Array<{ course_id: string; professor_id: string; subject_id: string }>> {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get(`/rh/indications/${linkId}/seed`);
      return data || [];
    } else {
      const { data: linkRow } = await supabase
        .from('external_links').select('school_id').eq('id', linkId).maybeSingle();
      const schoolId = (linkRow as any)?.school_id;
      if (!schoolId) return [];
      const { data: models } = await supabase
        .from('weekly_teaching_models')
        .select('professor_id, subject_id, class_groups!inner(course_id)')
        .eq('school_id', schoolId)
        .eq('status', 'ACTIVE')
        .eq('schedule_type', 'CLASS')
        .not('subject_id', 'is', null)
        .not('professor_id', 'is', null);
      const seen = new Set<string>();
      const seed: Array<{ course_id: string; professor_id: string; subject_id: string }> = [];
      (models ?? []).forEach((m: any) => {
        const courseId = m.class_groups?.course_id;
        if (!courseId || !m.professor_id || !m.subject_id) return;
        const k = `${courseId}|${m.professor_id}|${m.subject_id}`;
        if (seen.has(k)) return;
        seen.add(k);
        seed.push({ course_id: courseId, professor_id: m.professor_id, subject_id: m.subject_id });
      });
      return seed;
    }
  },

  async getSubjectsDetails(subjectIds: string[]) {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.post('/rh/indications/subjects-details', { subjectIds });
      return data || [];
    } else {
      const { data } = await supabase
        .from('subjects')
        .select('id, semester, carga_horaria_semanal, nome, nome_boletim')
        .in('id', subjectIds);
      return data || [];
    }
  },

  async getBimesterFilter(linkId: string) {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get(`/rh/indications/${linkId}/bimester-filter`);
      return data || [];
    } else {
      const { data } = await supabase
        .from('hr_link_subject_bimester_filter' as any)
        .select('subject_id, bimester, enabled')
        .eq('external_link_id', linkId);
      return data || [];
    }
  },

  async generatePrePlannings(payload: any) {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.post('/rh/plannings/generate', payload);
      return data;
    } else {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error('Sessão expirada');
      const { data, error } = await supabase.functions.invoke('generate-pre-plannings', {
        body: payload,
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (error) throw error;
      return data;
    }
  },

  async getBimesterFilterSubjects(linkId: string) {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get(`/rh/indications/${linkId}/bimester-filter-subjects`);
      return data;
    } else {
      const { data: classes, error: cErr } = await supabase
        .from('hr_indication_classes')
        .select('course_id')
        .eq('external_link_id', linkId);
      if (cErr) throw cErr;
      const courseIds = Array.from(new Set((classes ?? []).map((c: any) => c.course_id).filter(Boolean)));
      if (!courseIds.length) return [];
      const { data: subs, error: sErr } = await supabase
        .from('subjects')
        .select('id, nome, nome_boletim, semester, carga_horaria_semanal, course_id')
        .in('course_id', courseIds)
        .eq('status', 'ativo')
        .is('deleted_at', null)
        .order('nome');
      if (sErr) throw sErr;
      return subs;
    }
  },

  async getApprovedIndications(linkId: string) {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get(`/rh/indications/${linkId}/approved`);
      return data;
    } else {
      const { data, error } = await supabase
        .from('hr_school_indications')
        .select('id, candidato_nome, candidato_email, indication_class_id, candidato_grade, status')
        .eq('external_link_id', linkId)
        .eq('status', 'APROVADA');
      if (error) throw error;
      return data;
    }
  },
};

// URL pública estável — independente do preview/sandbox da Lovable.
// Sempre aponta para o domínio publicado para que o diretor abra o sistema
// e seja solicitada apenas a palavra-chave trimestral ativa.
const PUBLISHED_URL = 'https://nexa-gestao.lovable.app';

export function buildPublicUrl(token: string): string {
  // App usa BrowserRouter — NÃO usar `/#/` (HashRouter) aqui.
  return `${PUBLISHED_URL}/indicacao-escola/${encodeURIComponent(token)}`;
}
