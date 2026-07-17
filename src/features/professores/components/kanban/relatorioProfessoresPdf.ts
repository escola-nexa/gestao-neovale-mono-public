import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BRAND, drawBrandedHeader, drawBrandedFooter, brandTableStyles, resolveBrandLogo, type BrandLogo } from '@/lib/pdfBranding';

interface SchoolBreakdown {
  school_id: string;
  school_name: string;
  hours: { matutino: number; vespertino: number; noturno: number };
  totalHours: number;
  hasSchedule: boolean;
}

export interface ProfessorReportRow {
  professor_id: string;
  professor_name: string;
  registration_code: string | null;
  status?: string;
  contractual_hours: number | null;
  schools: SchoolBreakdown[];
  totalsByTurno: { matutino: number; vespertino: number; noturno: number };
  totalHours: number;
}

const statusLabel = (s?: string) =>
  s === 'ACTIVE' ? 'Ativo' : s === 'INACTIVE' ? 'Inativo' : s === 'ON_LEAVE' ? 'Afastado' : 'Ativo';

export interface ReportTotals {
  professores: number;
  escolas: number;
  totalsByTurno: { matutino: number; vespertino: number; noturno: number };
  totalHours: number;
}

export type ReportTemplate =
  | 'completo'        // 1. Detalhado por professor x escola (paisagem)
  | 'consolidado'     // 2. Resumo consolidado (1 linha por professor)
  | 'por-escola'      // 3. Agrupado por escola
  | 'por-professor'   // 4. Agrupado por professor (escolas + CH + total)
  | 'sintetico-kpi';  // 5. Capa executiva c/ KPIs e ranking

const fmtH = (h: number | null | undefined) =>
  h == null || h === 0 ? '—' : `${Number(h).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}h`;

interface GenOptions {
  template: ReportTemplate;
  rows: ProfessorReportRow[];
  totals: ReportTotals;
  /** Logotipo horizontal (preferencial). */
  logoUrl?: string | null;
  /** Ícone/símbolo (fallback se a horizontal não estiver disponível). */
  iconUrl?: string | null;
  organizationName?: string;
}

const TEMPLATE_LABEL: Record<ReportTemplate, string> = {
  'completo': 'Relatório Completo',
  'consolidado': 'Resumo Consolidado',
  'por-escola': 'Agrupado por Escola',
  'por-professor': 'Agrupado por Professor',
  'sintetico-kpi': 'Painel Executivo',
};

export async function generateProfessoresReportPdf(opts: GenOptions): Promise<void> {
  const brandLogo = await resolveBrandLogo(opts.logoUrl ?? null, opts.iconUrl ?? null);

  switch (opts.template) {
    case 'completo':       return renderCompleto(opts, brandLogo);
    case 'consolidado':    return renderConsolidado(opts, brandLogo);
    case 'por-escola':     return renderPorEscola(opts, brandLogo);
    case 'por-professor':  return renderPorProfessor(opts, brandLogo);
    case 'sintetico-kpi':  return renderSinteticoKpi(opts, brandLogo);
  }
}

function fileName(template: ReportTemplate): string {
  const date = new Date().toISOString().slice(0, 10);
  return `relatorio-professores-${template}-${date}.pdf`;
}

