import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  drawBrandedHeader,
  drawBrandedFooter,
  BRAND,
} from '@/lib/pdfBranding';
import { getBrandLogoForPdf } from '@/lib/brandLogoCache';
import { classifyUCP, UCP_LABELS, type UcpType } from '@/features/rh/lib/classifyUCP';

export type Turno = 'Matutino' | 'Vespertino' | 'Noturno';

const MONTHS_LABEL = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
];

const WEEKDAY_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const WEEKDAY_KEY = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'];
// Aliases que aparecem em diferentes pontos do schema (PT e EN)
const WEEKDAY_ALIASES: Record<number, string[]> = {
  0: ['DOMINGO', 'DOM', 'SUNDAY', 'SUN'],
  1: ['SEGUNDA', 'SEG', 'MONDAY', 'MON'],
  2: ['TERCA', 'TERÇA', 'TER', 'TUESDAY', 'TUE'],
  3: ['QUARTA', 'QUA', 'WEDNESDAY', 'WED'],
  4: ['QUINTA', 'QUI', 'THURSDAY', 'THU'],
  5: ['SEXTA', 'SEX', 'FRIDAY', 'FRI'],
  6: ['SABADO', 'SÁBADO', 'SAB', 'SATURDAY', 'SAT'],
};

export interface SlotInfo {
  slot_number: number;
  weekday: string; // 'MONDAY'..
  start_time: string;
  end_time: string;
}

export interface ModelInfo {
  weekday: string;
  slot_number: number | null;
  start_time: string;
  end_time: string;
  class_mode?: string | null; // PRESENCIAL | ANP
  schedule_type?: 'CLASS' | 'PLANNING' | null;
  subject_id?: string | null;
  subject_name?: string | null;
  subject_ch_semanal?: number | null;
  subject_semester?: 'FIRST' | 'SECOND' | 'ANNUAL' | null;
  course_name?: string | null;
  class_group_name?: string | null;
}

export interface CalendarEventInfo {
  event_date: string; // 'YYYY-MM-DD'
  event_type: 'LETIVO' | 'FERIADO' | 'RECESSO' | 'EVENTO';
}

export interface FolhaPontoInput {
  professorName: string;
  schoolName: string;
  turno: Turno;
  year: number;
  month: number; // 1-12
  slots: SlotInfo[];   // all ACTIVE slots of that school for that turno
  models: ModelInfo[]; // professor's weekly teaching models for that school in that turno
  events: CalendarEventInfo[]; // calendar events for that org in that month
}

