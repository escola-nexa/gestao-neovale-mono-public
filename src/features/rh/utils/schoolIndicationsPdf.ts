import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BRAND,
  drawBrandedHeader,
  drawBrandedFooter,
  resolveBrandLogo,
  type BrandLogo,
} from '@/lib/pdfBranding';
import { hrApi } from '../api';
import { indicationLinksApi } from '../lib/indicationLinksApi';

type Weekday = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
type Turno = 'manha' | 'tarde' | 'noite';

const WEEKDAY_ORDER: Record<Weekday, number> = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };
const WEEKDAY_LABEL: Record<Weekday, string> = {
  MON: 'Segunda', TUE: 'Terça', WED: 'Quarta', THU: 'Quinta', FRI: 'Sexta', SAT: 'Sábado',
};
const TURNO_LABEL: Record<Turno, string> = {
  manha: 'Matutino', tarde: 'Vespertino', noite: 'Noturno',
};
const TURNO_ORDER: Record<Turno, number> = { manha: 1, tarde: 2, noite: 3 };

interface GradeCell {
  turno: Turno;
  weekday: Weekday;
  subject_id: string;
  subject_nome: string;
  time_slot_label: string | null;
  is_anp?: boolean;
  class_mode?: string;
}

/** Marca disciplinas ANP com sufixo em PDFs/relatórios. */
function fmtSubject(g: GradeCell | null | undefined, fallback = '—'): string {
  if (!g) return fallback;
  const isAnp = g.is_anp === true || String(g.class_mode ?? '').toUpperCase() === 'ANP';
  const name = g.subject_nome ?? fallback;
  return isAnp ? `${name} (ANP)` : name;
}

interface IndicRow {
  id: string;
  course_id: string | null;
  indication_class_id: string | null;
  candidato_nome: string;
  candidato_telefone: string | null;
  candidato_email: string | null;
  candidato_formacao: string | null;
  candidato_grade: GradeCell | null;
  status: string;
  origem: string;
}

interface ClassRow {
  id: string;
  course_id: string;
  nome: string;
  turno: string;
}

function parseTimeRange(label: string | null): { inicio: string; fim: string } | null {
  if (!label) return null;
  const m = label.match(/(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})/);
  if (!m) return null;
  return { inicio: m[1], fim: m[2] };
}

function slotMinutes(label: string | null): number {
  const t = parseTimeRange(label);
  if (!t) return 50;
  const [h1, m1] = t.inicio.split(':').map(Number);
  const [h2, m2] = t.fim.split(':').map(Number);
  const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
  return diff > 0 ? diff : 50;
}

