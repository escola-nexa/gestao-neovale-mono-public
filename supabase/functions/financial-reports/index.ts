// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface ReportRequest {
  report: string;
  filters?: {
    start?: string | null;
    end?: string | null;
    school_id?: string | null;
    cost_center_id?: string | null;
    project_id?: string | null;
    category_id?: string | null;
    party_id?: string | null;
    account_id?: string | null;
    status?: string | null;
  };
  page?: number;
  page_size?: number;
}

interface Column { key: string; label: string; type?: 'number' | 'currency' | 'date' | 'text' }
interface ReportPayload {
  report: string;
  columns: Column[];
  rows: Record<string, any>[];
  totals?: Record<string, any>;
  meta?: Record<string, any>;
  page: number;
  page_size: number;
  total_count: number;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const ALLOWED_REPORTS = new Set([
  'fluxo_caixa',
  'contas_pagar',
  'contas_receber',
  'despesas_por_categoria',
  'despesas_por_escola',
  'despesas_por_cost_center',
  'pagamentos_substituicoes',
  'orcado_vs_realizado',
  'dre',
  'conciliacoes_pendentes',
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: 'Unauthorized' }, 401);

    const body: ReportRequest = await req.json();
    if (!body?.report || !ALLOWED_REPORTS.has(body.report)) {
      return json({ error: 'Invalid report' }, 400);
    }

    const filters = body.filters ?? {};
    const page = Math.max(1, body.page ?? 1);
    const pageSize = Math.min(500, Math.max(10, body.page_size ?? 100));
    const offset = (page - 1) * pageSize;

    const payload = await runReport(supabase, body.report, filters, page, pageSize, offset);
    return json(payload);
  } catch (err) {
    console.error('financial-reports error', err);
    return json({ error: (err as Error).message ?? 'internal_error' }, 500);
  }
});

