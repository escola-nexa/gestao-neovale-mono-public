// Campos do sistema disponíveis para mapeamento na importação de candidatos.
// Espelha o padrão usado em src/features/escolas/utils/schoolImportFields.ts.

export type TalentFieldKey =
  | 'fullName'
  | 'email'
  | 'phone'
  | 'whatsapp'
  | 'uf'
  | 'city'
  | 'periods'
  | 'weekdays'
  | 'formationArea'
  | 'hasLicentiate'
  | 'notes'
  | 'resumeUrl'
  | 'schoolingUrl'
  | 'graduateUrl';

export interface TalentImportField {
  key: TalentFieldKey;
  label: string;
  group: string;
  required?: boolean;
  aliases?: string[];
  hint?: string;
}

export const TALENT_IMPORT_FIELDS: TalentImportField[] = [
  // Identificação
  { key: 'fullName', label: 'Nome completo', group: 'Identificação', required: true,
    aliases: ['nome', 'name', 'nome do candidato', 'candidato'] },
  { key: 'phone', label: 'Telefone', group: 'Identificação', required: true,
    aliases: ['celular', 'fone', 'phone', 'tel', 'contato'] },
  { key: 'email', label: 'E-mail', group: 'Identificação',
    aliases: ['email', 'e-mail', 'mail'] },
  { key: 'whatsapp', label: 'WhatsApp (Sim/Não)', group: 'Identificação',
    aliases: ['whats', 'wpp', 'tem whatsapp'],
    hint: 'Sim/Não — informa se o telefone também é WhatsApp.' },

  // Localização
  { key: 'uf', label: 'UF / Estado', group: 'Localização',
    aliases: ['estado', 'sigla', 'unidade federativa'],
    hint: 'Sigla (SP) ou nome por extenso (São Paulo). Se vazio, tentamos inferir pela cidade.' },
  { key: 'city', label: 'Cidade', group: 'Localização',
    aliases: ['municipio', 'município', 'city'],
    hint: 'Se a UF estiver vazia e a cidade for única na base, a UF é preenchida automaticamente.' },

  // Disponibilidade
  { key: 'periods', label: 'Períodos livres', group: 'Disponibilidade',
    aliases: ['periodos', 'períodos', 'turno', 'turnos', 'disponibilidade'],
    hint: 'Aceita Manhã/Matutino, Tarde/Vespertino, Noite/Noturno, Integral. Separe por ; , / ou |' },
  { key: 'weekdays', label: 'Dias livres', group: 'Disponibilidade',
    aliases: ['dias', 'dia', 'dias da semana'],
    hint: 'Seg–Dom, "dias úteis" ou "fim de semana". Separe por ; , / ou |' },

  // Formação
  { key: 'formationArea', label: 'Área de formação', group: 'Formação',
    aliases: ['formacao', 'formação', 'curso', 'graduacao', 'graduação'] },
  { key: 'hasLicentiate', label: 'Possui licenciatura (Sim/Não)', group: 'Formação',
    aliases: ['licenciatura', 'tem licenciatura'] },

  // Outros
  { key: 'notes', label: 'Observações', group: 'Outros',
    aliases: ['obs', 'observacao', 'observações', 'notas'] },

  // Anexos (somente links externos — Google Drive, OneDrive, etc.)
  { key: 'resumeUrl', label: 'Currículo (link)', group: 'Anexos (links)',
    aliases: ['curriculo', 'currículo', 'cv', 'link curriculo', 'link cv', 'anexe seu curriculo', 'anexe seu currículo'],
    hint: 'Cole o link público do Drive/OneDrive para o PDF do currículo.' },
  { key: 'schoolingUrl', label: 'Comprovante de escolaridade — Superior/Técnica (link)', group: 'Anexos (links)',
    aliases: ['escolaridade', 'comprovante escolaridade', 'diploma', 'ensino superior', 'tecnico', 'técnica', 'anexe seu comprovante de escolaridade'],
    hint: 'Link público do PDF do diploma de ensino superior ou técnica.' },
  { key: 'graduateUrl', label: 'Comprovante de pós/mestrado/doutorado (link)', group: 'Anexos (links)',
    aliases: ['pos', 'pós', 'pos-graduacao', 'pós-graduação', 'mestrado', 'doutorado', 'graduate'],
    hint: 'Link público do PDF de pós-graduação, mestrado ou doutorado.' },
];

export function normalizeForMatch(s: string): string {
  return (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function autoMapTalentColumns(headers: string[]): Record<TalentFieldKey, number> {
  const result = {} as Record<TalentFieldKey, number>;
  const normHeaders = headers.map(h => normalizeForMatch(h));
  for (const field of TALENT_IMPORT_FIELDS) {
    const candidates = [field.label, field.key, ...(field.aliases || [])].map(normalizeForMatch);
    let idx = -1;
    for (const cand of candidates) {
      idx = normHeaders.findIndex(h => h === cand);
      if (idx !== -1) break;
    }
    if (idx === -1) {
      for (const cand of candidates) {
        if (cand.length < 4) continue;
        idx = normHeaders.findIndex(h => h.includes(cand));
        if (idx !== -1) break;
      }
    }
    result[field.key] = idx;
  }
  return result;
}
