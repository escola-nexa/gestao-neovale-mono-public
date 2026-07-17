import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawBrandedHeader, drawBrandedFooter, BRAND } from '@/lib/pdfBranding';
import { getBrandLogoForPdf } from '@/lib/brandLogoCache';
import { loadAllData, REQUIRED_DOCS } from './exportProfessorRegistration';
import type { ProfessorData } from '../types';

export type ShareFilter = 'all' | 'no_link' | 'link_never_accessed';

interface ShareInfo {
  token: string;
  createdAt: string;
  expiresAt: string | null;
  isActive: boolean;
  linkId: string;
}

interface SchoolOpt { id: string; nome: string; cidade?: string | null }

interface Args {
  filter: ShareFilter;
  groupBy?: 'professor' | 'school';
  professors: ProfessorData[];
  schools: SchoolOpt[];
  professorSchoolMap: Record<string, string[]>;
  professorShareMap: Record<string, ShareInfo>;
  accessedProfessorIds: Set<string>;
  contextFilters?: { schoolName?: string; letter?: string; search?: string };
  onProgress?: (msg: string) => void;
}

const fmtDate = (v?: string | null) => {
  if (!v) return '-';
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString('pt-BR');
};
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

const FILTER_LABEL: Record<ShareFilter, string> = {
  all: 'Todos os professores',
  no_link: 'Sem link gerado',
  link_never_accessed: 'Com link, nunca acessaram',
};

const FILTER_FILE_LABEL: Record<ShareFilter, string> = {
  all: 'Todos os Professores',
  no_link: 'Sem Link Gerado',
  link_never_accessed: 'Com Link Nunca Acessado',
};

const todayStrBR = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

const buildFileName = (filter: ShareFilter, groupBy: 'professor' | 'school') =>
  `Lista de Professores - ${FILTER_FILE_LABEL[filter]} - Agrupado por ${groupBy === 'school' ? 'Escola' : 'Professor'} - ${todayStrBR()}.pdf`;

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

async function inBatches<T, R>(items: T[], size: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    const res = await Promise.all(batch.map((it, j) => fn(it, i + j)));
    out.push(...res);
  }
  return out;
}