async function runReport(
  sb: any,
  report: string,
  f: ReportRequest['filters'] = {},
  page: number,
  pageSize: number,
  offset: number,
): Promise<ReportPayload> {
  const today = new Date().toISOString().slice(0, 10);
  const start = f?.start || null;
  const end = f?.end || null;

  switch (report) {
    case 'fluxo_caixa': {
      let q = sb
        .from('financial_payments')
        .select('payment_date, kind, amount', { count: 'exact' });
      if (start) q = q.gte('payment_date', start);
      if (end) q = q.lte('payment_date', end);
      if (f?.account_id) q = q.eq('account_id', f.account_id);
      const { data, error, count } = await q.range(offset, offset + pageSize - 1).order('payment_date', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []).map((r: any) => {
        const amt = Number(r.amount);
        const isReceipt = r.kind === 'receipt';
        const isPayment = r.kind === 'payment';
        const isReversal = r.kind === 'reversal';
        return {
          date: r.payment_date,
          kind: r.kind,
          income: isReceipt ? amt : 0,
          expense: isPayment ? amt : 0,
          amount: isReversal ? -amt : amt,
        };
      });
      const totals = {
        income: rows.reduce((s, r) => s + r.income, 0),
        expense: rows.reduce((s, r) => s + r.expense, 0),
        net: rows.reduce((s, r) => s + r.income - r.expense, 0),
      };
      return {
        report,
        columns: [
          { key: 'date', label: 'Data', type: 'date' },
          { key: 'kind', label: 'Tipo' },
          { key: 'income', label: 'Receita', type: 'currency' },
          { key: 'expense', label: 'Despesa', type: 'currency' },
        ],
        rows,
        totals,
        page,
        page_size: pageSize,
        total_count: count ?? rows.length,
      };
    }

    case 'contas_pagar':
    case 'contas_receber': {
      const isPay = report === 'contas_pagar';
      let q = sb
        .from('financial_installments')
        .select('id, due_date, amount, paid_amount, status, entry_id, financial_entries!inner(kind, description, party_id, financial_parties(name))', { count: 'exact' });
      q = q.eq('financial_entries.kind', isPay ? 'payable' : 'receivable');
      if (start) q = q.gte('due_date', start);
      if (end) q = q.lte('due_date', end);
      if (f?.status) q = q.eq('status', f.status);
      const { data, error, count } = await q.range(offset, offset + pageSize - 1).order('due_date', { ascending: true });
      if (error) throw error;
      const rows = (data ?? []).map((r: any) => {
        const amount = Number(r.amount);
        const paid = Number(r.paid_amount ?? 0);
        const balance = amount - paid;
        const overdue = r.status !== 'paid' && r.due_date < today;
        const days_overdue = overdue ? Math.floor((new Date(today).getTime() - new Date(r.due_date).getTime()) / 86400000) : 0;
        return {
          due_date: r.due_date,
          description: r.financial_entries?.description ?? '-',
          party: r.financial_entries?.financial_parties?.name ?? '-',
          amount,
          paid,
          balance,
          status: r.status,
          days_overdue,
        };
      });
      const totals = {
        amount: rows.reduce((s, r) => s + r.amount, 0),
        paid: rows.reduce((s, r) => s + r.paid, 0),
        balance: rows.reduce((s, r) => s + r.balance, 0),
      };
      return {
        report,
        columns: [
          { key: 'due_date', label: 'Vencimento', type: 'date' },
          { key: 'party', label: isPay ? 'Beneficiário' : 'Pagador' },
          { key: 'description', label: 'Descrição' },
          { key: 'amount', label: 'Valor', type: 'currency' },
          { key: 'paid', label: 'Pago', type: 'currency' },
          { key: 'balance', label: 'Saldo', type: 'currency' },
          { key: 'days_overdue', label: 'Dias atraso', type: 'number' },
          { key: 'status', label: 'Status' },
        ],
        rows,
        totals,
        page,
        page_size: pageSize,
        total_count: count ?? rows.length,
      };
    }

    case 'despesas_por_categoria': {
      let q = sb
        .from('financial_entries')
        .select('total_amount, category_id, financial_categories(name)')
        .eq('kind', 'payable')
        .neq('status', 'cancelled');
      if (start) q = q.gte('competence_date', start);
      if (end) q = q.lte('competence_date', end);
      if (f?.category_id) q = q.eq('category_id', f.category_id);
      const { data, error } = await q;
      if (error) throw error;
      const map = new Map<string, number>();
      for (const r of data ?? []) {
        const name = (r as any).financial_categories?.name ?? 'Sem categoria';
        map.set(name, (map.get(name) ?? 0) + Number((r as any).total_amount));
      }
      const rows = Array.from(map.entries())
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);
      return {
        report,
        columns: [
          { key: 'category', label: 'Categoria' },
          { key: 'amount', label: 'Total', type: 'currency' },
        ],
        rows: rows.slice(offset, offset + pageSize),
        totals: { amount: rows.reduce((s, r) => s + r.amount, 0) },
        page,
        page_size: pageSize,
        total_count: rows.length,
      };
    }

    case 'despesas_por_escola':
    case 'despesas_por_cost_center': {
      let q = sb
        .from('financial_entry_allocations')
        .select('amount, cost_center_id, school_id, project_id, financial_cost_centers(name), schools(name), financial_projects(name), financial_entries!inner(kind, competence_date, status)')
        .eq('financial_entries.kind', 'payable')
        .neq('financial_entries.status', 'cancelled');
      if (start) q = q.gte('financial_entries.competence_date', start);
      if (end) q = q.lte('financial_entries.competence_date', end);
      if (f?.school_id) q = q.eq('school_id', f.school_id);
      if (f?.cost_center_id) q = q.eq('cost_center_id', f.cost_center_id);
      if (f?.project_id) q = q.eq('project_id', f.project_id);
      const { data, error } = await q;
      if (error) throw error;
      const keyFn = report === 'despesas_por_escola'
        ? (r: any) => r.schools?.name ?? 'Sem escola'
        : (r: any) => r.financial_cost_centers?.name ?? 'Sem CC';
      const map = new Map<string, number>();
      for (const r of data ?? []) {
        const k = keyFn(r);
        map.set(k, (map.get(k) ?? 0) + Number(r.amount));
      }
      const rows = Array.from(map.entries())
        .map(([label, amount]) => ({ label, amount }))
        .sort((a, b) => b.amount - a.amount);
      return {
        report,
        columns: [
          { key: 'label', label: report === 'despesas_por_escola' ? 'Escola' : 'Centro de Custo' },
          { key: 'amount', label: 'Total', type: 'currency' },
        ],
        rows: rows.slice(offset, offset + pageSize),
        totals: { amount: rows.reduce((s, r) => s + r.amount, 0) },
        page,
        page_size: pageSize,
        total_count: rows.length,
      };
    }

    case 'pagamentos_substituicoes': {
      let q = sb
        .from('financial_entries')
        .select('id, document_number, description, competence_date, due_date, total_amount, status, source_kind, financial_parties(name)', { count: 'exact' })
        .in('source_kind', ['SUBSTITUTION', 'TEACHER_SUBSTITUTION', 'substitution', 'substitution_payment']);
      if (start) q = q.gte('competence_date', start);
      if (end) q = q.lte('competence_date', end);
      const { data, error, count } = await q.range(offset, offset + pageSize - 1).order('competence_date', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []).map((r: any) => ({
        document: r.document_number,
        party: r.financial_parties?.name ?? '-',
        description: r.description,
        competence: r.competence_date,
        due: r.due_date,
        amount: Number(r.total_amount),
        status: r.status,
      }));
      return {
        report,
        columns: [
          { key: 'competence', label: 'Competência', type: 'date' },
          { key: 'party', label: 'Substituto' },
          { key: 'description', label: 'Descrição' },
          { key: 'amount', label: 'Valor', type: 'currency' },
          { key: 'status', label: 'Status' },
        ],
        rows,
        totals: { amount: rows.reduce((s, r) => s + r.amount, 0) },
        page,
        page_size: pageSize,
        total_count: count ?? rows.length,
      };
    }

    case 'orcado_vs_realizado': {
      let bq = sb
        .from('financial_budget_lines')
        .select('planned_amount, month, category_id, cost_center_id, school_id, financial_categories(name), financial_cost_centers(name)');
      if (start) bq = bq.gte('month', start.slice(0, 7));
      if (end) bq = bq.lte('month', end.slice(0, 7));
      const { data: lines, error: lineErr } = await bq;
      if (lineErr) throw lineErr;

      let eq = sb
        .from('financial_entries')
        .select('total_amount, category_id, competence_date, status')
        .eq('kind', 'payable')
        .neq('status', 'cancelled');
      if (start) eq = eq.gte('competence_date', start);
      if (end) eq = eq.lte('competence_date', end);
      const { data: entries, error: entErr } = await eq;
      if (entErr) throw entErr;

      const realByCat = new Map<string, number>();
      for (const e of entries ?? []) {
        const k = (e as any).category_id ?? 'null';
        realByCat.set(k, (realByCat.get(k) ?? 0) + Number((e as any).total_amount));
      }
      const planByCat = new Map<string, { name: string; planned: number }>();
      for (const l of lines ?? []) {
        const k = (l as any).category_id ?? 'null';
        const name = (l as any).financial_categories?.name ?? 'Sem categoria';
        const prev = planByCat.get(k) ?? { name, planned: 0 };
        planByCat.set(k, { name, planned: prev.planned + Number((l as any).planned_amount) });
      }
      const keys = new Set<string>([...planByCat.keys(), ...realByCat.keys()]);
      const rows = Array.from(keys).map((k) => {
        const planned = planByCat.get(k)?.planned ?? 0;
        const realized = realByCat.get(k) ?? 0;
        const variance = realized - planned;
        const variance_pct = planned > 0 ? (variance / planned) * 100 : null;
        return { category: planByCat.get(k)?.name ?? 'Sem categoria', planned, realized, variance, variance_pct };
      }).sort((a, b) => b.realized - a.realized);
      return {
        report,
        columns: [
          { key: 'category', label: 'Categoria' },
          { key: 'planned', label: 'Orçado', type: 'currency' },
          { key: 'realized', label: 'Realizado', type: 'currency' },
          { key: 'variance', label: 'Variação', type: 'currency' },
          { key: 'variance_pct', label: 'Variação %', type: 'number' },
        ],
        rows: rows.slice(offset, offset + pageSize),
        totals: {
          planned: rows.reduce((s, r) => s + r.planned, 0),
          realized: rows.reduce((s, r) => s + r.realized, 0),
        },
        page,
        page_size: pageSize,
        total_count: rows.length,
      };
    }

    case 'dre': {
      let q = sb
        .from('financial_entries')
        .select('total_amount, kind, competence_date, status, financial_categories(name, nature)')
        .neq('status', 'cancelled');
      if (start) q = q.gte('competence_date', start);
      if (end) q = q.lte('competence_date', end);
      const { data, error } = await q;
      if (error) throw error;
      let receitas = 0, despesas = 0;
      const byCat = new Map<string, { nature: string; amount: number }>();
      for (const e of data ?? []) {
        const amt = Number((e as any).total_amount);
        const name = (e as any).financial_categories?.name ?? 'Sem categoria';
        const isIncome = (e as any).kind === 'receivable';
        const nature = (e as any).financial_categories?.nature ?? (e as any).kind;
        if (isIncome) receitas += amt; else despesas += amt;
        const prev = byCat.get(name) ?? { nature, amount: 0 };
        byCat.set(name, { nature, amount: prev.amount + (isIncome ? amt : -amt) });
      }
      const rows = [
        { label: '(+) Receitas', amount: receitas },
        { label: '(-) Despesas', amount: -despesas },
        { label: '(=) Resultado', amount: receitas - despesas },
        ...Array.from(byCat.entries()).map(([label, v]) => ({ label: `  ${label}`, amount: v.amount })),
      ];
      return {
        report,
        columns: [
          { key: 'label', label: 'Linha' },
          { key: 'amount', label: 'Valor', type: 'currency' },
        ],
        rows,
        totals: { resultado: receitas - despesas, receitas, despesas },
        page,
        page_size: pageSize,
        total_count: rows.length,
      };
    }

    case 'conciliacoes_pendentes': {
      let q = sb
        .from('financial_bank_transactions')
        .select('transaction_date, description, amount, direction, status, financial_accounts(name)', { count: 'exact' })
        .in('status', ['PENDING', 'PARTIALLY_RECONCILED']);
      if (start) q = q.gte('transaction_date', start);
      if (end) q = q.lte('transaction_date', end);
      if (f?.account_id) q = q.eq('account_id', f.account_id);
      const { data, error, count } = await q.range(offset, offset + pageSize - 1).order('transaction_date', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []).map((r: any) => ({
        date: r.transaction_date,
        account: r.financial_accounts?.name ?? '-',
        description: r.description,
        direction: r.direction,
        amount: Number(r.amount),
        status: r.status,
      }));
      return {
        report,
        columns: [
          { key: 'date', label: 'Data', type: 'date' },
          { key: 'account', label: 'Conta' },
          { key: 'description', label: 'Descrição' },
          { key: 'direction', label: 'Direção' },
          { key: 'amount', label: 'Valor', type: 'currency' },
          { key: 'status', label: 'Status' },
        ],
        rows,
        totals: { amount: rows.reduce((s, r) => s + r.amount, 0) },
        page,
        page_size: pageSize,
        total_count: count ?? rows.length,
      };
    }
  }

  throw new Error('Unhandled report');
}
