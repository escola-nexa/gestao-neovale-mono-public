import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { professoresApi } from '@/features/professores/api';
import type { ProfessorData } from '../types';

interface Args {
  professors: ProfessorData[];
  contextFilters?: { schoolName?: string; letter?: string; search?: string };
  onProgress?: (msg: string) => void;
}

const PIX_TYPE_LABEL: Record<string, string> = {
  CPF: 'CPF',
  CNPJ: 'CNPJ',
  EMAIL: 'E-mail',
  PHONE: 'Telefone',
  RANDOM: 'Aleatória',
};

const todayStrBR = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

function formatPhone(raw?: string | null): string {
  if (!raw) return '';
  const d = String(raw).replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
}

export async function exportPixReportXlsx({ professors, contextFilters, onProgress }: Args) {
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

  onProgress?.('Renderizando planilha...');

  const ctxParts: string[] = [];
  if (contextFilters?.schoolName) ctxParts.push(`Escola: ${contextFilters.schoolName}`);
  if (contextFilters?.letter && contextFilters.letter !== 'all') ctxParts.push(`Letra: ${contextFilters.letter}`);
  if (contextFilters?.search) ctxParts.push(`Busca: "${contextFilters.search}"`);

  const aoa: any[][] = [
    ['Por Professor — PIX'],
    [`Gerado em ${new Date().toLocaleString('pt-BR')}`],
    [`${list.length} professor(es) ativo(s)`],
  ];
  if (ctxParts.length) aoa.push([ctxParts.join('  •  ')]);
  aoa.push([]);
  aoa.push(['#', 'Professor', 'Contato', 'Tipo PIX', 'Chave PIX', 'CPF']);

  const formatCpf = (raw?: string | null) => {
    if (!raw) return '';
    const d = String(raw).replace(/\D/g, '');
    if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
    return raw;
  };

  list.forEach((p, idx) => {
    const pix = pixByProfessor.get(p.id);
    const tipo = pix?.pix_type ? (PIX_TYPE_LABEL[pix.pix_type] || pix.pix_type) : '';
    const chave = pix?.pix_key || '';
    aoa.push([idx + 1, p.full_name, formatPhone(p.phone), tipo, chave, formatCpf(p.cpf)]);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 6 }, { wch: 40 }, { wch: 18 }, { wch: 14 }, { wch: 42 }, { wch: 16 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'PIX');
  XLSX.writeFile(wb, `Por Professor - PIX - ${todayStrBR()}.xlsx`);
}
