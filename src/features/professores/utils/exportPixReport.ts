import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawBrandedHeader, drawBrandedFooter, BRAND } from '@/lib/pdfBranding';
import { getBrandLogoForPdf } from '@/lib/brandLogoCache';
import { professoresApi } from '@/features/professores/api';
import type { ProfessorData } from '../types';

interface Args {
  professors: ProfessorData[];
  contextFilters?: { schoolName?: string; letter?: string; search?: string };
  onProgress?: (msg: string) => void;
}

const todayStrBR = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

function trigger(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function formatPhone(raw?: string | null): string {
  if (!raw) return '—';
  const d = String(raw).replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
}

const PIX_TYPE_LABEL: Record<string, string> = {
  CPF: 'CPF',
  CNPJ: 'CNPJ',
  EMAIL: 'E-mail',
  PHONE: 'Telefone',
  RANDOM: 'Aleatória',
};

export async function exportPixReport({ professors, contextFilters, onProgress }: Args) {
  // Apenas professores ativos
  const list = professors
    .filter((p) => p.status === 'ACTIVE')
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR'));

  onProgress?.('Buscando dados de PIX...');

  const pixByProfessor = new Map<string, { pix_key: string | null; pix_type: string | null }>();
  const ids = list.map((p) => p.id);
  const CHUNK = 200;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    if (!slice.length) continue;
    const { data, error } = await supabase
      .from('professor_documents')
      .select('professor_id, pix_key, pix_type')
      .in('professor_id', slice);
    if (error) throw error;
    (data || []).forEach((r: any) =>
      pixByProfessor.set(r.professor_id, { pix_key: r.pix_key, pix_type: r.pix_type })
    );
  }

  onProgress?.('Renderizando PDF...');

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await getBrandLogoForPdf();
  drawBrandedHeader(pdf, {
    title: 'Por Professor — PIX',
    subtitle: `${list.length} professor(es) ativo(s)`,
    logo,
  });

  const margin = 14;
  let cursorY = 42;

  // Linha de filtros aplicados
  const ctxParts: string[] = [];
  if (contextFilters?.schoolName) ctxParts.push(`Escola: ${contextFilters.schoolName}`);
  if (contextFilters?.letter && contextFilters.letter !== 'all')
    ctxParts.push(`Letra: ${contextFilters.letter}`);
  if (contextFilters?.search) ctxParts.push(`Busca: "${contextFilters.search}"`);
  if (ctxParts.length) {
    pdf.setFontSize(9);
    pdf.setTextColor(...BRAND.muted);
    pdf.text(ctxParts.join('  •  '), margin, cursorY);
    cursorY += 6;
  }

  const formatCpf = (raw?: string | null) => {
    if (!raw) return '—';
    const d = String(raw).replace(/\D/g, '');
    if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
    return raw;
  };

  const body = list.map((p, idx) => {
    const pix = pixByProfessor.get(p.id);
    const tipo = pix?.pix_type ? (PIX_TYPE_LABEL[pix.pix_type] || pix.pix_type) : '—';
    const chave = pix?.pix_key || '—';
    return [
      String(idx + 1),
      p.full_name,
      formatPhone(p.phone),
      tipo,
      chave,
      formatCpf(p.cpf),
    ];
  });

  autoTable(pdf, {
    startY: cursorY,
    head: [['#', 'Professor', 'Contato', 'Tipo PIX', 'Chave PIX', 'CPF']],
    body,
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2, textColor: BRAND.navy as any },
    headStyles: { fillColor: BRAND.navy as any, textColor: BRAND.yellow as any, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 245] as any },
    columnStyles: {
      0: { cellWidth: 10, halign: 'right' },
      1: { cellWidth: 52 },
      2: { cellWidth: 30 },
      3: { cellWidth: 20 },
      5: { cellWidth: 32 },
    },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      drawBrandedFooter(pdf, 'Por Professor - PIX');
    },
  });

  trigger(pdf.output('blob'), `Por Professor - PIX - ${todayStrBR()}.pdf`);
}
