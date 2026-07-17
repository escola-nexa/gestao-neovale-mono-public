import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ValidatedRow } from './talentImportParser';
import { TEMPLATE_HEADERS } from './talentImportTemplate';

export function exportErrorsXlsx(rows: ValidatedRow[]) {
  const headers = [...TEMPLATE_HEADERS, 'Linha original', 'Motivo do erro'];
  const data = rows.map(r => [
    r.original.fullName,
    r.original.email,
    r.original.phone,
    r.original.whatsapp,
    r.original.uf,
    r.original.city,
    r.original.periods,
    r.original.weekdays,
    r.original.formationArea,
    r.original.hasLicentiate,
    r.original.notes,
    r.rowNumber,
    r.errors.join(' | '),
  ]);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  ws['!cols'] = [
    { wch: 32 }, { wch: 28 }, { wch: 14 }, { wch: 10 },
    { wch: 6 },  { wch: 22 }, { wch: 22 }, { wch: 26 },
    { wch: 22 }, { wch: 18 }, { wch: 40 }, { wch: 14 }, { wch: 60 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Erros');
  const ts = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `banco_talentos_erros_${ts}.xlsx`);
}

export function exportErrorsPdf(rows: ValidatedRow[], userName?: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(27, 30, 44); // #1B1E2C
  doc.rect(0, 0, w, 22, 'F');
  doc.setTextColor(255, 218, 69); // primary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Neovale · Banco de Talentos Docente', 12, 10);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Relatório de candidatos NÃO importados', 12, 17);

  const dateStr = new Date().toLocaleString('pt-BR');
  doc.setFontSize(8);
  doc.text(`Gerado em ${dateStr}${userName ? ` · ${userName}` : ''}`, w - 12, 17, { align: 'right' });

  autoTable(doc, {
    startY: 28,
    head: [['Linha', 'Nome', 'Telefone', 'UF', 'Cidade', 'Motivo do erro']],
    body: rows.map(r => [
      String(r.rowNumber),
      r.original.fullName || '—',
      r.original.phone || '—',
      r.original.uf || '—',
      r.original.city || '—',
      r.errors.join(' | '),
    ]),
    headStyles: { fillColor: [27, 30, 44], textColor: [255, 218, 69], fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, valign: 'top' },
    alternateRowStyles: { fillColor: [248, 248, 250] },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 55 },
      2: { cellWidth: 30 },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 38 },
      5: { cellWidth: 'auto' },
    },
    margin: { left: 8, right: 8 },
    didDrawPage: () => {
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(120);
      doc.text(
        `Total de erros: ${rows.length}`,
        8,
        pageH - 5,
      );
    },
  });

  const ts = new Date().toISOString().slice(0, 10);
  doc.save(`banco_talentos_erros_${ts}.pdf`);
}
