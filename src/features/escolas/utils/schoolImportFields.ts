import type { SchoolFormData } from '../components/SchoolFormDialog';

export type SchoolFieldKey = keyof SchoolFormData;

export interface SchoolImportField {
  key: SchoolFieldKey;
  label: string;        // PT-BR label exibido na UI e usado no template
  group: string;        // agrupamento visual
  required?: boolean;
  aliases?: string[];   // sinônimos para auto-mapeamento
  validator?: (value: string) => string | null; // retorna msg de erro ou null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Aceita múltiplos e-mails por célula (separados por ; , / espaço ou quebra). Válido se ao menos um for um e-mail bem formado. */
const emailValidator = (v: string): string | null => {
  if (!v) return null;
  const parts = v.split(/[;,\/\s\n\r]+/).map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  return parts.some(p => EMAIL_RE.test(p)) ? null : 'E-mail inválido';
};

const turnoValidator = (v: string): string | null => {
  if (!v) return null;
  const ok = ['matutino', 'vespertino', 'noturno', 'integral'];
  return ok.includes(v.toLowerCase()) ? null : `Turno inválido (use: ${ok.join('/')})`;
};

const statusValidator = (v: string): string | null => {
  if (!v) return null;
  return ['ativo', 'inativo'].includes(v.toLowerCase()) ? null : 'Status deve ser ativo ou inativo';
};

export const SCHOOL_IMPORT_FIELDS: SchoolImportField[] = [
  // Identificação
  { key: 'codigo', label: 'Código', group: 'Identificação', required: true, aliases: ['cod', 'code', 'código'] },
  { key: 'nome', label: 'Nome da Escola', group: 'Identificação', required: true, aliases: ['escola', 'name', 'nome escola'] },
  { key: 'cre', label: 'CRE', group: 'Identificação', aliases: ['coordenadoria', 'coordenadoria regional', 'regional', 'cres'] },
  { key: 'status', label: 'Status (ativo/inativo)', group: 'Identificação', validator: statusValidator, aliases: ['situacao', 'situação'] },

  // Localização
  { key: 'cidade', label: 'Cidade', group: 'Localização', aliases: ['city', 'municipio', 'município'] },
  { key: 'endereco_cep', label: 'CEP', group: 'Localização', aliases: ['cep', 'zip'] },
  { key: 'endereco_rua', label: 'Rua / Logradouro', group: 'Localização', aliases: ['rua', 'logradouro', 'endereco', 'endereço', 'street'] },
  { key: 'endereco_numero', label: 'Número', group: 'Localização', aliases: ['numero', 'número', 'nº', 'n°'] },
  { key: 'endereco_bairro', label: 'Bairro', group: 'Localização', aliases: ['bairro', 'district'] },

  // Contato geral
  { key: 'email', label: 'E-mail da Escola', group: 'Contato', validator: emailValidator, aliases: ['email', 'e-mail'] },
  { key: 'telefone', label: 'Telefone da Escola', group: 'Contato', aliases: ['fone', 'phone', 'tel'] },

  // Direção
  { key: 'diretor', label: 'Diretor(a)', group: 'Direção', aliases: ['diretor', 'director'] },
  { key: 'diretor_telefone', label: 'Diretor(a) - Telefone', group: 'Direção' },
  { key: 'diretor_email', label: 'Diretor(a) - E-mail', group: 'Direção', validator: emailValidator },
  { key: 'diretor_adjunto', label: 'Diretor(a) Adjunto(a)', group: 'Direção' },
  { key: 'diretor_adjunto_telefone', label: 'Adjunto(a) - Telefone', group: 'Direção' },
  { key: 'diretor_adjunto_email', label: 'Adjunto(a) - E-mail', group: 'Direção', validator: emailValidator },

  // Supervisores Técnicos 1
  { key: 'supervisor_tecnico_1', label: 'Supervisor(a) Técnico(a) 1', group: 'Supervisores' },
  { key: 'supervisor_tecnico_1_telefone', label: 'Supervisor 1 - Telefone', group: 'Supervisores' },
  { key: 'supervisor_tecnico_1_email', label: 'Supervisor 1 - E-mail', group: 'Supervisores', validator: emailValidator },
  { key: 'supervisor_tecnico_1_turno', label: 'Supervisor 1 - Turno', group: 'Supervisores', validator: turnoValidator },

  // Supervisores Técnicos 2
  { key: 'supervisor_tecnico_2', label: 'Supervisor(a) Técnico(a) 2', group: 'Supervisores' },
  { key: 'supervisor_tecnico_2_telefone', label: 'Supervisor 2 - Telefone', group: 'Supervisores' },
  { key: 'supervisor_tecnico_2_email', label: 'Supervisor 2 - E-mail', group: 'Supervisores', validator: emailValidator },
  { key: 'supervisor_tecnico_2_turno', label: 'Supervisor 2 - Turno', group: 'Supervisores', validator: turnoValidator },

  // Supervisores Técnicos 3
  { key: 'supervisor_tecnico_3', label: 'Supervisor(a) Técnico(a) 3', group: 'Supervisores' },
  { key: 'supervisor_tecnico_3_telefone', label: 'Supervisor 3 - Telefone', group: 'Supervisores' },
  { key: 'supervisor_tecnico_3_email', label: 'Supervisor 3 - E-mail', group: 'Supervisores', validator: emailValidator },
  { key: 'supervisor_tecnico_3_turno', label: 'Supervisor 3 - Turno', group: 'Supervisores', validator: turnoValidator },

  // Coordenação
  { key: 'coordenador_pedagogico', label: 'Coordenador(a) Pedagógico(a)', group: 'Coordenação', aliases: ['coordenador', 'coordenadora'] },
  { key: 'coordenador_pedagogico_telefone', label: 'Coordenador(a) - Telefone', group: 'Coordenação' },
  { key: 'coordenador_pedagogico_email', label: 'Coordenador(a) - E-mail', group: 'Coordenação', validator: emailValidator },
  { key: 'coordenador_pedagogico_turno', label: 'Coordenador(a) - Turno', group: 'Coordenação', validator: turnoValidator },
];

export function normalizeForMatch(s: string): string {
  return (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Tenta mapear automaticamente os campos do sistema às colunas da planilha. */
export function autoMapColumns(headers: string[]): Record<SchoolFieldKey, number | -1> {
  const result = {} as Record<SchoolFieldKey, number | -1>;
  const normHeaders = headers.map(h => normalizeForMatch(h));

  for (const field of SCHOOL_IMPORT_FIELDS) {
    const candidates = [field.label, field.key, ...(field.aliases || [])].map(normalizeForMatch);
    let idx = -1;
    for (const cand of candidates) {
      idx = normHeaders.findIndex(h => h === cand);
      if (idx !== -1) break;
    }
    if (idx === -1) {
      // tenta inclusão parcial
      for (const cand of candidates) {
        idx = normHeaders.findIndex(h => h.includes(cand) && cand.length >= 4);
        if (idx !== -1) break;
      }
    }
    result[field.key] = idx;
  }
  return result;
}
