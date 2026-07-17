import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Settings, History } from 'lucide-react';
import { financeiroApi } from '@/features/financeiro/api';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import {
  useFinancialAccounts,
  useFinancialPaymentMethods,
  useFinancialCostCenters,
  useFinancialCategories,
  useFinancialSettings,
  type FinancialSettings,
} from '../cadastros/useFinancialRegisters';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const TIMEZONES = ['America/Sao_Paulo','America/Manaus','America/Belem','America/Fortaleza','America/Recife','America/Cuiaba','America/Rio_Branco','America/Noronha','UTC'];
const IMPORT_FORMATS = ['OFX','CSV','CNAB240','CNAB400','PDF'];

// Fields that require a justification when changed
const CRITICAL_FIELDS: Array<keyof FinancialSettings> = [
  'accounting_basis',
  'fiscal_year_start_month',
  'fiscal_year_start_day',
  'enforce_segregation',
  'enable_budget_control',
  'budget_exceed_action',
  'require_monthly_closure',
  'allow_negative_bank_balance',
];

const defaultForm = (): Partial<FinancialSettings> => ({
  default_currency: 'BRL',
  fiscal_year_start_month: 1,
  fiscal_year_start_day: 1,
  timezone: 'America/Sao_Paulo',
  accounting_basis: 'accrual',
  approval_required_above: null,
  default_account_id: null,
  default_payment_method_id: null,
  default_cost_center_id: null,
  default_substitution_category_id: null,
  default_route_category_id: null,
  require_document_for_approval: true,
  require_receipt_for_payment: true,
  allow_partial_payment: true,
  allow_negative_bank_balance: false,
  enforce_segregation: true,
  enable_budget_control: false,
  budget_exceed_action: 'warn',
  overdue_grace_days: 0,
  auto_number_entries: true,
  entry_prefix: 'FIN',
  batch_prefix: 'LOT',
  require_monthly_closure: false,
  allowed_import_formats: ['OFX', 'CSV', 'CNAB240', 'CNAB400'],
  allow_physical_delete: false,
  notes: '',
});

