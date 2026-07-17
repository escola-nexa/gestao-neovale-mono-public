/**
 * Gera o "Relatório de Substituição" em PDF, layout Neovale.
 *
 * Privacidade: não expõe dados sensíveis do professor ausente (CPF, RG,
 * matrícula, telefone). Apenas o NOME do ausente é exibido — o foco do
 * documento é o substituto que assumirá a aula.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BRAND,
  BRAND_FULL_NAME,
  drawBrandedHeader,
  drawBrandedFooter,
  resolveBrandLogo,
  type BrandLogo,
} from '@/lib/pdfBranding';
import type { TSRRequest } from '../hooks/useTeacherSubstitution';

const BRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0);

const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso + 'T00:00').toLocaleDateString('pt-BR') : '—';

const formatDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('pt-BR') : '—';

const STATUS_LABEL: Record<string, string> = {
  request_created: 'Aguardando R.H.',
  rh_in_progress: 'R.H. em atendimento',
  returned_to_coordinator: 'Devolvida à coordenação',
  substitution_completed: 'Concluída',
  cancelled: 'Cancelada',
};

interface Options {
  request: TSRRequest;
  includeFinancials: boolean;
  branding: { logo_url: string | null; icon_url: string | null; display_name: string };
}

/** Tabela "rótulo → valor" garantindo 2 colunas (o head é spannado). */
function kvTable(
  doc: jsPDF,
  startY: number,
  margin: number,
  title: string,
  rows: Array<[string, string]>,
): number {
  autoTable(doc, {
    startY,
    head: [[{ content: title, colSpan: 2, styles: { halign: 'left' } } as any]],
    body: rows.map(([k, v]) => [
      { content: k, styles: { fontStyle: 'bold' } as any },
      v || '—',
    ]),
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.5, textColor: [40, 40, 40], lineColor: [225, 225, 225] },
    headStyles: { fillColor: BRAND.yellow, textColor: BRAND.navy, fontStyle: 'bold', fontSize: 10 },
    columnStyles: { 0: { cellWidth: 55, fillColor: [250, 250, 250] } },
    margin: { left: margin, right: margin },
  });
  return (doc as any).lastAutoTable.finalY;
}

