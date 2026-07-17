import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { usersApi } from '@/services/api';
import { User, CreateUserDTO, UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, Loader2, AlertTriangle, Shield, UserCog, Key, UserX, UserCheck } from 'lucide-react';
import FeatureGuideCard from '@/components/FeatureGuideCard';
import { PageHeader } from '@/components/PageHeader';
import { usersApi } from '@/features/users/api';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function UsersPage() {
  const { user: currentUser, canCreateUser } = useAuth();
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [masterAdminId, setMasterAdminId] = useState<string | null>(null);
  const [userLoginStatus, setUserLoginStatus] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toggleDialogOpen, setToggleDialogOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<{ user: User; nextActive: boolean } | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<CreateUserDTO & { novaSenha: string }>({
    nomeCompleto: '',
    email: '',
    perfil: 'professor',
    senhaInicial: '12345678',
    novaSenha: '',
  });

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const allUsers = await usersApi.getAll();
      setUsers(allUsers);
      
      // Identify master admin (first admin by creation date)
      const admins = allUsers.filter(u => u.perfil === 'admin').sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      if (admins.length > 0) {
        setMasterAdminId(admins[0].id);
      }

      const statusMap: Record<string, string | null> = {};
      for (const u of allUsers) {
        const created = new Date(u.createdAt).getTime();
        const updated = new Date(u.updatedAt).getTime();
        statusMap[u.id] = Math.abs(updated - created) < 60000 ? 'never' : 'active';
      }
      setUserLoginStatus(statusMap);
    }
    catch { toast({ title: 'Erro', description: 'Erro ao carregar usuários', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setSelectedUser(user);
      setFormData({ nomeCompleto: user.nomeCompleto, email: user.email, perfil: user.perfil, senhaInicial: '', novaSenha: '' });
    } else {
      setSelectedUser(null);
      setFormData({ nomeCompleto: '', email: '', perfil: 'professor', senhaInicial: '12345678', novaSenha: '' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nomeCompleto || !formData.email) {
      toast({ title: 'Erro', description: 'Preencha nome e e-mail', variant: 'destructive' });
      return;
    }
    
    // For new users, password is required
    if (!selectedUser && !formData.senhaInicial) {
      toast({ title: 'Erro', description: 'Senha é obrigatória para novos usuários', variant: 'destructive' });
      return;
    }
    
    // Validate password length if provided
    if (!selectedUser && formData.senhaInicial && formData.senhaInicial.length < 8) {
      toast({ title: 'Erro', description: 'Senha deve ter no mínimo 8 caracteres', variant: 'destructive' });
      return;
    }
    
    if (selectedUser && formData.novaSenha && formData.novaSenha.length > 0 && formData.novaSenha.length < 8) {
      toast({ title: 'Erro', description: 'Senha deve ter no mínimo 8 caracteres', variant: 'destructive' });
      return;
    }
    
    if (!selectedUser && !organizationId) {
      toast({ title: 'Erro', description: 'Organização não encontrada', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (selectedUser) {
        await usersApi.update({ 
          id: selectedUser.id, 
          nomeCompleto: formData.nomeCompleto,
          email: formData.email,
          perfil: formData.perfil,
          novaSenha: formData.novaSenha || undefined,
        });
        toast({ title: 'Sucesso', description: 'Usuário atualizado' });
      } else {
        await usersApi.create({
          nomeCompleto: formData.nomeCompleto,
          email: formData.email,
          perfil: formData.perfil,
          organizationId: organizationId!,
          password: formData.senhaInicial,
        });
        toast({ title: 'Sucesso', description: 'Usuário criado' });
      }
      setDialogOpen(false);
      loadUsers();
    } catch (error: any) {
      toast({ title: 'Erro', description: error?.message || 'Erro ao salvar usuário', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

   const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      await usersApi.delete(selectedUser.id);
      toast({ title: 'Sucesso', description: 'Usuário removido com sucesso' });
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Erro ao remover usuário', variant: 'destructive' });
    }
  };

  const handleToggleActive = async () => {
    if (!toggleTarget) return;
    try {
      await usersApi.setActive(toggleTarget.user.id, toggleTarget.nextActive);
      toast({
        title: 'Sucesso',
        description: toggleTarget.nextActive ? 'Usuário reativado' : 'Usuário desativado',
      });
      setToggleDialogOpen(false);
      setToggleTarget(null);
      loadUsers();
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Erro ao alterar status', variant: 'destructive' });
    }
  };

  const isMasterAdmin = (userId: string) => masterAdminId === userId;

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.nomeCompleto.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.perfil === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleOrder: UserRole[] = ['admin', 'coordenador', 'rh', 'financeiro', 'professor'];
  const roleLabels: Record<UserRole, string> = {
    admin: 'Administradores',
    coordenador: 'Coordenadores',
    rh: 'R.H.',
    financeiro: 'Financeiro',
    professor: 'Professores',
  };
  const groupedUsers = roleOrder
    .map(role => ({
      role,
      label: roleLabels[role],
      items: filteredUsers
        .filter(u => u.perfil === role)
        .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR', { sensitivity: 'base' })),
    }))
    .filter(group => group.items.length > 0);

  const getPerfilBadge = (perfil: UserRole) => {
    const config: Record<UserRole, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      admin: { label: 'Administrador', variant: 'default' },
      coordenador: { label: 'Coordenador', variant: 'secondary' },
      rh: { label: 'R.H.', variant: 'secondary' },
      financeiro: { label: 'Financeiro', variant: 'secondary' },
      professor: { label: 'Professor', variant: 'outline' },
    };
    const item = config[perfil] ?? { label: perfil, variant: 'outline' as const };
    return <Badge variant={item.variant}>{item.label}</Badge>;
  };

  const availableRoles: { value: UserRole; label: string }[] = currentUser?.perfil === 'admin'
    ? [
        { value: 'admin', label: 'Administrador' },
        { value: 'coordenador', label: 'Coordenador' },
        { value: 'rh', label: 'R.H.' },
        { value: 'financeiro', label: 'Financeiro' },
        { value: 'professor', label: 'Professor' },
      ]
    : [{ value: 'coordenador', label: 'Coordenador' }, { value: 'professor', label: 'Professor' }];

  return (
    <div className="space-y-4 sm:space-y-6">
      <FeatureGuideCard title="Como usar Gestão de Usuários" steps={[
        { icon: Plus, title: 'Criar usuário', description: 'Defina nome, e-mail, perfil e senha inicial para o novo usuário.', color: 'blue' },
        { icon: Shield, title: 'Perfis de acesso', description: 'Admin vê tudo. Coordenador gerencia escolas. Professor acessa apenas seus dados.', color: 'green' },
        { icon: Key, title: 'Redefinir senha', description: 'Edite o usuário para alterar a senha quando necessário.', color: 'purple' },
        { icon: UserCog, title: 'Status de acesso', description: 'Identifique usuários que nunca acessaram pelo indicador de alerta.', color: 'amber' },
      ]} />
      <PageHeader
        breadcrumbs={[{ label: 'Administração' }, { label: 'Usuários' }]}
        title="Gestão de Usuários"
        description="Cadastro e administração de contas, perfis e permissões"
        icon={UserCog}
        actions={
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />Novo Usuário
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar usuários..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Perfil" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os perfis</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="coordenador">Coordenador</SelectItem>
                <SelectItem value="rh">R.H.</SelectItem>
                <SelectItem value="financeiro">Financeiro</SelectItem>
                <SelectItem value="professor">Professor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Nenhum usuário encontrado
                        </TableCell>
                      </TableRow>
                    )}
                    {groupedUsers.map((group) => (
                      <React.Fragment key={`group-${group.role}`}>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableCell colSpan={4} className="py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {group.label}
                            <span className="ml-2 normal-case font-normal text-muted-foreground/70">({group.items.length})</span>
                          </TableCell>
                        </TableRow>
                        {group.items.map((user) => (
                          <TableRow key={user.id} className={!user.isActive ? 'opacity-60' : ''}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {user.nomeCompleto}
                                {!user.isActive && (
                                  <Badge variant="outline" className="text-xs border-destructive text-destructive">Inativo</Badge>
                                )}
                                {userLoginStatus[user.id] === 'never' && user.isActive && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Usuário nunca acessou o sistema</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{getPerfilBadge(user.perfil)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(user)} title="Editar">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                {currentUser?.perfil === 'admin' && !isMasterAdmin(user.id) && user.id !== currentUser?.id && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => { setToggleTarget({ user, nextActive: !user.isActive }); setToggleDialogOpen(true); }}
                                    title={user.isActive ? 'Desativar' : 'Reativar'}
                                  >
                                    {user.isActive
                                      ? <UserX className="h-4 w-4 text-amber-600" />
                                      : <UserCheck className="h-4 w-4 text-emerald-600" />}
                                  </Button>
                                )}
                                {!isMasterAdmin(user.id) && user.id !== currentUser?.id && (
                                  <Button variant="ghost" size="icon" onClick={() => { setSelectedUser(user); setDeleteDialogOpen(true); }} title="Excluir">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                                {isMasterAdmin(user.id) && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Shield className="h-4 w-4 text-primary" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Administrador Mestre — não pode ser desativado/excluído</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y">
                {groupedUsers.map((group) => (
                  <div key={`m-group-${group.role}`}>
                    <div className="px-4 py-2 bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.label}
                      <span className="ml-1 normal-case font-normal text-muted-foreground/70">({group.items.length})</span>
                    </div>
                    {group.items.map((user) => (
                      <div key={user.id} className={`p-4 space-y-2 border-t ${!user.isActive ? 'opacity-60' : ''}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium truncate">{user.nomeCompleto}</p>
                              {!user.isActive && (
                                <Badge variant="outline" className="text-xs border-destructive text-destructive">Inativo</Badge>
                              )}
                              {userLoginStatus[user.id] === 'never' && user.isActive && (
                                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                          </div>
                          {getPerfilBadge(user.perfil)}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button variant="outline" size="sm" className="flex-1 min-w-[110px]" onClick={() => handleOpenDialog(user)}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                          </Button>
                          {currentUser?.perfil === 'admin' && !isMasterAdmin(user.id) && user.id !== currentUser?.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 min-w-[110px]"
                              onClick={() => { setToggleTarget({ user, nextActive: !user.isActive }); setToggleDialogOpen(true); }}
                            >
                              {user.isActive ? (
                                <><UserX className="mr-2 h-4 w-4 text-amber-600" /> Desativar</>
                              ) : (
                                <><UserCheck className="mr-2 h-4 w-4 text-emerald-600" /> Reativar</>
                              )}
                            </Button>
                          )}
                          {!isMasterAdmin(user.id) && user.id !== currentUser?.id ? (
                            <Button variant="outline" size="sm" className="flex-1 min-w-[110px]" onClick={() => { setSelectedUser(user); setDeleteDialogOpen(true); }}>
                              <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Excluir
                            </Button>
                          ) : isMasterAdmin(user.id) ? (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground flex-1 justify-center">
                              <Shield className="h-4 w-4 text-primary" /> Admin Mestre
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                {groupedUsers.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhum usuário encontrado
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selectedUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Nome Completo *</Label><Input value={formData.nomeCompleto} onChange={(e) => setFormData({ ...formData, nomeCompleto: e.target.value })} /></div>
            <div className="space-y-2"><Label>E-mail *</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Perfil *</Label>
              <Select value={formData.perfil} onValueChange={(v: UserRole) => setFormData({ ...formData, perfil: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{availableRoles.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {!selectedUser ? (
              <div className="space-y-2">
                <Label>Senha Inicial *</Label>
                <Input 
                  type="password" 
                  value={formData.senhaInicial} 
                  onChange={(e) => setFormData({ ...formData, senhaInicial: e.target.value })} 
                  placeholder="Mínimo 8 caracteres"
                />
                <p className="text-xs text-muted-foreground">Senha padrão: 12345678</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Nova Senha</Label>
                <Input 
                  type="password" 
                  value={formData.novaSenha} 
                  onChange={(e) => setFormData({ ...formData, novaSenha: e.target.value })} 
                  placeholder="Deixe em branco para manter a senha atual"
                />
                <p className="text-xs text-muted-foreground">Mínimo 8 caracteres (opcional)</p>
              </div>
            )}
            {formData.perfil === 'professor' && !selectedUser && (
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                O registro de professor será criado automaticamente. Após o cadastro, vincule a escolas e cursos.
              </p>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Deseja remover o usuário "{selectedUser?.nomeCompleto}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="w-full sm:w-auto">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={toggleDialogOpen} onOpenChange={setToggleDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.nextActive ? 'Reativar usuário' : 'Desativar usuário'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.nextActive ? (
                <>O usuário "{toggleTarget?.user.nomeCompleto}" voltará a ter acesso ao sistema.</>
              ) : (
                <>
                  O usuário "{toggleTarget?.user.nomeCompleto}" não conseguirá mais acessar o sistema e suas sessões ativas serão encerradas.
                  {toggleTarget?.user.perfil === 'professor' && ' Como professor, deixará de aparecer em listas e novas seleções (dados, turmas e históricos são preservados).'}
                  {' '}A ação é reversível a qualquer momento.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleActive} className="w-full sm:w-auto">
              {toggleTarget?.nextActive ? 'Reativar' : 'Desativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
