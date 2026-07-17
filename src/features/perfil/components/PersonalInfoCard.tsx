import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCircle2, Pencil, Check, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { ProfileData } from '../hooks/useProfileData';

interface Props {
  profile: ProfileData;
  onUpdate: (data: { full_name?: string; phone?: string }) => Promise<boolean>;
}

export function PersonalInfoCard({ profile, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const ok = await onUpdate({ full_name: name.trim(), phone: phone.trim() || undefined });
    setSaving(false);
    if (ok) {
      toast({ title: 'Perfil atualizado com sucesso!' });
      setEditing(false);
    } else {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    }
  };

  const handleCancel = () => {
    setName(profile.full_name);
    setPhone(profile.phone || '');
    setEditing(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserCircle2 className="h-5 w-5 text-primary" />
          Dados Pessoais
        </CardTitle>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4 mr-1" /> Editar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {editing ? (
          <>
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Check className="h-4 w-4 mr-1" /> Salvar
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Nome Completo</p>
              <p className="text-sm font-medium">{profile.full_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium truncate">{profile.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Telefone</p>
              <p className="text-sm font-medium">{profile.phone || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Perfil</p>
              <p className="text-sm font-medium">{({ admin: 'Administrador', coordenador: 'Coordenador', rh: 'R.H.', professor: 'Professor' } as Record<string, string>)[profile.role] ?? profile.role}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
