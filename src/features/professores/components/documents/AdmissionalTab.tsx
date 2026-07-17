import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, Save } from 'lucide-react';
import type { ProfessorDocumentData } from '../../hooks/useProfessorDocuments';

interface Props {
  doc: ProfessorDocumentData;
  canEdit: boolean;
  saving: boolean;
  onSave: (patch: Partial<ProfessorDocumentData>) => Promise<void>;
}

const STATUS_OPTIONS = [
  { value: 'em_analise', label: 'Em análise' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'contratado', label: 'Contratado' },
  { value: 'desligado', label: 'Desligado' },
];

export function AdmissionalTab({ doc, canEdit, saving, onSave }: Props) {
  const [form, setForm] = useState({
    admission_date: doc.admission_date || '',
    function_title: doc.function_title || '',
    admission_status: doc.admission_status || 'em_analise',
    termination_date: doc.termination_date || '',
    registration_code: (doc as any).registration_code || '',
    specialization: (doc as any).specialization || '',
  });

  useEffect(() => {
    setForm({
      admission_date: doc.admission_date || '',
      function_title: doc.function_title || '',
      admission_status: doc.admission_status || 'em_analise',
      termination_date: doc.termination_date || '',
      registration_code: (doc as any).registration_code || '',
      specialization: (doc as any).specialization || '',
    });
  }, [doc]);

  const handleSave = () => {
    onSave({
      admission_date: form.admission_date || null,
      function_title: form.function_title || null,
      admission_status: form.admission_status,
      termination_date: form.termination_date || null,
      registration_code: form.registration_code || null,
      specialization: form.specialization || null,
    } as any);
  };

  return (
    <div className="space-y-4">
      {!canEdit && (
        <Card className="border-muted">
          <CardContent className="pt-4 flex items-start gap-3 text-sm">
            <Lock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground">Dados restritos ao R.H.</p>
              <p className="text-muted-foreground text-xs mt-0.5">Apenas o R.H. e administradores podem preencher ou alterar estes campos.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Data de admissão</Label>
          <Input type="date" value={form.admission_date} disabled={!canEdit}
            onChange={e => setForm({ ...form, admission_date: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Função / Cargo</Label>
          <Input value={form.function_title} disabled={!canEdit} placeholder="Ex.: Professor de Matemática"
            onChange={e => setForm({ ...form, function_title: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Status admissional</Label>
          <Select value={form.admission_status} disabled={!canEdit}
            onValueChange={v => setForm({ ...form, admission_status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Data de desligamento</Label>
          <Input type="date" value={form.termination_date} disabled={!canEdit}
            onChange={e => setForm({ ...form, termination_date: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Matrícula</Label>
          <Input value={form.registration_code} disabled={!canEdit} placeholder="Código de matrícula"
            onChange={e => setForm({ ...form, registration_code: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Especialização</Label>
          <Input value={form.specialization} disabled={!canEdit} placeholder="Ex.: Matemática, Pedagogia"
            onChange={e => setForm({ ...form, specialization: e.target.value })} />
        </div>
      </div>

      {canEdit && (
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> Salvar admissional
          </Button>
        </div>
      )}
    </div>
  );
}
