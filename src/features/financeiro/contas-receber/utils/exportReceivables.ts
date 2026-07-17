import jsPDF from 'jspdf';
import { RECEIVABLE_STATUS_LABEL, type ReceivableStatus } from '../useContasReceber';

const fmtBRL = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');

export function exportReceivablesCsv(rows: any[]) {
  const header = ['Descrição', 'Documento', 'Cliente', 'Vencimento', 'Valor', 'Parcelas', 'Status'];
  const data = rows.map(r => [
    r.description, r.document_number ?? '', r.party?.name ?? '',
    fmtDate(r.due_date), Number(r.total_amount).toFixed(2).replace('.', ','),
    `${r.installments_count}x`,
    RECEIVABLE_STATUS_LABEL[r.status as ReceivableStatus] ?? r.status,
  ]);
  const escape = (v: any) => {
    const s = String(v ?? '');
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...data].map(r => r.map(escape).join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `contas-a-receber-${Date.now()}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportReceivablesPdf(rows: any[]) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFontSize(14).text('Contas a Receber', 14, 14);
  doc.setFontSize(8).setTextColor(120).text(`${rows.length} título(s) — ${new Date().toLocaleString('pt-BR')}`, 14, 20);
  doc.setTextColor(0);

  const head = ['Descrição', 'Cliente', 'Vencimento', 'Valor', 'Parc.', 'Status'];
  const widths = [80, 70, 28, 30, 16, 35];
  let y = 28;
  doc.setFontSize(9).setFont('helvetica', 'bold');
  let x = 14;
  head.forEach((h, i) => { doc.text(h, x, y); x += widths[i]; });
  y += 4;
  doc.line(14, y, 283, y); y += 4;
  doc.setFont('helvetica', 'normal');

  for (const r of rows) {
    if (y > 195) { doc.addPage(); y = 18; }
    x = 14;
    const cells = [
      String(r.description).slice(0, 60),
      (r.party?.name ?? '—').slice(0, 50),
      fmtDate(r.due_date),
      fmtBRL(Number(r.total_amount)),
      `${r.installments_count}x`,
      RECEIVABLE_STATUS_LABEL[r.status as ReceivableStatus] ?? r.status,
    ];
    cells.forEach((c, i) => { doc.text(String(c), x, y); x += widths[i]; });
    y += 6;
  }
  doc.save(`contas-a-receber-${Date.now()}.pdf`);
}
