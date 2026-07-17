/**
 * Regra OFICIAL e ÚNICA de documentos obrigatórios por professor.
 * Importe deste arquivo em todas as telas (Kanban, B.I., Lista, Anexos)
 * para evitar divergências de contagem.
 */
export interface RequiredDocDef {
  value: string;
  label: string;
  /** Obrigatório apenas para professores do gênero "Homem". */
  maleOnly?: boolean;
}

export const REQUIRED_DOC_DEFS: RequiredDocDef[] = [
  { value: 'aso', label: 'Exame admissional (ASO)' },
  { value: 'foto_3x4', label: 'Fotos 3x4' },
  { value: 'carteira_trabalho', label: 'Carteira de Trabalho (CTPS)' },
  { value: 'rg', label: 'RG ou RNE' },
  { value: 'cpf', label: 'CPF' },
  { value: 'titulo_eleitor', label: 'Título de Eleitor' },
  { value: 'comprovante_residencia', label: 'Comprovante de residência' },
  { value: 'diploma', label: 'Diploma / Escolaridade' },
  { value: 'reservista', label: 'Certificado de Reservista', maleOnly: true },
  { value: 'declaracao_etnia', label: 'Declaração de etnia (Lei 12.288/2010)' },
  { value: 'certidao_justica_eleitoral', label: 'Certidão da Justiça Eleitoral' },
  { value: 'certidao_estadual_criminal', label: 'Certidão Estadual Criminal' },
  { value: 'certidao_acoes_criminais', label: 'Certidão de Ações Criminais' },
  { value: 'certidao_judicial_criminal_negativa', label: 'Certidão Judicial Criminal Negativa' },
  { value: 'certidao_antecedentes_criminais', label: 'Certidão de Antecedentes Criminais' },
  { value: 'certidao_acoes_civeis', label: 'Certidão de Ações Cíveis' },
  { value: 'certidao_judicial_civel', label: 'Certidão Judicial Cível' },
];

export function getRequiredDocsForGender(gender?: string | null): RequiredDocDef[] {
  const isMale = gender === 'Homem';
  return REQUIRED_DOC_DEFS.filter(d => !d.maleOnly || isMale);
}

export const REQUIRED_CATEGORIES_SET = new Set(REQUIRED_DOC_DEFS.map(d => d.value));
