// supabase/functions/generate-teacher-attendance-pdf/index.ts
// Gera o PDF da folha mensal de presença do professor.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { jsPDF } from 'npm:jspdf@2.5.1';
import autoTableModule from 'npm:jspdf-autotable@3.8.2';
const autoTable: any = (autoTableModule as any)?.default ?? autoTableModule;

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const MOTIVATIONAL_QUOTES = [
  'Onde o talento encontra a oportunidade certa.',
  'Cada aula é uma chance de transformar uma trajetória.',
  'Educar é abrir portas que ninguém mais pode fechar.',
  'Talento se revela quando encontra um bom professor.',
  'Ensinar hoje é construir as oportunidades de amanhã.',
  'O melhor caminho para o futuro começa na sala de aula.',
  'Onde há ensino de qualidade, há futuro garantido.',
  'Conhecimento partilhado vira oportunidade multiplicada.',
  'Cada professor é uma ponte entre o talento e o futuro.',
  'Educação é a oportunidade que muda gerações.',
];

// Cache em memória de ícones (por URL) na instância do worker
const ICON_CACHE = new Map<string, { b64: string; fmt: 'PNG' | 'JPEG' | 'WEBP' }>();

async function fetchIconSafe(url: string): Promise<{ b64: string; fmt: 'PNG' | 'JPEG' | 'WEBP' } | null> {
  try {
    if (ICON_CACHE.has(url)) return ICON_CACHE.get(url)!;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const ct = (resp.headers.get('content-type') || '').toLowerCase();
    let fmt: 'PNG' | 'JPEG' | 'WEBP' = 'PNG';
    if (ct.includes('jpeg') || ct.includes('jpg')) fmt = 'JPEG';
    else if (ct.includes('webp')) fmt = 'WEBP';
    const buf = new Uint8Array(await resp.arrayBuffer());
    if (buf.byteLength > 1_200_000) return null; // ~1.2MB
    // base64 em chunks (evita estourar stack)
    let bin = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < buf.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + CHUNK)) as any);
    }
    const out = { b64: btoa(bin), fmt };
    ICON_CACHE.set(url, out);
    return out;
  } catch {
    return null;
  }
}

const STATUS_LABEL: Record<string,string> = {
  draft:'Rascunho', generated:'Gerada', with_pending_items:'Com pendências',
  under_review:'Em revisão', approved_by_coordination:'Aprovada (Coord.)',
  approved_by_rh:'Aprovada (R.H.)', closed:'Fechada', reopened:'Reaberta', cancelled:'Cancelada',
};

const FINAL_LABEL: Record<string,string> = {
  pending:'Pendente', present:'Presente', present_with_delay:'Presente c/ atraso',
  absent:'Ausente', justified_absence:'Falta justificada', cancelled:'Cancelada',
  ignored:'Ignorada', manual_review_required:'Revisão manual',
};

