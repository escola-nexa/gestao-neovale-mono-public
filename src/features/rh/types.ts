import type { UcpType } from './lib/classifyUCP';

export type HrPeriod = 'MANHA' | 'TARDE' | 'NOITE';
export type HrPlanStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type HrItemOrigin = 'SUGERIDO' | 'MANUAL' | 'INDICADO_ESCOLA';
export type HrItemStatus = 'PENDENTE' | 'APROVADO' | 'RECUSADO' | 'PUBLICADO';

export const PERIOD_LABEL: Record<HrPeriod, string> = {
  MANHA: 'Matutino',
  TARDE: 'Vespertino',
  NOITE: 'Noturno',
};

export interface HrSettings {
  id: string;
  organization_id: string;
  teto_ch_semanal: number;
  default_ucp1_aulas: number;
  default_ucp2_aulas: number;
  default_ucp3_aulas: number;
  default_pedagogica_aulas: number;
  created_at: string;
  updated_at: string;
}

export interface HrSubjectUcpOverride {
  id: string;
  organization_id: string;
  subject_id: string;
  ucp_type: UcpType;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface HrAllocationPlan {
  id: string;
  organization_id: string;
  school_id: string;
  course_id: string;
  periodo: HrPeriod;
  ano_letivo: string;
  qtd_turmas: number;
  teto_ch_semanal: number;
  status: HrPlanStatus;
  notes: string | null;
  created_by: string | null;
  published_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HrAllocationItem {
  id: string;
  plan_id: string;
  organization_id: string;
  subject_id: string;
  class_group_id: string;
  professor_id: string | null;
  vaga_label: string | null;
  ucp_type: UcpType;
  aulas: number;
  weekday: string | null;
  school_time_slot_id: string | null;
  origem: HrItemOrigin;
  status: HrItemStatus;
  indicado_por_external_link_id: string | null;
  indicado_por_nome: string | null;
  motivo_recusa: string | null;
  weekly_teaching_model_id: string | null;
  created_at: string;
  updated_at: string;
}
