import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ShieldCheck, Search, Pencil, Trash2, Loader2, History, Plus, AlertTriangle,
} from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { financeiroApi } from '@/features/financeiro/api';
import { useQuery } from '@tanstack/react-query';

import {
  useFinancialPermissionsCatalog,
  useFinancialUsers,
  useUserFinancialPermissions,
  useUserFinancialScopes,
  useUserFinancialAuditLog,
  useGrantFinancialPermission,
  useRevokeFinancialPermission,
  useApplyFinancialTemplate,
  useSetApprovalLimit,
  useAddScope,
  useRemoveScope,
  type FinUserRow,
} from './useFinancialPermissionsAdmin';

const SENSITIVE_KEYS_REQUIRING_CONFIRM = new Set([
  'financeiro.contas_pagar.pagar',
  'financeiro.contas_pagar.aprovar',
  'financeiro.tesouraria.estornar',
  'financeiro.tesouraria.movimentar',
  'financeiro.usuarios.gerenciar_permissoes',
]);

const reasonSchema = z.object({ reason: z.string().trim().min(5, 'Mínimo de 5 caracteres') });

export default function PermissoesFinanceirasPage() {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Acesso gate (defesa em profundidade: backend já valida via RPC)
  const { data: canManage, isLoading: gateLoading } = useQuery({
    queryKey: ['fin-perm', 'can-manage', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (user?.perfil === 'admin') return true;
      const { data, error } = await financeiroApi.client.rpc('has_financial_permission', {
        _user_id: user!.id,
        _permission_key: 'financeiro.usuarios.gerenciar_permissoes',
        _context: {} as any,
      });
      if (error) return false;
      return !!data;
    },
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<FinUserRow | null>(null);

  const { data: catalog } = useFinancialPermissionsCatalog();
  const { data: users, isLoading: usersLoading } = useFinancialUsers();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users ?? []).filter((u) => {
      if (q && !`${u.full_name} ${u.email}`.toLowerCase().includes(q)) return false;
      if (statusFilter === 'active' && !u.is_active) return false;
      if (statusFilter === 'inactive' && u.is_active) return false;
      if (templateFilter !== 'all' && u.template_code !== templateFilter) return false;
      return true;
    });
  }, [users, search, statusFilter, templateFilter]);

  if (gateLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!canManage) {
    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[{ label: 'Administração', href: '/administracao' }, { label: 'Permissões Financeiras' }]}
          title="Permissões Financeiras"
          icon={ShieldCheck}
        />
        <Card>
          <CardContent className="py-10 text-center">
            <AlertTriangle className="h-10 w-10 mx-auto text-amber-500 mb-3" />
            <p className="font-medium">Você não possui acesso para gerenciar permissões financeiras.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Solicite a permissão <code>financeiro.usuarios.gerenciar_permissoes</code> a um administrador.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/administracao')}>
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Administração', href: '/administracao' }, { label: 'Permissões Financeiras' }]}
        title="Permissões Financeiras"
        description="Gerencie quem acessa o módulo financeiro, com quais permissões, escopos e limites de aprovação."
        icon={ShieldCheck}
        variant="hero"
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Usuários financeiros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={templateFilter} onValueChange={setTemplateFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Modelo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos modelos</SelectItem>
                {(catalog?.templates ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.code}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead className="text-right">Permissões</TableHead>
                  <TableHead className="text-right">Escopos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin inline" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado.</TableCell></TableRow>
                ) : filtered.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell>
                      <div className="font-medium">{u.full_name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                    <TableCell>{u.is_active ? <Badge>Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}</TableCell>
                    <TableCell>{u.template_code ?? <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                    <TableCell className="text-right tabular-nums">{u.permission_count}</TableCell>
                    <TableCell className="text-right tabular-nums">{u.scope_count}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelectedUser(u)}>
                        <Pencil className="h-4 w-4 mr-1" /> Gerenciar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedUser && (
        <UserPermissionSheet
          user={selectedUser}
          currentUserId={user?.id ?? null}
          organizationId={organizationId}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}

/* ============================================================ */
/*  Painel lateral por usuário                                  */
/* ============================================================ */
function UserPermissionSheet({
  user,
  currentUserId,
  organizationId,
  onClose,
}: {
  user: FinUserRow;
  currentUserId: string | null;
  organizationId: string | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { data: catalog } = useFinancialPermissionsCatalog();
  const { data: permsActive, isLoading: pLoading } = useUserFinancialPermissions(user.user_id);
  const { data: scopes } = useUserFinancialScopes(user.user_id);
  const { data: audit } = useUserFinancialAuditLog(user.user_id);

  const grant = useGrantFinancialPermission();
  const revoke = useRevokeFinancialPermission();
  const applyTpl = useApplyFinancialTemplate();
  const setLimit = useSetApprovalLimit();
  const addScope = useAddScope();
  const removeScope = useRemoveScope();

  const isSelf = currentUserId === user.user_id;

  const activeMap = useMemo(() => {
    const m = new Map<string, { max_amount: number | null; source_template: string | null }>();
    (permsActive as any[] | undefined)?.forEach((p) => {
      m.set(p.permission_key, { max_amount: p.max_amount, source_template: p.source_template });
    });
    return m;
  }, [permsActive]);

  const grouped = useMemo(() => {
    const out: Record<string, typeof catalog.permissions> = {} as any;
    (catalog?.permissions ?? []).forEach((p) => {
      (out[p.category] ||= [] as any).push(p);
    });
    return out;
  }, [catalog]);

  /* ---- diálogos confirmação / razão / limite ---- */
  const [pendingGrant, setPendingGrant] = useState<{ key: string; name: string } | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<{ key: string; name: string } | null>(null);
  const [pendingLimit, setPendingLimit] = useState<{ key: string; name: string; current: number | null } | null>(null);
  const [pendingScope, setPendingScope] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<{ id: string; name: string } | null>(null);

  const handleToggle = (perm: { key: string; name: string; is_sensitive: boolean }, next: boolean) => {
    if (isSelf && (perm.is_sensitive || SENSITIVE_KEYS_REQUIRING_CONFIRM.has(perm.key))) {
      toast({
        variant: 'destructive',
        title: 'Operação bloqueada',
        description: 'Você não pode conceder a si mesmo permissões críticas.',
      });
      return;
    }
    if (next) {
      if (SENSITIVE_KEYS_REQUIRING_CONFIRM.has(perm.key) || perm.is_sensitive) {
        setPendingGrant({ key: perm.key, name: perm.name });
      } else {
        grant.mutate({ userId: user.user_id, permissionKey: perm.key }, {
          onSuccess: () => toast({ title: 'Permissão concedida' }),
          onError: (e: any) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
        });
      }
    } else {
      setPendingRevoke({ key: perm.key, name: perm.name });
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{user.full_name}</SheetTitle>
          <SheetDescription>{user.email} • perfil {user.role}</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="permissoes" className="mt-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="permissoes">Permissões</TabsTrigger>
            <TabsTrigger value="modelos">Modelos</TabsTrigger>
            <TabsTrigger value="escopos">Escopos</TabsTrigger>
            <TabsTrigger value="historico"><History className="h-3 w-3 mr-1 inline" />Histórico</TabsTrigger>
          </TabsList>

          {/* ============ PERMISSÕES ============ */}
          <TabsContent value="permissoes" className="space-y-4 mt-4">
            {pLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {Object.entries(grouped).map(([cat, list]) => (
              <div key={cat} className="border rounded-md">
                <div className="px-3 py-2 bg-muted/40 font-semibold text-sm capitalize">{cat.replace(/_/g, ' ')}</div>
                <div className="divide-y">
                  {list.map((p) => {
                    const active = activeMap.get(p.key);
                    const isOn = !!active;
                    return (
                      <div key={p.key} className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium flex items-center gap-2">
                            {p.name}
                            {p.is_sensitive && <Badge variant="destructive" className="h-5 text-[10px]">crítico</Badge>}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">{p.key}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isOn && (active?.max_amount != null) && (
                            <Badge variant="outline" className="text-[10px]">
                              ≤ R$ {Number(active.max_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </Badge>
                          )}
                          {isOn && (p.action === 'aprovar' || p.action === 'pagar' || p.action === 'movimentar') && (
                            <Button size="sm" variant="ghost"
                              onClick={() => setPendingLimit({ key: p.key, name: p.name, current: active?.max_amount ?? null })}>
                              limite
                            </Button>
                          )}
                          <Switch checked={isOn} onCheckedChange={(v) => handleToggle(p, v)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </TabsContent>

          {/* ============ MODELOS ============ */}
          <TabsContent value="modelos" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">
              Aplicar um modelo concede em lote todas as permissões dele. Permissões já existentes permanecem.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {(catalog?.templates ?? []).map((t) => (
                <Card key={t.id} className="cursor-pointer hover:border-primary"
                  onClick={() => setPendingTemplate({ id: t.id, name: t.name })}>
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{t.name}</div>
                      {t.is_system && <Badge variant="secondary" className="text-[10px]">sistema</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">{t.description ?? '—'}</div>
                    <div className="text-[11px] font-mono text-muted-foreground">{t.code}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ============ ESCOPOS ============ */}
          <TabsContent value="escopos" className="space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Sem escopos cadastrados em um tipo = acesso total dentro da organização.
              </p>
              <Button size="sm" onClick={() => setPendingScope(true)}>
                <Plus className="h-4 w-4 mr-1" /> Novo escopo
              </Button>
            </div>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor / ID</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(scopes ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">Sem escopos.</TableCell></TableRow>
                  )}
                  {(scopes ?? []).map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.scope_type}</TableCell>
                      <TableCell className="font-mono text-xs">{s.scope_value}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost"
                          onClick={() => removeScope.mutate({ id: s.id, userId: user.user_id })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ============ HISTÓRICO ============ */}
          <TabsContent value="historico" className="space-y-3 mt-4">
            <div className="border rounded-md max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Detalhe</TableHead>
                    <TableHead>Justificativa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(audit ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Sem histórico.</TableCell></TableRow>
                  )}
                  {(audit ?? []).map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(a.created_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell><Badge variant="outline">{a.action}</Badge></TableCell>
                      <TableCell className="text-xs">
                        {a.permission_key && <div className="font-mono">{a.permission_key}</div>}
                        {a.template_code && <div>tpl: {a.template_code}</div>}
                        {a.scope_type && <div>{a.scope_type}: {a.scope_value}</div>}
                        {a.amount != null && <div>R$ {Number(a.amount).toLocaleString('pt-BR')}</div>}
                      </TableCell>
                      <TableCell className="text-xs">{a.reason ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {/* ---- Diálogos ---- */}
        <ConfirmGrantDialog
          open={!!pendingGrant}
          name={pendingGrant?.name ?? ''}
          onClose={() => setPendingGrant(null)}
          onConfirm={() => {
            if (!pendingGrant) return;
            grant.mutate({ userId: user.user_id, permissionKey: pendingGrant.key }, {
              onSuccess: () => { toast({ title: 'Permissão concedida' }); setPendingGrant(null); },
              onError: (e: any) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
            });
          }}
        />
        <RevokeReasonDialog
          open={!!pendingRevoke}
          name={pendingRevoke?.name ?? ''}
          onClose={() => setPendingRevoke(null)}
          onConfirm={(reason) => {
            if (!pendingRevoke) return;
            revoke.mutate({ userId: user.user_id, permissionKey: pendingRevoke.key, reason }, {
              onSuccess: () => { toast({ title: 'Permissão revogada' }); setPendingRevoke(null); },
              onError: (e: any) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
            });
          }}
        />
        <LimitDialog
          open={!!pendingLimit}
          name={pendingLimit?.name ?? ''}
          current={pendingLimit?.current ?? null}
          onClose={() => setPendingLimit(null)}
          onConfirm={(amount) => {
            if (!pendingLimit) return;
            setLimit.mutate({ userId: user.user_id, permissionKey: pendingLimit.key, maxAmount: amount }, {
              onSuccess: () => { toast({ title: 'Limite atualizado' }); setPendingLimit(null); },
              onError: (e: any) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
            });
          }}
        />
        <ScopeDialog
          open={pendingScope}
          onClose={() => setPendingScope(false)}
          onConfirm={(scopeType, scopeValue) => {
            if (!organizationId) return;
            addScope.mutate(
              { userId: user.user_id, organizationId, scopeType, scopeValue },
              {
                onSuccess: () => { toast({ title: 'Escopo adicionado' }); setPendingScope(false); },
                onError: (e: any) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
              },
            );
          }}
        />
        <ConfirmGrantDialog
          open={!!pendingTemplate}
          name={`Aplicar modelo "${pendingTemplate?.name ?? ''}"`}
          onClose={() => setPendingTemplate(null)}
          onConfirm={() => {
            if (!pendingTemplate) return;
            applyTpl.mutate({ userId: user.user_id, templateId: pendingTemplate.id }, {
              onSuccess: () => { toast({ title: 'Modelo aplicado' }); setPendingTemplate(null); },
              onError: (e: any) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
            });
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

/* --------- Diálogos auxiliares --------- */

function ConfirmGrantDialog({ open, name, onClose, onConfirm }: { open: boolean; name: string; onClose: () => void; onConfirm: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar concessão</DialogTitle>
          <DialogDescription>Conceder “{name}”? A ação é registrada na auditoria.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onConfirm}>Conceder</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RevokeReasonDialog({ open, name, onClose, onConfirm }: { open: boolean; name: string; onClose: () => void; onConfirm: (reason: string) => void }) {
  const form = useForm({ resolver: zodResolver(reasonSchema), defaultValues: { reason: '' } });
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { form.reset(); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revogar permissão</DialogTitle>
          <DialogDescription>Revogar “{name}”. Justificativa obrigatória.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => onConfirm(v.reason))} className="space-y-3">
            <FormField name="reason" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Justificativa</FormLabel>
                <FormControl><Textarea rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" variant="destructive">Revogar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function LimitDialog({ open, name, current, onClose, onConfirm }: { open: boolean; name: string; current: number | null; onClose: () => void; onConfirm: (amount: number) => void }) {
  const [amount, setAmount] = useState<string>(current != null ? String(current) : '');
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Limite de aprovação</DialogTitle>
          <DialogDescription>Definir o teto em R$ para “{name}”.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Valor máximo (R$)</Label>
          <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => {
            const n = Number(amount);
            if (!Number.isFinite(n) || n < 0) return;
            onConfirm(n);
          }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScopeDialog({ open, onClose, onConfirm }: {
  open: boolean;
  onClose: () => void;
  onConfirm: (type: 'school' | 'cost_center' | 'project' | 'bank_account' | 'city' | 'organization', value: string) => void;
}) {
  const [type, setType] = useState<'school' | 'cost_center' | 'project' | 'bank_account' | 'city' | 'organization'>('school');
  const [value, setValue] = useState('');
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo escopo</DialogTitle>
          <DialogDescription>Restringe permissões a este recurso.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="school">Escola</SelectItem>
                <SelectItem value="cost_center">Centro de custo</SelectItem>
                <SelectItem value="project">Projeto</SelectItem>
                <SelectItem value="bank_account">Conta bancária</SelectItem>
                <SelectItem value="city">Cidade</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>ID / valor</Label>
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="UUID ou identificador" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => value.trim() && onConfirm(type, value.trim())}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
