import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { ReportPayload, ReportColumn } from './useFinancialReport';

const fmtCurrency = (v: any) =>
  typeof v === 'number'
    ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : v ?? '';

const fmtDate = (v: any) => {
  if (!v) return '';
  try {
    return new Date(v).toLocaleDateString('pt-BR');
  } catch {
    return String(v);
  }
};

export function formatCell(value: any, col: ReportColumn): string {
  if (value == null) return '';
  if (col.type === 'currency') return fmtCurrency(Number(value));
  if (col.type === 'date') return fmtDate(value);
  if (col.type === 'number') return Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  return String(value);
}

export function exportReportXLSX(payload: ReportPayload, title: string) {
  const headers = payload.columns.map((c) => c.label);
  const data = payload.rows.map((r) => payload.columns.map((c) => {
    const v = r[c.key];
    if (c.type === 'currency' || c.type === 'number') return v == null ? null : Number(v);
    if (c.type === 'date' && v) return fmtDate(v);
    return v ?? '';
  }));
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 30));
  XLSX.writeFile(wb, `${title}.xlsx`);
}

export function exportReportPDF(payload: ReportPayload, title: string) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(title, 14, 14);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString('pt-BR'), 14, 20);
  autoTable(doc, {
    startY: 26,
    head: [payload.columns.map((c) => c.label)],
    body: payload.rows.map((r) => payload.columns.map((c) => formatCell(r[c.key], c))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [27, 30, 44] },
  });
  if (payload.totals) {
    const y = (doc as any).lastAutoTable?.finalY ?? 30;
    doc.setFontSize(10);
    const totalsText = Object.entries(payload.totals)
      .map(([k, v]) => `${k}: ${typeof v === 'number' ? fmtCurrency(v) : v}`)
      .join('   ');
    doc.text(totalsText, 14, y + 8);
  }
  doc.save(`${title}.pdf`);
}