export async function exportShareReport({
  filter,
  groupBy = 'professor',
  professors,
  schools,
  professorSchoolMap,
  professorShareMap,
  accessedProfessorIds,
  contextFilters,
  onProgress,
}: Args) {
  // Relatórios incluem APENAS professores com status ACTIVE
  const list = professors.filter(p => {
    if (p.status !== 'ACTIVE') return false;
    if (filter === 'all') return true;
    const share = professorShareMap[p.id];
    if (filter === 'no_link') return !share;
    if (filter === 'link_never_accessed') return !!share && !accessedProfessorIds.has(p.id);
    return true;
  });

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await getBrandLogoForPdf();
  const groupLabel = groupBy === 'school' ? 'por Escola' : 'por Professor';
  const title = `Compartilhamento ${groupLabel} — ${FILTER_LABEL[filter]}`;
  drawBrandedHeader(pdf, { title, subtitle: `${list.length} professor(es)`, logo });

  let cursorY = 32;
  const schoolName = (id: string) => schools.find(s => s.id === id)?.nome || id;
  const schoolCity = (id: string) => (schools.find(s => s.id === id)?.cidade || '').trim();
  const cityForProfessor = (p: ProfessorData) => {
    const sids = professorSchoolMap[p.id] || [];
    const cities = sids.map(schoolCity).filter(Boolean);
    return cities[0] || 'Sem cidade';
  };
  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  // Filter context line
  const ctxParts: string[] = [];
  if (contextFilters?.schoolName) ctxParts.push(`Escola: ${contextFilters.schoolName}`);
  if (contextFilters?.letter && contextFilters.letter !== 'all') ctxParts.push(`Letra: ${contextFilters.letter}`);
  if (contextFilters?.search) ctxParts.push(`Busca: "${contextFilters.search}"`);
  if (ctxParts.length) {
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text(`Filtros: ${ctxParts.join(' | ')}`, 14, cursorY);
    cursorY += 5;
    pdf.setTextColor(0);
  }

  if (list.length === 0) {
    pdf.setFontSize(11);
    pdf.text('Nenhum professor encontrado para este filtro.', 14, cursorY + 6);
    drawBrandedFooter(pdf, title);
    trigger(pdf.output('blob'), `compartilhamento_${filter}_${todayStr()}.pdf`);
    return;
  }

  const formatPhone = (raw?: string | null) => {
    if (!raw) return '-';
    const d = String(raw).replace(/\D/g, '');
    if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    return raw;
  };

  const baseHead = filter === 'link_never_accessed'
    ? [['Professor', 'E-mail', 'Contato', 'Escolas', 'Status', 'Cadastrado em', 'Link criado em', 'Validade', 'Acessado']]
    : filter === 'no_link'
      ? [['Professor', 'E-mail', 'Contato', 'CPF', 'Escolas', 'Status', 'Cadastrado em']]
      : null;

  // Build school groups when grouping by school (sorted by city, then school)
  type SchoolGroup = { schoolId: string; schoolName: string; cidade: string; profs: ProfessorData[] };
  const schoolGroups: SchoolGroup[] = [];
  if (groupBy === 'school') {
    const map = new Map<string, ProfessorData[]>();
    list.forEach(p => {
      const sids = professorSchoolMap[p.id] || [];
      if (sids.length === 0) {
        if (!map.has('__none__')) map.set('__none__', []);
        map.get('__none__')!.push(p);
      } else {
        sids.forEach(sid => {
          if (!map.has(sid)) map.set(sid, []);
          map.get(sid)!.push(p);
        });
      }
    });
    Array.from(map.entries()).forEach(([sid, profs]) => {
      schoolGroups.push({
        schoolId: sid,
        schoolName: sid === '__none__' ? 'Sem escola vinculada' : schoolName(sid),
        cidade: sid === '__none__' ? 'Sem cidade' : (schoolCity(sid) || 'Sem cidade'),
        profs: profs.sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR')),
      });
    });
    schoolGroups.sort((a, b) => {
      const c = norm(a.cidade).localeCompare(norm(b.cidade), 'pt-BR');
      return c !== 0 ? c : a.schoolName.localeCompare(b.schoolName, 'pt-BR');
    });
  }

  // Build city groups for "by professor" mode (or to wrap school groups)
  type CityProfGroup = { cidade: string; profs: ProfessorData[] };
  const cityProfGroups: CityProfGroup[] = [];
  if (groupBy === 'professor') {
    const map = new Map<string, ProfessorData[]>();
    list.forEach(p => {
      const c = cityForProfessor(p) || 'Sem cidade';
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(p);
    });
    Array.from(map.entries()).forEach(([cidade, profs]) => {
      cityProfGroups.push({
        cidade,
        profs: profs.sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR')),
      });
    });
    cityProfGroups.sort((a, b) => norm(a.cidade).localeCompare(norm(b.cidade), 'pt-BR'));
  }

  const drawCityHeader = (cidade: string, count: number) => {
    if (cursorY > 260) { pdf.addPage(); cursorY = 14; }
    cursorY += 2;
    pdf.setFillColor(...BRAND.navy);
    pdf.rect(14, cursorY, 182, 13, 'F');
    pdf.setFillColor(255, 218, 69);
    pdf.rect(14, cursorY, 3, 13, 'F');
    pdf.setTextColor(255, 218, 69);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CIDADE', 21, cursorY + 5);
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(15);
    pdf.text(cidade.toUpperCase(), 21, cursorY + 11);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(255, 218, 69);
    const totalLabel = `${count} professor(es)`;
    const tw = pdf.getTextWidth(totalLabel);
    pdf.text(totalLabel, 194 - tw, cursorY + 8);
    pdf.setTextColor(0);
    cursorY += 16;
  };

  const drawSchoolHeader = (g: SchoolGroup) => {
    if (cursorY > 270) { pdf.addPage(); cursorY = 14; }
    pdf.setFillColor(255, 218, 69);
    pdf.rect(14, cursorY, 182, 10, 'F');
    pdf.setFillColor(...BRAND.navy);
    pdf.rect(14, cursorY, 2, 10, 'F');
    pdf.setTextColor(...BRAND.navy);
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ESCOLA', 20, cursorY + 4);
    pdf.setFontSize(12);
    pdf.text(g.schoolName, 20, cursorY + 8.5);
    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'normal');
    const totalLabel = `${g.profs.length} professor(es)`;
    const tw = pdf.getTextWidth(totalLabel);
    pdf.text(totalLabel, 194 - tw, cursorY + 6.8);
    pdf.setTextColor(0);
    cursorY += 13;
  };

  const buildRows = (profs: ProfessorData[]) => profs.map(p => {
    const escolas = (professorSchoolMap[p.id] || []).map(schoolName).join(', ') || '-';
    const status = p.status === 'ACTIVE' ? 'Ativo' : p.status === 'INACTIVE' ? 'Inativo' : 'Afastado';
    const cadastro = fmtDate((p as any).created_at);
    const contato = formatPhone(p.phone);
    if (filter === 'link_never_accessed') {
      const s = professorShareMap[p.id];
      return [p.full_name, (p as any).email || '-', contato, escolas, status, cadastro, fmtDate(s?.createdAt), fmtDate(s?.expiresAt), 'Não'];
    }
    return [p.full_name, (p as any).email || '-', contato, p.cpf || '-', escolas, status, cadastro];
  });

  const renderTable = (head: string[][], rows: any[][]) => {
    autoTable(pdf, {
      startY: cursorY,
      head,
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: BRAND.yellow, textColor: BRAND.navy, fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 1.6, lineColor: BRAND.border, lineWidth: 0.2 },
      alternateRowStyles: { fillColor: [255, 252, 235] },
      margin: { left: 14, right: 14 },
    });
    cursorY = (pdf as any).lastAutoTable.finalY + 5;
  };

  if (baseHead) {
    onProgress?.('Montando tabela...');
    if (groupBy === 'school') {
      // Group schools by city
      const byCity = new Map<string, SchoolGroup[]>();
      schoolGroups.forEach(g => {
        if (!byCity.has(g.cidade)) byCity.set(g.cidade, []);
        byCity.get(g.cidade)!.push(g);
      });
      Array.from(byCity.entries())
        .sort((a, b) => norm(a[0]).localeCompare(norm(b[0]), 'pt-BR'))
        .forEach(([cidade, groups]) => {
          const total = groups.reduce((s, g) => s + g.profs.length, 0);
          drawCityHeader(cidade, total);
          groups.forEach(g => {
            drawSchoolHeader(g);
            renderTable(baseHead, buildRows(g.profs));
          });
        });
    } else {
      cityProfGroups.forEach(cg => {
        drawCityHeader(cg.cidade, cg.profs.length);
        renderTable(baseHead, buildRows(cg.profs));
      });
    }
    drawBrandedFooter(pdf, title);
    trigger(pdf.output('blob'), `compartilhamento_${filter}_${groupBy}_${todayStr()}.pdf`);
    return;
  }

  // Modo "Todos" — bloco detalhado por professor (com checklist de documentos)
  onProgress?.(`Carregando dados de ${list.length} professor(es)...`);
  const allData = await inBatches(list, 5, async (p, idx) => {
    if (idx % 10 === 0) onProgress?.(`Carregando ${idx + 1}/${list.length}...`);
    try {
      return await loadAllData(p.id);
    } catch {
      return null;
    }
  });

  onProgress?.('Renderizando PDF...');
  const ensureSpace = (h: number) => {
    if (cursorY + h > 285) { pdf.addPage(); cursorY = 14; }
  };

  const dataById = new Map(list.map((p, i) => [p.id, allData[i]]));

  const renderProfessor = (p: ProfessorData, idx: number) => {
    const data = dataById.get(p.id);
    if (!data) return;
    ensureSpace(50);

    pdf.setFillColor(...BRAND.navy);
    pdf.rect(14, cursorY, 182, 7, 'F');
    pdf.setTextColor(255, 218, 69);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${idx}. ${data.professor.full_name}`, 16, cursorY + 5);
    pdf.setTextColor(0);
    cursorY += 9;

    const share = professorShareMap[p.id];
    const expired = share?.expiresAt ? new Date(share.expiresAt) < new Date() : false;
    const shareStatus = !share ? 'Sem link gerado'
      : !share.isActive ? 'Link inativo'
      : expired ? 'Link expirado'
      : accessedProfessorIds.has(p.id) ? 'Acessado' : 'Ativo, nunca acessado';

    const escolas = (professorSchoolMap[p.id] || []).map(schoolName).join(', ') || '-';
    const doc: any = data.doc || {};
    const isMale = doc.gender === 'Homem';
    const required = REQUIRED_DOCS(isMale);
    const uploadedCats = new Set(data.files.map((f: any) => f.category));
    const delivered = required.filter(d => uploadedCats.has(d.value)).length;
    const pending = required.filter(d => !uploadedCats.has(d.value)).map(d => d.label);

    autoTable(pdf, {
      startY: cursorY,
      head: [['Campo', 'Valor']],
      body: [
        ['CPF', p.cpf || doc.cpf || '-'],
        ['E-mail', (p as any).email || doc.email || '-'],
        ['Telefone', formatPhone(p.phone || doc.phone)],
        ['Status', p.status === 'ACTIVE' ? 'Ativo' : p.status === 'INACTIVE' ? 'Inativo' : 'Afastado'],
        ['Especialização', p.specialization || '-'],
        ['Cadastrado no sistema em', fmtDate((p as any).created_at)],
        ['Nascimento', fmtDate(doc.birth_date)],
        ['Endereço', [doc.address, doc.neighborhood, doc.address_city, doc.address_state].filter(Boolean).join(', ') || '-'],
        ['Banco / Conta', [doc.bank_name, doc.bank_branch, doc.bank_account].filter(Boolean).join(' / ') || '-'],
        ['PIX', doc.pix_key ? `${doc.pix_type || ''} ${doc.pix_key}`.trim() : '-'],
        ['Escolas vinculadas', escolas],
        ['Compartilhamento', shareStatus + (share ? ` (criado ${fmtDate(share.createdAt)})` : '')],
        ['Documentos entregues', `${delivered}/${required.length}` + (pending.length ? ` — Pendentes: ${pending.join('; ')}` : '')],
      ],
      theme: 'grid',
      headStyles: { fillColor: BRAND.yellow, textColor: BRAND.navy, fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 1.4, lineColor: BRAND.border, lineWidth: 0.15 },
      columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold' }, 1: { cellWidth: 142 } },
      margin: { left: 14, right: 14 },
    });
    cursorY = (pdf as any).lastAutoTable.finalY + 5;
  };

  if (groupBy === 'school') {
    const byCity = new Map<string, SchoolGroup[]>();
    schoolGroups.forEach(g => {
      if (!byCity.has(g.cidade)) byCity.set(g.cidade, []);
      byCity.get(g.cidade)!.push(g);
    });
    Array.from(byCity.entries())
      .sort((a, b) => norm(a[0]).localeCompare(norm(b[0]), 'pt-BR'))
      .forEach(([cidade, groups]) => {
        const total = groups.reduce((s, g) => s + g.profs.length, 0);
        drawCityHeader(cidade, total);
        let counter = 1;
        groups.forEach(g => {
          drawSchoolHeader(g);
          g.profs.forEach(p => renderProfessor(p, counter++));
        });
      });
  } else {
    cityProfGroups.forEach(cg => {
      drawCityHeader(cg.cidade, cg.profs.length);
      cg.profs.forEach((p, i) => renderProfessor(p, i + 1));
    });
  }

  drawBrandedFooter(pdf, title);
  trigger(pdf.output('blob'), `compartilhamento_${filter}_${groupBy}_${todayStr()}.pdf`);
}
