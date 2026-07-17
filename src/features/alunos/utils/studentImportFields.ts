import { isValidCPF } from './cpf';

export type StudentFieldKey =
  | 'nome_completo'
  | 'data_nascimento'
  | 'codigo_matricula'
  | 'cpf'
  | 'rg'
  | 'orgao_expedidor'
  | 'nacionalidade'
  | 'educacao_especial'
  | 'educacao_especial_descricao'
  | 'whatsapp'
  | 'email'
  | 'endereco_rua'
  | 'endereco_numero'
  | 'endereco_bairro'
  | 'endereco_cep'
  | 'endereco_municipio'
  | 'endereco_estado'
  | 'nome_mae'
  | 'nome_pai'
  | 'contato_responsavel'
  | 'email_responsavel'
  | 'status';

export interface StudentImportField {
  key: StudentFieldKey;
  label: string;
  group: string;
  required?: boolean;
  aliases?: string[];
  validator?: (value: string) => string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emailValidator = (v: string): string | null => {
  if (!v) return null;
  return EMAIL_RE.test(v) ? null : 'E-mail inválido';
};

const cpfValidator = (v: string): string | null => {
  if (!v) return null;
  return isValidCPF(v) ? null : 'CPF inválido';
};

const dateValidator = (v: string): string | null => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? 'Data inválida (use AAAA-MM-DD)' : null;
};

const ufValidator = (v: string): string | null => {
  if (!v) return null;
  const ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  return ufs.includes(v.toUpperCase()) ? null : 'UF inválida (sigla de 2 letras)';
};

const statusValidator = (v: string): string | null => {
  if (!v) return null;
  return ['ativo', 'inativo'].includes(v.toLowerCase()) ? null : 'Status deve ser ativo ou inativo';
};

const boolValidator = (v: string): string | null => {
  if (!v) return null;
  const ok = ['sim', 'não', 'nao', 'true', 'false', '1', '0', 's', 'n', 'yes', 'no'];
  return ok.includes(v.toLowerCase()) ? null : 'Use Sim ou Não';
};

export const STUDENT_IMPORT_FIELDS: StudentImportField[] = [
  // Identificação
  { key: 'nome_completo', label: 'Nome do Estudante', group: 'Identificação', required: true,
    aliases: ['nome', 'nome completo', 'nome estudante', 'nome do estudante', 'nome do aluno', 'aluno', 'estudante', 'discente'] },
  { key: 'codigo_matricula', label: 'Código do Aluno', group: 'Identificação', required: true,
    aliases: ['matricula', 'matrícula', 'codigo matricula', 'código matrícula', 'codigo do aluno', 'código do aluno', 'numero matricula', 'número matrícula', 'n matricula', 'nº matricula', 'ra', 'ra aluno', 'ra do aluno', 'registro academico', 'registro acadêmico'] },
  { key: 'data_nascimento', label: 'Data de Nascimento', group: 'Identificação', validator: dateValidator,
    aliases: ['nascimento', 'dt nascimento', 'data nasc', 'data de nasc', 'data nascimento', 'dob', 'nasc'] },
  { key: 'status', label: 'Status (ativo/inativo)', group: 'Identificação', validator: statusValidator,
    aliases: ['status', 'situacao', 'situação', 'status aprovacao', 'status aprovação', 'situacao aluno'] },

  // Documentação
  { key: 'cpf', label: 'CPF do Estudante', group: 'Documentação', validator: cpfValidator,
    aliases: ['cpf', 'cpf aluno', 'cpf do aluno', 'cpf estudante', 'cpf do estudante'] },
  { key: 'rg', label: 'RG (Registro Geral)', group: 'Documentação',
    aliases: ['rg', 'registro geral', 'identidade', 'rg aluno', 'rg do aluno'] },
  { key: 'orgao_expedidor', label: 'Órgão Expedidor', group: 'Documentação',
    aliases: ['orgao', 'órgão', 'expedidor', 'orgao expedidor', 'órgão expedidor', 'orgao emissor', 'emissor'] },
  { key: 'nacionalidade', label: 'Nacionalidade', group: 'Documentação',
    aliases: ['nacionalidade', 'pais', 'país'] },

  // Educação Especial
  { key: 'educacao_especial', label: 'Estudante da Educação Especial (Sim/Não)', group: 'Educação Especial', validator: boolValidator,
    aliases: ['educacao especial', 'educação especial', 'aee', 'necessidade especial', 'pcd', 'deficiencia', 'deficiência'] },
  { key: 'educacao_especial_descricao', label: 'Educação Especial — Descrição/Laudo', group: 'Educação Especial',
    aliases: ['descricao educacao especial', 'laudo', 'necessidade', 'tipo deficiencia', 'tipo deficiência', 'descricao laudo'] },

  // Contato
  { key: 'whatsapp', label: 'Telefone de Contato', group: 'Contato',
    aliases: ['telefone', 'celular', 'whatsapp', 'wpp', 'zap', 'fone', 'contato', 'telefone aluno', 'telefone do aluno', 'celular aluno'] },
  { key: 'email', label: 'E-mail (Opcional)', group: 'Contato', validator: emailValidator,
    aliases: ['email', 'e-mail', 'mail', 'email aluno', 'e-mail aluno', 'email do aluno'] },

  // Endereço
  { key: 'endereco_rua', label: 'Rua / Logradouro', group: 'Endereço',
    aliases: ['rua', 'logradouro', 'endereco', 'endereço', 'endereco rua', 'street'] },
  { key: 'endereco_numero', label: 'Número', group: 'Endereço',
    aliases: ['numero', 'número', 'numero casa', 'nº', 'n°', 'num', 'numero endereco', 'número endereço'] },
  { key: 'endereco_bairro', label: 'Bairro', group: 'Endereço',
    aliases: ['bairro', 'district'] },
  { key: 'endereco_cep', label: 'CEP', group: 'Endereço',
    aliases: ['cep', 'zip', 'codigo postal', 'código postal'] },
  { key: 'endereco_municipio', label: 'Município', group: 'Endereço',
    aliases: ['municipio', 'município', 'cidade', 'city'] },
  { key: 'endereco_estado', label: 'Estado (UF)', group: 'Endereço', validator: ufValidator,
    aliases: ['estado', 'uf', 'sigla', 'sigla estado'] },

  // Responsáveis
  { key: 'nome_mae', label: 'Nome da Mãe', group: 'Responsáveis',
    aliases: ['mae', 'mãe', 'nome mae', 'nome mãe', 'nome da mae', 'nome da mãe', 'filiacao mae', 'filiação mãe'] },
  { key: 'nome_pai', label: 'Nome do Pai', group: 'Responsáveis',
    aliases: ['pai', 'nome pai', 'nome do pai', 'filiacao pai', 'filiação pai'] },
  { key: 'contato_responsavel', label: 'Contato do Responsável', group: 'Responsáveis',
    aliases: ['telefone responsavel', 'telefone responsável', 'contato responsavel', 'contato responsável', 'fone resp', 'celular responsavel', 'celular responsável', 'telefone resp'] },
  { key: 'email_responsavel', label: 'E-mail do Responsável', group: 'Responsáveis', validator: emailValidator,
    aliases: ['email responsavel', 'email responsável', 'e-mail responsavel', 'e-mail responsável', 'mail responsavel'] },
];

