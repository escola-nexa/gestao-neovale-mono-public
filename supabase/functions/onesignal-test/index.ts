// OneSignal connection tester
// Validates app_id + rest_api_key by calling GET /apps/{app_id}
// Returns structured diagnostics + remediation hints
// deno-lint-ignore-file
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ErrorCode =
  | 'NOT_CONFIGURED'
  | 'INVALID_APP_ID_FORMAT'
  | 'UNAUTHORIZED'
  | 'APP_NOT_FOUND'
  | 'APP_ID_MISMATCH'
  | 'NETWORK_ERROR'
  | 'UNEXPECTED';

const REMEDIATIONS: Record<ErrorCode, { title: string; steps: string[] }> = {
  NOT_CONFIGURED: {
    title: 'Credenciais não preenchidas',
    steps: [
      'Preencha o campo "OneSignal App ID" com o ID do seu app (UUID).',
      'Preencha o campo "REST API Key" com a chave secreta (começa com "os_v2_app_…").',
      'Clique em "Salvar configurações" antes de testar novamente.',
    ],
  },
  INVALID_APP_ID_FORMAT: {
    title: 'Formato do App ID inválido',
    steps: [
      'O App ID deve ser um UUID no formato 00000000-0000-0000-0000-000000000000.',
      'No painel da OneSignal: Settings → Keys & IDs → copie o valor de "OneSignal App ID".',
      'Cole exatamente como aparece, sem espaços antes ou depois.',
    ],
  },
  UNAUTHORIZED: {
    title: 'REST API Key inválida ou sem permissão',
    steps: [
      'Verifique se você copiou a "REST API Key" (NÃO a "User Auth Key" nem o "App ID").',
      'No painel da OneSignal: Settings → Keys & IDs → "REST API Key" → clique em copiar.',
      'A chave começa com "os_v2_app_". Cole no campo correspondente e salve.',
      'Se a chave foi rotacionada recentemente, gere uma nova e atualize aqui.',
    ],
  },
  APP_NOT_FOUND: {
    title: 'App não encontrado na OneSignal',
    steps: [
      'O App ID informado não existe (ou foi excluído) na conta da OneSignal.',
      'Confira no painel da OneSignal se o app ainda existe.',
      'Garanta que a "REST API Key" pertence à mesma conta/organização do App ID.',
    ],
  },
  APP_ID_MISMATCH: {
    title: 'App ID não corresponde à REST API Key',
    steps: [
      'A REST API Key pertence a outro app na sua conta OneSignal.',
      'Abra o app correto no painel da OneSignal e copie de novo o par App ID + REST API Key.',
      'Salve e teste novamente.',
    ],
  },
  NETWORK_ERROR: {
    title: 'Falha de rede ao contatar a OneSignal',
    steps: [
      'A API api.onesignal.com não respondeu. Pode ser instabilidade momentânea.',
      'Aguarde 1 minuto e tente de novo.',
      'Se persistir, verifique o status em status.onesignal.com.',
    ],
  },
  UNEXPECTED: {
    title: 'Erro inesperado',
    steps: [
      'Ocorreu um erro fora do padrão. Verifique os detalhes técnicos abaixo.',
      'Se persistir, contate o suporte com o "request_id" retornado pela OneSignal.',
    ],
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const auth = req.headers.get('Authorization');
    if (!auth) return json({ ok: false, code: 'UNAUTHORIZED', error: 'missing auth' }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userData.user) return json({ ok: false, code: 'UNAUTHORIZED', error: 'invalid token' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role, organization_id')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (!roleRow || !['admin', 'coordenador', 'rh'].includes(roleRow.role)) {
      return json({ ok: false, code: 'UNAUTHORIZED', error: 'forbidden' }, 403);
    }

    const body = await req.json().catch(() => ({} as any));
    let appId: string | null = (body?.app_id ?? '').trim() || null;
    let restKey: string | null = (body?.rest_api_key ?? '').trim() || null;

    if (!appId || !restKey) {
      const { data: settings } = await admin
        .from('onesignal_settings')
        .select('app_id, rest_api_key')
        .eq('organization_id', roleRow.organization_id)
        .maybeSingle();
      appId = appId || settings?.app_id || null;
      restKey = restKey || settings?.rest_api_key || null;
    }

    if (!appId || !restKey) {
      return json(buildResp('NOT_CONFIGURED', { http_status: null, response: null }));
    }

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(appId)) {
      return json(buildResp('INVALID_APP_ID_FORMAT', { http_status: null, response: null, app_id: appId }));
    }

    let osRes: Response;
    try {
      osRes = await fetch(`https://api.onesignal.com/apps/${appId}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Key ${restKey}`,
        },
      });
    } catch (e) {
      return json(buildResp('NETWORK_ERROR', { http_status: null, response: { message: (e as Error).message } }));
    }

    const text = await osRes.text();
    let osJson: any = null;
    try { osJson = text ? JSON.parse(text) : null; } catch { osJson = { raw: text }; }

    if (osRes.ok && osJson?.id) {
      if (String(osJson.id).toLowerCase() !== appId.toLowerCase()) {
        return json(buildResp('APP_ID_MISMATCH', { http_status: osRes.status, response: osJson }));
      }
      return json({
        ok: true,
        code: 'OK',
        http_status: osRes.status,
        app: {
          id: osJson.id,
          name: osJson.name ?? null,
          players: osJson.players ?? null,
          messageable_players: osJson.messageable_players ?? null,
          updated_at: osJson.updated_at ?? null,
          created_at: osJson.created_at ?? null,
        },
      });
    }

    if (osRes.status === 401 || osRes.status === 403) {
      return json(buildResp('UNAUTHORIZED', { http_status: osRes.status, response: osJson }));
    }
    if (osRes.status === 404) {
      return json(buildResp('APP_NOT_FOUND', { http_status: osRes.status, response: osJson }));
    }
    return json(buildResp('UNEXPECTED', { http_status: osRes.status, response: osJson }));
  } catch (err) {
    return json({
      ok: false,
      code: 'UNEXPECTED' as ErrorCode,
      error: (err as Error).message,
      remediation: REMEDIATIONS.UNEXPECTED,
    }, 500);
  }
});

function buildResp(code: ErrorCode, extra: Record<string, unknown>) {
  return {
    ok: false,
    code,
    remediation: REMEDIATIONS[code],
    ...extra,
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
