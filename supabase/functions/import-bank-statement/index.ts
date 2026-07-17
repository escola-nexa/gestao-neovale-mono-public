import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BankTx {
  transaction_date: string;
  amount: number;
  description?: string;
  document_number?: string;
  payer_payee_name?: string;
  payer_payee_document?: string;
  fitid?: string;
  memo?: string;
  reference?: string;
}

function parseOFX(content: string): BankTx[] {
  const txs: BankTx[] = [];
  // SGML-like OFX: extract <STMTTRN>...</STMTTRN> blocks (works for both OFX 1.x and 2.x)
  const blockRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;
  while ((match = blockRegex.exec(content)) !== null) {
    const block = match[1];
    const get = (tag: string) => {
      const re = new RegExp(`<${tag}>\\s*([^<\\r\\n]+)`, "i");
      const m = block.match(re);
      return m ? m[1].trim() : undefined;
    };
    const dt = get("DTPOSTED");
    const amt = get("TRNAMT");
    if (!dt || !amt) continue;
    const date = `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`;
    txs.push({
      transaction_date: date,
      amount: Number(amt),
      fitid: get("FITID"),
      memo: get("MEMO"),
      description: get("MEMO") || get("NAME"),
      document_number: get("CHECKNUM") || get("REFNUM"),
      payer_payee_name: get("NAME"),
    });
  }
  return txs;
}

function parseCSV(content: string): BankTx[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0].split(/[,;]/).map((h) => h.trim().toLowerCase());
  const idx = (names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));
  const dateIdx = idx(["data", "date"]);
  const amtIdx = idx(["valor", "amount", "value"]);
  const descIdx = idx(["descri", "memo", "histor"]);
  const docIdx = idx(["docu", "numero", "ref"]);
  if (dateIdx < 0 || amtIdx < 0) return [];

  const sep = lines[0].includes(";") ? ";" : ",";
  return lines.slice(1).map((line) => {
    const cols = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    const rawDate = cols[dateIdx];
    // DD/MM/YYYY or YYYY-MM-DD
    let date = rawDate;
    if (rawDate.includes("/")) {
      const [d, m, y] = rawDate.split("/");
      date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    const rawAmt = cols[amtIdx].replace(/\./g, "").replace(",", ".");
    return {
      transaction_date: date,
      amount: Number(rawAmt),
      description: descIdx >= 0 ? cols[descIdx] : undefined,
      document_number: docIdx >= 0 ? cols[docIdx] : undefined,
      memo: descIdx >= 0 ? cols[descIdx] : undefined,
    };
  }).filter((t) => !isNaN(t.amount) && t.transaction_date);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { account_id, file_name, file_format, file_content } = await req.json();

    if (!account_id || !file_content || !file_format) {
      return new Response(JSON.stringify({ error: "Parâmetros obrigatórios faltando" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const txs = file_format.toUpperCase() === "OFX" ? parseOFX(file_content) : parseCSV(file_content);

    if (txs.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhuma transação encontrada no arquivo" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data, error } = await supabase.rpc("import_bank_transactions", {
      _account_id: account_id,
      _file_name: file_name,
      _file_format: file_format.toUpperCase(),
      _transactions: txs,
    });

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("import-bank-statement error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
