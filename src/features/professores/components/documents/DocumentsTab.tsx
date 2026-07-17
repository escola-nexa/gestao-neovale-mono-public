import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import type { ProfessorDocumentData, ProfessorMedicalReport } from '../../hooks/useProfessorDocuments';
import { MedicalReportsSection } from './MedicalReportsSection';
import { useAutoSavePatch } from './useAutoSavePatch';

interface Props {
  doc: ProfessorDocumentData;
  canEdit: boolean;
  saving: boolean;
  onSave: (patch: Partial<ProfessorDocumentData>) => Promise<void>;
  /** Opcional: salva em background sem trocar de aba (auto-save). */
  onAutoSave?: (patch: Partial<ProfessorDocumentData>) => Promise<void>;
  medicalReports: ProfessorMedicalReport[];
  onAddMedicalReport: (cidCode: string, description: string | null, file: File | null) => Promise<void>;
  onDeleteMedicalReport: (report: ProfessorMedicalReport) => Promise<void>;
  onGetUrl: (path: string) => Promise<string | null>;
  showMedicalReports?: boolean;
}

const SECTIONS: Array<{ title: string; optional?: boolean; fields: Array<{ key: keyof ProfessorDocumentData; label: string; type?: string }> }> = [
  {
    title: 'Identidade',
    fields: [
      { key: 'cpf', label: 'CPF' },
      { key: 'rg_number', label: 'RG (número)' },
      { key: 'rg_issuer', label: 'Órgão emissor' },
      { key: 'rg_state', label: 'UF' },
      { key: 'rg_issue_date', label: 'Data de expedição', type: 'date' },
    ],
  },
  {
    title: 'Carteira de Trabalho',
    fields: [
      { key: 'work_card_number', label: 'Número' },
      { key: 'work_card_series', label: 'Série' },
      { key: 'work_card_state', label: 'UF' },
    ],
  },
  {
    title: 'CNH',
    optional: true,
    fields: [
      { key: 'cnh_number', label: 'Número' },
      { key: 'cnh_state', label: 'UF' },
      { key: 'cnh_category', label: 'Categoria' },
      { key: 'cnh_issue_date', label: 'Emissão', type: 'date' },
      { key: 'cnh_expiry', label: 'Vencimento', type: 'date' },
    ],
  },
  {
    title: 'Eleitor & Reservista',
    fields: [
      { key: 'voter_id', label: 'Título de eleitor' },
      { key: 'voter_zone', label: 'Zona' },
      { key: 'voter_section', label: 'Seção' },
      { key: 'military_cert', label: 'Certificado de reservista' },
      { key: 'pis_nit', label: 'PIS / NIT' },
    ],
  },
];

export function DocumentsTab({ doc, canEdit, saving, onSave, onAutoSave, medicalReports, onAddMedicalReport, onDeleteMedicalReport, onGetUrl, showMedicalReports = true }: Props) {
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    const initial: any = {};
    SECTIONS.forEach(s => s.fields.forEach(f => { initial[f.key] = doc[f.key] ?? ''; }));
    setForm(initial);
  }, [doc]);

  useAutoSavePatch({
    form,
    original: Object.fromEntries(SECTIONS.flatMap(s => s.fields.map(f => [f.key, (doc as any)[f.key] ?? '']))) as any,
    enabled: canEdit && !!onAutoSave,
    onAutoSave,
  });

  const handleSave = () => {
    const patch: any = {};
    const missing: string[] = [];
    SECTIONS.forEach(s => s.fields.forEach(f => {
      const v = form[f.key];
      const isEmpty = v === '' || v === null || v === undefined;
      if (isEmpty && !s.optional) missing.push(f.label);
      patch[f.key] = isEmpty ? null : v;
    }));
    if (missing.length > 0) {
      toast.error(`Preencha todos os campos obrigatórios: ${missing.join(', ')}`);
      return;
    }
    onSave(patch);
  };

  return (
    <div className="space-y-6">
      {SECTIONS.map(section => (
        <div key={section.title} className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {section.title}
            {section.optional && <span className="ml-2 text-[10px] normal-case font-normal text-muted-foreground">(opcional)</span>}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {section.fields.map(f => (
              <div key={String(f.key)} className="space-y-2">
                <Label>
                  {f.label} {!section.optional && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  type={f.type || 'text'}
                  value={form[f.key] ?? ''}
                  disabled={!canEdit}
                  required={!section.optional}
                  aria-required={!section.optional}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      {canEdit && (
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> Salvar documentos
          </Button>
        </div>
      )}

      {showMedicalReports && (
        <>
          <Separator className="my-2" />
          <MedicalReportsSection
            reports={medicalReports}
            canEdit={canEdit}
            onAdd={onAddMedicalReport}
            onDelete={onDeleteMedicalReport}
            onGetUrl={onGetUrl}
          />
        </>
      )}
    </div>
  );
}
