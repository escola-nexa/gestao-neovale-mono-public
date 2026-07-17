import jsPDF from 'jspdf';

const fmtBRL = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => new Date(d.length > 10 ? d : d + 'T00:00:00').toLocaleDateString('pt-BR');

export type ReceiptData = {
  organization_name?: string;
  payer_name: string;
  payer_document?: string | null;
  description: string;
  document_number?: string | null;
  installment_number?: number;
  total_installments?: number;
  payment_date: string;
  amount: number;
  interest?: number;
  late_fee?: number;
  discount?: number;
  reference?: string | null;
  account_name?: string | null;
  payment_method?: string | null;
  receipt_id: string;
};

export function generateReceiptPdf(r: ReceiptData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  let y = 18;

  doc.setFont('helvetica', 'bold').setFontSize(16);
  doc.text('RECIBO DE PAGAMENTO', W / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(9).setFont('helvetica', 'normal');
  if (r.organization_name) {
    doc.text(r.organization_name, W / 2, y, { align: 'center' });
    y += 5;
  }
  doc.setDrawColor(200);
  doc.line(15, y, W - 15, y);
  y += 8;

  doc.setFontSize(11).setFont('helvetica', 'bold');
  doc.text(`Valor: ${fmtBRL(r.amount)}`, 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data: ${fmtDate(r.payment_date)}`, W - 15, y, { align: 'right' });
  y += 8;

  doc.setFontSize(10);
  const lines: string[] = [];
  lines.push(`Recebemos de ${r.payer_name}${r.payer_document ? ` (${r.payer_document})` : ''}`);
  lines.push(`a importância de ${fmtBRL(r.amount)} referente a:`);
  lines.push(`${r.description}${r.document_number ? ` — Nº ${r.document_number}` : ''}`);
  if (r.installment_number && r.total_installments) {
    lines.push(`Parcela ${r.installment_number} de ${r.total_installments}.`);
  }
  for (const l of lines) {
    doc.text(l, 15, y, { maxWidth: W - 30 });
    y += 6;
  }

  if ((r.late_fee || 0) + (r.interest || 0) + (r.discount || 0) > 0) {
    y += 3;
    doc.setFont('helvetica', 'bold').text('Composição:', 15, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    if (r.late_fee) { doc.text(`Multa: ${fmtBRL(r.late_fee)}`, 20, y); y += 5; }
    if (r.interest) { doc.text(`Juros: ${fmtBRL(r.interest)}`, 20, y); y += 5; }
    if (r.discount) { doc.text(`Desconto: ${fmtBRL(r.discount)}`, 20, y); y += 5; }
  }

  y += 6;
  if (r.account_name || r.payment_method) {
    doc.text(
      `Forma: ${[r.payment_method, r.account_name].filter(Boolean).join(' — ') || '—'}`,
      15, y,
    );
    y += 6;
  }
  if (r.reference) {
    doc.text(`Referência: ${r.reference}`, 15, y);
    y += 6;
  }

  y += 12;
  doc.line(60, y, W - 60, y);
  y += 5;
  doc.setFontSize(9).text('Assinatura do recebedor', W / 2, y, { align: 'center' });

  doc.setFontSize(7).setTextColor(120);
  doc.text(
    `Recibo nº ${r.receipt_id.slice(0, 8).toUpperCase()} — gerado em ${new Date().toLocaleString('pt-BR')}`,
    W / 2, 285, { align: 'center' },
  );

  doc.save(`recibo-${r.receipt_id.slice(0, 8)}.pdf`);
}