export function bucketTurno(startTime: string): Turno {
  const h = Number(startTime.split(':')[0] || 0);
  if (h < 12) return 'Matutino';
  if (h < 18) return 'Vespertino';
  return 'Noturno';
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function pad(n: number) { return String(n).padStart(2, '0'); }

export async function generateFolhaPontoPdf(input: FolhaPontoInput): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const margin = 12;

  const logo = await getBrandLogoForPdf();
  let y = drawBrandedHeader(doc, {
    title: 'Folha de Ponto',
    eyebrow: 'NEOVALE · FOLHA DE FREQUÊNCIA',
    tagline: 'Onde o talento encontra a oportunidade certa.',
    subtitle: 'Documento Oficial',
    logo,
  });

  // ---------- Bloco de identificação ----------
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2, lineColor: BRAND.border, lineWidth: 0.15, textColor: [20, 20, 20] },
    head: [['UNIDADE ESCOLAR', 'TURNO', 'FUNÇÃO', 'MÊS']],
    headStyles: { fillColor: BRAND.yellow, textColor: BRAND.navy, fontStyle: 'bold', halign: 'center' },
    body: [[
      input.schoolName.toUpperCase(),
      input.turno.toUpperCase(),
      'PROFESSOR',
      `${MONTHS_LABEL[input.month - 1]} / ${input.year}`,
    ]],
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 36, halign: 'center' },
    },
  });
  // @ts-expect-error autotable typings
  y = doc.lastAutoTable.finalY + 1.5;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.2, lineColor: BRAND.border, lineWidth: 0.15 },
    head: [['NOME DO PROFESSOR']],
    headStyles: { fillColor: BRAND.yellow, textColor: BRAND.navy, fontStyle: 'bold', halign: 'left' },
    body: [[input.professorName.toUpperCase()]],
  });
  // @ts-expect-error autotable typings
  y = doc.lastAutoTable.finalY + 4;

  // ---------- Título ----------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...BRAND.navy);
  doc.text('GRADE HORÁRIA DO PROFESSOR', pw / 2, y, { align: 'center' });
  y += 3;

  // ---------- Índice de eventos do calendário ----------


  // index: date -> event_type
  const eventIndex = new Map<string, CalendarEventInfo['event_type']>();
  for (const ev of input.events) {
    // priorizar FERIADO > RECESSO > LETIVO/EVENTO
    const prev = eventIndex.get(ev.event_date);
    const rank = (t: string) => ({ FERIADO: 3, RECESSO: 2, EVENTO: 1, LETIVO: 0 } as Record<string, number>)[t] ?? 0;
    if (!prev || rank(ev.event_type) > rank(prev)) eventIndex.set(ev.event_date, ev.event_type);
  }

  // ---------- Tempos (colunas) do turno do professor ----------
  // Inclui também os slot_numbers usados por modelos PLANNING (que podem cair fora
  // dos slots ACTIVE do turno principal das aulas).
  const tempoNumbers = Array.from(
    new Set([
      ...((input.slots || []).map((s) => s.slot_number).filter((n) => n != null) as number[]),
      ...((input.models || [])
        .filter((m) => m.slot_number != null)
        .map((m) => m.slot_number as number)),
    ]),
  ).sort((a, b) => a - b);

  // Construir corpo (MATRIZ: linha = dia / colunas = tempos)
  const totalDays = daysInMonth(input.year, input.month);
  const body: (string | { content: string; colSpan?: number; styles?: any })[][] = [];

  for (let d = 1; d <= totalDays; d++) {
    const dateObj = new Date(input.year, input.month - 1, d);
    const dow = dateObj.getDay();
    const dateStr = `${input.year}-${pad(input.month)}-${pad(d)}`;
    const dateLabel = `${pad(d)}/${pad(input.month)}`;
    const diaLabel = WEEKDAY_LABEL[dow];
    const evt = eventIndex.get(dateStr);
    const isWeekend = dow === 0 || dow === 6;

    let dayCode: string | null = null;
    if (evt === 'FERIADO') dayCode = 'F';
    else if (evt === 'RECESSO') dayCode = 'RR';
    else if (isWeekend) dayCode = 'NL';

    if (dayCode) {
      const row: any[] = [dateLabel, diaLabel];
      for (const _n of tempoNumbers) row.push(dayCode);
      row.push('');
      body.push(row);
      continue;
    }

    const aliases = new Set((WEEKDAY_ALIASES[dow] || [WEEKDAY_KEY[dow]]).map((s) => s.toUpperCase()));
    const dayModels = (input.models || []).filter((m) => aliases.has(String(m.weekday || '').toUpperCase()));
    const bySlot = new Map<number, ModelInfo>();
    for (const m of dayModels) {
      if (m.slot_number != null) bySlot.set(m.slot_number, m);
    }

    const row: any[] = [dateLabel, diaLabel];
    for (const n of tempoNumbers) {
      const m = bySlot.get(n);
      if (!m) { row.push(''); continue; }
      let cell: string;
      if (m.schedule_type === 'PLANNING') {
        cell = 'PL';
      } else {
        const ucp = shortUcpLabel(m); // "UCP I" / "UCP II" / "UCP III" / "UCP Ped." / sigla
        const rawName = (m.subject_name || '').trim();
        // Tira o prefixo "UCP X - " do nome para não duplicar
        const disciplina = rawName.replace(/^UCP\s*(?:I{1,3}|Ped\.?|Pedag[óo]gica)\s*[-–—:]\s*/i, '').trim();
        const lines: string[] = [];
        if (ucp) lines.push(ucp);
        if (disciplina) lines.push(disciplina);
        if (lines.length === 0) lines.push(rawName || '✓');
        if (m.class_mode === 'ANP') lines.push('(ANP)');
        cell = lines.join('\n');
      }
      row.push(cell);
    }
    row.push('');
    body.push(row);
  }

  const head: string[][] = [[
    'DATA', 'DIA',
    ...tempoNumbers.map((n) => `${n}º TEMPO`),
    'ASSINATURA',
  ]];

  const tableW = pw - margin * 2;
  const fixedW = 16 + 12 + 22;
  const tempoColW = tempoNumbers.length > 0
    ? Math.max(16, (tableW - fixedW) / tempoNumbers.length)
    : 16;
  const columnStyles: Record<number, any> = {
    0: { cellWidth: 16, halign: 'center' },
    1: { cellWidth: 12, halign: 'center' },
  };
  tempoNumbers.forEach((_n, i) => {
    columnStyles[2 + i] = { cellWidth: tempoColW, halign: 'center' };
  });
  columnStyles[2 + tempoNumbers.length] = { cellWidth: 22 };

  autoTable(doc, {
    startY: y + 1,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.2, lineColor: BRAND.border, lineWidth: 0.15, minCellHeight: 9, valign: 'middle', overflow: 'linebreak' },
    head,
    headStyles: { fillColor: BRAND.yellow, textColor: BRAND.navy, fontStyle: 'bold', halign: 'center', fontSize: 7 },
    body: body as any,
    columnStyles,
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const txt = String(data.cell.raw ?? '');
      const isTempoCol = data.column.index >= 2 && data.column.index < 2 + tempoNumbers.length;
      if (!isTempoCol) return;

      if (txt === 'NL') {
        data.cell.styles.fillColor = [240, 240, 240];
        data.cell.styles.textColor = [120, 120, 120];
        data.cell.styles.fontStyle = 'bold';
      } else if (txt === 'F') {
        data.cell.styles.fillColor = [255, 230, 230];
        data.cell.styles.textColor = [180, 30, 30];
        data.cell.styles.fontStyle = 'bold';
      } else if (txt === 'RR') {
        data.cell.styles.fillColor = [230, 240, 255];
        data.cell.styles.textColor = [40, 70, 160];
        data.cell.styles.fontStyle = 'bold';
      } else if (txt === 'PL') {
        data.cell.styles.fillColor = [255, 248, 214];
        data.cell.styles.textColor = BRAND.navy as any;
        data.cell.styles.fontStyle = 'bold';
      } else if (txt.includes('(ANP)')) {
        data.cell.styles.fillColor = [255, 246, 200];
        data.cell.styles.textColor = [110, 80, 0];
        data.cell.styles.fontStyle = 'bold';
      } else if (txt) {
        data.cell.styles.textColor = BRAND.navy as any;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });


  // @ts-expect-error autotable typings
  y = doc.lastAutoTable.finalY + 5;

  const ph = doc.internal.pageSize.getHeight();
  if (y > ph - 38) { doc.addPage(); y = 18; }

  // ---------- Observações: Curso × Disciplina × UCP ----------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.navy);
  doc.text('OBSERVAÇÕES — CURSO E DISCIPLINAS QUE O PROFESSOR LECIONA', margin, y);
  y += 2;

  const obsRows = buildObservationRows(input.models);
  autoTable(doc, {
    startY: y + 1,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.8, lineColor: BRAND.border, lineWidth: 0.15 },
    head: [['UCP', 'DISCIPLINA', 'CURSO', 'TURMA']],
    headStyles: { fillColor: BRAND.yellow, textColor: BRAND.navy, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [255, 252, 235] as [number, number, number] },
    body: obsRows.length > 0
      ? obsRows.map((r) => [r.ucp, r.subject, r.course, r.classGroup])
      : [[{ content: 'Sem disciplinas vinculadas no período.', colSpan: 4, styles: { halign: 'center', textColor: [120, 120, 120] as [number, number, number], fontStyle: 'italic' as const } }]],
    columnStyles: {
      0: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 50 },
      3: { cellWidth: 28, halign: 'center' },
    },
  });
  // @ts-expect-error autotable typings
  y = doc.lastAutoTable.finalY + 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 40);
  doc.text('OBSERVAÇÕES: DATA, CARIMBO E ASSINATURA DA CHEFIA IMEDIATA EM ____/____/______', margin, y);
  y += 6;


  doc.setDrawColor(...BRAND.border);
  doc.line(margin, y, pw - margin, y);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.navy);
  doc.text('LEGENDA', margin, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);
  const legenda = [
    '(F) Feriado · (FC) Formação Continuada · (FE) Família e Escola · (JP) Jornada Pedagógica',
    '(NL) Não letivo · (AT) Atestado médico · (EF) Emenda de feriado · (UC) Unidade Curricular I, II ou III',
    '(UCP) Unidade Curricular de Planejamento · (PL) Planejamento · (RR) Recesso Remunerado · (ANP) Atividade Não Presencial',
  ];
  for (const line of legenda) { doc.text(line, margin, y); y += 3.5; }

  // ---------- Assinaturas ----------
  y += 8;
  if (y > ph - 22) { doc.addPage(); y = 18; }
  const colW = (pw - margin * 2 - 16) / 2;
  doc.setDrawColor(80, 80, 80);
  doc.line(margin, y, margin + colW, y);
  doc.line(margin + colW + 16, y, pw - margin, y);
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text('Professor(a)', margin + colW / 2, y + 4, { align: 'center' });
  doc.text('Responsável pela unidade escolar', margin + colW + 16 + colW / 2, y + 4, { align: 'center' });

  drawBrandedFooter(doc, 'Folha de Ponto');

  return doc.output('blob');
}

