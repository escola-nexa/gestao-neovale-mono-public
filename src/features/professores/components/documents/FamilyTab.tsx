import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Save, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { ProfessorDocumentData, ProfessorChild } from '../../hooks/useProfessorDocuments';
import { useAutoSavePatch } from './useAutoSavePatch';

interface Props {
  doc: ProfessorDocumentData;
  children: ProfessorChild[];
  canEdit: boolean;
  saving: boolean;
  onSave: (patch: Partial<ProfessorDocumentData>) => Promise<void>;
  /** Opcional: salva em background sem trocar de aba (auto-save). */
  onAutoSave?: (patch: Partial<ProfessorDocumentData>) => Promise<void>;
  onAddChild: (c: Omit<ProfessorChild, 'id' | 'professor_id' | 'organization_id'>) => Promise<void>;
  onUpdateChild: (id: string, patch: Partial<ProfessorChild>) => Promise<void>;
  onDeleteChild: (id: string) => Promise<void>;
}

export function FamilyTab({ doc, children, canEdit, saving, onSave, onAutoSave, onAddChild, onUpdateChild, onDeleteChild }: Props) {
  const [form, setForm] = useState<any>({});
  const [newChild, setNewChild] = useState({ name: '', birth_date: '', city: '', state: '', cpf: '' });

  useEffect(() => {
    setForm({
      father_name: doc.father_name || '',
      mother_name: doc.mother_name || '',
      spouse_name: doc.spouse_name || '',
      spouse_nationality: doc.spouse_nationality || '',
      spouse_birth_city: doc.spouse_birth_city || '',
      spouse_birth_state: doc.spouse_birth_state || '',
      spouse_birth_date: doc.spouse_birth_date || '',
    });
  }, [doc]);

  // Auto-save silencioso (não salva enquanto faltar nome da mãe — campo obrigatório).
  useAutoSavePatch({
    form,
    original: {
      father_name: doc.father_name || '',
      mother_name: doc.mother_name || '',
      spouse_name: doc.spouse_name || '',
      spouse_nationality: doc.spouse_nationality || '',
      spouse_birth_city: doc.spouse_birth_city || '',
      spouse_birth_state: doc.spouse_birth_state || '',
      spouse_birth_date: doc.spouse_birth_date || '',
    },
    enabled: canEdit && !!onAutoSave,
    onAutoSave,
    validate: (f) => String(f.mother_name || '').trim().length > 0,
  });

  const handleSave = () => {
    if (!String(form.mother_name || '').trim()) {
      toast.error('Preencha o campo obrigatório: Nome da mãe');
      return;
    }
    onSave({
      father_name: form.father_name || null,
      mother_name: form.mother_name || null,
      spouse_name: form.spouse_name || null,
      spouse_nationality: form.spouse_nationality || null,
      spouse_birth_city: form.spouse_birth_city || null,
      spouse_birth_state: form.spouse_birth_state || null,
      spouse_birth_date: form.spouse_birth_date || null,
    });
  };

  const handleAddChild = async () => {
    if (!newChild.name.trim()) return;
    await onAddChild({
      name: newChild.name.trim(),
      birth_date: newChild.birth_date || null,
      city: newChild.city || null,
      state: newChild.state || null,
      cpf: newChild.cpf || null,
    });
    setNewChild({ name: '', birth_date: '', city: '', state: '', cpf: '' });
  };

  return (
    <div className="space-y-6">
      {/* Pais */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Filiação</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome do pai</Label>
            <Input value={form.father_name ?? ''} disabled={!canEdit}
              onChange={e => setForm({ ...form, father_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Nome da mãe <span className="text-destructive">*</span></Label>
            <Input value={form.mother_name ?? ''} disabled={!canEdit} required aria-required="true"
              onChange={e => setForm({ ...form, mother_name: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Cônjuge */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Cônjuge</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Nome</Label>
            <Input value={form.spouse_name ?? ''} disabled={!canEdit}
              onChange={e => setForm({ ...form, spouse_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Nacionalidade</Label>
            <Input value={form.spouse_nationality ?? ''} disabled={!canEdit}
              onChange={e => setForm({ ...form, spouse_nationality: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Cidade de nascimento</Label>
            <Input value={form.spouse_birth_city ?? ''} disabled={!canEdit}
              onChange={e => setForm({ ...form, spouse_birth_city: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>UF</Label>
            <Input value={form.spouse_birth_state ?? ''} disabled={!canEdit}
              onChange={e => setForm({ ...form, spouse_birth_state: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Data de nascimento</Label>
            <Input type="date" value={form.spouse_birth_date ?? ''} disabled={!canEdit}
              onChange={e => setForm({ ...form, spouse_birth_date: e.target.value })} />
          </div>
        </div>
      </div>

      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> Salvar filiação e cônjuge
          </Button>
        </div>
      )}

      {/* Filhos */}
      <div className="space-y-3 pt-4 border-t">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Users className="h-4 w-4" /> Filhos
        </h3>

        {children.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Nenhum filho cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {children.map(child => (
              <Card key={child.id}>
                <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-xs">Nome</Label>
                    <Input defaultValue={child.name} disabled={!canEdit}
                      onBlur={e => e.target.value !== child.name && onUpdateChild(child.id!, { name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nascimento</Label>
                    <Input type="date" defaultValue={child.birth_date || ''} disabled={!canEdit}
                      onBlur={e => onUpdateChild(child.id!, { birth_date: e.target.value || null })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cidade</Label>
                    <Input defaultValue={child.city || ''} disabled={!canEdit}
                      onBlur={e => onUpdateChild(child.id!, { city: e.target.value || null })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">UF</Label>
                    <Input defaultValue={child.state || ''} disabled={!canEdit}
                      onBlur={e => onUpdateChild(child.id!, { state: e.target.value || null })} />
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">CPF</Label>
                      <Input defaultValue={child.cpf || ''} disabled={!canEdit}
                        onBlur={e => onUpdateChild(child.id!, { cpf: e.target.value || null })} />
                    </div>
                    {canEdit && (
                      <Button variant="ghost" size="icon" onClick={() => onDeleteChild(child.id!)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {canEdit && (
          <Card className="border-dashed">
            <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs">Nome do filho</Label>
                <Input value={newChild.name} placeholder="Nome completo"
                  onChange={e => setNewChild({ ...newChild, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nascimento</Label>
                <Input type="date" value={newChild.birth_date}
                  onChange={e => setNewChild({ ...newChild, birth_date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cidade</Label>
                <Input value={newChild.city}
                  onChange={e => setNewChild({ ...newChild, city: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">UF</Label>
                <Input value={newChild.state}
                  onChange={e => setNewChild({ ...newChild, state: e.target.value })} />
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">CPF</Label>
                  <Input value={newChild.cpf}
                    onChange={e => setNewChild({ ...newChild, cpf: e.target.value })} />
                </div>
                <Button onClick={handleAddChild} disabled={!newChild.name.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
