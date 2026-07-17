import * as XLSX from 'xlsx';
import { z } from 'zod';
import { TalentPeriod, TalentWeekday } from '../types';
import { TALENT_IMPORT_FIELDS, TalentFieldKey } from './talentImportFields';

export interface ParsedRowOriginal {
  fullName: string;
  email: string;
  phone: string;
  whatsapp: string;
  uf: string;
  city: string;
  periods: string;
  weekdays: string;
  formationArea: string;
  hasLicentiate: string;
  notes: string;
  resumeUrl: string;
  schoolingUrl: string;
  graduateUrl: string;
}

export interface TalentInsertPayload {
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
  notes: string | null;
  resume_path: string | null;
  schooling_path: string | null;
  graduate_path: string | null;
  created_by: string | null;
}

export interface ValidatedRow {
  rowNumber: number;
  status: 'ok' | 'error';
  errors: string[];
  warnings?: string[];
  original: ParsedRowOriginal;
  parsed?: TalentInsertPayload;
}

interface StateRef { id: string; nome: string; sigla: string; }
interface CityRef { id: string; state_id: string; nome: string; }

export interface ParseContext {
  organizationId: string;
  createdBy: string | null;
  states: StateRef[];
  cities: CityRef[];
  existingPhones: Set<string>;
  existingEmails: Set<string>;
}

const norm = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
/** Normalização agressiva: remove tudo que não é letra/dígito (para casar UF/cidade com pontuação variável). */
const normHard = (s: string) => norm(s).replace(/[^a-z0-9]/g, '');

const truthy = ['sim', 's', 'true', 'verdadeiro', 'yes', 'y', '1', 'x', 'marcado', 'ok', 'possui', 'tem'];
const falsy = ['nao', 'não', 'n', 'false', 'falso', 'no', '0', '', 'sem', 'nenhum', 'n/a', 'na', '-', '--'];

function parseBool(v: string, field: string): { value: boolean; error?: string } {
  const t = norm(v);
  if (!t) return { value: false };
  if (truthy.includes(t)) return { value: true };
  if (falsy.includes(t)) return { value: false };
  return { value: false, error: `${field}: use "Sim" ou "Não"` };
}

/** Mapa expandido — aceita sinônimos da rede pública (matutino/vespertino/noturno) e atalhos. */
const periodMap: Record<string, TalentPeriod[]> = {
  manha: ['MANHA'], 'manhã': ['MANHA'], m: ['MANHA'], mat: ['MANHA'], matutino: ['MANHA'],
  tarde: ['TARDE'], t: ['TARDE'], vesp: ['TARDE'], vespertino: ['TARDE'],
  noite: ['NOITE'], n: ['NOITE'], not: ['NOITE'], noturno: ['NOITE'],
  integral: ['MANHA', 'TARDE'], diurno: ['MANHA', 'TARDE'],
  todos: ['MANHA', 'TARDE', 'NOITE'], qualquer: ['MANHA', 'TARDE', 'NOITE'], livre: ['MANHA', 'TARDE', 'NOITE'],
};

const weekdayMap: Record<string, TalentWeekday[]> = {
  seg: ['SEG'], 'seg.': ['SEG'], segunda: ['SEG'], 'segunda-feira': ['SEG'], 'segunda feira': ['SEG'], '2a': ['SEG'], '2': ['SEG'],
  ter: ['TER'], 'ter.': ['TER'], terca: ['TER'], terça: ['TER'], 'terca-feira': ['TER'], 'terça-feira': ['TER'], 'terca feira': ['TER'], '3a': ['TER'], '3': ['TER'],
  qua: ['QUA'], 'qua.': ['QUA'], quarta: ['QUA'], 'quarta-feira': ['QUA'], 'quarta feira': ['QUA'], '4a': ['QUA'], '4': ['QUA'],
  qui: ['QUI'], 'qui.': ['QUI'], quinta: ['QUI'], 'quinta-feira': ['QUI'], 'quinta feira': ['QUI'], '5a': ['QUI'], '5': ['QUI'],
  sex: ['SEX'], 'sex.': ['SEX'], sexta: ['SEX'], 'sexta-feira': ['SEX'], 'sexta feira': ['SEX'], '6a': ['SEX'], '6': ['SEX'],
  sab: ['SAB'], 'sab.': ['SAB'], sabado: ['SAB'], sábado: ['SAB'], '7a': ['SAB'], '7': ['SAB'],
  dom: ['DOM'], 'dom.': ['DOM'], domingo: ['DOM'], '1a': ['DOM'], '1': ['DOM'],
  todos: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'],
  qualquer: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'],
  semana: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'],
  'dias uteis': ['SEG', 'TER', 'QUA', 'QUI', 'SEX'],
  'dias úteis': ['SEG', 'TER', 'QUA', 'QUI', 'SEX'],
  uteis: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'],
  'fim de semana': ['SAB', 'DOM'],
  fds: ['SAB', 'DOM'],
};

