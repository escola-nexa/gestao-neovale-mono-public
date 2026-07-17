// Academic Calendar Types
export type CalendarEventType = 'LETIVO' | 'FERIADO' | 'RECESSO' | 'EVENTO';
export type CalendarStatus = 'ACTIVE' | 'INACTIVE' | 'CLOSED';
export type OccurrenceStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export type PrePlanningType = 'MENSAL' | 'BIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
// Status do Planejamento do Professor (novo fluxo)
// DRAFT = Rascunho (professor editando)
// ENVIADO = Enviado para análise do coordenador
// DEVOLVIDO = Devolvido pelo coordenador com orientação
// ASSINADO = Assinado pelo professor (imutável)
// Legacy status for backwards compatibility:
// PENDING = Pendente Aprovação (mapeia para ENVIADO)
// APPROVED = Aprovado (mapeia para ASSINADO)
// REJECTED = Rejeitado (mapeia para DEVOLVIDO)
export type TeacherPlanningStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ENVIADO' | 'DEVOLVIDO' | 'ASSINADO' | 'AGUARDANDO_ASSINATURA' | 'AGUARDANDO_ASSINATURA_COORDENADOR' | 'CONCLUIDO';
export type SignatureType = 'PROFESSOR'; // Somente professor assina (não coordenador)
export type Weekday = 'SEGUNDA' | 'TERCA' | 'QUARTA' | 'QUINTA' | 'SEXTA';
export type AppRole = 'admin' | 'coordenador' | 'professor' | 'rh' | 'financeiro';

// Organization
export interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// User Role
export interface UserRole {
  id: string;
  user_id: string;
  organization_id: string;
  role: AppRole;
  created_at: string;
}

// Profile
export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// Academic Calendar
export interface AcademicCalendar {
  id: string;
  organization_id: string;
  academic_year: number;
  start_date: string;
  end_date: string;
  status: CalendarStatus;
  created_at: string;
  updated_at: string;
  bimesters?: AcademicBimester[];
  events?: CalendarEvent[];
}

export interface CreateAcademicCalendarDTO {
  organization_id: string;
  academic_year: number;
  start_date: string;
  end_date: string;
  status?: CalendarStatus;
}

