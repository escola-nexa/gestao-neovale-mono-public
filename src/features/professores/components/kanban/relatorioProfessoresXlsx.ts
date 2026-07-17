import * as XLSX from 'xlsx';
import type { ReportTemplate } from './relatorioProfessoresPdf';

interface SchoolBreakdown {
  school_id: string;
  school_name: string;
  hours: { matutino: number; vespertino: number; noturno: number };
  totalHours: number;
  hasSchedule: boolean;
}

interface ProfessorReportRow {
  professor_id: string;
  professor_name: string;
  registration_code: string | null;
  status?: string;
  contractual_hours: number | null;
  schools: SchoolBreakdown[];
  totalsByTurno: { matutino: number; vespertino: number; noturno: number };
  totalHours: number;
}

const statusLabel = (s?: string) =>
  s === 'ACTIVE' ? 'Ativo' : s === 'INACTIVE' ? 'Inativo' : s === 'ON_LEAVE' ? 'Afastado' : 'Ativo';

interface Totals {
  professores: number;
  escolas: number;
  totalsByTurno: { matutino: number; vespertino: number; noturno: number };
  totalHours: number;
}

interface Args {
  template: ReportTemplate;
  rows: ProfessorReportRow[];
  totals: Totals;
  organizationName?: string;
}

const num = (n: number) => Number((n || 0).toFixed(2));

function buildCompleto(rows: ProfessorReportRow[], totals: Totals): any[][] {
  const aoa: any[][] = [
    ['Professor', 'Matrícula', 'Status', 'Escola', 'Matutino (h)', 'Vespertino (h)', 'Noturno (h)', 'Total CH (h)'],
  ];
  rows.forEach((p) => {
    if (p.schools.length === 0) {
      aoa.push([p.professor_name, p.registration_code || '', statusLabel(p.status), 'Sem escola vinculada', 0, 0, 0, num(p.totalHours)]);
      return;
    }
    p.schools.forEach((s, i) => {
      aoa.push([
        i === 0 ? p.professor_name : '',
        i === 0 ? p.registration_code || '' : '',
        i === 0 ? statusLabel(p.status) : '',
        s.school_name,
        num(s.hours.matutino),
        num(s.hours.vespertino),
        num(s.hours.noturno),
        num(s.totalHours),
      ]);
    });
    if (p.schools.length > 1) {
      aoa.push([
        '', '', '', `→ Total ${p.professor_name}`,
        num(p.totalsByTurno.matutino),
        num(p.totalsByTurno.vespertino),
        num(p.totalsByTurno.noturno),
        num(p.totalHours),
      ]);
    }
  });
  aoa.push([]);
  aoa.push(['', '', '', 'TOTAL GERAL',
    num(totals.totalsByTurno.matutino),
    num(totals.totalsByTurno.vespertino),
    num(totals.totalsByTurno.noturno),
    num(totals.totalHours),
  ]);
  return aoa;
}

function buildConsolidado(rows: ProfessorReportRow[], totals: Totals): any[][] {
  const aoa: any[][] = [
    ['Professor', 'Matrícula', 'Status', 'Escolas', 'Matutino (h)', 'Vespertino (h)', 'Noturno (h)', 'Total CH (h)'],
  ];
  rows.forEach((p) => {
    aoa.push([
      p.professor_name,
      p.registration_code || '',
      statusLabel(p.status),
      p.schools.map((s) => s.school_name).join(' • ') || 'Sem escola vinculada',
      num(p.totalsByTurno.matutino),
      num(p.totalsByTurno.vespertino),
      num(p.totalsByTurno.noturno),
      num(p.totalHours),
    ]);
  });
  aoa.push([]);
  aoa.push(['', '', '', 'TOTAL GERAL',
    num(totals.totalsByTurno.matutino),
    num(totals.totalsByTurno.vespertino),
    num(totals.totalsByTurno.noturno),
    num(totals.totalHours),
  ]);
  return aoa;
}