function splitMulti(v: string): string[] {
  return v.split(/[;,/|+\n]/).map(s => s.trim()).filter(Boolean);
}

function parsePeriods(v: string): { values: TalentPeriod[]; errors: string[] } {
  const errors: string[] = [];
  const out = new Set<TalentPeriod>();
  for (const tok of splitMulti(v)) {
    const k = norm(tok);
    const m = periodMap[k];
    if (!m) errors.push(`Período inválido: "${tok}" (use Manhã/Matutino, Tarde/Vespertino, Noite/Noturno, Integral)`);
    else m.forEach(p => out.add(p));
  }
  return { values: [...out], errors };
}

function parseWeekdays(v: string): { values: TalentWeekday[]; errors: string[] } {
  const errors: string[] = [];
  const out = new Set<TalentWeekday>();
  for (const tok of splitMulti(v)) {
    const k = norm(tok);
    const m = weekdayMap[k];
    if (!m) errors.push(`Dia inválido: "${tok}" (use Seg–Dom, "dias úteis" ou "fim de semana")`);
    else m.forEach(d => out.add(d));
  }
  return { values: [...out], errors };
}

function cleanPhone(v: string): string {
  // Remove ramais (após "r/", "ramal", "ext")
  let s = v.replace(/\b(ramal|ext|r\/)\s*\d+/gi, '');
  let digits = s.replace(/\D/g, '');
  // Remove DDI 55 redundante (fica com 12-13 dígitos começando com 55)
  if (digits.length > 11 && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  return digits;
}

const baseSchema = z.object({
  fullName: z.string().trim().min(3, 'Nome completo deve ter ao menos 3 caracteres').max(150),
  phone: z.string().min(1, 'Telefone é obrigatório'),
});

export interface ParsedSheet {
  headers: string[];
  rows: { rowNumber: number; cells: string[] }[];
}

/** Lê o XLSX e devolve cabeçalhos + linhas brutas (sem mapear). */
export function readTalentXlsx(buf: ArrayBuffer): ParsedSheet | { error: string } {
  try {
    const wb = XLSX.read(buf, { type: 'array' });
    const sheetName = wb.SheetNames.find(n => norm(n).includes('candidato')) || wb.SheetNames[0];
    if (!sheetName) return { error: 'Planilha vazia' };
    const ws = wb.Sheets[sheetName];
    const aoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false, raw: false });
    if (aoa.length < 2) return { error: 'A planilha precisa ter cabeçalho e ao menos 1 linha de dados.' };

    const headers = (aoa[0] || []).map(h => String(h ?? '').trim());
    const rows = aoa.slice(1).map((r, i) => ({
      rowNumber: i + 2,
      cells: (r as any[]).map(c => (c == null ? '' : String(c).trim())),
    })).filter(r => r.cells.some(c => c !== ''));

    return { headers, rows };
  } catch (e: any) {
    return { error: 'Falha ao ler XLSX: ' + (e?.message || 'arquivo inválido') };
  }
}

/** Aplica o mapeamento manual e devolve as linhas em formato lógico. */
export function applyMapping(
  sheet: ParsedSheet,
  mapping: Record<TalentFieldKey, number>,
): { rowNumber: number; original: ParsedRowOriginal }[] {
  const get = (cells: string[], idx: number) => (idx >= 0 && idx < cells.length ? (cells[idx] || '').trim() : '');
  return sheet.rows.map(r => ({
    rowNumber: r.rowNumber,
    original: {
      fullName:      get(r.cells, mapping.fullName),
      email:         get(r.cells, mapping.email),
      phone:         get(r.cells, mapping.phone),
      whatsapp:      get(r.cells, mapping.whatsapp),
      uf:            get(r.cells, mapping.uf),
      city:          get(r.cells, mapping.city),
      periods:       get(r.cells, mapping.periods),
      weekdays:      get(r.cells, mapping.weekdays),
      formationArea: get(r.cells, mapping.formationArea),
      hasLicentiate: get(r.cells, mapping.hasLicentiate),
      notes:         get(r.cells, mapping.notes),
      resumeUrl:     get(r.cells, mapping.resumeUrl),
      schoolingUrl:  get(r.cells, mapping.schoolingUrl),
      graduateUrl:   get(r.cells, mapping.graduateUrl),
    },
  }));
}

