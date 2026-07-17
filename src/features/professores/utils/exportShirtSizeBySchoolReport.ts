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
const NO_SCHOOL = 'Sem escola';

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

export async function exportShirtSizeBySchoolReport({
  professors,
  schools,
  professorSchoolMap,
  contextFilters,
  onProgress,
}: Args) {
  const list = professors.filter(p => p.status === 'ACTIVE');

  onProgress?.('Buscando tamanhos de camisa...');

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

  // Agrupar por escola — sem repetir o mesmo professor entre escolas.
  // Cada professor aparece em apenas UMA escola (a primeira em ordem alfabética),
  // mas guardamos a lista completa de escolas dele para imprimir abaixo do nome.
  const grouped = new Map<string, { name: string; size: string; schools: string[] }[]>();
  const assigned = new Set<string>();
  list.forEach(p => {
    if (assigned.has(p.id)) return;
    const size = normalizeSize(sizeByProfessor.get(p.id));
    const sids = professorSchoolMap[p.id] || [];
    const names = (sids
      .map(id => schools.find(s => s.id === id)?.nome)
      .filter(Boolean) as string[])
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const bucket = names.length ? names[0] : NO_SCHOOL;
    if (!grouped.has(bucket)) grouped.set(bucket, []);
    grouped.get(bucket)!.push({
      name: p.full_name,
      size,
      schools: names.length ? names : [NO_SCHOOL],
    });
    assigned.add(p.id);
  });
  const orderedSchools = Array.from(grouped.keys()).sort((a, b) => {
    if (a === NO_SCHOOL) return 1;
    if (b === NO_SCHOOL) return -1;
    return a.localeCompare(b, 'pt-BR');
  });
  orderedSchools.forEach(s => {
    grouped.get(s)!.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  });


  // Contagem por escola × tamanho (sumário no topo de cada escola)
  function summarize(rows: { size: string }[]): string {
    const c: Record<string, number> = {};
    rows.forEach(r => { c[r.size] = (c[r.size] || 0) + 1; });
    const parts: string[] = [];
    [...CANONICAL_SIZES, NOT_INFORMED].forEach(s => {
      if (c[s]) parts.push(`${s}: ${c[s]}`);
    });
    return parts.join('  •  ');
  }

  onProgress?.('Renderizando PDF...');

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await getBrandLogoForPdf();
  drawBrandedHeader(pdf, {
    title: 'Tamanho de Camisa por Escola',
    subtitle: `${orderedSchools.length} escola(s) • ${list.length} professor(es) ativos`,
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

  // Monta corpo: cabeçalho por escola + uma linha por professor com
  // "Professor — Tamanho" em coluna única (informações juntas).
  const body: any[] = [];
  orderedSchools.forEach(schoolName => {
    const profs = grouped.get(schoolName)!;
    // (resumo de tamanhos removido a pedido)
    // Linhas dos professores: "#" + "Nome do Professor — Tamanho"
    // e, abaixo, a(s) escola(s) à qual o professor está vinculado.
    profs.forEach((r, idx) => {
      body.push([
        String(idx + 1),
        `${r.name} — ${r.size}`,
      ]);
      body.push([
        {
          content: r.schools.join(' • '),
          colSpan: 2,
          styles: {
            fillColor: [255, 255, 255] as any,
            textColor: BRAND.muted as any,
            fontStyle: 'italic',
            halign: 'left',
            fontSize: 8,
            cellPadding: { top: 0, bottom: 2, left: 16, right: 2 } as any,
          },
        },
      ]);
    });

  });

  autoTable(pdf, {
    startY: cursorY,
    head: [['#', 'Professor — Tamanho']],
    body,
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 2.5, textColor: BRAND.navy as any },
    headStyles: { fillColor: BRAND.navy as any, textColor: BRAND.yellow as any, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 245] as any },
    columnStyles: {
      0: { cellWidth: 12, halign: 'right' },
    },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      drawBrandedFooter(pdf);
    },
  });

  trigger(pdf.output('blob'), `Tamanho de Camisa por Escola - ${todayStrBR()}.pdf`);
}
