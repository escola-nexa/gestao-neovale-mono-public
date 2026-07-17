// Gera PDF da Declaração de Substituição de Professor
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { jsPDF } from 'npm:jspdf@2.5.1';
import autoTableModule from 'npm:jspdf-autotable@3.8.2';
const autoTable: any = (autoTableModule as any)?.default ?? autoTableModule;

function fmtDate(s: string | null | undefined) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch { return '—'; }
}
function safe(v: any) { return (v ?? '—').toString(); }
function slug(s: string) {
  return (s || 'doc').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE);

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claims.claims.sub;

    const body = await req.json().catch(() => ({}));
    const reqId: string | undefined = body?.substitution_request_id;
    if (!reqId) {
      return new Response(JSON.stringify({ error: 'substitution_request_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar solicitação (RLS via userClient)
    const { data: r, error: rErr } = await userClient
      .from('teacher_substitution_requests')
      .select('*')
      .eq('id', reqId)
      .maybeSingle();
    if (rErr || !r) {
      return new Response(JSON.stringify({ error: 'Solicitação não encontrada ou sem permissão' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ocorrências (multi-data / multi-disciplina)
    const { data: occList } = await userClient
      .from('teacher_substitution_occurrences')
      .select('*')
      .eq('substitution_request_id', reqId)
      .order('scheduled_date', { ascending: true });
    const occurrences = (occList || []) as any[];

    // Construir PDF
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    let y = 18;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.text('Declaração de Substituição de Professor', W / 2, y, { align: 'center' });
    y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(`Código: ${safe(r.substitution_code)}`, W / 2, y, { align: 'center' });
    doc.setTextColor(0);
    y += 8;

    const datesAll: string[] = Array.isArray(r.absence_dates) && r.absence_dates.length
      ? r.absence_dates as string[]
      : (r.absence_date ? [r.absence_date] : []);
    const datesLabel = datesAll.length === 0
      ? '—'
      : datesAll.length === 1
        ? fmtDate(datesAll[0])
        : `${fmtDate(datesAll[0])} a ${fmtDate(datesAll[datesAll.length - 1])} (${datesAll.length} datas)`;

    const headerRows: [string, string][] = [
      ['Professor substituído', safe(r.substituted_professor_name)],
      ['CPF do substituído', safe(r.substituted_professor_cpf)],
      ['RG do substituído', safe(r.substituted_professor_rg)],
      ['Professor substituto', safe(r.substitute_professor_name)],
      ['CPF do substituto', safe(r.substitute_professor_cpf)],
      ['RG do substituto', safe(r.substitute_professor_rg)],
      ['Escola', safe(r.school_name_snapshot)],
      ['Município / Estado', `${safe(r.municipality)} / ${safe(r.state)}`],
      ['Datas da ausência', datesLabel],
      ['Motivo', safe(r.absence_reason)],
      ['Total de horas/aulas', Number(r.total_class_hours || 0).toFixed(2)],
    ];

    autoTable(doc, {
      startY: y,
      head: [['Campo', 'Valor']],
      body: headerRows,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [27, 30, 44], textColor: 255 },
      columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    if (occurrences.length > 0) {
      const occRows = occurrences.map((o: any) => {
        let snap: any = {};
        try { snap = o.evidence_notes ? JSON.parse(o.evidence_notes) : {}; } catch { /* legado */ }
        const horario = snap.start_time && snap.end_time
          ? `${snap.slot_label ? snap.slot_label + ' · ' : ''}${snap.start_time}–${snap.end_time}`
          : '—';
        return [
          fmtDate(o.scheduled_date),
          horario,
          safe(snap.class_group_name),
          safe(snap.subject_name),
          Number(o.class_hours || 0).toFixed(2),
        ];
      });
      autoTable(doc, {
        startY: y,
        head: [['Data', 'Tempo', 'Turma', 'Disciplina', 'H/A']],
        body: occRows,
        styles: { fontSize: 8, cellPadding: 1.8 },
        headStyles: { fillColor: [255, 218, 69], textColor: 27 },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    } else {
      // Compat: solicitações antigas (1 aula no próprio request)
      autoTable(doc, {
        startY: y,
        head: [['Campo', 'Valor']],
        body: [
          ['Curso', safe(r.course_name_snapshot)],
          ['Turma', safe(r.class_group_name_snapshot)],
          ['Disciplina', safe(r.subject_name_snapshot)],
        ],
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [27, 30, 44], textColor: 255 },
        columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }
    y += 4;

    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    const declText = occurrences.length > 1
      ? `Declaramos, para os devidos fins, que o(a) professor(a) ${safe(r.substitute_professor_name)} ` +
        `realizou a substituição do(a) professor(a) ${safe(r.substituted_professor_name)} ` +
        `nas ${datesAll.length} datas e ${occurrences.length} aulas listadas acima, ` +
        `totalizando ${Number(r.total_class_hours || 0).toFixed(2)} hora(s)/aula, conforme registros desta instituição.`
      : `Declaramos, para os devidos fins, que o(a) professor(a) ${safe(r.substitute_professor_name)} ` +
        `realizou a substituição do(a) professor(a) ${safe(r.substituted_professor_name)} ` +
        `na data de ${fmtDate(r.absence_date)}, na disciplina ${safe(r.subject_name_snapshot)} ` +
        `da turma ${safe(r.class_group_name_snapshot)}, totalizando ${Number(r.total_class_hours || 0).toFixed(2)} ` +
        `hora(s)/aula, conforme registros desta instituição.`;
    const lines = doc.splitTextToSize(declText, W - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 18;

    // Assinaturas
    const sigCol = (label: string, name: string, x: number) => {
      doc.setDrawColor(80);
      doc.line(x, y, x + 55, y);
      doc.setFontSize(8); doc.setTextColor(80);
      doc.text(label, x + 27.5, y + 4, { align: 'center' });
      doc.setFontSize(9); doc.setTextColor(0);
      doc.text(safe(name), x + 27.5, y + 9, { align: 'center' });
    };
    if (y > 240) { doc.addPage(); y = 30; }
    y += 10;
    sigCol('Diretor(a) Titular', r.director_name || '', 14);
    sigCol('Diretor(a) Adjunto', r.adjunct_director_name || '', 78);
    sigCol('Coordenador(a)', r.coordinator_name || '', 142);
    y += 22;
    sigCol('Professor(a) Substituto(a)', r.substitute_professor_name || '', 14);
    sigCol('Professor(a) Substituído(a)', r.substituted_professor_name || '', 78);

    doc.setFontSize(7); doc.setTextColor(120);
    doc.text(
      `Gerado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · Neovale Gestão Acadêmica`,
      W / 2, 288, { align: 'center' },
    );

    const pdfBytes = doc.output('arraybuffer');
    const fileName = `declaracao_${slug(r.substitution_code)}_${Date.now()}.pdf`;
    const storagePath = `${r.organization_id}/${r.id}/${fileName}`;

    const { error: upErr } = await admin.storage
      .from('teacher-substitutions')
      .upload(storagePath, new Uint8Array(pdfBytes), {
        contentType: 'application/pdf',
        upsert: true,
      });
    if (upErr) {
      return new Response(JSON.stringify({ error: `Upload falhou: ${upErr.message}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: signed } = await admin.storage
      .from('teacher-substitutions')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
    const signedUrl = signed?.signedUrl || null;

    // Registrar via RPC (mantém auditoria/permissões consistentes)
    const { data: rpcData, error: rpcErr } = await userClient.rpc(
      'generate_teacher_substitution_declaration',
      {
        p_substitution_request_id: reqId,
        p_file_url: signedUrl,
        p_storage_path: storagePath,
        p_file_name: fileName,
      },
    );
    if (rpcErr) {
      return new Response(JSON.stringify({ error: rpcErr.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        document_id: rpcData,
        signed_url: signedUrl,
        storage_path: storagePath,
        file_name: fileName,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e: any) {
    console.error('[generate-teacher-substitution-declaration]', e);
    return new Response(JSON.stringify({ error: e?.message || 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