export function getRequiredTalentFields(): TalentFieldKey[] {
  return TALENT_IMPORT_FIELDS.filter(f => f.required).map(f => f.key);
}

/**
 * Normaliza/limpa cada coluna ANTES da validação. Função pura, isolada.
 * Limpa espaços extras, padroniza telefones, e tenta inferir UF a partir da cidade
 * quando a UF não foi informada.
 */
export function normalizeRowForImport(
  row: ParsedRowOriginal,
  ctx: ParseContext,
): { row: ParsedRowOriginal; warnings: string[]; ufInferred: boolean } {
  const warnings: string[] = [];
  let ufInferred = false;

  const trimmed: ParsedRowOriginal = {
    fullName: row.fullName.replace(/\s+/g, ' ').trim(),
    email: row.email.trim(),
    phone: row.phone.trim(),
    whatsapp: row.whatsapp.trim(),
    uf: row.uf.replace(/\s+/g, ' ').trim(),
    city: row.city.replace(/\s+/g, ' ').trim(),
    periods: row.periods.trim(),
    weekdays: row.weekdays.trim(),
    formationArea: row.formationArea.trim(),
    hasLicentiate: row.hasLicentiate.trim(),
    notes: row.notes.trim(),
    resumeUrl: row.resumeUrl.trim(),
    schoolingUrl: row.schoolingUrl.trim(),
    graduateUrl: row.graduateUrl.trim(),
  };

  // Inferir UF pela cidade quando UF estiver vazia e cidade preenchida
  if (!trimmed.uf && trimmed.city) {
    const cityKey = normHard(trimmed.city);
    const matches = ctx.cities.filter(c => normHard(c.nome) === cityKey);
    if (matches.length === 1) {
      const st = ctx.states.find(s => s.id === matches[0].state_id);
      if (st) {
        trimmed.uf = st.sigla;
        ufInferred = true;
        warnings.push(`UF "${st.sigla}" inferida a partir da cidade "${trimmed.city}"`);
      }
    }
  }

  return { row: trimmed, warnings, ufInferred };
}

/** Resolve UF aceitando sigla, nome por extenso e variações de pontuação/acentos. */
function findState(uf: string, ctx: ParseContext): StateRef | undefined {
  if (!uf) return undefined;
  const key = normHard(uf);
  return ctx.states.find(s => normHard(s.sigla) === key || normHard(s.nome) === key);
}

/** Limiar: linhas com até N erros NÃO-CRÍTICOS são importadas mesmo assim, com avisos. */
const TOLERABLE_ERRORS_THRESHOLD = 3;

