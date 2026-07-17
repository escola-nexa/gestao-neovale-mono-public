import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { BoletimData, StudentBoletimData } from '../hooks/useBoletimData';
import { drawBrandedHeader, drawBrandedFooter, BRAND, type BrandLogo } from '@/lib/pdfBranding';
import { getBrandLogoForPdf } from '@/lib/brandLogoCache';

function addStudentPage(
  doc: jsPDF,
  student: StudentBoletimData,
  data: BoletimData,
  isFirst: boolean,
  logo: BrandLogo | null,
) {
  if (!isFirst) doc.addPage('a4', 'landscape');

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;
  let y = drawBrandedHeader(doc, { title: 'Boletim Escolar (Parcial)', subtitle: `Emitido em: ${data.emissionDate}`, logo });


  // ── Student info ──
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  const info: [string, string][] = [
    ['Id', student.codigoMatricula],
    ['Nome', student.nome],
    ['Nº', String(student.numero)],
    ['Curso', data.course.nome],
    ['Turma', data.classGroup.nome],
    ['Qualificação', data.course.qualificacao],
    ['Ano Letivo', data.classGroup.anoLetivo],
  ];
  if (data.formativeTrack) info.push(['Itinerário', data.formativeTrack]);

  const colW = (pageW - 2 * margin) / 3;
  info.forEach((item, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = margin + col * colW;
    const iy = y + row * 6;
    doc.setFont('helvetica', 'bold');
    doc.text(`${item[0]}: `, x, iy);
    const labelW = doc.getTextWidth(`${item[0]}: `);
    doc.setFont('helvetica', 'normal');
    doc.text(item[1], x + labelW, iy);
  });
  y += Math.ceil(info.length / 3) * 6 + 4;

  // ── Grades table ──
  const bimNums = student.subjects[0]?.bimesters.map(b => b.number) || [];

  // Build header rows
  const headerRow1: string[] = ['Unidade Curricular'];
  bimNums.forEach(n => { headerRow1.push(`${n}º Bim`, ''); });
  headerRow1.push('Total Faltas', 'Média Final');

  const headerRow2: string[] = [''];
  bimNums.forEach(() => { headerRow2.push('Méd.', 'Falta'); });
  headerRow2.push('', '');

  // Build body
  const body: string[][] = student.subjects.map(sub => {
    const row: string[] = [sub.subjectName];
    sub.bimesters.forEach(bim => {
      row.push(bim.media !== null ? bim.media.toFixed(1) : '-');
      row.push(String(bim.faltas || 0));
    });
    row.push(String(sub.totalFaltas));
    row.push(sub.mediaFinal !== null ? sub.mediaFinal.toFixed(1) : '-');
    return row;
  });

  const totalCols = 1 + bimNums.length * 2 + 2;
  const subjectColW = 55;
  const dataCellW = (pageW - 2 * margin - subjectColW) / (totalCols - 1);
  const colStyles: Record<number, { cellWidth: number; halign: 'left' | 'center' }> = {
    0: { cellWidth: subjectColW, halign: 'left' },
  };
  for (let i = 1; i < totalCols; i++) {
    colStyles[i] = { cellWidth: dataCellW, halign: 'center' };
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [headerRow1, headerRow2],
    body,
    styles: { fontSize: 7, cellPadding: 1.5, lineColor: [200, 200, 200], lineWidth: 0.2 },
    headStyles: { fillColor: BRAND.yellow, textColor: BRAND.navy, fontStyle: 'bold', halign: 'center' },
    columnStyles: colStyles,
    didParseCell(hookData) {
      // Highlight grades below 6
      if (hookData.section === 'body' && hookData.column.index > 0) {
        const val = parseFloat(hookData.cell.raw as string);
        if (!isNaN(val) && val < 6) {
          hookData.cell.styles.textColor = [220, 38, 38];
          hookData.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // ── Footer (escola/cidade) — branded footer global é adicionado fora ──
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.muted);
  doc.text(`${data.school.nome} — ${data.school.cidade}`, pageW / 2, pageH - 12, { align: 'center' });
  doc.setTextColor(0, 0, 0);
}

/**
 * Generates a multi-page PDF with one student per page and triggers a download.
 */
export async function generateBoletimPdf(
  data: BoletimData,
  selectedStudentId?: string,
): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logo = await getBrandLogoForPdf();

  const students = selectedStudentId
    ? data.students.filter(s => s.id === selectedStudentId)
    : data.students;

  if (students.length === 0) return;

  students.forEach((student, idx) => {
    addStudentPage(doc, student, data, idx === 0, logo);
  });

  drawBrandedFooter(doc, 'Boletim Escolar');

  const fileName = selectedStudentId
    ? `boletim_${students[0]?.nome?.replace(/\s+/g, '_') || 'aluno'}.pdf`
    : `boletim_turma_${data.classGroup.nome?.replace(/\s+/g, '_') || 'turma'}.pdf`;

  doc.save(fileName);
}


/**
 * Generates a PDF for the "Relatório Geral" (class overview table) and triggers download.
 */
export async function generateRelatorioGeralPdf(data: BoletimData): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;
  const logo = await getBrandLogoForPdf();

  // Header (paleta Neovale)
  drawBrandedHeader(doc, { title: 'Relatório Geral da Turma', subtitle: `Emitido em: ${data.emissionDate}`, logo });

  // Info
  doc.setTextColor(...BRAND.navySoft);
  doc.setFontSize(9);
  let y = 32;
  doc.setFont('helvetica', 'bold');
  doc.text(`Escola: `, margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.school.nome, margin + doc.getTextWidth('Escola: '), y);
  doc.setFont('helvetica', 'bold');
  doc.text(`Curso: `, margin + 100, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.course.nome, margin + 100 + doc.getTextWidth('Curso: '), y);
  doc.setFont('helvetica', 'bold');
  doc.text(`Turma: `, margin + 200, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.classGroup.nome, margin + 200 + doc.getTextWidth('Turma: '), y);
  y += 8;

  // Collect all unique subjects
  const subjectMap = new Map<string, string>();
  data.students.forEach(st =>
    st.subjects.forEach(sub => subjectMap.set(sub.subjectId, sub.subjectName)),
  );
  const subjects = Array.from(subjectMap.entries());

  // Header: Nº | Nome | Sub1 Méd | Sub1 Flt | Sub2 Méd | ... | Média Geral
  const head: string[] = ['Nº', 'Nome'];
  subjects.forEach(([, name]) => {
    head.push(name.length > 12 ? name.substring(0, 12) + '…' : name);
    head.push('Flt');
  });
  head.push('Média Geral');

  const body: string[][] = data.students.map(st => {
    const row: string[] = [String(st.numero), st.nome];
    subjects.forEach(([subId]) => {
      const sub = st.subjects.find(s => s.subjectId === subId);
      row.push(sub?.mediaFinal !== null && sub?.mediaFinal !== undefined ? sub.mediaFinal.toFixed(1) : '-');
      row.push(String(sub?.totalFaltas ?? 0));
    });
    // overall average
    const finals = st.subjects.map(s => s.mediaFinal).filter((v): v is number => v !== null);
    const avg = finals.length > 0 ? (finals.reduce((a, b) => a + b, 0) / finals.length) : null;
    row.push(avg !== null ? avg.toFixed(1) : '-');
    return row;
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [head],
    body,
    styles: { fontSize: 6, cellPadding: 1.2, lineColor: [200, 200, 200], lineWidth: 0.2, overflow: 'ellipsize' },
    headStyles: { fillColor: BRAND.yellow, textColor: BRAND.navy, fontStyle: 'bold', halign: 'center', fontSize: 5.5 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 35, halign: 'left' },
    },
    didParseCell(hookData) {
      if (hookData.section === 'body' && hookData.column.index >= 2) {
        const val = parseFloat(hookData.cell.raw as string);
        if (!isNaN(val) && val < 6) {
          hookData.cell.styles.textColor = [...BRAND.red];
          hookData.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // Footer extra (escola/cidade) acima do footer global
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.muted);
  doc.text(`${data.school.nome} — ${data.school.cidade}`, pageW / 2, pageH - 12, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  drawBrandedFooter(doc, 'Relatório Geral');

  doc.save(`relatorio_geral_${data.classGroup.nome?.replace(/\s+/g, '_') || 'turma'}.pdf`);
}