function formatHM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m.toString().padStart(2, '0')}min`;
}

const isSemInd = (nome: string) => !nome || /sem\s*indica/i.test(nome);

export interface ExportSchoolIndicationsPdfOpts {
  linkId: string;
  schoolName: string;
}

export async function exportSchoolIndicationsPdf({
  linkId,
  schoolName,
}: ExportSchoolIndicationsPdfOpts): Promise<void> {
  // 1) Link → organização (para branding) e turmas/indicações
  const organizationId = await indicationLinksApi.getLinkOrganizationId(linkId);

  const { classes: classesRaw, indics: indicsRaw, courseMap } = await indicationLinksApi.getConferirData(linkId);

  const classes: ClassRow[] = classesRaw as any;
  const indics: IndicRow[] = indicsRaw as any;

  const courseNameMap = courseMap;

  // 3) Branding da organização
  let brandLogo: BrandLogo | null = null;
  if (organizationId) {
    const brand = await hrApi.getBranding(organizationId);
    brandLogo = await resolveBrandLogo((brand as any)?.logo_url, (brand as any)?.icon_url);
  }

  // 4) Inicializar PDF (PAISAGEM)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 12;

  const renderHeader = (subtitle = 'Documento de R.H.') =>
    drawBrandedHeader(doc, {
      eyebrow: 'NEOVALE · INDICAÇÕES POR ESCOLA',
      title: `Indicações: ${schoolName}`,
      tagline: 'Onde o talento encontra a oportunidade certa.',
      subtitle,
      logo: brandLogo,
    });

  let y = renderHeader();

  function ensureRoom(needed: number) {
    if (y + needed > ph - 14) {
      doc.addPage('a4', 'landscape');
      y = renderHeader();
    }
  }

  // ----- Resumo geral -----
  const totalIndic = indics.length;
  const indicados = indics.filter((i) => !isSemInd(i.candidato_nome)).length;
  const semInd = totalIndic - indicados;
  const profsUnicos = new Set(
    indics
      .filter((i) => !isSemInd(i.candidato_nome))
      .map((i) => `${i.candidato_nome.trim().toLowerCase()}|${(i.candidato_telefone ?? '').trim()}`),
  ).size;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.navy);
  doc.text('Resumo geral', margin, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(
    [
      `Turmas: ${classes.length}`,
      `Indicações: ${totalIndic}`,
      `Com professor: ${indicados}`,
      `Sem indicação: ${semInd}`,
      `Professores únicos: ${profsUnicos}`,
    ].join('   •   '),
    margin, y,
  );
  y += 6;

  // ----- Agrupar TURMAS por TURNO -----
  const byTurno = new Map<Turno, ClassRow[]>();
  for (const c of classes) {
    const t = (c.turno as Turno) || 'manha';
    const arr = byTurno.get(t) ?? [];
    arr.push(c);
    byTurno.set(t, arr);
  }
  const turnoEntries = Array.from(byTurno.entries()).sort(
    (a, b) => (TURNO_ORDER[a[0]] ?? 99) - (TURNO_ORDER[b[0]] ?? 99),
  );

  let firstTurno = true;
  for (const [turno, turnoClasses] of turnoEntries) {
    if (!firstTurno) {
      doc.addPage('a4', 'landscape');
      y = renderHeader(`Turno ${TURNO_LABEL[turno]}`);
    }
    firstTurno = false;

    // Cabeçalho do TURNO
    ensureRoom(14);
    // barra amarela à esquerda
    doc.setFillColor(...BRAND.yellow);
    doc.rect(margin, y, 1.6, 8, 'F');
    doc.setTextColor(...BRAND.navy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setCharSpace(1.2);
    doc.text(`GRADE SEMANAL · ${TURNO_LABEL[turno].toUpperCase()}`, margin + 4, y + 5.5);
    doc.setCharSpace(0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `${turnoClasses.length} turma${turnoClasses.length === 1 ? '' : 's'}`,
      pw - margin, y + 5.5,
      { align: 'right' },
    );
    y += 11;
    doc.setTextColor(0, 0, 0);

    const sortedClasses = turnoClasses
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }));

    for (const cls of sortedClasses) {
      const courseName = courseNameMap.get(cls.course_id) ?? 'Curso';
      const rows = indics.filter((i) => i.indication_class_id === cls.id);
      renderClassBlock(cls, courseName, rows, turno);
    }
  }

  // Sem turmas? mostrar mensagem
  if (turnoEntries.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text('Nenhuma turma declarada para este link.', margin, y + 8);
  }

  // ----- Apêndice: lista plana de indicações -----
  if (indics.length > 0) {
    doc.addPage('a4', 'landscape');
    y = renderHeader('Apêndice — lista completa');

    const head = [['Curso', 'Turma', 'Disc.', 'Dia/Horário', 'Professor', 'Telefone', 'E-mail', 'Formação']];
    const body = indics
      .slice()
      .sort((a, b) => {
        const cn = (courseNameMap.get(a.course_id ?? '') ?? '').localeCompare(courseNameMap.get(b.course_id ?? '') ?? '', 'pt-BR');
        if (cn !== 0) return cn;
        return a.candidato_nome.localeCompare(b.candidato_nome, 'pt-BR');
      })
      .map((i) => {
        const cls = classes.find((c) => c.id === i.indication_class_id);
        const g = i.candidato_grade;
        const dia = g ? `${WEEKDAY_LABEL[g.weekday] ?? g.weekday}${g.time_slot_label ? `\n${g.time_slot_label}` : ''}` : '—';
        const sem = isSemInd(i.candidato_nome);
        return [
          courseNameMap.get(i.course_id ?? '') ?? '—',
          cls?.nome ?? '—',
          fmtSubject(g),
          dia,
          sem ? '⚠ Sem indicação' : i.candidato_nome,
          sem ? '' : (i.candidato_telefone ?? ''),
          sem ? '' : (i.candidato_email ?? ''),
          sem ? '' : (i.candidato_formacao ?? ''),
        ];
      });

    autoTable(doc, {
      head, body, startY: y,
      margin: { left: margin, right: margin },
      styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 1.4, overflow: 'linebreak' },
      headStyles: { fillColor: BRAND.navy, textColor: [255, 218, 69], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 251, 253] },
    });
  }

  drawBrandedFooter(doc, `Indicações — ${schoolName}`);

  const today = new Date().toISOString().slice(0, 10);
  const safeName = schoolName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9-]+/g, '_').slice(0, 60);
  doc.save(`indicacoes-${safeName || 'escola'}-${today}.pdf`);

  // ===================== Helpers de bloco =====================

  function renderClassBlock(cls: ClassRow, courseName: string, rows: IndicRow[], turno: Turno) {
    // Métricas
    const totalAulas = rows.length;
    const totalMin = rows.reduce((sum, r) => sum + slotMinutes(r.candidato_grade?.time_slot_label ?? null), 0);
    const semIndRows = rows.filter((r) => isSemInd(r.candidato_nome));
    const indicRows = rows.filter((r) => !isSemInd(r.candidato_nome));
    const indicMin = indicRows.reduce((s, r) => s + slotMinutes(r.candidato_grade?.time_slot_label ?? null), 0);
    const semIndMin = semIndRows.reduce((s, r) => s + slotMinutes(r.candidato_grade?.time_slot_label ?? null), 0);

    // Pendências por disciplina
    const pendBySubj = new Map<string, { count: number; min: number }>();
    semIndRows.forEach((r) => {
      const sub = fmtSubject(r.candidato_grade);
      const cur = pendBySubj.get(sub) ?? { count: 0, min: 0 };
      cur.count += 1;
      cur.min += slotMinutes(r.candidato_grade?.time_slot_label ?? null);
      pendBySubj.set(sub, cur);
    });

    // Calcular altura aproximada antes de quebrar página
    const hasPending = semIndRows.length > 0;
    const approxRows = new Set(rows.map((r) => r.candidato_grade?.time_slot_label ?? '')).size || 1;
    const approxH = 9 /* header */ + 14 /* kpis */ + (hasPending ? 14 : 0) + 8 /* turnos line */ + 8 /* table head */ + approxRows * 11 + 6;
    ensureRoom(Math.min(approxH, ph - 40));

    // 1) Cabeçalho navy escuro: TURMA | ESCOLA | CURSO
    const headerH = 9;
    doc.setFillColor(...BRAND.navy);
    doc.roundedRect(margin, y, pw - margin * 2, headerH, 1.4, 1.4, 'F');
    // dot amarelo
    doc.setFillColor(...BRAND.yellow);
    doc.circle(margin + 4, y + headerH / 2, 1.1, 'F');

    let cx = margin + 7;
    const drawSeg = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(170, 170, 180);
      doc.setCharSpace(0.6);
      doc.text(label.toUpperCase(), cx, y + 3.6);
      doc.setCharSpace(0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      doc.text(value, cx, y + 7.6);
      const w = doc.getTextWidth(value);
      cx += Math.max(w, doc.getTextWidth(label.toUpperCase())) + 6;
      // separador
      doc.setDrawColor(80, 80, 95);
      doc.setLineWidth(0.2);
      doc.line(cx - 3, y + 1.6, cx - 3, y + headerH - 1.6);
    };
    drawSeg('Turma', cls.nome);
    drawSeg('Escola', schoolName);
    // Curso ocupa o restante (truncado se preciso)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(170, 170, 180);
    doc.setCharSpace(0.6);
    doc.text('CURSO', cx, y + 3.6);
    doc.setCharSpace(0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    const maxW = pw - margin - cx - 2;
    const courseText = truncateToWidth(doc, courseName, maxW);
    doc.text(courseText, cx, y + 7.6);

    y += headerH + 2;
    doc.setTextColor(0, 0, 0);

    // 2) KPIs
    const kpiH = 12;
    const kpiW = (pw - margin * 2) / 4;
    const kpis: Array<{ label: string; value: string; warn?: boolean }> = [
      { label: 'AULAS', value: String(totalAulas) },
      { label: 'CARGA', value: formatHM(totalMin) },
      { label: 'INDICADOS', value: `${indicRows.length}${indicRows.length ? ` · ${formatHM(indicMin)}` : ''}` },
      { label: 'SEM INDICAÇÃO', value: hasPending ? `${semIndRows.length} · ${formatHM(semIndMin)}` : '0', warn: hasPending },
    ];
    kpis.forEach((k, i) => {
      const x = margin + i * kpiW;
      doc.setFillColor(...(k.warn ? BRAND.bgSoft : ([250, 251, 253] as [number, number, number])));
      doc.setDrawColor(...BRAND.border);
      doc.setLineWidth(0.2);
      doc.rect(x, y, kpiW, kpiH, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(...(k.warn ? BRAND.navy : [120, 120, 120] as [number, number, number]));
      doc.setCharSpace(0.6);
      doc.text(k.label, x + 2.6, y + 4.3);
      doc.setCharSpace(0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...BRAND.navy);
      doc.text(k.value, x + 2.6, y + 9.6);
    });
    y += kpiH + 2;
    doc.setTextColor(0, 0, 0);

    // 3) Faixa de pendências
    if (hasPending) {
      const pendH = 11;
      doc.setFillColor(...BRAND.bgSoft);
      doc.rect(margin, y, pw - margin * 2, pendH, 'F');
      doc.setFillColor(...BRAND.yellow);
      doc.rect(margin, y, 1.6, pendH, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...BRAND.navy);
      doc.setCharSpace(0.5);
      doc.text('CARGA HORÁRIA PENDENTE POR DISCIPLINA', margin + 4, y + 4);
      doc.setCharSpace(0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text(`(${semIndRows.length} aula${semIndRows.length === 1 ? '' : 's'} · ${formatHM(semIndMin)})`, margin + 88, y + 4);
      const list = Array.from(pendBySubj.entries())
        .map(([sub, v]) => `${sub}: ${v.count} aula${v.count === 1 ? '' : 's'}`)
        .join('   •   ');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...BRAND.navy);
      doc.text(truncateToWidth(doc, list, pw - margin * 2 - 6), margin + 4, y + 8.6);
      y += pendH + 2;
      doc.setTextColor(0, 0, 0);
    }

    // 4) Linha "Turnos:"
    doc.setFillColor(248, 249, 252);
    doc.rect(margin, y, pw - margin * 2, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.setCharSpace(0.6);
    doc.text('TURNOS:', margin + 2, y + 4);
    doc.setCharSpace(0);
    doc.setFillColor(...BRAND.yellow);
    doc.circle(margin + 16, y + 3, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.navy);
    doc.text(TURNO_LABEL[turno], margin + 18, y + 4);
    y += 7;
    doc.setTextColor(0, 0, 0);

    // 5) Grade dia × tempo
    type Cell = { subject: string; nome: string; isSemInd: boolean };
    type R = { inicio: string; fim: string; label: string; cells: Partial<Record<Weekday, Cell>> };
    const rowMap = new Map<string, R>();
    const daysSet = new Set<Weekday>();
    rows.forEach((r) => {
      const g = r.candidato_grade; if (!g) return;
      const t = parseTimeRange(g.time_slot_label); if (!t) return;
      daysSet.add(g.weekday);
      const key = `${t.inicio}-${t.fim}`;
      const cur = rowMap.get(key) ?? { inicio: t.inicio, fim: t.fim, label: g.time_slot_label ?? `${t.inicio}–${t.fim}`, cells: {} };
      cur.cells[g.weekday] = { subject: fmtSubject(g), nome: r.candidato_nome, isSemInd: isSemInd(r.candidato_nome) };
      rowMap.set(key, cur);
    });

    if (rowMap.size === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(120, 120, 120);
      doc.text('Nenhuma aula com horário registrado para esta turma.', margin + 2, y + 4);
      y += 8;
      doc.setTextColor(0, 0, 0);
      return;
    }

    const days = Array.from(daysSet).sort((a, b) => WEEKDAY_ORDER[a] - WEEKDAY_ORDER[b]);
    const grade = Array.from(rowMap.values()).sort((a, b) => a.inicio.localeCompare(b.inicio));

    const head = [['HORÁRIO', ...days.map((d) => WEEKDAY_LABEL[d].toUpperCase())]];
    const body = grade.map((r) => {
      const dur = slotMinutes(r.label);
      const horario = `${r.inicio}–${r.fim}\n${dur}min`;
      const cells = days.map((d) => {
        const c = r.cells[d];
        if (!c) return '·';
        const prof = c.isSemInd ? '⚠ SEM INDICAÇÃO' : c.nome;
        return `${c.subject}\n${prof}`;
      });
      return [horario, ...cells];
    });

    autoTable(doc, {
      head, body, startY: y,
      margin: { left: margin, right: margin },
      styles: {
        font: 'helvetica', fontSize: 7.8, cellPadding: 1.8,
        lineColor: [220, 222, 230], lineWidth: 0.18,
        valign: 'middle', overflow: 'linebreak',
      },
      headStyles: { fillColor: BRAND.navy, textColor: [255, 218, 69], fontStyle: 'bold', halign: 'center', fontSize: 8 },
      bodyStyles: { textColor: [27, 30, 44] },
      columnStyles: { 0: { cellWidth: 26, fontStyle: 'bold', halign: 'center', textColor: BRAND.navy } },
      alternateRowStyles: { fillColor: [250, 251, 253] },
      didParseCell: (data) => {
        if (data.section !== 'body' || data.column.index === 0) return;
        const raw = String(data.cell.raw ?? '');
        if (/SEM INDICAÇÃO/.test(raw)) {
          data.cell.styles.fillColor = BRAND.bgSoft;
          data.cell.styles.textColor = BRAND.navy;
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }
}

function truncateToWidth(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  const ell = '…';
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (doc.getTextWidth(text.slice(0, mid) + ell) <= maxWidth) lo = mid; else hi = mid - 1;
  }
  return text.slice(0, lo) + ell;
}
