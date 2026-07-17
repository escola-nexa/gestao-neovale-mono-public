import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Loader2, Save, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from '@/hooks/use-toast';
import { substitutionApi } from './api';
import { useOrganization } from '@/hooks/useOrganization';

type Form = {
  default_hour_class_value: number;
  payment_approval_required: boolean;
  require_signed_report_for_payment: boolean;
  require_receipt_for_payment: boolean;
  use_financial_module: boolean;
  default_financial_category_id: string | null;
  default_financial_cost_center_id: string | null;
  default_financial_account_id: string | null;
  default_financial_payment_method_id: string | null;
};

const DEFAULTS: Form = {
  default_hour_class_value: 0,
  payment_approval_required: true,
  require_signed_report_for_payment: true,
  require_receipt_for_payment: true,
  use_financial_module: false,
  default_financial_category_id: null,
  default_financial_cost_center_id: null,
  default_financial_account_id: null,
  default_financial_payment_method_id: null,
};

function useFinancialOptions(orgId?: string | null) {
  return useQuery({
    queryKey: ['fin-options', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const data = await substitutionApi.getFinancialOptions(orgId!);
      return {
        categories: (data.categories || []).filter((c: any) => !c.kind || c.kind === 'expense' || c.kind === 'both'),
        costCenters: data.costCenters || [],
        accounts: data.accounts || [],
        methods: data.paymentMethods || [],
      };
    },
  });
}

export default function SubstituicaoConfiguracoesPage() {
  const { organizationId } = useOrganization();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(DEFAULTS);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['tsr_settings', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const data = await substitutionApi.getSettings(organizationId!);
      return data || DEFAULTS;
    },
  });

  useEffect(() => {
    if (settings) setForm((f) => ({ ...f, ...settings }));
  }, [settings]);

  const { data: opts } = useFinancialOptions(organizationId);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, organization_id: organizationId };
      await substitutionApi.updateSettings(organizationId!, payload);
    },
    onSuccess: () => {
      toast({ title: 'Configurações salvas' });
      qc.invalidateQueries({ queryKey: ['tsr_settings', organizationId] });
    },
    onError: (e: any) => toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const finOn = form.use_financial_module;
  const finReady = finOn && form.default_financial_category_id && form.default_financial_account_id;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Settings}
        breadcrumbs={[
          { label: 'Presença dos Professores', href: '/presenca-professores' },
          { label: 'Substituição', href: '/presenca-professores/substituicao' },
          { label: 'Configurações' },
        ]}
        title="Configurações — Substituição"
        description="Defina valor de hora-aula, regras de pagamento e integração com o módulo financeiro."
      />

      <Card>
        <CardContent className="pt-5 space-y-6">
          <section className="space-y-3">
            <h3 className="font-semibold">Pagamento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Valor padrão da hora-aula (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.default_hour_class_value}
                  onChange={(e) => setForm({ ...form, default_hour_class_value: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
            <Toggle label="Exigir aprovação do pagamento" checked={form.payment_approval_required}
              onChange={(v) => setForm({ ...form, payment_approval_required: v })} />
            <Toggle label="Exigir relatório assinado para pagar" checked={form.require_signed_report_for_payment}
              onChange={(v) => setForm({ ...form, require_signed_report_for_payment: v })} />
            <Toggle label="Exigir recibo para pagar" checked={form.require_receipt_for_payment}
              onChange={(v) => setForm({ ...form, require_receipt_for_payment: v })} />
          </section>

          <section className="space-y-3 border-t pt-5">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Integração com Contas a Pagar</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Quando ativado, a aprovação de cada pagamento gera automaticamente um título no módulo financeiro,
              tendo o professor substituto como beneficiário. O pagamento da substituição é confirmado quando o
              título é marcado como pago no financeiro.
            </p>

            <Toggle
              label="Usar módulo financeiro (Contas a Pagar)"
              checked={form.use_financial_module}
              onChange={(v) => setForm({ ...form, use_financial_module: v })}
            />

            {finOn && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Categoria padrão *</Label>
                  <SearchableSelect
                    value={form.default_financial_category_id ?? ''}
                    onValueChange={(v) => setForm({ ...form, default_financial_category_id: v || null })}
                    options={(opts?.categories ?? []).map((c) => ({ value: c.id, label: c.name }))}
                    placeholder="Selecione..."
                  />
                </div>
                <div>
                  <Label>Centro de custo padrão</Label>
                  <SearchableSelect
                    value={form.default_financial_cost_center_id ?? ''}
                    onValueChange={(v) => setForm({ ...form, default_financial_cost_center_id: v || null })}
                    options={(opts?.costCenters ?? []).map((c) => ({ value: c.id, label: c.name }))}
                    placeholder="Selecione..."
                  />
                </div>
                <div>
                  <Label>Conta financeira padrão *</Label>
                  <SearchableSelect
                    value={form.default_financial_account_id ?? ''}
                    onValueChange={(v) => setForm({ ...form, default_financial_account_id: v || null })}
                    options={(opts?.accounts ?? []).map((c) => ({ value: c.id, label: c.name }))}
                    placeholder="Selecione..."
                  />
                </div>
                <div>
                  <Label>Método de pagamento padrão</Label>
                  <SearchableSelect
                    value={form.default_financial_payment_method_id ?? ''}
                    onValueChange={(v) => setForm({ ...form, default_financial_payment_method_id: v || null })}
                    options={(opts?.methods ?? []).map((c) => ({ value: c.id, label: c.name }))}
                    placeholder="Selecione..."
                  />
                </div>
              </div>
            )}

            {finOn && !finReady && (
              <p className="text-xs text-amber-600">
                Defina ao menos categoria e conta padrão para que a integração funcione.
              </p>
            )}
          </section>

          <div className="flex justify-end">
            <Button onClick={() => save.mutate()} disabled={save.isPending || (finOn && !finReady)}>
              {save.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar configurações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
