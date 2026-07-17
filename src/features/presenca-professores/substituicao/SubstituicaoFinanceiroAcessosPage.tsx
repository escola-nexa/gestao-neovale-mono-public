import { useState } from 'react';
import { KeyRound, Plus, ShieldOff, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  useTSRFinancialAccessUsers,
  useGrantTSRFinancialAccess,
  useRevokeTSRFinancialAccess,
} from './hooks/useTeacherSubstitutionFinancial';

export default function SubstituicaoFinanceiroAcessosPage() {
  const { toast } = useToast();
  const { data: users = [], isLoading } = useTSRFinancialAccessUsers();
  const grant = useGrantTSRFinancialAccess();
  const revoke = useRevokeTSRFinancialAccess();

  const [grantOpen, setGrantOpen] = useState(false);
  const [grantUser, setGrantUser] = useState<string>('');
  const [grantNotes, setGrantNotes] = useState('');

  const [revokeOpen, setRevokeOpen] = useState<{ open: boolean; userId?: string; name?: string }>({ open: false });
  const [revokeReason, setRevokeReason] = useState('');

  const eligible = users.filter((u: any) => !u.is_active);

  const handleGrant = async () => {
    if (!grantUser) return;
    try {
      await grant.mutateAsync({ user_id: grantUser, notes: grantNotes || null });
      toast({ title: 'Acesso concedido' });
      setGrantOpen(false);
      setGrantUser(''); setGrantNotes('');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleRevoke = async () => {
    if (!revokeOpen.userId || !revokeReason.trim()) {
      toast({ title: 'Justificativa obrigatória', variant: 'destructive' });
      return;
    }
    try {
      await revoke.mutateAsync({ user_id: revokeOpen.userId, reason: revokeReason.trim() });
      toast({ title: 'Acesso revogado' });
      setRevokeOpen({ open: false });
      setRevokeReason('');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Acessos Financeiros"
        description="Conceda ou revogue acesso à área financeira de Substituição para usuários de R.H."
        icon={KeyRound}
        breadcrumbs={[
          { label: 'Presença dos Professores', href: '/presenca-professores' },
          { label: 'Substituição', href: '/presenca-professores/substituicao' },
          { label: 'Financeiro', href: '/presenca-professores/substituicao/financeiro' },
          { label: 'Acessos' },
        ]}
        actions={
          <Button onClick={() => setGrantOpen(true)} disabled={eligible.length === 0}>
            <Plus className="h-4 w-4 mr-2" /> Conceder acesso
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário R.H.</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Concedido por</TableHead>
                <TableHead>Em</TableHead>
                <TableHead>Revogado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">Carregando…</TableCell></TableRow>
              )}
              {!isLoading && users.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">Nenhum usuário R.H. encontrado nesta organização.</TableCell></TableRow>
              )}
              {users.map((u: any) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell className="text-xs">{u.email}</TableCell>
                  <TableCell>
                    {u.is_active ? (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100"><ShieldCheck className="h-3 w-3 mr-1" /> Autorizado</Badge>
                    ) : (
                      <Badge variant="outline">Sem acesso</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{u.granted_by_name || '—'}</TableCell>
                  <TableCell className="text-xs">{u.granted_at ? new Date(u.granted_at).toLocaleString('pt-BR') : '—'}</TableCell>
                  <TableCell className="text-xs">{u.revoked_at ? new Date(u.revoked_at).toLocaleString('pt-BR') : '—'}</TableCell>
                  <TableCell className="text-right">
                    {u.is_active ? (
                      <Button size="sm" variant="outline" className="text-rose-700"
                        onClick={() => setRevokeOpen({ open: true, userId: u.user_id, name: u.full_name })}>
                        <ShieldOff className="h-4 w-4 mr-1" /> Revogar
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={async () => {
                        try { await grant.mutateAsync({ user_id: u.user_id }); toast({ title: 'Acesso concedido' }); }
                        catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
                      }}>
                        <ShieldCheck className="h-4 w-4 mr-1" /> Conceder
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Conceder */}
      <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Conceder acesso financeiro</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Usuário R.H.</Label>
              <Select value={grantUser} onValueChange={setGrantUser}>
                <SelectTrigger><SelectValue placeholder="Selecione o usuário" /></SelectTrigger>
                <SelectContent>
                  {eligible.map((u: any) => (
                    <SelectItem key={u.user_id} value={u.user_id}>{u.full_name} — {u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações (opcional)</Label>
              <Textarea value={grantNotes} onChange={(e) => setGrantNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantOpen(false)}>Cancelar</Button>
            <Button onClick={handleGrant} disabled={!grantUser || grant.isPending}>Conceder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revogar */}
      <Dialog open={revokeOpen.open} onOpenChange={(o) => setRevokeOpen({ open: o })}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Revogar acesso de {revokeOpen.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Justificativa <span className="text-rose-600">*</span></Label>
              <Textarea value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} rows={3}
                placeholder="Motivo da revogação (obrigatório, será registrado em auditoria)" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeOpen({ open: false })}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={!revokeReason.trim() || revoke.isPending}>
              Revogar acesso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