// Academic Bimester
export interface AcademicBimester {
  id: string;
  calendar_id: string;
  number: number;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface CreateAcademicBimesterDTO {
  calendar_id: string;
  number: 1 | 2 | 3 | 4;
  start_date: string;
  end_date: string;
}

// Calendar Event
export interface CalendarEvent {
  id: string;
  calendar_id: string;
  event_date: string;
  event_type: CalendarEventType;
  description?: string;
  city?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCalendarEventDTO {
  calendar_id: string;
  event_date: string;
  event_type: CalendarEventType;
  description?: string;
  city?: string | null;
}

// Weekly Teaching Model
export interface WeeklyTeachingModel {
  id: string;
  organization_id: string;
  professor_id: string;
  school_id: string;
  course_id: string;
  class_group_id: string;
  subject_id: string;
  weekday: Weekday;
  start_time: string;
  end_time: string;
  status: CalendarStatus;
  created_at: string;
  updated_at: string;
  // Populated fields
  professor?: Profile;
  school_name?: string;
  course_name?: string;
  class_group_name?: string;
  subject_name?: string;
}

export interface CreateWeeklyTeachingModelDTO {
  organization_id: string;
  professor_id: string;
  school_id: string;
  course_id: string;
  class_group_id: string;
  subject_id: string;
  weekday: Weekday;
  start_time: string;
  end_time: string;
  status?: CalendarStatus;
}

// Annual Class Occurrence
export interface AnnualClassOccurrence {
  id: string;
  organization_id: string;
  weekly_model_id: string;
  occurrence_date: string;
  start_time: string;
  end_time: string;
  status: OccurrenceStatus;
  created_at: string;
  updated_at: string;
  weekly_model?: WeeklyTeachingModel;
}

export interface CreateAnnualClassOccurrenceDTO {
  organization_id: string;
  weekly_model_id: string;
  occurrence_date: string;
  start_time: string;
  end_time: string;
  status?: OccurrenceStatus;
}

// Pre-Planning (Coordinator)
export interface PrePlanning {
  id: string;
  organization_id: string;
  created_by: string;
  course_id: string;
  subject_id: string;
  planning_type: PrePlanningType;
  bimester_number?: number;
  reference_month?: number;
  reference_year: number;
  objective: string;
  competencies: string;
  contents: string;
  methodology: string;
  resources: string;
  evaluation: string;
  product: string;
  next_steps: string;
  created_at: string;
  updated_at: string;
  // Populated
  creator?: Profile;
  course_name?: string;
  subject_name?: string;
}

export interface CreatePrePlanningDTO {
  organization_id: string;
  course_id: string;
  subject_id: string;
  planning_type: PrePlanningType;
  bimester_number?: number;
  reference_month?: number;
  reference_year: number;
  objective: string;
  competencies: string;
  contents: string;
  methodology: string;
  resources: string;
  evaluation: string;
  product: string;
  next_steps: string;
}

// Teacher Planning
export interface TeacherPlanning {
  id: string;
  organization_id: string;
  professor_id: string;
  pre_planning_id?: string;
  occurrence_id?: string;
  status: TeacherPlanningStatus;
  objective: string;
  competencies: string;
  contents: string;
  methodology: string;
  resources: string;
  evaluation: string;
  product: string;
  next_steps: string;
  coordinator_feedback?: string;
  rejection_reason?: string;
  professor_signed: boolean;
  coordinator_signed: boolean;
  finalized_at?: string;
  created_at: string;
  updated_at: string;
  // Populated
  professor?: Profile;
  pre_planning?: PrePlanning;
  occurrence?: AnnualClassOccurrence;
  signatures?: DigitalSignature[];
}

export interface CreateTeacherPlanningDTO {
  organization_id: string;
  pre_planning_id?: string;
  occurrence_id?: string;
  objective: string;
  competencies: string;
  contents: string;
  methodology: string;
  resources: string;
  evaluation: string;
  product: string;
  next_steps: string;
}

export interface UpdateTeacherPlanningDTO extends Partial<CreateTeacherPlanningDTO> {
  id: string;
  status?: TeacherPlanningStatus;
  coordinator_feedback?: string;
  rejection_reason?: string;
}

// Digital Signature
export interface DigitalSignature {
  id: string;
  planning_id: string;
  user_id: string;
  signature_type: SignatureType;
  photo_url: string;
  latitude: number;
  longitude: number;
  ip_address?: string;
  signed_at: string;
  user?: Profile;
}

export interface CreateDigitalSignatureDTO {
  planning_id: string;
  signature_type: SignatureType;
  photo_url: string;
  latitude: number;
  longitude: number;
  ip_address?: string;
}

// Helpers
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  SEGUNDA: 'Segunda-feira',
  TERCA: 'Terça-feira',
  QUARTA: 'Quarta-feira',
  QUINTA: 'Quinta-feira',
  SEXTA: 'Sexta-feira',
};

export const WEEKDAY_OPTIONS: { value: Weekday; label: string }[] = [
  { value: 'SEGUNDA', label: 'Segunda-feira' },
  { value: 'TERCA', label: 'Terça-feira' },
  { value: 'QUARTA', label: 'Quarta-feira' },
  { value: 'QUINTA', label: 'Quinta-feira' },
  { value: 'SEXTA', label: 'Sexta-feira' },
];

export const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  LETIVO: 'Dia Letivo',
  FERIADO: 'Feriado',
  RECESSO: 'Recesso',
  EVENTO: 'Evento',
};

export const EVENT_TYPE_OPTIONS: { value: CalendarEventType; label: string }[] = [
  { value: 'LETIVO', label: 'Dia Letivo' },
  { value: 'FERIADO', label: 'Feriado' },
  { value: 'RECESSO', label: 'Recesso' },
  { value: 'EVENTO', label: 'Evento' },
];

export const PLANNING_TYPE_LABELS: Record<PrePlanningType, string> = {
  MENSAL: 'Mensal',
  BIMESTRAL: 'Bimestral',
  SEMESTRAL: 'Semestral',
  ANUAL: 'Anual',
};

export const PLANNING_TYPE_OPTIONS: { value: PrePlanningType; label: string }[] = [
  { value: 'MENSAL', label: 'Mensal' },
  { value: 'BIMESTRAL', label: 'Bimestral' },
  { value: 'SEMESTRAL', label: 'Semestral' },
  { value: 'ANUAL', label: 'Anual' },
];

export const PLANNING_STATUS_LABELS: Record<TeacherPlanningStatus, string> = {
  DRAFT: 'Em edição',
  PENDING: 'Pendente Aprovação', // Legacy
  APPROVED: 'Aprovado', // Legacy
  REJECTED: 'Rejeitado', // Legacy
  ENVIADO: 'Enviado para coordenação',
  DEVOLVIDO: 'Devolvido',
  ASSINADO: 'Assinado',
  AGUARDANDO_ASSINATURA: 'Aguardando assinatura do professor',
  AGUARDANDO_ASSINATURA_COORDENADOR: 'Aguardando assinatura do coordenador',
  CONCLUIDO: 'Concluído',
};

