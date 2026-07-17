import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawBrandedHeader, drawBrandedFooter, BRAND } from '@/lib/pdfBranding';
import { getBrandLogoForPdf } from '@/lib/brandLogoCache';
import type { CHProfessor } from './cargaHorariaAggregator';

const MONTHS_LABEL = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
];

export interface CargaHorariaPdfInput {
  professor: CHProfessor;
  year: number;
  month: number; // 1-12
}

export async function generateCargaHorariaSemanalPdf(input: CargaHorariaPdfInput): Promise<Blob> {
  const { professor, year, month } = input;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const margin = 12;

  const logo = await getBrandLogoForPdf();
  let y = drawBrandedHeader(doc, {
    title: 'Carga Horária Semanal',
    eyebrow: 'NEOVALE · GRADE HORÁRIA',
    tagline: 'Espelho semanal de aulas (CLASS) por escola.',
    subtitle: 'Documento Oficial',
    logo,
  });

  // ---------- Bloco de identificação ----------
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2, lineColor: BRAND.border, lineWidth: 0.15, textColor: [20, 20, 20] },
    head: [['PROFESSOR', 'PERÍODO', 'ESCOLAS']],
    headStyles: { fillColor: BRAND.yellow, textColor: BRAND.navy, fontStyle: 'bold', halign: 'center' },
    body: [[
      professor.professorName.toUpperCase(),
      `${MONTHS_LABEL[month - 1]} / ${year}`,
      String(professor.schools.length),
    ]],
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 42, halign: 'center' },
      2: { cellWidth: 26, halign: 'center' },
    },
  });
  // @ts-expect-error autotable typings
  y = doc.lastAutoTable.finalY + 3;

  // ---------- Aviso vermelho destacado: PL não computado ----------
  const warnH = 11;
  doc.setDrawColor(...BRAND.red);
  doc.setLineWidth(0.4);
  doc.setFillColor(254, 226, 226); // red-100
  doc.rect(margin, y, pw - margin * 2, warnH, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND.red);
  doc.text(
    '⚠ ATENÇÃO: Este relatório NÃO contabiliza horas de Planejamento (PL). Apenas aulas (CLASS).',
    pw / 2, y + warnH / 2 + 1.2, { align: 'center' }
  );
  doc.setLineWidth(0.2);
  y += warnH + 4;

  // ---------- Conteúdo por escola ----------
  for (let i = 0; i < professor.schools.length; i++) {
    const sch = professor.schools[i];

    // Subtítulo da escola
    if (y > 270) { doc.addPage(); y = 14; }
    doc.setFillColor(...BRAND.navy);
    doc.rect(margin, y, pw - margin * 2, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`ESCOLA: ${sch.schoolName.toUpperCase()}`, margin + 2, y + 4.8);
    y += 7;

    // Tabela disciplina × H/A
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2, lineColor: BRAND.border, lineWidth: 0.15, textColor: [20, 20, 20] },
      head: [['DISCIPLINA · TURMA', 'H/A']],
      headStyles: { fillColor: [240, 240, 240], textColor: BRAND.navy, fontStyle: 'bold' },
      body: sch.rows.length > 0
        ? sch.rows.map((r) => [r.label, `${r.ha}`])
        : [['—', '0']],
      foot: [['Total da escola', `${sch.totalHa} H/A`]],
      footStyles: { fillColor: BRAND.bgSoft, textColor: BRAND.navy, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 24, halign: 'right' },
      },
    });
    // @ts-expect-error autotable typings
    y = doc.lastAutoTable.finalY + 4;
  }

  // ---------- Bloco final: total geral ----------
  if (y > 270) { doc.addPage(); y = 14; }
  const totH = 12;
  doc.setFillColor(...BRAND.yellow);
  doc.rect(margin, y, pw - margin * 2, totH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.navy);
  doc.text('TOTAL GERAL SEMANAL', margin + 3, y + totH / 2 + 1.5);
  doc.text(`${professor.totalGeral} H/A`, pw - margin - 3, y + totH / 2 + 1.5, { align: 'right' });
  y += totH;

  // ---------- Rodapé Neovale ----------
  drawBrandedFooter(doc);

  return doc.output('blob');
}
