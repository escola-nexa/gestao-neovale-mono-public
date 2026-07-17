import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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

type FieldDef = {
  key: keyof ProfessorDocumentData;
  label: string;
  type?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  optional?: boolean;
};

const SHIRT_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'];

const MARITAL_STATUS = [
  'Solteiro(a)',
  'Casado(a)',
  'União Estável',
  'Divorciado(a)',
  'Separado(a)',
  'Viúvo(a)',
];

const EDUCATION_LEVELS = [
  'Ensino Fundamental Incompleto',
  'Ensino Fundamental Completo',
  'Ensino Médio Incompleto',
  'Ensino Médio Completo',
  'Ensino Técnico',
  'Ensino Superior Incompleto',
  'Ensino Superior Completo',
  'Pós-graduação',
  'Mestrado',
  'Doutorado',
  'Pós-doutorado',
];

const SKIN_COLORS = [
  'Branca',
  'Preta',
  'Parda',
  'Amarela',
  'Indígena',
  'Não declarado',
];

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const toOpts = (arr: string[]) => arr.map(v => ({ value: v, label: v }));

const FIELDS: FieldDef[] = [
  { key: 'full_name', label: 'Nome completo' },
  { key: 'social_name' as keyof ProfessorDocumentData, label: 'Nome social', placeholder: 'Opcional', optional: true },
  { key: 'nationality', label: 'Nacionalidade', placeholder: 'Brasileira' },
  { key: 'birth_city', label: 'Cidade de nascimento' },
  { key: 'birth_state', label: 'UF de nascimento', placeholder: 'SP' },
  { key: 'birth_date', label: 'Data de nascimento', type: 'date' },
  { key: 'marital_status', label: 'Estado civil', type: 'select', options: toOpts(MARITAL_STATUS) },
  { key: 'education_level', label: 'Grau de instrução', type: 'select', options: toOpts(EDUCATION_LEVELS) },
  { key: 'gender', label: 'Sexo', type: 'gender' },
  { key: 'race', label: 'Cor', type: 'select', options: toOpts(SKIN_COLORS) },
  { key: 'blood_type', label: 'Tipo sanguíneo', type: 'select', options: toOpts(BLOOD_TYPES) },
  {
    key: 'shirt_size' as keyof ProfessorDocumentData,
    label: 'Tamanho de camisa',
    type: 'select',
    options: toOpts(SHIRT_SIZES),
  },
  { key: 'phone', label: 'Telefone de contato', placeholder: '(00) 00000-0000' },
  { key: 'email', label: 'E-mail de contato', type: 'email', placeholder: 'nome@dominio.com' },
];

export function PersonalDataTab({ doc, canEdit, saving, onSave, onAutoSave }: Props) {
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    const initial: any = {};
    FIELDS.forEach(f => { initial[f.key] = (doc as any)[f.key] ?? ''; });
    setForm(initial);
  }, [doc]);

  // Auto-save silencioso a cada 1.5s de inatividade.
  useAutoSavePatch({
    form,
    original: Object.fromEntries(FIELDS.map(f => [f.key, (doc as any)[f.key] ?? ''])) as any,
    enabled: canEdit && !!onAutoSave,
    onAutoSave,
  });

  const handleSave = () => {
    const patch: any = {};
    const missing: string[] = [];
    FIELDS.forEach(f => {
      const v = form[f.key];
      const isEmpty = v === '' || v === null || v === undefined;
      if (isEmpty && !f.optional) missing.push(f.label);
      if (f.type === 'number') patch[f.key] = isEmpty ? null : Number(v);
      else patch[f.key] = isEmpty ? null : v;
    });
    if (missing.length > 0) {
      toast.error(`Preencha todos os campos obrigatórios: ${missing.join(', ')}`);
      return;
    }
    onSave(patch);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FIELDS.map(f => (
          <div key={String(f.key)} className="space-y-2">
            <Label>
              {f.label} {!f.optional && <span className="text-destructive">*</span>}
            </Label>
            {f.type === 'gender' ? (
              <RadioGroup
                value={form[f.key] || ''}
                disabled={!canEdit}
                onValueChange={(v) => setForm({ ...form, [f.key]: v })}
                className="flex flex-wrap gap-4 pt-2"
              >
                {[
                  { value: 'Homem', label: 'Homem' },
                  { value: 'Mulher', label: 'Mulher' },
                  { value: 'Outros', label: 'Outros' },
                ].map(opt => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt.value} id={`gender-${opt.value}`} />
                    <Label htmlFor={`gender-${opt.value}`} className="cursor-pointer font-normal">
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : f.type === 'select' ? (
              <Select
                value={form[f.key] || ''}
                disabled={!canEdit}
                onValueChange={(v) => setForm({ ...form, [f.key]: v })}
              >
                <SelectTrigger aria-required="true">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {f.options?.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={f.type || 'text'}
                step={f.type === 'number' ? '0.01' : undefined}
                value={form[f.key] ?? ''}
                placeholder={f.placeholder}
                disabled={!canEdit}
                required
                aria-required="true"
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
              />
            )}
          </div>
        ))}
      </div>
      {canEdit && (
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> Salvar dados pessoais
          </Button>
        </div>
      )}
    </div>
  );
}
