import { professoresApi } from '@/features/professores/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { drawBrandedHeader, drawBrandedFooter, BRAND } from '@/lib/pdfBranding';
import { getBrandLogoForPdf } from '@/lib/brandLogoCache';

export type ExportFormat = 'pdf' | 'excel';

export const REQUIRED_DOCS = (isMale: boolean) => [
  { value: 'aso', label: 'Exame admissional (ASO)' },
  { value: 'foto_3x4', label: 'Fotos 3x4' },
  { value: 'carteira_trabalho', label: 'Cópia da CTPS' },
  { value: 'rg', label: 'Cópia do RG ou RNE' },
  { value: 'cpf', label: 'Cópia do CPF' },
  { value: 'titulo_eleitor', label: 'Cópia do Título de Eleitor' },
  { value: 'comprovante_residencia', label: 'Comprovante de residência' },
  { value: 'diploma', label: 'Cópia do diploma/escolaridade' },
  ...(isMale ? [{ value: 'reservista', label: 'Certificado militar/reservista' }] : []),
  { value: 'declaracao_etnia', label: 'Declaração de etnia (Lei 12.288/2010)' },
  { value: 'atestado_sanidade', label: 'Atestado de sanidade física e mental' },
  { value: 'certidao_justica_eleitoral', label: 'Certidão da Justiça Eleitoral' },
  { value: 'certidao_estadual_criminal', label: 'Certidão Estadual Criminal' },
  { value: 'certidao_acoes_criminais', label: 'Certidão de Ações Criminais' },
  { value: 'certidao_judicial_criminal_negativa', label: 'Certidão Judicial Criminal Negativa' },
  { value: 'certidao_antecedentes_criminais', label: 'Certidão de Antecedentes Criminais' },
  { value: 'certidao_acoes_civeis', label: 'Certidão de Ações Cíveis' },
  { value: 'certidao_judicial_civel', label: 'Certidão Judicial Cível' },
];

const fmt = (v: any) => (v === null || v === undefined || v === '' ? '-' : String(v));
const fmtDate = (v?: string | null) => {
  if (!v) return '-';
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString('pt-BR');
};
const fmtBool = (v: any) => (v === true ? 'Sim' : v === false ? 'Não' : '-');

const slug = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase().slice(0, 60);

// Preserva o nome do professor de forma legível no nome do arquivo (acentos removidos, espaços mantidos)
const safeName = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9 ]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

export async function loadAllData(professorId: string) {
  const [profRes, docRes, childrenRes, filesRes, reportsRes, bindingsRes] = await Promise.all([
    professoresApi.client.from('professors').select('*').eq('id', professorId).maybeSingle(),
    professoresApi.client.from('professor_documents').select('*').eq('professor_id', professorId).maybeSingle(),
    professoresApi.client.from('professor_children').select('*').eq('professor_id', professorId).order('created_at'),
    professoresApi.client.from('professor_document_files').select('*').eq('professor_id', professorId).order('uploaded_at', { ascending: false }),
    professoresApi.client.from('professor_medical_reports').select('*').eq('professor_id', professorId).order('created_at', { ascending: false }),
    professoresApi.client.from('professor_school_courses').select('school_id, course_id, is_coordinator, status').eq('professor_id', professorId),
  ]);

  if (profRes.error) throw profRes.error;
  const professor = profRes.data;
  if (!professor) throw new Error('Professor não encontrado');

  let email = '';
  if (professor.user_id) {
    const { data: profile } = await professoresApi.client.from('profiles').select('email').eq('user_id', professor.user_id).maybeSingle();
    email = profile?.email || '';
  }

  const bindings = bindingsRes.data || [];
  const schoolIds = [...new Set(bindings.map((b: any) => b.school_id))];
  const courseIds = [...new Set(bindings.map((b: any) => b.course_id))];
  const [schoolsRes, coursesRes] = await Promise.all([
    schoolIds.length ? professoresApi.client.from('schools').select('id, nome').in('id', schoolIds as string[]) : Promise.resolve({ data: [] as any[] }),
    courseIds.length ? professoresApi.client.from('courses').select('id, nome').in('id', courseIds as string[]) : Promise.resolve({ data: [] as any[] }),
  ]);
  const schoolMap = Object.fromEntries((schoolsRes.data || []).map((s: any) => [s.id, s.nome]));
  const courseMap = Object.fromEntries((coursesRes.data || []).map((c: any) => [c.id, c.nome]));

  return {
    professor,
    email,
    doc: docRes.data || {},
    children: childrenRes.data || [],
    files: filesRes.data || [],
    reports: reportsRes.data || [],
    bindings: bindings.map((b: any) => ({
      school: schoolMap[b.school_id] || '-',
      course: courseMap[b.course_id] || '-',
      is_coordinator: b.is_coordinator,
      status: b.status,
    })),
  };
}

