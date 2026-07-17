import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawBrandedHeader, drawBrandedFooter, brandTableStyles, BRAND } from '@/lib/pdfBranding';
import { getBrandLogoForPdf } from '@/lib/brandLogoCache';

export interface ImportFailureRow {
  rowNumber: number;
  codigo: string;
  nome: string;
  motivo: string;
}

export interface ImportSuccessRow {
  rowNumber: number;
  codigo: string;
  nome: string;
}

export async function generateFailuresPdf(failures: ImportFailureRow[]): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logo = await getBrandLogoForPdf();
  const startY = drawBrandedHeader(doc, {
    title: 'Importação de Alunos — Relatório de Falhas',
    subtitle: 'Documento gerado automaticamente',
    logo,
  });

  doc.setFontSize(10);
  doc.setTextColor(...BRAND.navy);
  doc.text(`Total de falhas: ${failures.length}`, 14, startY);

  autoTable(doc, {
    startY: startY + 4,
    head: [['Linha', 'Matrícula', 'Nome do Aluno', 'Motivo']],
    body: failures.length
      ? failures.map(f => [String(f.rowNumber), f.codigo || '—', f.nome || '—', f.motivo])
      : [['—', '—', 'Nenhuma falha registrada', '—']],
    ...brandTableStyles,
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 28 },
      2: { cellWidth: 70 },
      3: { cellWidth: 'auto' },
    },
    styles: { ...brandTableStyles.styles, fontSize: 9, cellPadding: 2 },
  });

  drawBrandedFooter(doc, 'Importação de Alunos');
  doc.save(`importacao-alunos-falhas-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function generateFullReportPdf(
  successes: ImportSuccessRow[],
  failures: ImportFailureRow[],
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logo = await getBrandLogoForPdf();
  const startY = drawBrandedHeader(doc, {
    title: 'Importação de Alunos — Relatório Completo',
    subtitle: 'Documento gerado automaticamente',
    logo,
  });

  doc.setFontSize(10);
  doc.setTextColor(...BRAND.navy);
  doc.text(`Importados: ${successes.length}    |    Falhas: ${failures.length}    |    Total: ${successes.length + failures.length}`, 14, startY);

  autoTable(doc, {
    startY: startY + 4,
    head: [['Linha', 'Matrícula', 'Nome do Aluno Importado']],
    body: successes.length
      ? successes.map(s => [String(s.rowNumber), s.codigo || '—', s.nome || '—'])
      : [['—', '—', 'Nenhum aluno importado']],
    ...brandTableStyles,
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 30 },
      2: { cellWidth: 'auto' },
    },
    styles: { ...brandTableStyles.styles, fontSize: 9, cellPadding: 2 },
  });

  const lastY = (doc as any).lastAutoTable?.finalY ?? startY + 20;
  autoTable(doc, {
    startY: lastY + 8,
    head: [['Linha', 'Matrícula', 'Nome', 'Motivo da Falha']],
    body: failures.length
      ? failures.map(f => [String(f.rowNumber), f.codigo || '—', f.nome || '—', f.motivo])
      : [['—', '—', 'Nenhuma falha', '—']],
    headStyles: { ...brandTableStyles.headStyles, fillColor: BRAND.red, textColor: [255, 255, 255] },
    styles: { ...brandTableStyles.styles, fontSize: 9, cellPadding: 2 },
    alternateRowStyles: brandTableStyles.alternateRowStyles,
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 28 },
      2: { cellWidth: 60 },
      3: { cellWidth: 'auto' },
    },
  });

  drawBrandedFooter(doc, 'Importação de Alunos');
  doc.save(`importacao-alunos-completo-${new Date().toISOString().slice(0, 10)}.pdf`);
}