export function validateMappedRows(
  mapped: { rowNumber: number; original: ParsedRowOriginal }[],
  ctx: ParseContext,
): ValidatedRow[] {
  const seenPhone = new Set<string>();
  const seenEmail = new Set<string>();
  const out: ValidatedRow[] = [];

  for (const { rowNumber, original: rawRow } of mapped) {
    /** Erros que SEMPRE bloqueiam (faltam dados mínimos ou violam UNIQUE). */
    const criticalErrors: string[] = [];
    /** Erros toleráveis: até 3 viram avisos e a linha é importada com fallbacks. */
    const softErrors: string[] = [];
    const { row, warnings: normWarnings } = normalizeRowForImport(rawRow, ctx);

    const base = baseSchema.safeParse(row);
    if (!base.success) criticalErrors.push(...base.error.issues.map(x => x.message));

    const phoneDigits = cleanPhone(row.phone);
    let phoneValid = true;
    if (row.phone && (phoneDigits.length < 10 || phoneDigits.length > 13)) {
      criticalErrors.push('Telefone inválido (esperado 10 a 13 dígitos)');
      phoneValid = false;
    }

    let emailNorm: string | null = null;
    if (row.email) {
      const e = z.string().email().safeParse(row.email);
      if (!e.success) softErrors.push('E-mail com formato inválido (não importado)');
      else emailNorm = row.email.toLowerCase();
    }

    const wpp = parseBool(row.whatsapp, 'WhatsApp');
    if (wpp.error) softErrors.push(wpp.error + ' — assumido "Não"');
    const lic = parseBool(row.hasLicentiate, 'Licenciatura');
    if (lic.error) softErrors.push(lic.error + ' — assumido "Não"');

    const periods = parsePeriods(row.periods);
    softErrors.push(...periods.errors.map(e => e + ' — período ignorado'));
    const weekdays = parseWeekdays(row.weekdays);
    softErrors.push(...weekdays.errors.map(e => e + ' — dia ignorado'));

    let stateId: string | null = null;
    let cityId: string | null = null;
    if (row.uf) {
      const st = findState(row.uf, ctx);
      if (!st) softErrors.push(`UF "${row.uf}" não encontrada — não vinculada`);
      else stateId = st.id;
    }
    if (row.city) {
      if (!stateId) {
        const cityKey = normHard(row.city);
        const matches = ctx.cities.filter(c => normHard(c.nome) === cityKey);
        if (matches.length === 0) {
          softErrors.push(`Cidade "${row.city}" não encontrada na base — não vinculada`);
        } else if (matches.length > 1) {
          const ufs = matches
            .map(m => ctx.states.find(s => s.id === m.state_id)?.sigla)
            .filter(Boolean)
            .join(', ');
          softErrors.push(`Cidade "${row.city}" existe em ${matches.length} estados (${ufs}) — informe a UF para vincular`);
        } else {
          softErrors.push(`Cidade "${row.city}" sem UF — não vinculada`);
        }
      } else {
        const cityKey = normHard(row.city);
        const city = ctx.cities.find(c => c.state_id === stateId && normHard(c.nome) === cityKey);
        if (!city) softErrors.push(`Cidade "${row.city}" não encontrada em ${row.uf} — não vinculada`);
        else cityId = city.id;
      }
    }

    // Duplicatas SEMPRE bloqueiam (violariam UNIQUE no banco)
    if (phoneValid && phoneDigits) {
      if (ctx.existingPhones.has(phoneDigits)) criticalErrors.push('Telefone já cadastrado no banco de talentos');
      else if (seenPhone.has(phoneDigits)) criticalErrors.push('Telefone duplicado dentro da planilha');
      else seenPhone.add(phoneDigits);
    }
    if (emailNorm) {
      if (ctx.existingEmails.has(emailNorm)) criticalErrors.push('E-mail já cadastrado no banco de talentos');
      else if (seenEmail.has(emailNorm)) criticalErrors.push('E-mail duplicado dentro da planilha');
      else seenEmail.add(emailNorm);
    }

    // Links de anexos — toleráveis (ignorados se inválidos)
    const sanitizeUrl = (raw: string, label: string): string | null => {
      const v = raw.trim();
      if (!v) return null;
      if (!/^https?:\/\//i.test(v)) {
        softErrors.push(`${label}: link inválido (ignorado)`);
        return null;
      }
      if (v.length > 1000) {
        softErrors.push(`${label}: link muito longo (ignorado)`);
        return null;
      }
      return v;
    };
    const resumeUrl = sanitizeUrl(row.resumeUrl, 'Currículo (link)');
    const schoolingUrl = sanitizeUrl(row.schoolingUrl, 'Escolaridade (link)');
    const graduateUrl = sanitizeUrl(row.graduateUrl, 'Pós/Mestrado/Doutorado (link)');

    // Decisão final
    const tolerable = softErrors.length <= TOLERABLE_ERRORS_THRESHOLD && criticalErrors.length === 0;
    const allErrors = [...criticalErrors, ...softErrors];
    const allWarnings = [...normWarnings, ...softErrors];

    if (!tolerable) {
      out.push({
        rowNumber,
        status: 'error',
        errors: allErrors,
        warnings: normWarnings,
        original: row,
      });
      continue;
    }

    out.push({
      rowNumber,
      status: 'ok',
      errors: [],
      warnings: allWarnings,
      original: row,
      parsed: {
        organization_id: ctx.organizationId,
        full_name: row.fullName,
        email: emailNorm,
        phone: phoneDigits,
        phone_is_whatsapp: wpp.value,
        state_id: stateId,
        city_id: cityId,
        free_periods: periods.values,
        free_weekdays: weekdays.values,
        formation_area: row.formationArea || null,
        has_licentiate: lic.value,
        notes: row.notes || null,
        resume_path: resumeUrl,
        schooling_path: schoolingUrl,
        graduate_path: graduateUrl,
        created_by: ctx.createdBy,
      },
    });
  }

  return out;
}