export function buildSections(data: Awaited<ReturnType<typeof loadAllData>>) {
  const { professor, email, doc, children, files, reports, bindings } = data;
  const isMale = doc?.gender === 'Homem';
  const required = REQUIRED_DOCS(isMale);
  const uploadedCats = new Set(files.map((f: any) => f.category));

  const statusLabel = (s: string) => ({ ACTIVE: 'Ativo', INACTIVE: 'Inativo', ON_LEAVE: 'Afastado' } as any)[s] || s;

  return {
    identificacao: [
      ['Nome completo', fmt(professor.full_name)],
      ['Nome social', fmt(doc.full_name && doc.full_name !== professor.full_name ? doc.full_name : null)],
      ['CPF', fmt(professor.cpf || doc.cpf)],
      ['Matrícula', fmt(professor.registration_code)],
      ['Status', statusLabel(professor.status)],
      ['E-mail', fmt(email || doc.email)],
      ['Telefone', fmt(professor.phone || doc.phone)],
      ['Especialização', fmt(professor.specialization)],
    ],
    admissional: [
      ['Data de admissão', fmtDate(doc.admission_date)],
      ['Função', fmt(doc.function_title)],
      ['Status admissional', fmt(doc.admission_status)],
      ['Data de demissão', fmtDate(doc.termination_date)],
    ],
    pessoais: [
      ['Nacionalidade', fmt(doc.nationality)],
      ['Naturalidade (cidade)', fmt(doc.birth_city)],
      ['Naturalidade (UF)', fmt(doc.birth_state)],
      ['Data de nascimento', fmtDate(doc.birth_date)],
      ['Estado civil', fmt(doc.marital_status)],
      ['Escolaridade', fmt(doc.education_level)],
      ['Sexo', fmt(doc.gender)],
      ['Altura (m)', fmt(doc.height)],
      ['Peso (kg)', fmt(doc.weight)],
      ['Cor/Raça', fmt(doc.race)],
      ['Cor do cabelo', fmt(doc.hair_color)],
      ['Cor dos olhos', fmt(doc.eye_color)],
      ['Tipo sanguíneo', fmt(doc.blood_type)],
    ],
    documentos: [
      ['RG', fmt(doc.rg_number)],
      ['Órgão emissor', fmt(doc.rg_issuer)],
      ['UF do RG', fmt(doc.rg_state)],
      ['Emissão do RG', fmtDate(doc.rg_issue_date)],
      ['CTPS', fmt(doc.work_card_number)],
      ['Série CTPS', fmt(doc.work_card_series)],
      ['UF CTPS', fmt(doc.work_card_state)],
      ['CNH', fmt(doc.cnh_number)],
      ['Categoria CNH', fmt(doc.cnh_category)],
      ['UF CNH', fmt(doc.cnh_state)],
      ['Emissão CNH', fmtDate(doc.cnh_issue_date)],
      ['Validade CNH', fmtDate(doc.cnh_expiry)],
      ['1ª habilitação', fmtDate(doc.first_license_date)],
      ['Título de Eleitor', fmt(doc.voter_id)],
      ['Zona', fmt(doc.voter_zone)],
      ['Seção', fmt(doc.voter_section)],
      ['Reservista', fmt(doc.military_cert)],
      ['PIS/NIT', fmt(doc.pis_nit)],
    ],
    endereco: [
      ['E-mail', fmt(doc.email || email)],
      ['Telefone', fmt(doc.phone || professor.phone)],
      ['Endereço', fmt(doc.address)],
      ['Complemento', fmt(doc.address_complement)],
      ['Bairro', fmt(doc.neighborhood)],
      ['CEP', fmt(doc.zip_code)],
      ['Cidade', fmt(doc.address_city)],
      ['UF', fmt(doc.address_state)],
    ],
    bancarios: [
      ['Banco', fmt(doc.bank_name)],
      ['Agência', fmt(doc.bank_branch)],
      ['Conta', fmt(doc.bank_account)],
      ['Conta Sicredi', fmtBool(doc.has_sicredi_account)],
      ['Tipo de PIX', fmt(doc.pix_type)],
      ['Chave PIX', fmt(doc.pix_key)],
    ],
    familia: [
      ['Nome do pai', fmt(doc.father_name)],
      ['Nome da mãe', fmt(doc.mother_name)],
      ['Cônjuge', fmt(doc.spouse_name)],
      ['Nacionalidade do cônjuge', fmt(doc.spouse_nationality)],
      ['Naturalidade do cônjuge', fmt([doc.spouse_birth_city, doc.spouse_birth_state].filter(Boolean).join(' / ') || null)],
      ['Nascimento do cônjuge', fmtDate(doc.spouse_birth_date)],
    ],
    children: children.map((c: any) => [c.name, fmtDate(c.birth_date), fmt(c.cpf), fmt([c.city, c.state].filter(Boolean).join(' / ') || null)]),
    bindings: bindings.map((b: any) => [b.school, b.course, b.is_coordinator ? 'Sim' : 'Não', b.status === 'ACTIVE' ? 'Ativo' : 'Inativo']),
    reports: reports.map((r: any) => [r.cid_code, fmt(r.description), fmtDate(r.created_at), r.file_name || '-']),
    checklist: required.map(d => [d.label, uploadedCats.has(d.value) ? 'Entregue' : 'Pendente']),
    summary: { required: required.length, delivered: required.filter(d => uploadedCats.has(d.value)).length },
  };
}