export function normalizeForMatch(s: string): string {
  return (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function tokenize(s: string): string[] {
  return (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t && !['do', 'da', 'de', 'dos', 'das', 'o', 'a', 'e'].includes(t));
}

/** Auto-mapeia colunas da planilha aos campos do sistema. */
export function autoMapColumns(headers: string[]): Record<StudentFieldKey, number | -1> {
  const result = {} as Record<StudentFieldKey, number | -1>;
  const normHeaders = headers.map(h => normalizeForMatch(h));
  const tokHeaders = headers.map(h => new Set(tokenize(h)));
  const usedHeaders = new Set<number>();

  // Fase 1: match exato por label/key/alias
  for (const field of STUDENT_IMPORT_FIELDS) {
    const candidates = [field.label, field.key, ...(field.aliases || [])].map(normalizeForMatch);
    let idx = normHeaders.findIndex((h, i) => !usedHeaders.has(i) && candidates.includes(h));
    result[field.key] = idx;
    if (idx !== -1) usedHeaders.add(idx);
  }

  // Fase 2: match por substring (cabeçalho contém ou é contido em um candidato)
  for (const field of STUDENT_IMPORT_FIELDS) {
    if (result[field.key] !== -1) continue;
    const candidates = [field.label, field.key, ...(field.aliases || [])].map(normalizeForMatch);
    let idx = -1;
    for (let i = 0; i < normHeaders.length; i++) {
      if (usedHeaders.has(i)) continue;
      const h = normHeaders[i];
      if (!h) continue;
      const hit = candidates.some(c => c.length >= 3 && (h.includes(c) || c.includes(h)));
      if (hit) { idx = i; break; }
    }
    result[field.key] = idx;
    if (idx !== -1) usedHeaders.add(idx);
  }

  // Fase 3: match por token compartilhado (ex.: "Telefone do Responsável" → tokens [telefone, responsavel])
  for (const field of STUDENT_IMPORT_FIELDS) {
    if (result[field.key] !== -1) continue;
    const candTokens = [field.label, field.key, ...(field.aliases || [])]
      .flatMap(tokenize);
    if (candTokens.length === 0) continue;
    let bestIdx = -1; let bestScore = 0;
    for (let i = 0; i < tokHeaders.length; i++) {
      if (usedHeaders.has(i)) continue;
      const hTokens = tokHeaders[i];
      let score = 0;
      candTokens.forEach(t => { if (hTokens.has(t)) score++; });
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
    if (bestScore > 0) {
      result[field.key] = bestIdx;
      usedHeaders.add(bestIdx);
    }
  }
  return result;
}

export function parseBoolCell(v: string): boolean {
  return ['sim', 'true', '1', 'yes', 's'].includes((v || '').trim().toLowerCase());
}