function buildPorEscola(rows: ProfessorReportRow[]): any[][] {
  const map = new Map<string, { name: string; items: { prof: string; mat: number; ves: number; not: number; total: number }[] }>();
  rows.forEach((p) => {
    p.schools.forEach((s) => {
      if (!map.has(s.school_id)) map.set(s.school_id, { name: s.school_name, items: [] });
      map.get(s.school_id)!.items.push({
        prof: p.professor_name,
        mat: s.hours.matutino,
        ves: s.hours.vespertino,
        not: s.hours.noturno,
        total: s.totalHours,
      });
    });
  });
  const aoa: any[][] = [['Escola', 'Professor', 'Matutino (h)', 'Vespertino (h)', 'Noturno (h)', 'Total CH (h)']];
  Array.from(map.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((sch) => {
      let mat = 0, ves = 0, not = 0, tot = 0;
      sch.items.forEach((it, i) => {
        aoa.push([i === 0 ? sch.name : '', it.prof, num(it.mat), num(it.ves), num(it.not), num(it.total)]);
        mat += it.mat; ves += it.ves; not += it.not; tot += it.total;
      });
      aoa.push(['', `→ Total ${sch.name}`, num(mat), num(ves), num(not), num(tot)]);
      aoa.push([]);
    });
  return aoa;
}

function buildPorProfessor(rows: ProfessorReportRow[]): any[][] {
  const aoa: any[][] = [['Professor', 'Matrícula', 'Escola', 'Matutino (h)', 'Vespertino (h)', 'Noturno (h)', 'Total CH (h)']];
  rows.forEach((p) => {
    aoa.push([p.professor_name, p.registration_code || '', '', '', '', '', '']);
    if (p.schools.length === 0) {
      aoa.push(['', '', 'Sem escola vinculada', 0, 0, 0, 0]);
    } else {
      p.schools.forEach((s) => {
        aoa.push(['', '', s.school_name, num(s.hours.matutino), num(s.hours.vespertino), num(s.hours.noturno), num(s.totalHours)]);
      });
    }
    aoa.push(['', '', `→ Total ${p.professor_name}`,
      num(p.totalsByTurno.matutino), num(p.totalsByTurno.vespertino), num(p.totalsByTurno.noturno), num(p.totalHours)]);
    aoa.push([]);
  });
  return aoa;
}

function buildSinteticoKpi(rows: ProfessorReportRow[], totals: Totals): { kpi: any[][]; top: any[][] } {
  const kpi: any[][] = [
    ['Indicador', 'Valor'],
    ['Professores', totals.professores],
    ['Escolas', totals.escolas],
    ['CH Matutino (h)', num(totals.totalsByTurno.matutino)],
    ['CH Vespertino (h)', num(totals.totalsByTurno.vespertino)],
    ['CH Noturno (h)', num(totals.totalsByTurno.noturno)],
    ['Total CH (h)', num(totals.totalHours)],
  ];
  const top = [...rows]
    .sort((a, b) => b.totalHours - a.totalHours)
    .slice(0, 10);
  const topAoa: any[][] = [['#', 'Professor', 'Matrícula', 'Escolas', 'Total CH (h)']];
  top.forEach((p, i) => {
    topAoa.push([i + 1, p.professor_name, p.registration_code || '', p.schools.length, num(p.totalHours)]);
  });
  return { kpi, top: topAoa };
}

export function generateProfessoresReportXlsx({ template, rows, totals, organizationName }: Args) {
  const wb = XLSX.utils.book_new();
  const today = new Date().toISOString().slice(0, 10);
  const orgRow: any[][] = [
    [`Relatório de Professores${organizationName ? ' - ' + organizationName : ''}`],
    [`Gerado em ${new Date().toLocaleString('pt-BR')}`],
    [],
  ];

  const addSheet = (name: string, body: any[][]) => {
    const ws = XLSX.utils.aoa_to_sheet([...orgRow, ...body]);
    // Larguras razoáveis
    ws['!cols'] = (body[0] || []).map((_: any, i: number) => ({ wch: i === 0 || i === 1 || i === 2 ? 32 : 14 }));
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  };

  if (template === 'completo') addSheet('Completo', buildCompleto(rows, totals));
  else if (template === 'consolidado') addSheet('Consolidado', buildConsolidado(rows, totals));
  else if (template === 'por-escola') addSheet('Por Escola', buildPorEscola(rows));
  else if (template === 'por-professor') addSheet('Por Professor', buildPorProfessor(rows));
  else if (template === 'sintetico-kpi') {
    const { kpi, top } = buildSinteticoKpi(rows, totals);
    addSheet('KPIs', kpi);
    addSheet('Top 10', top);
  }

  XLSX.writeFile(wb, `relatorio-professores-${template}-${today}.xlsx`);
}
