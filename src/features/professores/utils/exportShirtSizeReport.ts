import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawBrandedHeader, drawBrandedFooter, BRAND } from '@/lib/pdfBranding';
import { getBrandLogoForPdf } from '@/lib/brandLogoCache';
import { professoresApi } from '@/features/professores/api';
import type { ProfessorData } from '../types';

interface SchoolOpt { id: string; nome: string; cidade?: string | null }

interface Args {
  professors: ProfessorData[];
  schools: SchoolOpt[];
  professorSchoolMap: Record<string, string[]>;
  contextFilters?: { schoolName?: string; letter?: string; search?: string };
  onProgress?: (msg: string) => void;
}

const CANONICAL_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'] as const;
const NOT_INFORMED = 'Não informado';

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

function normalizeSize(raw?: string | null): string {
  if (!raw) return NOT_INFORMED;
  const v = String(raw).trim().toUpperCase();
  if ((CANONICAL_SIZES as readonly string[]).includes(v)) return v;
  return NOT_INFORMED;
}

export async function exportShirtSizeReport({
  professors,
  schools,
  professorSchoolMap,
  contextFilters,
  onProgress,
}: Args) {
  // Apenas professores ativos
  const list = professors.filter(p => p.status === 'ACTIVE');

  onProgress?.('Buscando tamanhos de camisa...');

  // Buscar shirt_size em lote (por chunks de 200 para evitar URL gigante)
  const sizeByProfessor = new Map<string, string | null>();
  const ids = list.map(p => p.id);
  const CHUNK = 200;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    if (!slice.length) continue;
    const { data, error } = await supabase
      .from('professor_documents')
      .select('professor_id, shirt_size')
      .in('professor_id', slice);
    if (error) throw error;
    (data || []).forEach((r: any) => sizeByProfessor.set(r.professor_id, r.shirt_size));
  }

  // Totais globais (1 contagem por professor, independente de quantas escolas)
  const counts: Record<string, number> = {};
  [...CANONICAL_SIZES, NOT_INFORMED].forEach(s => { counts[s] = 0; });
  list.forEach(p => {
    const size = normalizeSize(sizeByProfessor.get(p.id));
    counts[size] = (counts[size] || 0) + 1;
  });

  // Agrupar por escola (professor sem escola cai em "Sem escola")
  const NO_SCHOOL = 'Sem escola';
  const grouped = new Map<string, { name: string; size: string }[]>();
  list.forEach(p => {
    const size = normalizeSize(sizeByProfessor.get(p.id));
    const sids = professorSchoolMap[p.id] || [];
    const names = sids
      .map(id => schools.find(s => s.id === id)?.nome)
      .filter(Boolean) as string[];
    const buckets = names.length ? names : [NO_SCHOOL];
    buckets.forEach(schoolName => {
      if (!grouped.has(schoolName)) grouped.set(schoolName, []);
      grouped.get(schoolName)!.push({ name: p.full_name, size });
    });
  });
  const orderedSchools = Array.from(grouped.keys()).sort((a, b) => {
    if (a === NO_SCHOOL) return 1;
    if (b === NO_SCHOOL) return -1;
    return a.localeCompare(b, 'pt-BR');
  });
  orderedSchools.forEach(s => {
    grouped.get(s)!.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  });

  onProgress?.('Renderizando PDF...');

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await getBrandLogoForPdf();
  drawBrandedHeader(pdf, {
    title: 'Tamanho de Camisa — Professores Ativos',
    subtitle: `${list.length} professor(es)`,
    logo,
  });

  const pw = pdf.internal.pageSize.getWidth();
  const margin = 14;
  let cursorY = 42;

  // Linha de filtros aplicados
  const ctxParts: string[] = [];
  if (contextFilters?.schoolName) ctxParts.push(`Escola: ${contextFilters.schoolName}`);
  if (contextFilters?.letter && contextFilters.letter !== 'all') ctxParts.push(`Letra: ${contextFilters.letter}`);
  if (contextFilters?.search) ctxParts.push(`Busca: "${contextFilters.search}"`);
  if (ctxParts.length) {
    pdf.setFontSize(9);
    pdf.setTextColor(...BRAND.muted);
    pdf.text(ctxParts.join('  •  '), margin, cursorY);
    cursorY += 6;
  }

  // KPIs por tamanho
  const kpiSizes = [...CANONICAL_SIZES, NOT_INFORMED];
  const totalCards = kpiSizes.length + 1; // + total geral
  const gap = 3;
  const cardW = (pw - margin * 2 - gap * (totalCards - 1)) / totalCards;
  const cardH = 18;

  pdf.setFontSize(8);
  for (let i = 0; i < totalCards; i++) {
    const isTotal = i === totalCards - 1;
    const label = isTotal ? 'TOTAL' : kpiSizes[i];
    const val = isTotal ? list.length : (counts[kpiSizes[i]] || 0);
    const x = margin + i * (cardW + gap);

    // fundo
    pdf.setFillColor(...(isTotal ? BRAND.navy : BRAND.bgSoft));
    pdf.setDrawColor(...BRAND.border);
    pdf.roundedRect(x, cursorY, cardW, cardH, 1.5, 1.5, 'FD');

    // label
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...(isTotal ? BRAND.yellow : BRAND.navy));
    pdf.text(String(label), x + cardW / 2, cursorY + 6, { align: 'center' });

    // valor
    pdf.setFontSize(13);
    pdf.setTextColor(...(isTotal ? [255, 255, 255] as [number, number, number] : BRAND.navy));
    pdf.text(String(val), x + cardW / 2, cursorY + 14, { align: 'center' });
  }
  cursorY += cardH + 6;

  // Monta body com linha de seção por escola
  const body: any[] = [];
  let counter = 0;
  orderedSchools.forEach(schoolName => {
    const profs = grouped.get(schoolName)!;
    body.push([
      {
        content: `${schoolName}  (${profs.length})`,
        colSpan: 4,
        styles: {
          fillColor: BRAND.navy as any,
          textColor: BRAND.yellow as any,
          fontStyle: 'bold',
          halign: 'left',
        },
      },
    ]);
    profs.forEach(r => {
      counter += 1;
      body.push([String(counter), r.name, schoolName, r.size]);
    });
  });

  autoTable(pdf, {
    startY: cursorY,
    head: [['#', 'Professor', 'Escola', 'Tamanho']],
    body,
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2, textColor: BRAND.navy as any },
    headStyles: { fillColor: BRAND.navy as any, textColor: BRAND.yellow as any, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 245] as any },
    columnStyles: {
      0: { cellWidth: 12, halign: 'right' },
      3: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      drawBrandedFooter(pdf);
    },
  });

  trigger(pdf.output('blob'), `Tamanho de Camisa - Professores Ativos - ${todayStrBR()}.pdf`);
}