async function generatePdfBlob(data: Awaited<ReturnType<typeof loadAllData>>): Promise<Blob> {
  const sections = buildSections(data);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await getBrandLogoForPdf();

  // Header padrão Neovale
  drawBrandedHeader(pdf, { title: 'Cadastro do Professor', subtitle: data.professor.full_name, logo });

  let cursorY = 32;

  const drawSection = (_title: string, rows: any[][], head?: string[]) => {
    autoTable(pdf, {
      startY: cursorY,
      head: head ? [head] : undefined,
      body: rows.length ? rows : [['—', ...(head ? Array(head.length - 1).fill('') : [''])]],
      theme: 'grid',
      headStyles: { fillColor: BRAND.yellow, textColor: BRAND.navy, fontSize: 9, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 1.8, lineColor: BRAND.border, lineWidth: 0.2 },
      alternateRowStyles: { fillColor: [255, 252, 235] },
      margin: { left: 14, right: 14 },
    });
    cursorY = (pdf as any).lastAutoTable.finalY + 4;
  };

  const sectionTitle = (title: string) => {
    if (cursorY > 270) { pdf.addPage(); cursorY = 14; }
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...BRAND.navy);
    pdf.text(title, 14, cursorY);
    pdf.setTextColor(0, 0, 0);
    cursorY += 4;
  };

  sectionTitle('1. Identificação'); drawSection('', sections.identificacao);
  sectionTitle('2. Dados Admissionais'); drawSection('', sections.admissional);
  sectionTitle('3. Dados Pessoais'); drawSection('', sections.pessoais);
  sectionTitle('4. Documentos'); drawSection('', sections.documentos);
  sectionTitle('5. Endereço e Contato'); drawSection('', sections.endereco);
  sectionTitle('6. Dados Bancários'); drawSection('', sections.bancarios);
  sectionTitle('7. Família'); drawSection('', sections.familia);
  sectionTitle('   Filhos'); drawSection('', sections.children, ['Nome', 'Nascimento', 'CPF', 'Naturalidade']);
  sectionTitle('8. Vínculos Institucionais'); drawSection('', sections.bindings, ['Escola', 'Curso', 'Coordenador', 'Status']);
  sectionTitle('9. Laudos Médicos'); drawSection('', sections.reports, ['CID-10', 'Descrição', 'Data', 'Arquivo']);
  sectionTitle(`10. Checklist de Anexos (${sections.summary.delivered}/${sections.summary.required})`);
  drawSection('', sections.checklist, ['Documento', 'Status']);

  drawBrandedFooter(pdf, 'Cadastro do Professor');

  return pdf.output('blob');
}