// ---------------------------------------------------------------
// 1) COMPLETO — paisagem, detalhado professor × escola × turnos
// ---------------------------------------------------------------
function renderCompleto({ rows, totals, organizationName }: GenOptions, logo: BrandLogo | null) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const startY = drawBrandedHeader(doc, {
    eyebrow: 'NEOVALE · RELATÓRIO DETALHADO',
    title: 'Carga Horária dos Professores',
    tagline: 'Cada hora dedicada constrói o futuro da educação.',
    subtitle: organizationName || 'Documento Oficial',
    logo,
  });

  // Bloco de KPIs
  drawKpiStrip(doc, startY, totals);

  const tableBody: any[] = [];
  rows.forEach((p) => {
    const profCellText = `${p.professor_name}${p.registration_code ? `\nMat. ${p.registration_code}` : ''}\nStatus: ${statusLabel(p.status)}`;
    if (p.schools.length === 0) {
      tableBody.push([
        { content: profCellText, styles: { fontStyle: 'bold' } },
        { content: 'Sem escola vinculada', styles: { textColor: BRAND.muted, fontStyle: 'italic' } },
        '—', '—', '—',
        { content: fmtH(p.totalHours), styles: { halign: 'right', fontStyle: 'bold', textColor: BRAND.navy } },
      ]);
      return;
    }
    p.schools.forEach((s, idx) => {
      tableBody.push([
        idx === 0
          ? { content: profCellText, rowSpan: p.schools.length + (p.schools.length > 1 ? 1 : 0), styles: { fontStyle: 'bold', valign: 'top' } }
          : null,
        s.school_name + (s.hasSchedule ? '' : '  (sem grade)'),
        { content: fmtH(s.hours.matutino), styles: { halign: 'right' } },
        { content: fmtH(s.hours.vespertino), styles: { halign: 'right' } },
        { content: fmtH(s.hours.noturno), styles: { halign: 'right' } },
        { content: fmtH(s.totalHours), styles: { halign: 'right', fontStyle: 'bold' } },
      ].filter((c) => c !== null));
    });
    if (p.schools.length > 1) {
      tableBody.push([
        { content: `Total ${p.professor_name}`, colSpan: 1, styles: { halign: 'right', fontStyle: 'bold', fillColor: BRAND.bgSoft, textColor: BRAND.navy } },
        { content: fmtH(p.totalsByTurno.matutino), styles: { halign: 'right', fontStyle: 'bold', fillColor: BRAND.bgSoft } },
        { content: fmtH(p.totalsByTurno.vespertino), styles: { halign: 'right', fontStyle: 'bold', fillColor: BRAND.bgSoft } },
        { content: fmtH(p.totalsByTurno.noturno), styles: { halign: 'right', fontStyle: 'bold', fillColor: BRAND.bgSoft } },
        { content: fmtH(p.totalHours), styles: { halign: 'right', fontStyle: 'bold', fillColor: BRAND.yellow, textColor: BRAND.navy } },
      ]);
    }
  });

  autoTable(doc, {
    startY: startY + 22,
    head: [['Professor', 'Escola', 'Matutino', 'Vespertino', 'Noturno', 'Total CH']],
    body: tableBody,
    ...brandTableStyles,
    styles: { ...brandTableStyles.styles, fontSize: 8, cellPadding: 1.8, overflow: 'linebreak' },
    headStyles: { ...brandTableStyles.headStyles, halign: 'center' },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 24, halign: 'right' },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 26, halign: 'right' },
    },
    foot: [[
      { content: 'TOTAL GERAL', colSpan: 2, styles: { halign: 'right', fillColor: BRAND.navy, textColor: [255, 255, 255], fontStyle: 'bold' } },
      { content: fmtH(totals.totalsByTurno.matutino), styles: { halign: 'right', fillColor: BRAND.navy, textColor: [255, 255, 255], fontStyle: 'bold' } },
      { content: fmtH(totals.totalsByTurno.vespertino), styles: { halign: 'right', fillColor: BRAND.navy, textColor: [255, 255, 255], fontStyle: 'bold' } },
      { content: fmtH(totals.totalsByTurno.noturno), styles: { halign: 'right', fillColor: BRAND.navy, textColor: [255, 255, 255], fontStyle: 'bold' } },
      { content: fmtH(totals.totalHours), styles: { halign: 'right', fillColor: BRAND.yellow, textColor: BRAND.navy, fontStyle: 'bold' } },
    ]],
  });

  drawBrandedFooter(doc, TEMPLATE_LABEL.completo);
  doc.save(fileName('completo'));
}

