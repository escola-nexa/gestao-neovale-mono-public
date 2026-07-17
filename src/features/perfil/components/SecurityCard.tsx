import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, KeyRound, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  createdAt: string;
  onChangePassword: (current: string, newPass: string) => Promise<{ success: boolean; error: string | null }>;
}

export function SecurityCard({ createdAt, onChangePassword }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (newPass.length < 6) {
      toast({ title: 'A nova senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }
    if (newPass !== confirmPass) {
      toast({ title: 'As senhas não coincidem', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const result = await onChangePassword(currentPass, newPass);
    setSaving(false);
    if (result.success) {
      toast({ title: 'Senha alterada com sucesso!' });
      setShowForm(false);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } else {
      toast({ title: result.error || 'Erro ao alterar senha', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Segurança
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <p className="text-sm font-medium">Conta criada em</p>
            <p className="text-xs text-muted-foreground">
              {createdAt ? format(new Date(createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : '—'}
            </p>
          </div>
        </div>

        {!showForm ? (
          <Button variant="outline" className="w-full" onClick={() => setShowForm(true)}>
            <KeyRound className="h-4 w-4 mr-2" /> Alterar Senha
          </Button>
        ) : (
          <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
            <div className="space-y-1.5">
              <Label className="text-xs">Senha Atual</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPass}
                  onChange={e => setCurrentPass(e.target.value)}
                  placeholder="••••••••"
                />
                <button type="button" className="absolute right-2.5 top-2.5 text-muted-foreground" onClick={() => setShowCurrent(!showCurrent)}>
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nova Senha</Label>
              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
                <button type="button" className="absolute right-2.5 top-2.5 text-muted-foreground" onClick={() => setShowNew(!showNew)}>
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Confirmar Nova Senha</Label>
              <Input
                type="password"
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                placeholder="Repita a nova senha"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmit} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <KeyRound className="h-4 w-4 mr-1" />}
                Alterar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setCurrentPass(''); setNewPass(''); setConfirmPass(''); }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
