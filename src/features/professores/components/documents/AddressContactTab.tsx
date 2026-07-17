import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';
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

const FIELDS: Array<{ key: keyof ProfessorDocumentData; label: string; type?: string; cols?: string }> = [
  { key: 'email', label: 'E-mail', type: 'email', cols: 'md:col-span-2' },
  { key: 'phone', label: 'Telefone' },
  { key: 'zip_code', label: 'CEP', cols: '' },
  { key: 'address', label: 'Endereço', cols: 'md:col-span-2' },
  { key: 'address_complement', label: 'Complemento' },
  { key: 'neighborhood', label: 'Bairro' },
  { key: 'address_city', label: 'Cidade' },
  { key: 'address_state', label: 'UF' },
];

function formatCep(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return digits;
}

export function AddressContactTab({ doc, canEdit, saving, onSave, onAutoSave }: Props) {
  const [form, setForm] = useState<any>({});
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    const initial: any = {};
    FIELDS.forEach(f => { initial[f.key] = doc[f.key] ?? ''; });
    setForm(initial);
  }, [doc]);

  // Auto-save silencioso a cada 1.5s de inatividade.
  useAutoSavePatch({
    form,
    original: Object.fromEntries(FIELDS.map(f => [f.key, (doc as any)[f.key] ?? ''])) as any,
    enabled: canEdit && !!onAutoSave && !cepLoading,
    onAutoSave,
  });

  const lookupCep = async (rawCep: string) => {
    const digits = rawCep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data?.erro) {
        toast.error('CEP não encontrado');
        return;
      }
      setForm((prev: any) => ({
        ...prev,
        address: data.logradouro || prev.address || '',
        neighborhood: data.bairro || prev.neighborhood || '',
        address_city: data.localidade || prev.address_city || '',
        address_state: data.uf || prev.address_state || '',
        address_complement: prev.address_complement || data.complemento || '',
      }));
      toast.success('Endereço preenchido pelo CEP');
    } catch (err) {
      toast.error('Não foi possível consultar o CEP');
    } finally {
      setCepLoading(false);
    }
  };

  const handleCepChange = (value: string) => {
    const formatted = formatCep(value);
    setForm({ ...form, zip_code: formatted });
    if (formatted.replace(/\D/g, '').length === 8) {
      lookupCep(formatted);
    }
  };

  const handleSave = () => {
    const patch: any = {};
    const missing: string[] = [];
    FIELDS.forEach(f => {
      const v = form[f.key];
      const isEmpty = v === '' || v === null || v === undefined;
      if (isEmpty) missing.push(f.label);
      patch[f.key] = isEmpty ? null : v;
    });
    if (missing.length > 0) {
      toast.error(`Preencha todos os campos obrigatórios: ${missing.join(', ')}`);
      return;
    }
    onSave(patch);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FIELDS.map(f => {
          if (f.key === 'zip_code') {
            return (
              <div key="zip_code" className="space-y-2">
                <Label>
                  CEP <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    value={form.zip_code ?? ''}
                    disabled={!canEdit || cepLoading}
                    placeholder="00000-000"
                    inputMode="numeric"
                    maxLength={9}
                    required
                    aria-required="true"
                    onChange={e => handleCepChange(e.target.value)}
                    onBlur={e => lookupCep(e.target.value)}
                  />
                  {cepLoading && (
                    <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Preenchimento automático via ViaCEP</p>
              </div>
            );
          }
          return (
            <div key={String(f.key)} className={`space-y-2 ${f.cols || ''}`}>
              <Label>
                {f.label} <span className="text-destructive">*</span>
              </Label>
              <Input
                type={f.type || 'text'}
                value={form[f.key] ?? ''}
                disabled={!canEdit}
                required
                aria-required="true"
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
              />
            </div>
          );
        })}
      </div>
      {canEdit && (
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> Salvar endereço
          </Button>
        </div>
      )}
    </div>
  );
}
