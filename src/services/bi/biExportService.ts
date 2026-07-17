import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { BIFilters } from '@/components/bi/GlobalFilterBar';
import { drawBrandedHeader, drawBrandedFooter, BRAND, type BrandLogo } from '@/lib/pdfBranding';
import { getBrandLogoForPdf } from '@/lib/brandLogoCache';

interface ExportHeader {
  title: string;
  organizationName?: string;
  filters: BIFilters;
  generatedAt: Date;
}

function formatFilters(filters: BIFilters): string[] {
  const lines: string[] = [];
  if (filters.schoolId) lines.push(`Escola: ${filters.schoolId}`);
  if (filters.courseId) lines.push(`Curso: ${filters.courseId}`);
  if (filters.bimester) lines.push(`Bimestre: ${filters.bimester}º`);
  if (lines.length === 0) lines.push('Todos os dados (sem filtros)');
  return lines;
}

function addPDFHeader(doc: jsPDF, header: ExportHeader, logo: BrandLogo | null, _yStart = 15): number {
  let y = drawBrandedHeader(doc, { title: header.title, emittedAt: header.generatedAt, logo });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  const filterLines = formatFilters(header.filters);
  doc.text(`Filtros: ${filterLines.join(' | ')}`, 14, y);
  y += 4;
  doc.setDrawColor(...BRAND.border);
  doc.line(14, y, 196, y);
  doc.setTextColor(0);
  return y + 5;
}

function addPDFTable(doc: jsPDF, headers: string[], rows: string[][], startY: number): number {
  let y = startY;
  const tableLeft = 14;
  const tableWidth = 182;
  const pageH = doc.internal.pageSize.getHeight();
  const lineH = 4; // line height in mm
  const cellPad = 1.5;

  // Calculate column widths proportionally — first col (name) gets more space
  const colWidths = headers.map((_, i) => {
    if (i === 0) return Math.min(tableWidth * 0.28, 50);
    if (i === 1) return Math.min(tableWidth * 0.22, 40);
    return 0;
  });
  const fixedTotal = colWidths[0] + colWidths[1];
  const remaining = tableWidth - fixedTotal;
  const otherCols = headers.length - 2;
  for (let i = 2; i < headers.length; i++) {
    colWidths[i] = remaining / otherCols;
  }

  function getColX(colIndex: number): number {
    let x = tableLeft;
    for (let i = 0; i < colIndex; i++) x += colWidths[i];
    return x;
  }

  // Header row (paleta Neovale)
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(...BRAND.yellow);
  doc.rect(tableLeft, y - 4, tableWidth, 7, 'F');
  doc.setTextColor(...BRAND.navy);
  headers.forEach((h, i) => {
    doc.text(h, getColX(i) + cellPad, y);
  });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  // Data rows with text wrapping
  rows.forEach(row => {
    // Pre-calculate wrapped text for each cell
    const wrappedCells = row.map((cell, i) => {
      const txt = (cell ?? '').toString();
      const maxW = colWidths[i] - cellPad * 2;
      return doc.splitTextToSize(txt, maxW) as string[];
    });

    const maxLines = Math.max(...wrappedCells.map(c => c.length));
    const rowH = maxLines * lineH;

    // Page break if needed
    if (y + rowH > pageH - 15) {
      doc.addPage();
      y = 15;
    }

    // Draw alternating row background
    wrappedCells.forEach((lines, i) => {
      const x = getColX(i) + cellPad;
      lines.forEach((line, li) => {
        doc.text(line, x, y + li * lineH);
      });
    });

    y += rowH + 1;
  });

  return y;
}

export async function exportToPDF(
  title: string,
  headers: string[],
  rows: string[][],
  filters: BIFilters,
  summary?: Record<string, string | number>
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const header: ExportHeader = { title, filters, generatedAt: new Date() };
  const logo = await getBrandLogoForPdf();
  let y = addPDFHeader(doc, header, logo);

  if (summary) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Executivo', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    Object.entries(summary).forEach(([k, v]) => {
      doc.text(`${k}: ${v}`, 14, y);
      y += 5;
    });
    y += 3;
  }

  addPDFTable(doc, headers, rows, y);
  drawBrandedFooter(doc, 'Relatório Gerencial');
  doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

export async function previewPDF(
  title: string,
  headers: string[],
  rows: string[][],
  filters: BIFilters,
  summary?: Record<string, string | number>
): Promise<ArrayBuffer> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const header: ExportHeader = { title, filters, generatedAt: new Date() };
  const logo = await getBrandLogoForPdf();
  let y = addPDFHeader(doc, header, logo);

  if (summary) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Executivo', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    Object.entries(summary).forEach(([k, v]) => {
      doc.text(`${k}: ${v}`, 14, y);
      y += 5;
    });
    y += 3;
  }

  addPDFTable(doc, headers, rows, y);
  drawBrandedFooter(doc, 'Relatório Gerencial');

  return doc.output('arraybuffer') as ArrayBuffer;
}

export function exportToXLSX(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  filters: BIFilters,
  summary?: Record<string, string | number>
) {
  const wb = XLSX.utils.book_new();

  // Data sheet
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  // Auto-width
  ws['!cols'] = headers.map((h, i) => ({
    wch: Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length)) + 2,
  }));
  XLSX.utils.book_append_sheet(wb, ws, 'Dados');

  // Filters sheet
  const filterData = [
    ['Relatório', title],
    ['Gerado em', new Date().toLocaleString('pt-BR')],
    ...formatFilters(filters).map(f => ['Filtro', f]),
  ];
  if (summary) {
    filterData.push(['', '']);
    filterData.push(['--- Resumo Executivo ---', '']);
    Object.entries(summary).forEach(([k, v]) => {
      filterData.push([k, String(v)]);
    });
  }
  const wsFilters = XLSX.utils.aoa_to_sheet(filterData);
  XLSX.utils.book_append_sheet(wb, wsFilters, 'Filtros');

  XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
}