function fmtDate(s: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}
// scheduled_* preservam o horário-parede em UTC. Formatamos em UTC para bater com a Grade.
function fmtTimeWall(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hourCycle: 'h23' });
}
function fmtDayWall(s: string) {
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
}
function fmtTimeReal(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}
function minutesToHours(m: number) {
  if (!m) return '0h';
  const h = Math.floor(m / 60); const r = m % 60;
  return r ? `${h}h${String(r).padStart(2,'0')}` : `${h}h`;
}
function slugifyName(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json().catch(() => ({}));
    const sheetId: string | undefined = body.monthly_sheet_id;
    if (!sheetId || !/^[0-9a-f-]{36}$/i.test(sheetId)) {
      return new Response(JSON.stringify({ error: 'invalid_sheet_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { error: permErr } = await userClient.rpc('log_teacher_attendance_pdf_generated', { p_monthly_sheet_id: sheetId });
    if (permErr) {
      return new Response(JSON.stringify({ error: 'permission_denied', detail: permErr.message }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: sheet } = await admin
      .from('teacher_attendance_monthly_sheets')
      .select('*, professors:professor_id(id, full_name)')
      .eq('id', sheetId)
      .maybeSingle();
    if (!sheet) {
      return new Response(JSON.stringify({ error: 'sheet_not_found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Branding da organização (mesma fonte da Pré-visualização em /configuracoes/marca)
    const { data: branding } = await admin
      .from('branding_settings')
      .select('display_name, subtitle, icon_url')
      .eq('organization_id', sheet.organization_id)
      .maybeSingle();
    const displayName = (branding?.display_name as string) || 'Neovale';
    const subtitle = (branding?.subtitle as string) || 'Gestão Acadêmica';
    const icon = branding?.icon_url ? await fetchIconSafe(branding.icon_url as string) : null;

    const { data: entriesRaw = [] } = await admin
      .from('teacher_attendance_entries')
      .select('*, schools:school_id(nome), class_groups:class_group_id(nome), subjects:subject_id(nome), courses:course_id(nome)')
      .eq('monthly_sheet_id', sheetId)
      .not('final_status', 'in', '(cancelled,ignored)')
      .order('scheduled_start_at', { ascending: true });
    const entries = entriesRaw as any[];

    // Totais — separando CLASS x PLANNING
    const totals = entries.reduce((acc, e) => {
      const isPlan = e.slot_type === 'PLANNING';
      acc.expected += 1;
      if (e.final_status === 'present') acc.present += 1;
      if (e.final_status === 'present_with_delay') { acc.present += 1; acc.late += 1; }
      if (e.final_status === 'absent' || e.final_status === 'justified_absence') acc.absent += 1;
      const wl = e.workload_minutes || 0;
      const cwl = e.confirmed_workload_minutes || 0;
      if (isPlan) { acc.expectedPlanWl += wl; acc.confirmedPlanWl += cwl; }
      else { acc.expectedClassWl += wl; acc.confirmedClassWl += cwl; }
      return acc;
    }, { expected: 0, present: 0, late: 0, absent: 0, expectedClassWl: 0, confirmedClassWl: 0, expectedPlanWl: 0, confirmedPlanWl: 0 });

    const { data: audit = [] } = await admin
      .from('teacher_attendance_audit_logs')
      .select('action, actor_role, reason, created_at')
      .eq('monthly_sheet_id', sheetId)
      .order('created_at', { ascending: false })
      .limit(40);

    const { data: closedByProfile } = sheet.closed_by
      ? await admin.from('profiles').select('full_name').eq('id', sheet.closed_by).maybeSingle()
      : { data: null } as any;

    // Build PDF
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();

    // === Header — espelha a Pré-visualização da Marca ===
    // Faixa principal azul escuro #1B1E2C
    doc.setFillColor(27, 30, 44);
    doc.rect(0, 0, W, 26, 'F');
    // Faixa amarela superior #FFDA45
    doc.setFillColor(255, 218, 69);
    doc.rect(0, 0, W, 1.2, 'F');

    // Placa do ícone (quadrado arredondado, fundo amarelo translúcido)
    const plateX = 12, plateY = 5, plateSize = 16;
    doc.setFillColor(255, 218, 69);
    doc.setGState(new (doc as any).GState({ opacity: 0.18 }));
    doc.roundedRect(plateX, plateY, plateSize, plateSize, 3, 3, 'F');
    doc.setGState(new (doc as any).GState({ opacity: 1 }));

    if (icon) {
      try {
        const pad = 1.5;
        doc.addImage(
          `data:image/${icon.fmt.toLowerCase()};base64,${icon.b64}`,
          icon.fmt,
          plateX + pad,
          plateY + pad,
          plateSize - pad * 2,
          plateSize - pad * 2,
        );
      } catch {
        drawSparkleFallback(doc, plateX, plateY, plateSize);
      }
    } else {
      drawSparkleFallback(doc, plateX, plateY, plateSize);
    }

    // Texto (display_name + subtítulo)
    const textX = plateX + plateSize + 5;
    doc.setTextColor(255, 218, 69);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(displayName, textX, plateY + 8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 210);
    doc.setFontSize(7.5);
    doc.text(subtitle.toUpperCase(), textX, plateY + 14, { charSpace: 0.6 });

    // Título à direita
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Folha Mensal de Presença', W - 14, plateY + 11, { align: 'right' });

    // === Nome do professor + referência ===
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.text(sheet.professors?.full_name || 'Professor', 14, 34);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Referência: ${MONTHS[sheet.reference_month - 1]}/${sheet.reference_year}`, 14, 40);
    doc.text(`Status: ${STATUS_LABEL[sheet.status] || sheet.status}`, 14, 45);

    const quote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(110, 110, 120);
    doc.setFontSize(9);
    doc.text(`“${quote}”`, 14, 51);
    doc.setFont('helvetica', 'normal');

    // === Summary box: 7 colunas (com CH planej.) ===
    const sumCols: Array<[string, string]> = [
      ['Previstas', String(totals.expected)],
      ['Presentes', String(totals.present)],
      ['Atrasos', String(totals.late)],
      ['Ausências', String(totals.absent)],
      ['CH aulas', minutesToHours(totals.expectedClassWl)],
      ['CH planej.', minutesToHours(totals.expectedPlanWl)],
      ['CH conf.', minutesToHours(totals.confirmedClassWl + totals.confirmedPlanWl)],
    ];
    const sumW = 154; // largura total do box
    const sumX = W - sumW - 10;
    const sumY = 28;
    const colW = sumW / sumCols.length;
    doc.setDrawColor(220); doc.setFillColor(248);
    doc.roundedRect(sumX, sumY, sumW, 22, 2, 2, 'FD');
    doc.setFontSize(9);
    sumCols.forEach(([l, v], i) => {
      const x = sumX + i * colW + colW / 2;
      doc.setTextColor(120); doc.setFontSize(8);
      doc.text(l, x, sumY + 7, { align: 'center' });
      doc.setTextColor(0); doc.setFontSize(11);
      doc.text(v, x, sumY + 15, { align: 'center' });
    });

    // Closure info
    let y = 57;
    if (sheet.closed_at) {
      doc.setFontSize(9); doc.setTextColor(60);
      doc.text(`Fechada em ${fmtDate(sheet.closed_at)} por ${closedByProfile?.full_name || '—'}`, 14, y);
      y += 5;
      if (sheet.closure_notes) {
        doc.text(`Observações: ${String(sheet.closure_notes).slice(0, 180)}`, 14, y);
        y += 5;
      }
    } else {
      doc.setFontSize(9); doc.setTextColor(180, 80, 0);
      doc.text('Folha ainda não fechada — dados sujeitos a alteração.', 14, y);
      y += 5;
      doc.setTextColor(60);
    }

    // Entries table — com coluna "Tipo" (Aula/PL)
    autoTable(doc, {
      startY: y + 2,
      head: [['Data','Início','Fim','Escola','Curso','Turma','Disciplina','Tipo','Chamada','Atraso','CH (min)','Status']],
      body: entries.map((e) => [
        fmtDayWall(e.scheduled_start_at),
        fmtTimeWall(e.scheduled_start_at),
        fmtTimeWall(e.scheduled_end_at),
        e.schools?.nome || '—',
        e.courses?.nome || '—',
        e.class_groups?.nome || '—',
        e.subjects?.nome || '—',
        e.slot_type === 'PLANNING' ? 'PL' : 'Aula',
        fmtTimeReal(e.actual_call_started_at),
        e.late_minutes ? `${e.late_minutes}m` : '—',
        `${e.confirmed_workload_minutes}/${e.workload_minutes}`,
        FINAL_LABEL[e.final_status] || e.final_status,
      ]),
      styles: { fontSize: 7.3, cellPadding: 1.4 },
      headStyles: { fillColor: [27, 30, 44], textColor: [255, 218, 69] },
      alternateRowStyles: { fillColor: [248, 248, 250] },
      columnStyles: { 7: { halign: 'center', fontStyle: 'bold' } },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 7 && data.cell.raw === 'PL') {
          data.cell.styles.textColor = [37, 99, 235];
        }
      },
      margin: { left: 10, right: 10 },
    });

    // Audit timeline
    let afterY = (doc as any).lastAutoTable.finalY + 6;
    if (afterY > 180) { doc.addPage(); afterY = 20; }
    doc.setFontSize(10); doc.setTextColor(0);
    doc.text('Histórico de auditoria', 14, afterY);
    autoTable(doc, {
      startY: afterY + 2,
      head: [['Quando', 'Perfil', 'Ação', 'Motivo']],
      body: (audit as any[]).map((a) => [
        fmtDate(a.created_at), a.actor_role || '—', a.action, a.reason || '—',
      ]),
      styles: { fontSize: 7.5 },
      headStyles: { fillColor: [27, 30, 44], textColor: [255, 218, 69] },
      margin: { left: 10, right: 10 },
    });

    // Audit hash + footer
    const payload = JSON.stringify({
      sheet: sheet.id, professor: sheet.professor_id, year: sheet.reference_year,
      month: sheet.reference_month, status: sheet.status, totals: {
        expected: sheet.total_expected_entries, present: sheet.total_present_entries,
        absent: sheet.total_absent_entries, late: sheet.total_late_entries,
        expected_wl: sheet.expected_workload_minutes, confirmed_wl: sheet.confirmed_workload_minutes,
      }, entries: entries.map((e) => [e.id, e.final_status, e.confirmed_workload_minutes]),
      generated_at: new Date().toISOString(),
    });
    const hash = await sha256Hex(payload);
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(7); doc.setTextColor(140);
      doc.text(`Hash de auditoria: ${hash.slice(0, 24)}…  •  Página ${i}/${pages}  •  Gerado em ${fmtDate(new Date().toISOString())}`, 14, doc.internal.pageSize.getHeight() - 6);
    }

    const pdfBytes = doc.output('arraybuffer');

    const profName = sheet.professors?.full_name || 'Professor';
    const downloadName = `Folha Mensal - ${profName} - ${String(sheet.reference_month).padStart(2,'0')}-${sheet.reference_year}.pdf`;
    const storagePath = `${sheet.organization_id}/${sheet.reference_year}-${String(sheet.reference_month).padStart(2,'0')}/${slugifyName(profName)}-${sheetId}-${Date.now()}.pdf`;
    const { error: uploadErr } = await admin.storage
      .from('teacher-attendance-pdfs')
      .upload(storagePath, new Uint8Array(pdfBytes), { contentType: 'application/pdf', upsert: true });
    if (uploadErr) {
      return new Response(JSON.stringify({ error: 'upload_failed', detail: uploadErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: signed } = await admin.storage.from('teacher-attendance-pdfs').createSignedUrl(storagePath, 60 * 60);

    return new Response(JSON.stringify({
      ok: true,
      pdf_url: signed?.signedUrl,
      file_name: downloadName,
      generated_at: new Date().toISOString(),
      audit_hash: hash,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'internal_error', detail: String((e as any)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Fallback "Sparkles" desenhado em vetor (sem fetch)
function drawSparkleFallback(doc: any, x: number, y: number, size: number) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  doc.setFillColor(255, 218, 69);
  // estrela de 4 pontas simples
  const r1 = size * 0.32;
  const r2 = size * 0.12;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 8; i++) {
    const ang = (Math.PI / 4) * i - Math.PI / 2;
    const r = i % 2 === 0 ? r1 : r2;
    pts.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]);
  }
  // jsPDF não tem polygon trivial: usa lines
  const lines: Array<[number, number]> = [];
  for (let i = 1; i < pts.length; i++) {
    lines.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
  }
  lines.push([pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]]);
  doc.lines(lines, pts[0][0], pts[0][1], [1, 1], 'F', true);
}
