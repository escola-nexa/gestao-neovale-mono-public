import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import type { ProfessorDocumentData } from '../../hooks/useProfessorDocuments';
import { useAutoSavePatch } from './useAutoSavePatch';

interface Props {
  doc: ProfessorDocumentData;
  canEdit: boolean;
  saving: boolean;
  onSave: (patch: Partial<ProfessorDocumentData>) => Promise<void>;
  /** Opcional: salva em background sem trocar de aba (auto-save). */
  onAutoSave?: (patch: Partial<ProfessorDocumentData>) => Promise<void>;
}

const PIX_TYPES = ['CPF', 'E-mail', 'Telefone', 'Chave aleatória'];

export function BankingTab({ doc, canEdit, saving, onSave, onAutoSave }: Props) {
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    setForm({
      bank_name: doc.bank_name || '',
      bank_branch: doc.bank_branch || '',
      bank_account: doc.bank_account || '',
      has_sicredi_account: !!doc.has_sicredi_account,
      pix_type: doc.pix_type || '',
      pix_key: doc.pix_key || '',
    });
  }, [doc]);

  // Auto-save silencioso a cada 1.5s de inatividade.
  useAutoSavePatch({
    form,
    original: {
      bank_name: doc.bank_name || '',
      bank_branch: doc.bank_branch || '',
      bank_account: doc.bank_account || '',
      has_sicredi_account: !!doc.has_sicredi_account,
      pix_type: doc.pix_type || '',
      pix_key: doc.pix_key || '',
    },
    enabled: canEdit && !!onAutoSave,
    onAutoSave,
  });

  const handleSave = () => {
    const required = [
      { key: 'bank_name', label: 'Banco' },
      { key: 'bank_branch', label: 'Agência' },
      { key: 'bank_account', label: 'Conta' },
    ];
    const missing = required.filter(r => !String(form[r.key] || '').trim()).map(r => r.label);
    if (missing.length > 0) {
      toast.error(`Preencha os campos obrigatórios: ${missing.join(', ')}`);
      return;
    }
    onSave({
      bank_name: form.bank_name || null,
      bank_branch: form.bank_branch || null,
      bank_account: form.bank_account || null,
      has_sicredi_account: form.has_sicredi_account,
      pix_type: form.pix_type || null,
      pix_key: form.pix_key || null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2 md:col-span-1">
          <Label>Banco <span className="text-destructive">*</span></Label>
          <Input value={form.bank_name ?? ''} disabled={!canEdit} required aria-required="true"
            onChange={e => setForm({ ...form, bank_name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Agência <span className="text-destructive">*</span></Label>
          <Input value={form.bank_branch ?? ''} disabled={!canEdit} required aria-required="true"
            onChange={e => setForm({ ...form, bank_branch: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Conta <span className="text-destructive">*</span></Label>
          <Input value={form.bank_account ?? ''} disabled={!canEdit} required aria-required="true"
            onChange={e => setForm({ ...form, bank_account: e.target.value })} />
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 rounded-md bg-muted/40">
        <Switch checked={!!form.has_sicredi_account} disabled={!canEdit}
          onCheckedChange={v => setForm({ ...form, has_sicredi_account: v })} />
        <Label className="cursor-pointer">Possui conta no Sicredi</Label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Tipo de chave Pix</Label>
          <Select value={form.pix_type || ''} disabled={!canEdit}
            onValueChange={v => setForm({ ...form, pix_type: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {PIX_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Chave Pix</Label>
          <Input value={form.pix_key ?? ''} disabled={!canEdit}
            onChange={e => setForm({ ...form, pix_key: e.target.value })} />
        </div>
      </div>

      {canEdit && (
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> Salvar bancário
          </Button>
        </div>
      )}
    </div>
  );
}