export async function generateSubstitutionReportPdf(opts: Options): Promise<void> {
  const { request: r, includeFinancials } = opts;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pw = doc.internal.pageSize.getWidth();
  const margin = 14;

  const logo: BrandLogo | null = await resolveBrandLogo(
    opts.branding.logo_url,
    opts.branding.icon_url,
  );

  let y = drawBrandedHeader(doc, {
    title: 'Relatório de Substituição',
    eyebrow: `${(opts.branding.display_name || 'NEOVALE').toUpperCase()} · SUBSTITUIÇÃO DOCENTE`,
    subtitle: r.substitution_code,
    tagline: 'Garantindo a continuidade da aula com agilidade.',
    logo,
  });

  // ===== Banner: código + status + data ausência =====
  const bannerH = 16;
  doc.setFillColor(...BRAND.bgSoft);
  doc.roundedRect(margin, y, pw - margin * 2, bannerH, 2, 2, 'F');
  doc.setTextColor(...BRAND.navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Solicitação ${r.substitution_code}`, margin + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Data da ausência: ${formatDate(r.absence_date)}`, margin + 4, y + 12);

  const statusLabel = STATUS_LABEL[r.status] || (r.status || '').replace(/_/g, ' ');
  doc.setFont('helvetica', 'bold');
  doc.text(`Status: ${statusLabel}`, pw - margin - 4, y + 6, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Emitido em ${new Date().toLocaleString('pt-BR')}`, pw - margin - 4, y + 12, { align: 'right' });
  y += bannerH + 6;

  // ===== Escola =====
  y = kvTable(doc, y, margin, 'Escola', [
    ['Unidade', r.school_name_snapshot || '—'],
    ['Diretor(a)', r.director_name || '—'],
    ['Diretor(a) Adjunto(a)', r.adjunct_director_name || '—'],
    ['Coordenador(a)', r.coordinator_name || '—'],
  ]) + 5;

  // ===== Aula substituída =====
  y = kvTable(doc, y, margin, 'Aula substituída', [
    ['Curso', r.course_name_snapshot || '—'],
    ['Turma', r.class_group_name_snapshot || '—'],
    ['Disciplina', r.subject_name_snapshot || '—'],
    ['Data', formatDate(r.absence_date)],
    ['Motivo', r.absence_reason || '—'],
  ]) + 5;

  // ===== Professor ausente (apenas NOME — sem CPF/RG/matrícula por privacidade) =====
  y = kvTable(doc, y, margin, 'Professor ausente', [
    ['Nome', r.substituted_professor_name || '—'],
  ]) + 5;

  // ===== Professor substituto (dados completos — é quem assume a aula) =====
  const subRows: Array<[string, string]> = [
    ['Nome', r.substitute_professor_name || '—'],
    ['CPF', r.substitute_professor_cpf || '—'],
    ['Telefone', r.substitute_professor_phone || '—'],
    ['Chave PIX', (r as any).substitute_pix || '—'],
  ];
  if (r.substitute_professor_rg) subRows.splice(2, 0, ['RG', r.substitute_professor_rg]);
  if ((r as any).substitute_email) subRows.push(['E-mail', (r as any).substitute_email]);
  y = kvTable(doc, y, margin, 'Professor substituto', subRows) + 5;

  // ===== Carga horária / Financeiro =====
  const chRows: any[] = [
    [
      { content: 'Total de horas-aula', styles: { fontStyle: 'bold' } },
      `${Number(r.total_class_hours || 0).toFixed(2)} h`,
    ],
  ];
  if (includeFinancials) {
    chRows.push(
      [
        { content: 'Valor da hora-aula', styles: { fontStyle: 'bold' } },
        BRL(Number(r.hour_class_value || 0)),
      ],
      [
        {
          content: 'VALOR TOTAL',
          styles: { fontStyle: 'bold', fillColor: BRAND.yellow, textColor: BRAND.navy },
        },
        {
          content: BRL(Number(r.total_amount || 0)),
          styles: { fontStyle: 'bold', fillColor: BRAND.yellow, textColor: BRAND.navy },
        },
      ],
    );
  }
  autoTable(doc, {
    startY: y,
    head: [[{ content: includeFinancials ? 'Resumo financeiro' : 'Carga horária', colSpan: 2, styles: { halign: 'left' } } as any]],
    body: chRows,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3, textColor: [40, 40, 40], lineColor: [225, 225, 225] },
    headStyles: { fillColor: BRAND.yellow, textColor: BRAND.navy, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 70, fillColor: [250, 250, 250] } },
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ===== Linha do tempo =====
  const tlRows: Array<[string, string]> = [
    ['Solicitada em', formatDateTime(r.created_at)],
    ['Atendida pelo R.H. em', formatDateTime(r.attended_at)],
    ['Devolvida à coordenação em', formatDateTime(r.returned_at)],
    ['Escola informada em', formatDateTime(r.school_notified_at)],
  ];
  y = kvTable(doc, y, margin, 'Linha do tempo', tlRows) + 6;

  // ===== Observações =====
  if (r.notes || r.return_notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.navy);
    doc.text('Observações', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    const parts: string[] = [];
    if (r.notes) parts.push(`Coordenação: ${r.notes}`);
    if (r.return_notes) parts.push(`R.H.: ${r.return_notes}`);
    const lines = doc.splitTextToSize(parts.join('\n\n'), pw - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 4;
  }

  // ===== Assinaturas =====
  const ph = doc.internal.pageSize.getHeight();
  const sigY = Math.min(Math.max(y + 18, ph - 50), ph - 30);
  const colW = (pw - margin * 2 - 8) / 2;
  doc.setDrawColor(...BRAND.border);
  doc.setLineWidth(0.2);
  doc.line(margin, sigY, margin + colW, sigY);
  doc.line(margin + colW + 8, sigY, pw - margin, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text('Coordenação', margin + colW / 2, sigY + 4, { align: 'center' });
  doc.text(r.coordinator_name || '—', margin + colW / 2, sigY + 8, { align: 'center' });
  doc.text('R.H.', margin + colW + 8 + colW / 2, sigY + 4, { align: 'center' });

  // ===== Nota de privacidade =====
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.muted);
  doc.text(
    'Documento gerado automaticamente. Dados pessoais do professor ausente são preservados conforme a LGPD.',
    pw / 2,
    ph - 18,
    { align: 'center' },
  );

  drawBrandedFooter(doc, BRAND_FULL_NAME);

  const fname = `relatorio-substituicao-${r.substitution_code}.pdf`;
  doc.save(fname);
}
