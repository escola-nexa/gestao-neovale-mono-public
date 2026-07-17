export type TalentPeriod = 'MANHA' | 'TARDE' | 'NOITE';
export type TalentWeekday = 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM';
export type TalentClassification = 'PRIORIDADE' | 'NAD' | 'SEM_HISTORICO' | 'NAO_CONTRATAR';

export const CLASSIFICATIONS: TalentClassification[] = ['PRIORIDADE', 'NAD', 'SEM_HISTORICO', 'NAO_CONTRATAR'];

export const CLASSIFICATION_META: Record<TalentClassification, {
  label: string; short: string; description: string;
  badgeClass: string; dotClass: string;
}> = {
  PRIORIDADE: {
    label: 'Prioridade', short: 'Prioridade',
    description: 'Atenção imediata ou estratégica',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/30',
    dotClass: 'bg-amber-500',
  },
  NAD: {
    label: 'NAD — Não admissional', short: 'NAD',
    description: 'Não admissional',
    badgeClass: 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-500/15 dark:text-slate-200 dark:border-slate-500/30',
    dotClass: 'bg-slate-500',
  },
  SEM_HISTORICO: {
    label: 'Sem histórico', short: 'Sem hist.',
    description: 'Sem registros ou informações anteriores',
    badgeClass: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-500/15 dark:text-sky-200 dark:border-sky-500/30',
    dotClass: 'bg-sky-500',
  },
  NAO_CONTRATAR: {
    label: 'Não contratar', short: 'Não contratar',
    description: 'Veto explícito de contratação',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-500/15 dark:text-rose-200 dark:border-rose-500/30',
    dotClass: 'bg-rose-500',
  },
};

export interface TalentCandidate {
  id: string;
  organization_id: string;
  full_name: string;
  email: string | null;
  phone: string;
  phone_is_whatsapp: boolean;
  state_id: string | null;
  city_id: string | null;
  free_periods: TalentPeriod[];
  free_weekdays: TalentWeekday[];
  formation_area: string | null;
  has_licentiate: boolean;
  resume_path: string | null;
  schooling_path: string | null;
  graduate_path: string | null;
  notes: string | null;
  classifications: TalentClassification[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // joins
  state_name?: string | null;
  state_sigla?: string | null;
  city_name?: string | null;
}

export interface TalentFormData {
  full_name: string;
  email: string;
  phone: string;
  phone_is_whatsapp: boolean;
  state_id: string;
  city_id: string;
  free_periods: TalentPeriod[];
  free_weekdays: TalentWeekday[];
  formation_area: string;
  has_licentiate: boolean;
  notes: string;
  classifications: TalentClassification[];
}

export const PERIOD_LABELS: Record<TalentPeriod, string> = {
  MANHA: 'Manhã',
  TARDE: 'Tarde',
  NOITE: 'Noite',
};

export const WEEKDAY_LABELS: Record<TalentWeekday, string> = {
  SEG: 'Segunda',
  TER: 'Terça',
  QUA: 'Quarta',
  QUI: 'Quinta',
  SEX: 'Sexta',
  SAB: 'Sábado',
  DOM: 'Domingo',
};

export const PERIODS: TalentPeriod[] = ['MANHA', 'TARDE', 'NOITE'];
export const WEEKDAYS: TalentWeekday[] = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];

export const RESUME_BUCKET = 'talent-pool-resumes';
export const MAX_PDF_SIZE_MB = 10;
