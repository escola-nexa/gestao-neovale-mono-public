import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Search, Users, Filter, UserX, UserMinus, Download, Eye, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useAuditDashboard,
  classifyUser,
  classificationLabel,
  classificationColor,
  daysSinceAccess,
  type UserActivityRow,
  type ActivityClassification,
} from './hooks/useAuditDashboard';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  coordenador: 'Coordenador',
  rh: 'R.H.',
  professor: 'Professor',
};

const ROLE_OPTIONS = [
  { value: 'all', label: 'Todos os perfis' },
  { value: 'admin', label: 'Administrador' },
  { value: 'coordenador', label: 'Coordenador' },
  { value: 'rh', label: 'R.H.' },
  { value: 'professor', label: 'Professor' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: 'acesso_hoje', label: 'Acesso hoje' },
  { value: 'acesso_recente', label: 'Acesso recente' },
  { value: 'ativo_regularmente', label: 'Ativo regularmente' },
  { value: 'nunca_acessou', label: 'Nunca acessou' },
  { value: 'inativo_7d', label: 'Inativo 7 dias' },
  { value: 'inativo_15d', label: 'Inativo 15 dias' },
  { value: 'inativo_30d', label: 'Inativo 30 dias' },
  { value: 'inativo_60d', label: 'Inativo 60 dias' },
  { value: 'inativo_90d', label: 'Inativo 90+ dias' },
  { value: 'situacao_critica', label: 'Situação crítica' },
  { value: 'critico', label: '⚠ Todos críticos' },
];

export default function AuditoriaUsuariosPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { usersQuery } = useAuditDashboard();

  const [search, setSearch] = useState(searchParams.get('busca') || '');
  const [roleFilter, setRoleFilter] = useState(searchParams.get('perfil') || 'all');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [schoolFilter, setSchoolFilter] = useState(searchParams.get('escola') || 'all');

  const users = usersQuery.data || [];

  // Extract unique schools
  const schoolOptions = useMemo(() => {
    const schoolSet = new Set<string>();
    users.forEach(u => u.school_names?.forEach(s => schoolSet.add(s)));
    return ['all', ...Array.from(schoolSet).sort()];
  }, [users]);

  const CRITICAL_CLASSIFICATIONS: ActivityClassification[] = [
    'situacao_critica', 'inativo_90d', 'inativo_60d', 'nunca_acessou'
  ];

  const filtered = useMemo(() => {
    let result = users;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(u =>
        u.user_name?.toLowerCase().includes(q) ||
        u.user_email?.toLowerCase().includes(q)
      );
    }

    if (roleFilter !== 'all') {
      result = result.filter(u => u.user_role === roleFilter);
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'critico') {
        result = result.filter(u =>
          CRITICAL_CLASSIFICATIONS.includes(classifyUser(u.last_access_at, u.total_access_count))
        );
      } else {
        result = result.filter(u =>
          classifyUser(u.last_access_at, u.total_access_count) === statusFilter
        );
      }
    }

    if (schoolFilter !== 'all') {
      result = result.filter(u => u.school_names?.includes(schoolFilter));
    }

    return result.sort((a, b) => {
      // Sort by criticality: nunca_acessou and critico first
      const clsA = classifyUser(a.last_access_at, a.total_access_count);
      const clsB = classifyUser(b.last_access_at, b.total_access_count);
      const critA = CRITICAL_CLASSIFICATIONS.includes(clsA) ? 0 : 1;
      const critB = CRITICAL_CLASSIFICATIONS.includes(clsB) ? 0 : 1;
      if (critA !== critB) return critA - critB;
      return (a.user_name || '').localeCompare(b.user_name || '');
    });
  }, [users, search, roleFilter, statusFilter, schoolFilter]);

  const clearFilters = () => {
    setSearch('');
    setRoleFilter('all');
    setStatusFilter('all');
    setSchoolFilter('all');
  };

  const hasFilters = search || roleFilter !== 'all' || statusFilter !== 'all' || schoolFilter !== 'all';

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Acompanhamento' }, { label: 'Auditoria', href: '/auditoria' }, { label: 'Usuários' }]}
        title="Auditoria de Usuários"
        description={`Listagem detalhada com classificação de atividade (${filtered.length} de ${users.length} usuários)`}
        backTo="/auditoria"
      />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setStatusFilter('nunca_acessou')} className="gap-1 text-xs">
          <UserMinus className="h-3 w-3" /> Nunca Acessaram
        </Button>
        <Button variant="outline" size="sm" onClick={() => setStatusFilter('critico')} className="gap-1 text-xs">
          <UserX className="h-3 w-3" /> Situação Crítica
        </Button>
        <Button variant="outline" size="sm" onClick={() => setStatusFilter('acesso_hoje')} className="gap-1 text-xs">
          <Eye className="h-3 w-3" /> Acesso Hoje
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger><SelectValue placeholder="Perfil" /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={schoolFilter} onValueChange={setSchoolFilter}>
              <SelectTrigger><SelectValue placeholder="Escola" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as escolas</SelectItem>
                {schoolOptions.filter(s => s !== 'all').map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasFilters && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Filtros ativos:</span>
              {search && <Badge variant="secondary" className="text-xs gap-1">Busca: {search} <X className="h-3 w-3 cursor-pointer" onClick={() => setSearch('')} /></Badge>}
              {roleFilter !== 'all' && <Badge variant="secondary" className="text-xs gap-1">{ROLE_LABELS[roleFilter] || roleFilter} <X className="h-3 w-3 cursor-pointer" onClick={() => setRoleFilter('all')} /></Badge>}
              {statusFilter !== 'all' && <Badge variant="secondary" className="text-xs gap-1">{STATUS_OPTIONS.find(s => s.value === statusFilter)?.label} <X className="h-3 w-3 cursor-pointer" onClick={() => setStatusFilter('all')} /></Badge>}
              {schoolFilter !== 'all' && <Badge variant="secondary" className="text-xs gap-1">{schoolFilter} <X className="h-3 w-3 cursor-pointer" onClick={() => setSchoolFilter('all')} /></Badge>}
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-6">Limpar</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {usersQuery.isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground font-medium">Nenhum usuário encontrado</p>
              <p className="text-xs text-muted-foreground mt-1">Ajuste os filtros para ver resultados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Escola</TableHead>
                    <TableHead>Último Acesso</TableHead>
                    <TableHead className="text-center">Dias Sem Acesso</TableHead>
                    <TableHead className="text-center">Acessos</TableHead>
                    <TableHead>Classificação</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const cls = classifyUser(u.last_access_at, u.total_access_count);
                    const days = daysSinceAccess(u.last_access_at);

                    return (
                      <TableRow
                        key={u.user_id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/auditoria/usuarios/${u.user_id}`)}
                      >
                        <TableCell>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{u.user_name || '—'}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.user_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{ROLE_LABELS[u.user_role] || u.user_role}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {u.school_names?.length ? u.school_names.join(', ') : '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {u.last_access_at
                            ? format(new Date(u.last_access_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                            : <span className="text-muted-foreground italic">Nunca</span>
                          }
                        </TableCell>
                        <TableCell className="text-center text-sm font-medium">
                          {days !== null ? (
                            <span className={days > 30 ? 'text-destructive font-bold' : days > 7 ? 'text-amber-600' : 'text-foreground'}>
                              {days}
                            </span>
                          ) : (
                            <span className="text-destructive font-bold">∞</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-sm">{u.total_access_count}</TableCell>
                        <TableCell>
                          <Badge className={classificationColor(cls) + ' text-[10px] whitespace-nowrap'}>
                            {classificationLabel(cls)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
