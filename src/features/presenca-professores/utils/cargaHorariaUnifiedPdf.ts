import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawBrandedHeader, drawBrandedFooter, BRAND } from '@/lib/pdfBranding';
import { getBrandLogoForPdf } from '@/lib/brandLogoCache';
import type { FolhaPontoTarget } from '../hooks/useFolhaPontoTargets';

const MONTHS_LABEL = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
];

type Turno = 'Matutino' | 'Vespertino' | 'Noturno';
const TURNO_ORDER: Turno[] = ['Matutino', 'Vespertino', 'Noturno'];

interface SchoolBlock {
  schoolId: string;
  schoolName: string;
  turnos: Set<Turno>;
  rows: { key: string; label: string; ha: number; hasAnp: boolean }[];
  totalHa: number;
}

interface ProfessorBlock {
  professorId: string;
  professorName: string;
  schools: SchoolBlock[];
  totalHa: number;
}

function groupTargets(targets: FolhaPontoTarget[], currentSemester: 'FIRST' | 'SECOND' | null): ProfessorBlock[] {
  const byProf = new Map<string, ProfessorBlock>();

  for (const t of targets) {
    if (!byProf.has(t.professorId)) {
      byProf.set(t.professorId, { professorId: t.professorId, professorName: t.professorName, schools: [], totalHa: 0 });
    }
    const prof = byProf.get(t.professorId)!;

    let sch = prof.schools.find((s) => s.schoolId === t.schoolId);
    if (!sch) {
      sch = { schoolId: t.schoolId, schoolName: t.schoolName, turnos: new Set(), rows: [], totalHa: 0 };
      prof.schools.push(sch);
    }
    const turno = (t as any).turno as Turno | undefined;
    if (turno) sch.turnos.add(turno);

    // Agrega por (disciplina × turma) — UMA linha por par, H/A = subjects.carga_horaria_semanal.
    // ANP já está incluída na CH semanal da disciplina; NÃO soma carga adicional, apenas marca
    // visualmente a linha. Dedupe é feito por (subject_id|nome + turma) ao nível da escola para
    // evitar duplicação entre targets de turnos diferentes.
    for (const m of t.models) {
      if (m.schedule_type !== 'CLASS') continue;
      const sem = (m as any).subject_semester as 'FIRST' | 'SECOND' | 'ANNUAL' | null;
      if (sem && sem !== 'ANNUAL' && currentSemester && sem !== currentSemester) continue;
      const subject = (m.subject_name || '—').trim();
      const cg = m.class_group_name ? m.class_group_name.trim() : null;
      const key = `${m.subject_id || subject}__${cg || ''}`;
      const isAnp = (m as any).class_mode === 'ANP';

      const existing = sch.rows.find((r) => r.key === key);
      if (existing) {
        if (isAnp) existing.hasAnp = true;
        continue; // já contabilizado uma vez para este par disciplina×turma
      }
      const ha = Number((m as any).subject_ch_semanal) || 0;
      const base = cg ? `${subject} · ${cg}` : subject;
      sch.rows.push({ key, label: base, ha, hasAnp: isAnp });
      sch.totalHa += ha;
      prof.totalHa += ha;
    }
  }

  const result = Array.from(byProf.values());
  result.sort((a, b) => a.professorName.localeCompare(b.professorName, 'pt-BR'));
  for (const p of result) {
    p.schools.sort((a, b) => a.schoolName.localeCompare(b.schoolName, 'pt-BR'));
    for (const s of p.schools) {
      s.rows.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
    }
  }
  return result;
}

function formatTurnos(turnos: Set<Turno>): string {
  return TURNO_ORDER.filter((t) => turnos.has(t)).join(' · ') || '—';
}

export interface CargaHorariaUnifiedPdfInput {
  targets: FolhaPontoTarget[];
  year: number;
  month: number; // 1-12
  currentSemester?: 'FIRST' | 'SECOND' | null;
}

