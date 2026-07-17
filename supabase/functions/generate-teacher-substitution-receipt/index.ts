// Gera PDF do Recibo de Pagamento de Substituição (hora-aula cheia)
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { jsPDF } from 'npm:jspdf@2.5.1';
import autoTableModule from 'npm:jspdf-autotable@3.8.2';
const autoTable: any = (autoTableModule as any)?.default ?? autoTableModule;

const BRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0);
function fmtDate(s: string | null | undefined) {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }); }
  catch { return '—'; }
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

    const body = await req.json().catch(() => ({}));
    const reqId: string | undefined = body?.substitution_request_id;
    if (!reqId) {
      return new Response(JSON.stringify({ error: 'substitution_request_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Regra financeira: hora-aula cheia, sem desconto / sem atraso / sem parcial
    const hours = Number(r.total_class_hours || 0);
    const value = Number(r.hour_class_value || 0);
    const total = hours * value;

    const bank = (r.bank_data || {}) as Record<string, any>;
    const bankSummary = [
      bank.bank ? `Banco: ${bank.bank}` : null,
      bank.agency ? `Ag.: ${bank.agency}` : null,
      bank.account ? `Conta: ${bank.account}` : null,
      bank.pix ? `PIX: ${bank.pix}` : null,
      bank.account_type ? `Tipo: ${bank.account_type}` : null,
    ].filter(Boolean).join(' · ') || '—';

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    let y = 18;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.text('Recibo de Pagamento de Substituição', W / 2, y, { align: 'center' });
    y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(`Código: ${safe(r.substitution_code)}`, W / 2, y, { align: 'center' });
    doc.setTextColor(0);
    y += 8;

    const rows: [string, string][] = [
      ['Professor substituto', safe(r.substitute_professor_name)],
      ['CPF', safe(r.substitute_professor_cpf)],
      ['RG', safe(r.substitute_professor_rg)],
      ['Escola', safe(r.school_name_snapshot)],
      ['Curso', safe(r.course_name_snapshot)],
      ['Turma', safe(r.class_group_name_snapshot)],
      ['Disciplina', safe(r.subject_name_snapshot)],
      ['Data da substituição', fmtDate(r.absence_date)],
      ['Total de horas/aulas', hours.toFixed(2)],
      ['Valor da hora-aula', BRL(value)],
      ['Valor total', BRL(total)],
      ['Forma de pagamento', safe(r.payment_method)],
      ['Dados bancários', bankSummary],
    ];

    autoTable(doc, {
      startY: y,
      head: [['Campo', 'Valor']],
      body: rows,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [27, 30, 44], textColor: 255 },
      columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    const declText =
      `Recebi a importância de ${BRL(total)} (${hours.toFixed(2)} hora(s)/aula a ${BRL(value)} cada), ` +
      `referente à substituição realizada na data de ${fmtDate(r.absence_date)} na disciplina ` +
      `${safe(r.subject_name_snapshot)} da turma ${safe(r.class_group_name_snapshot)}, ` +
      `dando plena, geral e irrevogável quitação à instituição pelo serviço prestado.`;
    const lines = doc.splitTextToSize(declText, W - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 4;

    doc.setFontSize(8); doc.setTextColor(110);
    doc.text(
      'Cálculo: hora-aula cheia (não há aplicação de atraso, minuto parcial ou desconto proporcional).',
      14, y,
    );
    doc.setTextColor(0);
    y += 18;

    if (y > 250) { doc.addPage(); y = 30; }
    doc.setDrawColor(80);
    doc.line(W / 2 - 40, y, W / 2 + 40, y);
    doc.setFontSize(8); doc.setTextColor(80);
    doc.text('Assinatura do(a) substituto(a)', W / 2, y + 4, { align: 'center' });
    doc.setFontSize(9); doc.setTextColor(0);
    doc.text(safe(r.substitute_professor_name), W / 2, y + 9, { align: 'center' });

    doc.setFontSize(7); doc.setTextColor(120);
    doc.text(
      `Gerado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · Neovale Gestão Acadêmica`,
      W / 2, 288, { align: 'center' },
    );

    const pdfBytes = doc.output('arraybuffer');
    const fileName = `recibo_${slug(r.substitution_code)}_${Date.now()}.pdf`;
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

    const { data: rpcData, error: rpcErr } = await userClient.rpc(
      'generate_teacher_substitution_receipt',
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
        total_amount: total,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e: any) {
    console.error('[generate-teacher-substitution-receipt]', e);
    return new Response(JSON.stringify({ error: e?.message || 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