export default function ConfiguracoesFinanceirasPage() {
  const { organizationId } = useOrganization();
  const { data: settings, isLoading } = useFinancialSettings();
  const { data: accounts = [] } = useFinancialAccounts();
  const { data: methods = [] } = useFinancialPaymentMethods();
  const { data: costCenters = [] } = useFinancialCostCenters();
  const { data: categories = [] } = useFinancialCategories();
  const qc = useQueryClient();

  const [form, setForm] = useState<Partial<FinancialSettings>>(defaultForm());
  const [justification, setJustification] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const auditQuery = useQuery({
    enabled: !!organizationId,
    queryKey: ['financial_settings_audit', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_settings_audit' as any)
        .select('*')
        .eq('organization_id', organizationId!)
        .order('changed_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const criticalChanges = useMemo(() => {
    if (!settings) return [];
    return CRITICAL_FIELDS.filter((k) => (form as any)[k] !== (settings as any)[k]);
  }, [form, settings]);

  const requiresJustification = criticalChanges.length > 0;

  const set = <K extends keyof FinancialSettings>(k: K, v: FinancialSettings[K] | null) =>
    setForm((f) => ({ ...f, [k]: v as any }));

  const toggleFormat = (fmt: string) => {
    const list = new Set(form.allowed_import_formats ?? []);
    list.has(fmt) ? list.delete(fmt) : list.add(fmt);
    set('allowed_import_formats', Array.from(list));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    if (requiresJustification && justification.trim().length < 10) {
      toast.error('Informe uma justificativa (mín. 10 caracteres) para alterações críticas.');
      return;
    }
    setSaving(true);
    try {
      const payload: any = { ...form, organization_id: organizationId };
      let resp;
      if (settings?.id) {
        const { id: _omit, ...rest } = payload;
        resp = await financeiroApi.client.from('financial_settings').update(rest).eq('id', settings.id);
      } else {
        resp = await financeiroApi.client.from('financial_settings').insert(payload);
      }
      if (resp.error) throw resp.error;

      if (requiresJustification && settings?.id) {
        await financeiroApi.client.from('financial_settings_audit' as any).insert({
          organization_id: organizationId,
          settings_id: settings.id,
          action: 'JUSTIFICATION',
          justification,
          diff: criticalChanges.reduce<any>((acc, k) => {
            acc[k] = { old: (settings as any)[k], new: (form as any)[k] };
            return acc;
          }, {}),
        });
      }

      toast.success('Configurações salvas.');
      setJustification('');
      qc.invalidateQueries({ queryKey: ['financial_settings'] });
      qc.invalidateQueries({ queryKey: ['financial_settings_audit'] });
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb
        items={[{ label: 'Financeiro', href: '/financeiro' }, { label: 'Configurações' }]}
      />
      <PageHeader
        icon={Settings}
        title="Configurações Financeiras"
        description="Parâmetros gerais do módulo financeiro da organização."
      />

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Geral */}
        <Card>
          <CardHeader><CardTitle className="text-base">Geral</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Moeda padrão</Label>
              <Input value={form.default_currency ?? 'BRL'} onChange={(e) => set('default_currency', e.target.value)} />
            </div>
            <div>
              <Label>Fuso horário</Label>
              <Select value={form.timezone ?? 'America/Sao_Paulo'} onValueChange={(v) => set('timezone', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Regime gerencial</Label>
              <Select value={form.accounting_basis ?? 'accrual'} onValueChange={(v) => set('accounting_basis', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Caixa</SelectItem>
                  <SelectItem value="accrual">Competência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Mês inicial do exercício</Label>
                <Select value={String(form.fiscal_year_start_month ?? 1)} onValueChange={(v) => set('fiscal_year_start_month', Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dia inicial</Label>
                <Input type="number" min={1} max={28} value={form.fiscal_year_start_day ?? 1}
                  onChange={(e) => set('fiscal_year_start_day', Number(e.target.value))} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Defaults */}
        <Card>
          <CardHeader><CardTitle className="text-base">Padrões de lançamentos</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Conta bancária padrão</Label>
              <SearchableSelect value={form.default_account_id ?? ''} onValueChange={(v) => set('default_account_id', v || null)}
                options={[{ value: '', label: '— Nenhuma —' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]} placeholder="Selecione..." />
            </div>
            <div>
              <Label>Método de pagamento padrão</Label>
              <SearchableSelect value={form.default_payment_method_id ?? ''} onValueChange={(v) => set('default_payment_method_id', v || null)}
                options={[{ value: '', label: '— Nenhum —' }, ...methods.map((m) => ({ value: m.id, label: m.name }))]} placeholder="Selecione..." />
            </div>
            <div>
              <Label>Centro de custo padrão</Label>
              <SearchableSelect value={form.default_cost_center_id ?? ''} onValueChange={(v) => set('default_cost_center_id', v || null)}
                options={[{ value: '', label: '— Nenhum —' }, ...costCenters.map((c: any) => ({ value: c.id, label: c.name }))]} placeholder="Selecione..." />
            </div>
            <div>
              <Label>Categoria padrão — Substituições</Label>
              <SearchableSelect value={form.default_substitution_category_id ?? ''} onValueChange={(v) => set('default_substitution_category_id', v || null)}
                options={[{ value: '', label: '— Nenhuma —' }, ...categories.map((c: any) => ({ value: c.id, label: c.name }))]} placeholder="Selecione..." />
            </div>
            <div>
              <Label>Categoria padrão — Rotas</Label>
              <SearchableSelect value={form.default_route_category_id ?? ''} onValueChange={(v) => set('default_route_category_id', v || null)}
                options={[{ value: '', label: '— Nenhuma —' }, ...categories.map((c: any) => ({ value: c.id, label: c.name }))]} placeholder="Selecione..." />
            </div>
            <div>
              <Label>Aprovação obrigatória acima de (R$)</Label>
              <Input type="number" step="0.01" value={form.approval_required_above ?? ''}
                onChange={(e) => set('approval_required_above', e.target.value === '' ? null : Number(e.target.value))} />
            </div>
          </CardContent>
        </Card>

        {/* Regras operacionais */}
        <Card>
          <CardHeader><CardTitle className="text-base">Regras operacionais</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {[
              ['require_document_for_approval', 'Exigir documento para aprovação'],
              ['require_receipt_for_payment', 'Exigir comprovante para pagamento'],
              ['allow_partial_payment', 'Permitir pagamento parcial'],
              ['allow_negative_bank_balance', 'Permitir saldo bancário negativo'],
              ['enforce_segregation', 'Ativar segregação de funções'],
              ['enable_budget_control', 'Ativar controle orçamentário'],
              ['require_monthly_closure', 'Fechamento mensal obrigatório'],
              ['auto_number_entries', 'Numeração automática de títulos'],
              ['allow_physical_delete', 'Permitir exclusão física (não recomendado)'],
            ].map(([k, label]) => (
              <div key={k} className="flex items-center gap-3">
                <Switch checked={!!(form as any)[k]} onCheckedChange={(v) => set(k as any, v as any)} />
                <Label className="font-normal">{label}</Label>
              </div>
            ))}
            <div>
              <Label>Ação ao exceder orçamento</Label>
              <Select value={form.budget_exceed_action ?? 'warn'} onValueChange={(v) => set('budget_exceed_action', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="warn">Apenas alertar</SelectItem>
                  <SelectItem value="block">Bloquear</SelectItem>
                  <SelectItem value="allow">Permitir sem alerta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Dias para considerar título vencido</Label>
              <Input type="number" min={0} value={form.overdue_grace_days ?? 0}
                onChange={(e) => set('overdue_grace_days', Number(e.target.value))} />
            </div>
            <div>
              <Label>Prefixo de títulos</Label>
              <Input value={form.entry_prefix ?? ''} onChange={(e) => set('entry_prefix', e.target.value.toUpperCase())} />
            </div>
            <div>
              <Label>Prefixo de lotes</Label>
              <Input value={form.batch_prefix ?? ''} onChange={(e) => set('batch_prefix', e.target.value.toUpperCase())} />
            </div>
            <div className="sm:col-span-2">
              <Label>Formatos permitidos de importação bancária</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {IMPORT_FORMATS.map((fmt) => {
                  const active = form.allowed_import_formats?.includes(fmt);
                  return (
                    <Badge key={fmt} variant={active ? 'default' : 'outline'}
                      className="cursor-pointer" onClick={() => toggleFormat(fmt)}>
                      {fmt}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {requiresJustification && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardHeader><CardTitle className="text-base">Justificativa obrigatória</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Você está alterando parâmetros críticos: {criticalChanges.join(', ')}.
                Informe uma justificativa que ficará registrada na auditoria.
              </p>
              <Textarea value={justification} onChange={(e) => setJustification(e.target.value)}
                placeholder="Descreva o motivo da alteração..." rows={3} />
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar configurações'}
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" /> Histórico de alterações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (auditQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma alteração registrada.</p>
          ) : (
            <div className="space-y-3">
              {(auditQuery.data ?? []).map((row: any) => (
                <div key={row.id} className="border rounded-md p-3 text-sm">
                  <div className="flex justify-between gap-2 mb-1">
                    <Badge variant="outline">{row.action}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(row.changed_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  {row.justification && (
                    <p className="text-xs italic text-muted-foreground mb-1">"{row.justification}"</p>
                  )}
                  <pre className="text-xs bg-muted/40 rounded p-2 overflow-auto max-h-40">
                    {JSON.stringify(row.diff, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