function shortUcpLabel(m: ModelInfo): string {
  const ucp = classifyUCP(m.subject_name);
  if (ucp === 'UCP1') return 'UCP I';
  if (ucp === 'UCP2') return 'UCP II';
  if (ucp === 'UCP3') return 'UCP III';
  if (ucp === 'PEDAGOGICA') return 'UCP Ped.';
  const name = (m.subject_name || '').trim();
  if (!name) return '';
  // Sigla curta com 3 letras das palavras significativas
  const parts = name.split(/\s+/).filter((w) => w.length > 2);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0] + (parts[2]?.[0] || '')).toUpperCase();
  return name.slice(0, 4).toUpperCase();
}

interface ObsRow { ucp: string; subject: string; course: string; classGroup: string; rank: number }

function buildObservationRows(models: ModelInfo[]): ObsRow[] {
  const seen = new Map<string, ObsRow>();
  const rank: Record<UcpType, number> = { UCP1: 1, UCP2: 2, UCP3: 3, PEDAGOGICA: 4, OUTRA: 5 };
  for (const m of models) {
    const key = `${m.subject_id || m.subject_name || '?'}__${m.class_group_name || ''}__${m.course_name || ''}`;
    if (seen.has(key)) continue;
    const ucpType = classifyUCP(m.subject_name);
    seen.set(key, {
      ucp: UCP_LABELS[ucpType],
      subject: m.subject_name || '—',
      course: m.course_name || '—',
      classGroup: m.class_group_name || '—',
      rank: rank[ucpType],
    });
  }
  return Array.from(seen.values()).sort(
    (a, b) => a.rank - b.rank || a.subject.localeCompare(b.subject, 'pt-BR'),
  );
}

