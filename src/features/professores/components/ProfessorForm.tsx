import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Info } from 'lucide-react';
import type { ProfessorData, ProfessorFormData, ProfessorStatus } from '../types';

interface ProfessorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professor: ProfessorData | null;
  onSave: (data: ProfessorFormData) => Promise<void>;
}

const statusOptions: { value: ProfessorStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'INACTIVE', label: 'Inativo' },
  { value: 'ON_LEAVE', label: 'Afastado' },
];

export function ProfessorForm({ open, onOpenChange, professor, onSave }: ProfessorFormProps) {
  const [formData, setFormData] = useState<ProfessorFormData>({
    full_name: '',
    cpf: '',
    registration_code: '',
    phone: '',
    specialization: '',
    status: 'ACTIVE',
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!professor;

  useEffect(() => {
    if (professor) {
      setFormData({
        full_name: professor.full_name,
        cpf: professor.cpf || '',
        registration_code: professor.registration_code || '',
        phone: professor.phone || '',
        specialization: professor.specialization || '',
        status: professor.status,
        email: professor.email || '',
      });
    } else {
      setFormData({
        full_name: '',
        cpf: '',
        registration_code: '',
        phone: '',
        specialization: '',
        status: 'ACTIVE',
        email: '',
        password: '',
      });
    }
  }, [professor, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = formData.full_name.trim();
    const email = (formData.email || '').trim().toLowerCase();
    const password = formData.password || '';

    if (!fullName) return;

    if (!isEditing) {
      if (!email) return;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        // Surface a friendly inline error via the input validity API
        const input = document.getElementById('email') as HTMLInputElement | null;
        input?.setCustomValidity('Informe um e-mail válido (ex.: nome@dominio.com).');
        input?.reportValidity();
        return;
      }
      if (password.length > 0 && password.length < 8) {
        const input = document.getElementById('password') as HTMLInputElement | null;
        input?.setCustomValidity('A senha deve ter pelo menos 8 caracteres ou ficar em branco para usar 12345678.');
        input?.reportValidity();
        return;
      }
    }

    setIsLoading(true);
    try {
      await onSave({ ...formData, full_name: fullName, email });
      onOpenChange(false);
    } catch {
      // handled by parent
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar professor' : 'Novo professor'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Edite o nome e o status. Os demais dados (CPF, matrícula, especialização, endereço etc.) são gerenciados em "Documentos do professor".'
              : 'Informe os dados mínimos para criar a conta. Os demais dados serão preenchidos na ficha completa.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="full_name">Nome completo *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Nome completo do professor"
              required
            />
          </div>

          {!isEditing && (
            <>
              <div>
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => {
                    e.currentTarget.setCustomValidity('');
                    setFormData({ ...formData, email: e.target.value });
                  }}
                  placeholder="email@exemplo.com"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Será o login do professor. Será normalizado para minúsculas.
                </p>
              </div>

              <div>
                <Label htmlFor="phone">Contato</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Telefone ou WhatsApp para contato (opcional).
                </p>
              </div>

              <div>
                <Label htmlFor="password">Senha (opcional)</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={0}
                  value={formData.password || ''}
                  onChange={(e) => {
                    e.currentTarget.setCustomValidity('');
                    setFormData({ ...formData, password: e.target.value });
                  }}
                  placeholder="Padrão: 12345678"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Se em branco, será usada a senha padrão <code className="font-mono">12345678</code>. Mínimo 8 caracteres se preenchida.
                </p>
              </div>
            </>
          )}

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: ProfessorStatus) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isEditing && (
            <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <p>
                Após criar, você será direcionado para <strong>"Documentos do professor"</strong> para preencher CPF, RG, endereço, dados bancários e demais documentos.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Salvar alterações' : 'Criar professor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