// Orientation Types
export type OrientationType = 
  | 'PLANEJAMENTO_PEDAGOGICO'
  | 'AVALIACAO_DESEMPENHO'
  | 'METODOLOGIA_ENSINO'
  | 'GESTAO_SALA_AULA'
  | 'ACOMPANHAMENTO_INDIVIDUAL'
  | 'FEEDBACK_AULA'
  | 'DESENVOLVIMENTO_PROFISSIONAL'
  | 'ORIENTACAO_DISCIPLINAR'
  | 'OUTRAS';

export type OrientationStatus = 'AGENDADO' | 'CANCELADO' | 'AGUARDANDO_ASSINATURA_PROFESSOR' | 'ASSINADO_PROFESSOR';

export interface Orientation {
  id: string;
  organization_id: string;
  professor_id: string;
  school_id?: string;
  course_id?: string;
  subject_id?: string;
  planning_slot_id?: string;
  orientation_type: OrientationType;
  scheduling_notes?: string;
  description?: string;
  evidence_urls?: string[];
  status: OrientationStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // Rejection fields
  rejection_reason?: string;
  // Signature fields
  signature_photo_url?: string;
  signed_at?: string;
  signed_by?: string;
  // Populated fields
  professor_name?: string;
  school_name?: string;
  course_name?: string;
  subject_name?: string;
}

export interface CreateOrientationDTO {
  organization_id: string;
  professor_id: string;
  school_id?: string;
  course_id?: string;
  subject_id?: string;
  planning_slot_id?: string;
  orientation_type: OrientationType;
  scheduling_notes?: string;
  description?: string;
  evidence_urls?: string[];
  status?: OrientationStatus;
}

export const ORIENTATION_TYPE_LABELS: Record<OrientationType, string> = {
  PLANEJAMENTO_PEDAGOGICO: 'Planejamento Pedagógico',
  AVALIACAO_DESEMPENHO: 'Avaliação de Desempenho',
  METODOLOGIA_ENSINO: 'Metodologia de Ensino',
  GESTAO_SALA_AULA: 'Gestão de Sala de Aula',
  ACOMPANHAMENTO_INDIVIDUAL: 'Acompanhamento Individual',
  FEEDBACK_AULA: 'Feedback de Aula',
  DESENVOLVIMENTO_PROFISSIONAL: 'Desenvolvimento Profissional',
  ORIENTACAO_DISCIPLINAR: 'Orientação Disciplinar',
  OUTRAS: 'Outras',
};

export const ORIENTATION_TYPE_OPTIONS: { value: OrientationType; label: string }[] = [
  { value: 'PLANEJAMENTO_PEDAGOGICO', label: 'Planejamento Pedagógico' },
  { value: 'AVALIACAO_DESEMPENHO', label: 'Avaliação de Desempenho' },
  { value: 'METODOLOGIA_ENSINO', label: 'Metodologia de Ensino' },
  { value: 'GESTAO_SALA_AULA', label: 'Gestão de Sala de Aula' },
  { value: 'ACOMPANHAMENTO_INDIVIDUAL', label: 'Acompanhamento Individual' },
  { value: 'FEEDBACK_AULA', label: 'Feedback de Aula' },
  { value: 'DESENVOLVIMENTO_PROFISSIONAL', label: 'Desenvolvimento Profissional' },
  { value: 'ORIENTACAO_DISCIPLINAR', label: 'Orientação Disciplinar' },
  { value: 'OUTRAS', label: 'Outras' },
];

// Notification Types
export type NotificationType = 
  | 'ORIENTATION_CREATED'
  | 'ORIENTATION_ACCEPTED'
  | 'ORIENTATION_REJECTED'
  | 'ORIENTATION_SIGNED'
  | 'GENERAL';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  reference_id?: string;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationDTO {
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  reference_id?: string;
}

export const ORIENTATION_STATUS_LABELS: Record<OrientationStatus, string> = {
  AGENDADO: 'Agendado',
  CANCELADO: 'Cancelado',
  AGUARDANDO_ASSINATURA_PROFESSOR: 'Aguardando Assinatura Professor',
  ASSINADO_PROFESSOR: 'Assinado Professor',
};
