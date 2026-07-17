import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Info, ShieldAlert } from 'lucide-react';
import {
  FinancialParty,
  FinancialPartyType,
  useFinancialCategories,
  useFinancialCostCenters,
  useFinancialPaymentMethods,
  useProfessorsForBeneficiary,
  useSaveRegister,
} from '../useFinancialRegisters';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: FinancialParty | null;
}

const PARTY_TYPES: { v: FinancialPartyType; l: string }[] = [
  { v: 'SUPPLIER', l: 'Fornecedor' },
  { v: 'CUSTOMER', l: 'Cliente' },
  { v: 'BENEFICIARY', l: 'Beneficiário' },
  { v: 'EMPLOYEE', l: 'Colaborador' },
  { v: 'PROFESSOR', l: 'Professor' },
  { v: 'GOVERNMENT', l: 'Governo / Órgão público' },
  { v: 'OTHER', l: 'Outro' },
];

const DOC_TYPES = [
  { v: 'CPF', l: 'CPF' },
  { v: 'CNPJ', l: 'CNPJ' },
  { v: 'PASSPORT', l: 'Passaporte' },
  { v: 'OTHER', l: 'Outro' },
];

export default function BeneficiarioDialog({ open, onOpenChange, initial }: Props) {
  const save = useSaveRegister<any>('financial_parties', 'Beneficiário');
  const { data: professors = [] } = useProfessorsForBeneficiary();

  const { data: categories = [] } = useFinancialCategories();
  const { data: costCenters = [] } = useFinancialCostCenters();
  const { data: methods = [] } = useFinancialPaymentMethods();

  const [form, setForm] = useState<any>(
    initial ?? {
      party_type: 'SUPPLIER',
      party_types: ['SUPPLIER'],
      person_type: 'PJ',
      name: '',
      legal_name: '',
      trade_name: '',
      document_type: 'CNPJ',
      document: '',
      state_registration: '',
      email: '',
      phone: '',
      pix_key: '',
      pix_key_type: null,
      bank_name: '',
      bank_agency: '',
      bank_account: '',
      professor_id: null,
      profile_id: null,
      default_category_id: null,
      default_cost_center_id: null,
      default_payment_method_id: null,
      is_blocked: false,
      block_reason: '',
      notes: '',
      active: true,
    },
  );

  const toggleType = (t: FinancialPartyType) => {
    const cur: FinancialPartyType[] = form.party_types ?? [];
    const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t];
    setForm({
      ...form,
      party_types: next.length ? next : [form.party_type],
      party_type: next.includes(form.party_type) ? form.party_type : (next[0] ?? form.party_type),
    });
  };

  const onPickProfessor = (professorId: string | null) => {
    if (!professorId) {
      setForm({ ...form, professor_id: null });
      return;
    }
    const p = professors.find((x: any) => x.id === professorId);
    if (!p) return;
    setForm({
      ...form,
      professor_id: professorId,
      name: p.full_name,
      document_type: 'CPF',
      document: p.cpf ?? form.document,
      party_type: 'BENEFICIARY',
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await save.mutateAsync(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initial ? 'Editar beneficiário' : 'Novo beneficiário'}
          </DialogTitle>
          <DialogDescription>
            Cadastre fornecedores, clientes e beneficiários. Professores já cadastrados
            podem ser vinculados sem duplicar dados.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Pessoa *</Label>
            <Select
              value={form.person_type}
              onValueChange={(v) =>
                setForm({ ...form, person_type: v, document_type: v === 'PF' ? 'CPF' : 'CNPJ' })
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PF">Pessoa Física</SelectItem>
                <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo principal *</Label>
            <Select
              value={form.party_type}
              onValueChange={(v) => {
                const types: FinancialPartyType[] = form.party_types?.includes(v)
                  ? form.party_types
                  : [...(form.party_types ?? []), v as FinancialPartyType];
                setForm({ ...form, party_type: v, party_types: types });
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PARTY_TYPES.map((t) => (
                  <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2 rounded-md border p-3 space-y-2">
            <Label className="text-sm">Atua também como</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PARTY_TYPES.map((t) => (
                <label key={t.v} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={(form.party_types ?? []).includes(t.v)}
                    onCheckedChange={() => toggleType(t.v)}
                  />
                  {t.l}
                </label>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2">
            <Label>Vincular a um professor existente</Label>
            <SearchableSelect
              value={form.professor_id ?? ''}
              onValueChange={(v) => onPickProfessor(v || null)}
              options={[
                { value: '', label: '— Nenhum —' },
                ...professors.map((p: any) => ({
                  value: p.id,
                  label: `${p.full_name}${p.cpf ? ' · ' + p.cpf : ''}`,
                })),
              ]}
              placeholder="Selecione um professor..."
            />
            {form.professor_id && (
              <Alert className="mt-2">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Dados preenchidos a partir do cadastro do professor — não há duplicação.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="sm:col-span-2">
            <Label>{form.person_type === 'PF' ? 'Nome completo *' : 'Razão social *'}</Label>
            <Input
              required
              value={form.legal_name ?? form.name ?? ''}
              onChange={(e) =>
                setForm({ ...form, legal_name: e.target.value, name: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Nome fantasia</Label>
            <Input
              value={form.trade_name ?? ''}
              onChange={(e) => setForm({ ...form, trade_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Inscrição estadual</Label>
            <Input
              value={form.state_registration ?? ''}
              onChange={(e) => setForm({ ...form, state_registration: e.target.value })}
              disabled={form.person_type === 'PF'}
            />
          </div>

          <div>
            <Label>Tipo documento</Label>
            <Select
              value={form.document_type ?? ''}
              onValueChange={(v) => setForm({ ...form, document_type: v || null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((d) => (
                  <SelectItem key={d.v} value={d.v}>
                    {d.l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Documento</Label>
            <Input
              value={form.document ?? ''}
              onChange={(e) => setForm({ ...form, document: e.target.value })}
            />
          </div>

          <div>
            <Label>E-mail</Label>
            <Input
              type="email"
              value={form.email ?? ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input
              value={form.phone ?? ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div>
            <Label>Banco</Label>
            <Input
              value={form.bank_name ?? ''}
              onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Agência / Conta</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Agência"
                value={form.bank_agency ?? ''}
                onChange={(e) => setForm({ ...form, bank_agency: e.target.value })}
              />
              <Input
                placeholder="Conta"
                value={form.bank_account ?? ''}
                onChange={(e) => setForm({ ...form, bank_account: e.target.value })}
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <Label>Chave Pix</Label>
            <Input
              value={form.pix_key ?? ''}
              onChange={(e) => setForm({ ...form, pix_key: e.target.value })}
            />
          </div>

          <div className="sm:col-span-2 rounded-md border p-3 space-y-3">
            <Label className="text-sm font-medium">Padrões financeiros (opcional)</Label>
            <p className="text-xs text-muted-foreground">
              Preenchem novos títulos automaticamente — podem ser alterados na criação do título.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-xs">Categoria padrão</Label>
                <SearchableSelect
                  value={form.default_category_id ?? ''}
                  onValueChange={(v) => setForm({ ...form, default_category_id: v || null })}
                  options={[
                    { value: '', label: '—' },
                    ...categories
                      .filter((c) => c.accepts_entries && c.active)
                      .map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  placeholder="—"
                />
              </div>
              <div>
                <Label className="text-xs">Centro de custo padrão</Label>
                <SearchableSelect
                  value={form.default_cost_center_id ?? ''}
                  onValueChange={(v) => setForm({ ...form, default_cost_center_id: v || null })}
                  options={[
                    { value: '', label: '—' },
                    ...costCenters
                      .filter((c) => c.allows_allocations && c.active)
                      .map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  placeholder="—"
                />
              </div>
              <div>
                <Label className="text-xs">Método padrão</Label>
                <SearchableSelect
                  value={form.default_payment_method_id ?? ''}
                  onValueChange={(v) => setForm({ ...form, default_payment_method_id: v || null })}
                  options={[
                    { value: '', label: '—' },
                    ...methods.filter((m) => m.active).map((m) => ({ value: m.id, label: m.name })),
                  ]}
                  placeholder="—"
                />
              </div>
            </div>
          </div>

          <div className="sm:col-span-2 rounded-md border border-destructive/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-destructive" />
                <Label className="text-sm font-medium">Bloquear novos pagamentos</Label>
              </div>
              <Switch
                checked={!!form.is_blocked}
                onCheckedChange={(v) => setForm({ ...form, is_blocked: v })}
              />
            </div>
            {form.is_blocked && (
              <Input
                placeholder="Motivo do bloqueio *"
                value={form.block_reason ?? ''}
                onChange={(e) => setForm({ ...form, block_reason: e.target.value })}
                required
              />
            )}
          </div>

          <div className="sm:col-span-2">
            <Label>Observações</Label>
            <Textarea
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-2">
            <Switch
              checked={!!form.active}
              onCheckedChange={(v) => setForm({ ...form, active: v })}
            />
            <Label className="text-sm">Ativo</Label>
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
