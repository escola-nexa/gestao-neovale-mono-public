import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Webhook, Save, RefreshCw, Copy, Eye, EyeOff, Loader2, Trash2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { webhooksApi } from '@/features/webhooks/api';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { WEBHOOK_DOMAINS } from './eventCatalog';
import { generateSecret, useWebhook } from './hooks/useWebhooks';

export default function WebhookFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { webhook, loading: loadingWh } = useWebhook(id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [headers, setHeaders] = useState<{ k: string; v: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (webhook) {
      setName(webhook.name);
      setDescription(webhook.description || '');
      setTargetUrl(webhook.target_url);
      setSecret(webhook.secret);
      setEvents(webhook.event_types || []);
      setIsActive(webhook.is_active);
      setHeaders(Object.entries(webhook.headers || {}).map(([k, v]) => ({ k, v: String(v) })));
    } else if (!isEdit) {
      setSecret(generateSecret());
    }
  }, [webhook, isEdit]);

  function toggleEvent(type: string) {
    setEvents((cur) => cur.includes(type) ? cur.filter((e) => e !== type) : [...cur, type]);
  }
  function toggleDomain(domainKey: string, allTypes: string[], allSelected: boolean) {
    setEvents((cur) => allSelected ? cur.filter((e) => !allTypes.includes(e)) : Array.from(new Set([...cur, ...allTypes])));
  }
  function copy(value: string, label = 'Copiado') {
    navigator.clipboard.writeText(value); toast({ title: label });
  }

  async function save() {
    if (!name.trim()) { toast({ title: 'Informe um nome', variant: 'destructive' }); return; }
    if (!/^https:\/\//i.test(targetUrl)) { toast({ title: 'URL deve começar com https://', variant: 'destructive' }); return; }
    if (events.length === 0) { toast({ title: 'Selecione ao menos um evento', variant: 'destructive' }); return; }

    const headersObj = headers.reduce<Record<string, string>>((acc, h) => {
      if (h.k.trim()) acc[h.k.trim()] = h.v;
      return acc;
    }, {});

    setSaving(true);
    if (isEdit && id) {
      const { error } = await webhooksApi.client.from('webhooks').update({
        name, description: description || null, target_url: targetUrl, secret,
        event_types: events, headers: headersObj, is_active: isActive,
      }).eq('id', id);
      setSaving(false);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Webhook atualizado' }); navigate('/webhooks');
    } else {
      // org do usuário
      const { data: orgRow } = await webhooksApi.client.from('user_roles').select('organization_id').eq('user_id', user!.id).limit(1).maybeSingle();
      if (!orgRow) { setSaving(false); toast({ title: 'Organização não encontrada', variant: 'destructive' }); return; }
      const { error } = await webhooksApi.client.from('webhooks').insert({
        organization_id: orgRow.organization_id,
        name, description: description || null, target_url: targetUrl, secret,
        event_types: events, headers: headersObj, is_active: isActive,
        created_by: user!.id,
      });
      setSaving(false);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Webhook criado', description: 'Guarde o segredo agora — ele ficará oculto depois.' });
      navigate('/webhooks');
    }
  }

  if (isEdit && loadingWh) {
    return <div className="p-12 flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Administração' }, { label: 'Webhooks', href: '/webhooks' }, { label: isEdit ? 'Editar' : 'Novo' }]}
        title={isEdit ? 'Editar webhook' : 'Novo webhook'}
        description="Configure o endpoint, escolha os eventos e ative para começar a receber notificações."
        icon={Webhook}
        backTo="/webhooks"
        actions={<Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Salvar</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">Identificação</h3>
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Integração com n8n" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Para que serve este webhook?" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>URL de destino *</Label>
              <Input value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://api.exemplo.com/webhook" />
              <p className="text-xs text-muted-foreground">Apenas HTTPS. IPs privados são bloqueados.</p>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Ativo</Label>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div>
              <h3 className="font-semibold">Eventos inscritos</h3>
              <p className="text-sm text-muted-foreground">Escolha quais eventos do sistema vão acionar este webhook.</p>
            </div>
            <Accordion type="multiple" className="w-full">
              {WEBHOOK_DOMAINS.map((d) => {
                const allTypes = d.events.map((e) => e.type);
                const selectedCount = allTypes.filter((t) => events.includes(t)).length;
                const allSelected = selectedCount === allTypes.length;
                return (
                  <AccordionItem key={d.key} value={d.key}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-3">
                        <span>{d.label}</span>
                        {selectedCount > 0 && <Badge variant="secondary">{selectedCount}/{allTypes.length}</Badge>}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{d.description}</p>
                        <Button size="sm" variant="ghost" onClick={() => toggleDomain(d.key, allTypes, allSelected)}>
                          {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {d.events.map((ev) => (
                          <label key={ev.type} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer">
                            <Checkbox checked={events.includes(ev.type)} onCheckedChange={() => toggleEvent(ev.type)} className="mt-0.5" />
                            <div className="text-sm">
                              <div className="font-medium">{ev.label}</div>
                              <div className="text-xs text-muted-foreground font-mono">{ev.type}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Headers customizados</h3>
                <p className="text-sm text-muted-foreground">Opcionais — enviados em todas as chamadas.</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setHeaders([...headers, { k: '', v: '' }])}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
            {headers.map((h, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="X-Custom-Header" value={h.k} onChange={(e) => { const c = [...headers]; c[i].k = e.target.value; setHeaders(c); }} />
                <Input placeholder="valor" value={h.v} onChange={(e) => { const c = [...headers]; c[i].v = e.target.value; setHeaders(c); }} />
                <Button size="icon" variant="ghost" onClick={() => setHeaders(headers.filter((_, x) => x !== i))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Segredo (HMAC)</h3>
              <Button size="sm" variant="ghost" onClick={() => { setSecret(generateSecret()); toast({ title: 'Novo segredo gerado' }); }}>
                <RefreshCw className="h-3 w-3 mr-1" /> Regenerar
              </Button>
            </div>
            <div className="flex gap-2">
              <Input value={showSecret ? secret : '•'.repeat(Math.min(secret.length, 32))} readOnly className="font-mono text-xs" />
              <Button size="icon" variant="ghost" onClick={() => setShowSecret(!showSecret)}>{showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
              <Button size="icon" variant="ghost" onClick={() => copy(secret, 'Segredo copiado')}><Copy className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use este valor para validar a assinatura no header <code className="text-foreground">X-Neovale-Signature</code>.
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <h3 className="font-semibold text-sm">Como validar a assinatura</h3>
            <pre className="text-[11px] bg-muted p-3 rounded font-mono overflow-x-auto whitespace-pre-wrap">{`// Node.js
const crypto = require('crypto');
const sig = req.headers['x-neovale-signature']; // sha256=...
const expected = 'sha256=' + crypto
  .createHmac('sha256', SECRET)
  .update(rawBody)
  .digest('hex');
if (sig !== expected) reject('Invalid');`}</pre>
          </Card>

          <Card className="p-6 space-y-3">
            <h3 className="font-semibold text-sm">Exemplo de payload</h3>
            <pre className="text-[11px] bg-muted p-3 rounded font-mono overflow-x-auto whitespace-pre-wrap">{`{
  "id": "uuid",
  "event": "school.created",
  "created_at": "2026-04-23T...",
  "organization_id": "uuid",
  "delivery_id": "uuid",
  "attempt": 1,
  "data": { ... }
}`}</pre>
          </Card>
        </div>
      </div>
    </div>
  );
}