// ---------------------------------------------------------------
// 2) CONSOLIDADO — 1 linha por professor (retrato)
// ---------------------------------------------------------------
function renderConsolidado({ rows, totals, organizationName }: GenOptions, logo: BrandLogo | null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = drawBrandedHeader(doc, {
    eyebrow: 'NEOVALE · RESUMO CONSOLIDADO',
    title: 'Visão Geral dos Professores',
    tagline: 'Uma fotografia clara de quem ensina e onde transforma.',
    subtitle: organizationName || 'Documento Oficial',
    logo,
  });

  drawKpiStrip(doc, startY, totals, true);

  const body: any[] = rows.map((p) => [
    { content: p.professor_name, styles: { fontStyle: 'bold' } },
    p.registration_code || '—',
    { content: statusLabel(p.status), styles: { halign: 'center' } },
    String(p.schools.length),
    { content: fmtH(p.totalsByTurno.matutino), styles: { halign: 'right' } },
    { content: fmtH(p.totalsByTurno.vespertino), styles: { halign: 'right' } },
    { content: fmtH(p.totalsByTurno.noturno), styles: { halign: 'right' } },
    { content: fmtH(p.totalHours), styles: { halign: 'right', fontStyle: 'bold', textColor: BRAND.navy } },
  ]);

  autoTable(doc, {
    startY: startY + 24,
    head: [['Professor', 'Matrícula', 'Status', 'Escolas', 'Matutino', 'Vespertino', 'Noturno', 'Total']],
    body,
    ...brandTableStyles,
    styles: { ...brandTableStyles.styles, fontSize: 8.5, cellPadding: 2 },
    headStyles: { ...brandTableStyles.headStyles, halign: 'center' },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 22, halign: 'right' },
    },
    foot: [[
      { content: 'TOTAL', colSpan: 4, styles: { halign: 'right', fillColor: BRAND.navy, textColor: [255, 255, 255], fontStyle: 'bold' } },
      { content: fmtH(totals.totalsByTurno.matutino), styles: { halign: 'right', fillColor: BRAND.navy, textColor: [255, 255, 255], fontStyle: 'bold' } },
      { content: fmtH(totals.totalsByTurno.vespertino), styles: { halign: 'right', fillColor: BRAND.navy, textColor: [255, 255, 255], fontStyle: 'bold' } },
      { content: fmtH(totals.totalsByTurno.noturno), styles: { halign: 'right', fillColor: BRAND.navy, textColor: [255, 255, 255], fontStyle: 'bold' } },
      { content: fmtH(totals.totalHours), styles: { halign: 'right', fillColor: BRAND.yellow, textColor: BRAND.navy, fontStyle: 'bold' } },
    ]],
  });

  drawBrandedFooter(doc, TEMPLATE_LABEL.consolidado);
  doc.save(fileName('consolidado'));
}