export async function generateCargaHorariaUnifiedPdf(input: CargaHorariaUnifiedPdfInput): Promise<Blob> {
  const { targets, year, month, currentSemester = null } = input;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 12;

  const logo = await getBrandLogoForPdf();
  let y = drawBrandedHeader(doc, {
    title: 'Relatório · Carga Horária Semanal',
    eyebrow: 'NEOVALE · GRADE HORÁRIA',
    tagline: 'Documento unificado por Professor · Escola.',
    subtitle: 'Documento Oficial',
    logo,
  });

  const professors = groupTargets(targets, currentSemester);
  const totalProfessores = professors.length;
  const totalEscolas = new Set(targets.map((t) => t.schoolId)).size;
  const totalHaGeral = professors.reduce((s, x) => s + x.totalHa, 0);

  // Identificação
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2, lineColor: BRAND.border, lineWidth: 0.15, textColor: [20, 20, 20] },
    head: [['PERÍODO', 'PROFESSORES', 'ESCOLAS', 'TOTAL H/A SEMANAL']],
    headStyles: { fillColor: BRAND.yellow, textColor: BRAND.navy, fontStyle: 'bold', halign: 'center' },
    body: [[
      `${MONTHS_LABEL[month - 1]} / ${year}`,
      String(totalProfessores),
      String(totalEscolas),
      `${totalHaGeral} H/A`,
    ]],
    columnStyles: {
      0: { halign: 'center' },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
    },
  });
  // @ts-expect-error autotable typings
  y = doc.lastAutoTable.finalY + 3;

  // Aviso — padrão Neovale
  const warnH = 10;
  const innerW = pw - margin * 2;
  doc.setFillColor(...BRAND.navy);
  doc.rect(margin, y, innerW, warnH, 'F');
  doc.setFillColor(...BRAND.yellow);
  doc.rect(margin, y, 3, warnH, 'F');
  const tag = 'ATENÇÃO';
  const msg = 'NÃO inclui horas de Planejamento (PL). Apenas aulas (CLASS) do semestre vigente + disciplinas Anuais.';
  let fs = 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fs);
  const padL = 3 + 4;
  const gap = 3;
  while (fs > 6) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fs);
    const msgW = doc.getTextWidth(msg);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fs);
    const tW = doc.getTextWidth(tag);
    if (padL + tW + gap + msgW + 4 <= innerW) break;
    fs -= 0.25;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fs);
  doc.setTextColor(...BRAND.yellow);
  doc.text(tag, margin + padL, y + warnH / 2 + fs * 0.18);
  const tagWFinal = doc.getTextWidth(tag);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs);
  doc.setTextColor(255, 255, 255);
  doc.text(msg, margin + padL + tagWFinal + gap, y + warnH / 2 + fs * 0.18);
  y += warnH + 4;

  const ensureSpace = (need: number) => {
    if (y + need > ph - 15) {
      doc.addPage();
      y = 14;
    }
  };

  for (const prof of professors) {
    ensureSpace(22);
    // Banner do PROFESSOR (navy)
    doc.setFillColor(...BRAND.navy);
    doc.rect(margin, y, pw - margin * 2, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(`PROFESSOR: ${prof.professorName.toUpperCase()}`, margin + 3, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const allTurnos = new Set<Turno>();
    prof.schools.forEach((s) => s.turnos.forEach((t) => allTurnos.add(t)));
    doc.text(`${prof.totalHa} H/A · ${prof.schools.length} escola${prof.schools.length === 1 ? '' : 's'} · ${formatTurnos(allTurnos)}`, pw - margin - 3, y + 6, { align: 'right' });
    y += 9 + 2;

    // Único agrupamento por professor: uma tabela com todas as escolas/disciplinas
    const body: any[] = [];
    for (const sch of prof.schools) {
      if (sch.rows.length === 0) continue;
      sch.rows.forEach((r, idx) => {
        body.push([
          idx === 0
            ? { content: sch.schoolName, rowSpan: sch.rows.length, styles: { fontStyle: 'bold', valign: 'middle', fillColor: BRAND.bgSoft, textColor: BRAND.navy } }
            : null,
          r.label,
          `${r.ha} H/A`,
        ].filter((c) => c !== null) as any);
      });
    }

    ensureSpace(20);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 1.8, lineColor: BRAND.border, lineWidth: 0.15, textColor: [20, 20, 20] },
      head: [['ESCOLA', 'DISCIPLINA · TURMA', 'H/A']],
      headStyles: { fillColor: [240, 240, 240], textColor: BRAND.navy, fontStyle: 'bold' },
      body: body.length > 0 ? body : [['—', '—', '0']],
      foot: [[
        { content: `TOTAL DO PROFESSOR · ${prof.professorName.toUpperCase()}`, colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fillColor: BRAND.yellow, textColor: BRAND.navy } } as any,
        { content: `${prof.totalHa} H/A`, styles: { halign: 'right', fontStyle: 'bold', fillColor: BRAND.yellow, textColor: BRAND.navy } } as any,
      ]],
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 26, halign: 'right' },
      },
      rowPageBreak: 'avoid',
    });
    // @ts-expect-error autotable typings
    y = doc.lastAutoTable.finalY + 6;
  }

  // Total geral
  ensureSpace(15);
  const totH = 12;
  doc.setFillColor(...BRAND.yellow);
  doc.rect(margin, y, pw - margin * 2, totH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.navy);
  doc.text('TOTAL GERAL SEMANAL', margin + 3, y + totH / 2 + 1.5);
  doc.text(`${totalHaGeral} H/A`, pw - margin - 3, y + totH / 2 + 1.5, { align: 'right' });

  drawBrandedFooter(doc);
  return doc.output('blob');
}
