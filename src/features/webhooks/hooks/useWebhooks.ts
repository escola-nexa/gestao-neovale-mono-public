import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useCallback } from 'react';
import { webhooksApi } from '@/features/webhooks/api';

export interface Webhook {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  target_url: string;
  secret: string;
  event_types: string[];
  headers: Record<string, string>;
  is_active: boolean;
  failure_count: number;
  last_triggered_at: string | null;
  last_failure_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useWebhooks() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setWebhooks((data || []) as unknown as Webhook[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { webhooks, loading, error, refetch: fetch };
}

export function useWebhook(id: string | undefined) {
  const [webhook, setWebhook] = useState<Webhook | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    const { data } = await webhooksApi.client.from('webhooks').select('*').eq('id', id).maybeSingle();
    setWebhook(data as unknown as Webhook | null);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { webhook, loading, refetch: fetch };
}

export function generateSecret(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return 'whsec_' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}