// ---------------------------------------------------------------
// 3) POR ESCOLA — agrupa professores por escola
// ---------------------------------------------------------------
function renderPorEscola({ rows, totals, organizationName }: GenOptions, logo: BrandLogo | null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = drawBrandedHeader(doc, {
    eyebrow: 'NEOVALE · POR UNIDADE ESCOLAR',
    title: 'Professores Agrupados por Escola',
    tagline: 'Cada escola é um território onde o aprendizado floresce.',
    subtitle: organizationName || 'Documento Oficial',
    logo,
  });

  // Reorganiza: school_id -> { name, professores: [{ name, mat, hours }] }
  const bySchool = new Map<string, { name: string; profs: Array<{ name: string; mat: string | null; status?: string; m: number; v: number; n: number; t: number }>; totals: { m: number; v: number; n: number; t: number } }>();
  rows.forEach((p) => {
    p.schools.forEach((s) => {
      if (!bySchool.has(s.school_id)) bySchool.set(s.school_id, { name: s.school_name, profs: [], totals: { m: 0, v: 0, n: 0, t: 0 } });
      const g = bySchool.get(s.school_id)!;
      g.profs.push({ name: p.professor_name, mat: p.registration_code, status: p.status, m: s.hours.matutino, v: s.hours.vespertino, n: s.hours.noturno, t: s.totalHours });
      g.totals.m += s.hours.matutino;
      g.totals.v += s.hours.vespertino;
      g.totals.n += s.hours.noturno;
      g.totals.t += s.totalHours;
    });
  });

  drawKpiStrip(doc, startY, totals, true);

  let cursorY = startY + 24;
  const sortedSchools = Array.from(bySchool.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name, 'pt-BR'));

  sortedSchools.forEach(([sid, g], idx) => {
    if (cursorY > 250) {
      doc.addPage();
      cursorY = 20;
    }
    // Cabeçalho da escola — faixa azul com nº de professores
    doc.setFillColor(...BRAND.navy);
    doc.rect(14, cursorY, doc.internal.pageSize.getWidth() - 28, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(g.name, 17, cursorY + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${g.profs.length} professor(es) • Total CH: ${fmtH(g.totals.t)}`, doc.internal.pageSize.getWidth() - 17, cursorY + 5.5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    cursorY += 8;

    autoTable(doc, {
      startY: cursorY,
      head: [['Professor', 'Matrícula', 'Status', 'Matutino', 'Vespertino', 'Noturno', 'Total']],
      body: g.profs
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
        .map((pr) => [
          pr.name,
          pr.mat || '—',
          { content: statusLabel(pr.status), styles: { halign: 'center' } },
          { content: fmtH(pr.m), styles: { halign: 'right' } },
          { content: fmtH(pr.v), styles: { halign: 'right' } },
          { content: fmtH(pr.n), styles: { halign: 'right' } },
          { content: fmtH(pr.t), styles: { halign: 'right', fontStyle: 'bold' } },
        ]),
      ...brandTableStyles,
      styles: { ...brandTableStyles.styles, fontSize: 8, cellPadding: 1.8 },
      headStyles: { ...brandTableStyles.headStyles, halign: 'center' },
      foot: [[
        { content: 'Subtotal', colSpan: 3, styles: { halign: 'right', fillColor: BRAND.bgSoft, textColor: BRAND.navy, fontStyle: 'bold' } },
        { content: fmtH(g.totals.m), styles: { halign: 'right', fillColor: BRAND.bgSoft, textColor: BRAND.navy, fontStyle: 'bold' } },
        { content: fmtH(g.totals.v), styles: { halign: 'right', fillColor: BRAND.bgSoft, textColor: BRAND.navy, fontStyle: 'bold' } },
        { content: fmtH(g.totals.n), styles: { halign: 'right', fillColor: BRAND.bgSoft, textColor: BRAND.navy, fontStyle: 'bold' } },
        { content: fmtH(g.totals.t), styles: { halign: 'right', fillColor: BRAND.yellow, textColor: BRAND.navy, fontStyle: 'bold' } },
      ]],
    });

    cursorY = (doc as any).lastAutoTable.finalY + 6;
  });

  drawBrandedFooter(doc, TEMPLATE_LABEL['por-escola']);
  doc.save(fileName('por-escola'));
}

// ---------------------------------------------------------------
// 4) PAINEL EXECUTIVO — KPIs grandes, top 10 e ranking
// ---------------------------------------------------------------
function renderSinteticoKpi({ rows, totals, organizationName }: GenOptions, logo: BrandLogo | null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = drawBrandedHeader(doc, {
    eyebrow: 'NEOVALE · PAINEL EXECUTIVO',
    title: 'Indicadores Estratégicos do Corpo Docente',
    tagline: 'Decisões que começam por enxergar com clareza.',
    subtitle: organizationName || 'Documento Oficial',
    logo,
  });

  const pw = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = startY + 4;

  // KPIs grandes em grid 2x2
  const cards = [
    { label: 'Professores ativos', value: String(totals.professores), accent: BRAND.yellow },
    { label: 'Escolas atendidas', value: String(totals.escolas), accent: BRAND.bgSoft },
    { label: 'Carga total semanal', value: fmtH(totals.totalHours), accent: BRAND.yellow },
    { label: 'Professores sem escola', value: String(rows.filter(r => r.schools.length === 0).length), accent: BRAND.bgSoft },
  ];
  const cardW = (pw - margin * 2 - 6) / 2;
  const cardH = 22;
  cards.forEach((c, i) => {
    const cx = margin + (i % 2) * (cardW + 6);
    const cy = y + Math.floor(i / 2) * (cardH + 4);
    doc.setFillColor(...c.accent);
    doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'F');
    doc.setDrawColor(...BRAND.navy);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'S');
    doc.setTextColor(...BRAND.navy);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(c.label.toUpperCase(), cx + 4, cy + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(c.value, cx + 4, cy + 17);
  });
  y += cardH * 2 + 4 + 6;

  // Distribuição por turno (barras horizontais)
  doc.setTextColor(...BRAND.navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Distribuição da carga por turno', margin, y);
  y += 5;

  const turnos = [
    { label: 'Matutino', val: totals.totalsByTurno.matutino },
    { label: 'Vespertino', val: totals.totalsByTurno.vespertino },
    { label: 'Noturno', val: totals.totalsByTurno.noturno },
  ];
  const maxTurno = Math.max(1, ...turnos.map(t => t.val));
  const barAreaW = pw - margin * 2 - 50;
  turnos.forEach((t) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(t.label, margin, y + 4);
    // trilho
    doc.setFillColor(245, 245, 245);
    doc.rect(margin + 26, y, barAreaW, 5, 'F');
    // barra
    const w = (t.val / maxTurno) * barAreaW;
    doc.setFillColor(...BRAND.yellow);
    doc.rect(margin + 26, y, w, 5, 'F');
    doc.setTextColor(...BRAND.navy);
    doc.setFont('helvetica', 'bold');
    doc.text(fmtH(t.val), pw - margin, y + 4, { align: 'right' });
    y += 8;
  });
  y += 4;

  // TOP 10 professores por carga
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.navy);
  doc.text('Top 10 — Maior carga horária', margin, y);
  y += 3;

  const top10 = [...rows].sort((a, b) => b.totalHours - a.totalHours).slice(0, 10);
  autoTable(doc, {
    startY: y,
    head: [['#', 'Professor', 'Status', 'Escolas', 'Matutino', 'Vespertino', 'Noturno', 'Total']],
    body: top10.map((p, i) => [
      String(i + 1),
      { content: p.professor_name, styles: { fontStyle: 'bold' } },
      { content: statusLabel(p.status), styles: { halign: 'center' } },
      String(p.schools.length),
      { content: fmtH(p.totalsByTurno.matutino), styles: { halign: 'right' } },
      { content: fmtH(p.totalsByTurno.vespertino), styles: { halign: 'right' } },
      { content: fmtH(p.totalsByTurno.noturno), styles: { halign: 'right' } },
      { content: fmtH(p.totalHours), styles: { halign: 'right', fontStyle: 'bold', textColor: BRAND.navy, fillColor: BRAND.bgSoft } },
    ]),
    ...brandTableStyles,
    styles: { ...brandTableStyles.styles, fontSize: 8.5, cellPadding: 2 },
    headStyles: { ...brandTableStyles.headStyles, halign: 'center' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 22, halign: 'right' },
    },
  });

  // Top 5 sem escola / sem CH
  const semCH = rows.filter((p) => p.totalHours === 0);
  if (semCH.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.red);
    doc.text(`⚠ Professores sem carga horária registrada (${semCH.length})`, margin, finalY);
    autoTable(doc, {
      startY: finalY + 2,
      head: [['Professor', 'Matrícula', 'Escolas vinculadas']],
      body: semCH.slice(0, 15).map((p) => [
        p.professor_name,
        p.registration_code || '—',
        p.schools.length === 0 ? 'Nenhuma' : p.schools.map((s) => s.school_name).join(', '),
      ]),
      ...brandTableStyles,
      styles: { ...brandTableStyles.styles, fontSize: 8, cellPadding: 1.6 },
      headStyles: { ...brandTableStyles.headStyles, halign: 'left' },
    });
  }

  drawBrandedFooter(doc, TEMPLATE_LABEL['sintetico-kpi']);
  doc.save(fileName('sintetico-kpi'));
}

// ---------------------------------------------------------------
// 5) POR PROFESSOR — agrupado por professor: lista escolas + CH + total
// ---------------------------------------------------------------
function renderPorProfessor({ rows, totals, organizationName }: GenOptions, logo: BrandLogo | null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = drawBrandedHeader(doc, {
    eyebrow: 'NEOVALE · POR PROFESSOR',
    title: 'Carga Horária por Professor',
    tagline: 'Cada docente, um percurso de dedicação que merece ser visto.',
    subtitle: organizationName || 'Documento Oficial',
    logo,
  });

  drawKpiStrip(doc, startY, totals, true);

  const pw = doc.internal.pageSize.getWidth();
  const margin = 14;
  let cursorY = startY + 24;

  const sortedProfs = [...rows].sort((a, b) => a.professor_name.localeCompare(b.professor_name, 'pt-BR'));

  sortedProfs.forEach((p) => {
    if (cursorY > 255) {
      doc.addPage();
      cursorY = 20;
    }

    // Faixa do professor — navy com matrícula e total à direita
    doc.setFillColor(...BRAND.navy);
    doc.rect(margin, cursorY, pw - margin * 2, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(p.professor_name, margin + 3, cursorY + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const meta = `${p.registration_code ? `Mat. ${p.registration_code} • ` : ''}Status: ${statusLabel(p.status)} • ${p.schools.length} escola(s) • Total: ${fmtH(p.totalHours)}`;
    doc.text(meta, pw - margin - 3, cursorY + 5.5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    cursorY += 8;

    if (p.schools.length === 0) {
      autoTable(doc, {
        startY: cursorY,
        body: [[{ content: 'Sem escola vinculada', styles: { fontStyle: 'italic', textColor: BRAND.muted, halign: 'center' } }]],
        ...brandTableStyles,
        styles: { ...brandTableStyles.styles, fontSize: 8.5, cellPadding: 2 },
      });
    } else {
      autoTable(doc, {
        startY: cursorY,
        head: [['Escola', 'Matutino', 'Vespertino', 'Noturno', 'Total CH']],
        body: p.schools
          .slice()
          .sort((a, b) => a.school_name.localeCompare(b.school_name, 'pt-BR'))
          .map((s) => [
            s.school_name + (s.hasSchedule ? '' : '  (sem grade)'),
            { content: fmtH(s.hours.matutino), styles: { halign: 'right' } },
            { content: fmtH(s.hours.vespertino), styles: { halign: 'right' } },
            { content: fmtH(s.hours.noturno), styles: { halign: 'right' } },
            { content: fmtH(s.totalHours), styles: { halign: 'right', fontStyle: 'bold' } },
          ]),
        ...brandTableStyles,
        styles: { ...brandTableStyles.styles, fontSize: 8.5, cellPadding: 1.8 },
        headStyles: { ...brandTableStyles.headStyles, halign: 'center' },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 24, halign: 'right' },
          2: { cellWidth: 24, halign: 'right' },
          3: { cellWidth: 24, halign: 'right' },
          4: { cellWidth: 26, halign: 'right' },
        },
        foot: [[
          { content: 'Total do professor', styles: { halign: 'right', fillColor: BRAND.bgSoft, textColor: BRAND.navy, fontStyle: 'bold' } },
          { content: fmtH(p.totalsByTurno.matutino), styles: { halign: 'right', fillColor: BRAND.bgSoft, textColor: BRAND.navy, fontStyle: 'bold' } },
          { content: fmtH(p.totalsByTurno.vespertino), styles: { halign: 'right', fillColor: BRAND.bgSoft, textColor: BRAND.navy, fontStyle: 'bold' } },
          { content: fmtH(p.totalsByTurno.noturno), styles: { halign: 'right', fillColor: BRAND.bgSoft, textColor: BRAND.navy, fontStyle: 'bold' } },
          { content: fmtH(p.totalHours), styles: { halign: 'right', fillColor: BRAND.yellow, textColor: BRAND.navy, fontStyle: 'bold' } },
        ]],
      });
    }

    cursorY = (doc as any).lastAutoTable.finalY + 6;
  });

  // Totais finais em página
  if (cursorY > 250) {
    doc.addPage();
    cursorY = 20;
  }
  autoTable(doc, {
    startY: cursorY,
    body: [[
      { content: 'TOTAL GERAL', styles: { halign: 'right', fillColor: BRAND.navy, textColor: [255, 255, 255], fontStyle: 'bold' } },
      { content: fmtH(totals.totalsByTurno.matutino), styles: { halign: 'right', fillColor: BRAND.navy, textColor: [255, 255, 255], fontStyle: 'bold' } },
      { content: fmtH(totals.totalsByTurno.vespertino), styles: { halign: 'right', fillColor: BRAND.navy, textColor: [255, 255, 255], fontStyle: 'bold' } },
      { content: fmtH(totals.totalsByTurno.noturno), styles: { halign: 'right', fillColor: BRAND.navy, textColor: [255, 255, 255], fontStyle: 'bold' } },
      { content: fmtH(totals.totalHours), styles: { halign: 'right', fillColor: BRAND.yellow, textColor: BRAND.navy, fontStyle: 'bold' } },
    ]],
    ...brandTableStyles,
    styles: { ...brandTableStyles.styles, fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 24 },
      2: { cellWidth: 24 },
      3: { cellWidth: 24 },
      4: { cellWidth: 26 },
    },
  });

  drawBrandedFooter(doc, TEMPLATE_LABEL['por-professor']);
  doc.save(fileName('por-professor'));
}

// ---------------------------------------------------------------
// Helper: faixa de KPIs no topo do conteúdo
// ---------------------------------------------------------------
function drawKpiStrip(doc: jsPDF, startY: number, totals: ReportTotals, compact = false) {
  const pw = doc.internal.pageSize.getWidth();
  const margin = 14;
  const items = [
    { label: 'Professores', value: String(totals.professores) },
    { label: 'Escolas', value: String(totals.escolas) },
    { label: 'Matutino', value: fmtH(totals.totalsByTurno.matutino) },
    { label: 'Vespertino', value: fmtH(totals.totalsByTurno.vespertino) },
    { label: 'Noturno', value: fmtH(totals.totalsByTurno.noturno) },
    { label: 'Total CH', value: fmtH(totals.totalHours), highlight: true },
  ];
  const gap = 2;
  const w = (pw - margin * 2 - gap * (items.length - 1)) / items.length;
  const h = compact ? 16 : 18;
  items.forEach((it, i) => {
    const x = margin + i * (w + gap);
    if (it.highlight) {
      doc.setFillColor(...BRAND.yellow);
    } else {
      doc.setFillColor(...BRAND.bgSoft);
    }
    doc.roundedRect(x, startY, w, h, 1.5, 1.5, 'F');
    doc.setDrawColor(...BRAND.border);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, startY, w, h, 1.5, 1.5, 'S');
    doc.setTextColor(...BRAND.navy);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(it.label.toUpperCase(), x + 2, startY + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(compact ? 10 : 11);
    doc.text(it.value, x + 2, startY + (compact ? 12 : 14));
  });
}