function generateExcelBlob(data: Awaited<ReturnType<typeof loadAllData>>): Blob {
  const sections = buildSections(data);
  const wb = XLSX.utils.book_new();

  const cadastro = [
    ['Cadastro do Professor', data.professor.full_name],
    [],
    ['== Identificação =='], ...sections.identificacao,
    [],
    ['== Dados Admissionais =='], ...sections.admissional,
    [],
    ['== Dados Pessoais =='], ...sections.pessoais,
    [],
    ['== Documentos =='], ...sections.documentos,
    [],
    ['== Endereço e Contato =='], ...sections.endereco,
    [],
    ['== Dados Bancários =='], ...sections.bancarios,
    [],
    ['== Família =='], ...sections.familia,
  ];
  const wsCad = XLSX.utils.aoa_to_sheet(cadastro);
  wsCad['!cols'] = [{ wch: 30 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsCad, 'Cadastro');

  const wsFilhos = XLSX.utils.aoa_to_sheet([['Nome', 'Nascimento', 'CPF', 'Naturalidade'], ...sections.children]);
  XLSX.utils.book_append_sheet(wb, wsFilhos, 'Filhos');

  const wsVinc = XLSX.utils.aoa_to_sheet([['Escola', 'Curso', 'Coordenador', 'Status'], ...sections.bindings]);
  XLSX.utils.book_append_sheet(wb, wsVinc, 'Vínculos');

  const wsLaudos = XLSX.utils.aoa_to_sheet([['CID-10', 'Descrição', 'Data', 'Arquivo'], ...sections.reports]);
  XLSX.utils.book_append_sheet(wb, wsLaudos, 'Laudos');

  const wsCheck = XLSX.utils.aoa_to_sheet([
    ['Documento', 'Status'],
    ...sections.checklist,
    [],
    ['Total entregue', sections.summary.delivered],
    ['Total exigido', sections.summary.required],
  ]);
  XLSX.utils.book_append_sheet(wb, wsCheck, 'Checklist Anexos');

  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

interface AttachmentResult { name: string; ok: boolean; reason?: string }

function uniqueName(used: Set<string>, name: string): string {
  if (!used.has(name)) { used.add(name); return name; }
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let i = 2;
  while (used.has(`${base}_${i}${ext}`)) i++;
  const final = `${base}_${i}${ext}`;
  used.add(final);
  return final;
}

// Formatos já comprimidos — não vale a pena re-comprimir no ZIP (CPU alto, ganho ~0)
const STORE_EXT = new Set(['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'zip', 'rar', '7z', 'docx', 'xlsx', 'pptx', 'mp4', 'mp3', 'mov']);
const isStored = (name: string) => {
  const dot = name.lastIndexOf('.');
  if (dot < 0) return false;
  return STORE_EXT.has(name.slice(dot + 1).toLowerCase());
};

const FETCH_TIMEOUT_MS = 20000;
const CONCURRENCY = 6;

async function fetchWithTimeout(url: string): Promise<Blob> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    if (!blob || blob.size === 0) throw new Error('Arquivo vazio');
    return blob;
  } finally {
    clearTimeout(t);
  }
}

interface Job { path: string; label: string; fileName: string; folderPath: string; usedKey: string }

async function downloadAttachments(
  data: Awaited<ReturnType<typeof loadAllData>>,
  zip: JSZip,
  onProgress?: (msg: string) => void,
): Promise<AttachmentResult[]> {
  const folder = zip.folder('anexos')!;
  const results: AttachmentResult[] = [];
  const usedPerKey = new Map<string, Set<string>>();

  // 1) Montar lista de jobs
  const jobs: Job[] = [];
  for (const f of data.files) {
    if (!f.file_path) continue;
    const cat = f.category || 'outros';
    jobs.push({
      path: f.file_path,
      label: `${f.category}/${f.file_name}`,
      fileName: f.file_name || 'arquivo.bin',
      folderPath: cat,
      usedKey: cat,
    });
  }
  for (const r of data.reports) {
    if (!r.file_path) continue;
    const fname = r.file_name || `laudo_${r.cid_code}.bin`;
    jobs.push({
      path: r.file_path,
      label: `laudos/${fname}`,
      fileName: fname,
      folderPath: 'laudos',
      usedKey: '__laudos__',
    });
  }

  const total = jobs.length;
  if (total === 0) return results;

  // 2) Pedir todas as Signed URLs em UMA chamada (drasticamente reduz RTT)
  onProgress?.(`Preparando ${total} anexo(s)...`);
  const { data: signedList, error: signErr } = await professoresApi.client.storage
    .from('professor-documents')
    .createSignedUrls(jobs.map(j => j.path), 600);
  if (signErr) {
    // fallback: marca todos como falha com o motivo
    jobs.forEach(j => results.push({ name: j.label, ok: false, reason: signErr.message || 'URL assinada negada' }));
    return finalizeReport(folder, results);
  }
  const urlByPath = new Map<string, string>();
  const errByPath = new Map<string, string>();
  (signedList || []).forEach((s: any) => {
    if (s.signedUrl) urlByPath.set(s.path, s.signedUrl);
    else if (s.error) errByPath.set(s.path, s.error);
  });

  // 3) Pool de downloads em paralelo + progresso throttled
  let done = 0;
  let lastProgressAt = 0;
  const reportProgress = () => {
    const now = Date.now();
    if (now - lastProgressAt < 250 && done < total) return;
    lastProgressAt = now;
    onProgress?.(`Baixando anexos ${done}/${total}...`);
  };

  let cursor = 0;
  const worker = async () => {
    while (true) {
      const i = cursor++;
      if (i >= jobs.length) return;
      const j = jobs[i];
      const url = urlByPath.get(j.path);
      if (!url) {
        results.push({ name: j.label, ok: false, reason: errByPath.get(j.path) || 'URL assinada negada' });
        done++; reportProgress(); continue;
      }
      try {
        const blob = await fetchWithTimeout(url);
        if (!usedPerKey.has(j.usedKey)) usedPerKey.set(j.usedKey, new Set());
        const finalName = uniqueName(usedPerKey.get(j.usedKey)!, j.fileName);
        // STORE para arquivos já comprimidos (PDF/JPG/PNG/etc.) — economiza muito CPU no zip
        const opts: any = isStored(finalName) ? { compression: 'STORE' } : { compression: 'DEFLATE', compressionOptions: { level: 6 } };
        folder.folder(j.folderPath)!.file(finalName, blob, opts);
        results.push({ name: j.label, ok: true });
      } catch (e: any) {
        const reason = e?.name === 'AbortError' ? `timeout após ${FETCH_TIMEOUT_MS / 1000}s` : (e?.message || 'erro desconhecido');
        results.push({ name: j.label, ok: false, reason });
      } finally {
        done++; reportProgress();
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, () => worker()));

  return finalizeReport(folder, results);
}

function finalizeReport(folder: JSZip, results: AttachmentResult[]): AttachmentResult[] {

  const ok = results.filter(r => r.ok).length;
  const fail = results.length - ok;
  const reportTxt = [
    `Relatório de anexos — ${new Date().toLocaleString('pt-BR')}`,
    `Total: ${results.length} | Incluídos: ${ok} | Falhas: ${fail}`,
    '',
    ...results.map(r => `${r.ok ? '[OK]   ' : '[FALHA]'} ${r.name}${r.reason ? '  — ' + r.reason : ''}`),
  ].join('\n');
  folder.file('_relatorio.txt', reportTxt);

  return results;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function exportProfessor(
  professorId: string,
  format: ExportFormat,
  includeAttachments: boolean,
  onProgress?: (msg: string) => void,
) {
  onProgress?.('Carregando dados do professor...');
  const data = await loadAllData(professorId);
  const baseName = `Cadastro - ${safeName(data.professor.full_name)} - ${todayStr()}`;
  const ext = format === 'pdf' ? 'pdf' : 'xlsx';

  onProgress?.('Gerando relatório...');
  const reportBlob = format === 'pdf' ? await generatePdfBlob(data) : generateExcelBlob(data);

  if (!includeAttachments) {
    triggerDownload(reportBlob, `${baseName}.${ext}`);
    return;
  }

  onProgress?.('Empacotando anexos...');
  const zip = new JSZip();
  zip.file(`${baseName}.${ext}`, reportBlob);
  const results = await downloadAttachments(data, zip, onProgress);
  const totalAttachments = results.length;
  const okAttachments = results.filter(r => r.ok).length;
  if (totalAttachments > 0 && okAttachments === 0) {
    const firstReason = results.find(r => !r.ok)?.reason || 'permissão negada';
    throw new Error(`Nenhum anexo pôde ser baixado — ${firstReason}`);
  }
  onProgress?.('Compactando ZIP...');
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(zipBlob, `${baseName}.zip`);
  return { totalAttachments, okAttachments, failedAttachments: totalAttachments - okAttachments };
}
