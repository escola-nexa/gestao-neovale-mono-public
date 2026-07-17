import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, User, Mail, Shield, School, Calendar, Clock, Activity,
  TrendingUp, Eye, FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUserAuditDetail } from './hooks/useUserAuditDetail';
import {
  classifyUser, classificationLabel, classificationColor, daysSinceAccess
} from './hooks/useAuditDashboard';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { PageHeader } from '@/components/PageHeader';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  coordenador: 'Coordenador',
  rh: 'R.H.',
  professor: 'Professor',
};

const MODULE_LABELS: Record<string, string> = {
  auth: 'Autenticação',
  dashboard: 'Dashboard',
  planejamento: 'Planejamento',
  frequencia: 'Frequência',
  notas: 'Notas',
  boletins: 'Boletins',
  orientacoes: 'Orientações',
  escolas: 'Escolas',
  alunos: 'Alunos',
  professores: 'Professores',
  grade_horaria: 'Grade Horária',
  calendario: 'Calendário',
  compartilhamento: 'Compartilhamento',
  bi: 'B.I.',
  configuracoes: 'Configurações',
  usuarios: 'Usuários',
};

export default function AuditoriaUsuarioDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { profileQuery, eventsQuery, moduleUsageQuery } = useUserAuditDetail(userId);

  const profile = profileQuery.data;
  const events = eventsQuery.data || [];
  const moduleUsage = moduleUsageQuery.data || [];
  const isLoading = profileQuery.isLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Usuário não encontrado.</p>
        <Button variant="outline" onClick={() => navigate('/auditoria/usuarios')} className="mt-4">Voltar</Button>
      </div>
    );
  }

  const lastAccess = profile.activity?.last_access_at;
  const totalCount = profile.activity?.total_access_count || 0;
  const cls = classifyUser(lastAccess, totalCount);
  const days = daysSinceAccess(lastAccess);

  const moduleChartData = moduleUsage.slice(0, 10).map(m => ({
    module: MODULE_LABELS[m.module] || m.module,
    count: m.count,
  }));

  // Hourly distribution from events
  const hourlyMap = new Map<number, number>();
  for (let i = 0; i < 24; i++) hourlyMap.set(i, 0);
  events.forEach((e: any) => {
    const hour = new Date(e.created_at).getHours();
    hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
  });
  const hourlyData = Array.from(hourlyMap.entries()).map(([hour, count]) => ({
    hour: `${String(hour).padStart(2, '0')}h`,
    count,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Auditoria' },
          { label: 'Usuários', href: '/auditoria/usuarios' },
          { label: profile.full_name || 'Detalhe' },
        ]}
        title={profile.full_name || 'Usuário'}
        description={profile.email || undefined}
        icon={User}
        backTo="/auditoria/usuarios"
        badge={{ label: classificationLabel(cls), tone: 'default' }}
      />

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Dados Básicos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Perfil</span>
              <Badge variant="outline">{ROLE_LABELS[profile.role] || profile.role}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">E-mail</span>
              <span className="font-mono text-xs truncate max-w-[180px]">{profile.email}</span>
            </div>
            {profile.phone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Telefone</span>
                <span>{profile.phone}</span>
              </div>
            )}
            {profile.professor?.specialization && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Especialização</span>
                <span>{profile.professor.specialization}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Atividade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Último Acesso</span>
              <span className="font-medium">
                {lastAccess
                  ? format(new Date(lastAccess), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                  : 'Nunca'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total de Acessos</span>
              <span className="font-bold text-lg">{totalCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dias sem Acessar</span>
              <span className={`font-bold text-lg ${days !== null && days > 30 ? 'text-destructive' : ''}`}>
                {days !== null ? days : '∞'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Primeiro Acesso</span>
              <span>{profile.activity?.first_access_at ? format(new Date(profile.activity.first_access_at), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <School className="h-4 w-4 text-primary" /> Vínculos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {profile.schools?.length > 0 ? (
              profile.schools.map((s: string) => (
                <Badge key={s} variant="outline" className="mr-1 mb-1 text-xs">{s}</Badge>
              ))
            ) : (
              <p className="text-muted-foreground text-xs">Sem vínculos escolares</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {moduleChartData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Módulos Mais Utilizados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={moduleChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="module" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Horários de Uso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="hour" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Events Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Histórico de Eventos (últimos 100)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum evento registrado.</p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {events.map((e: any) => (
                <div key={e.id} className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/50 text-sm">
                  <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(e.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                  </span>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {MODULE_LABELS[e.module] || e.module}
                  </Badge>
                  <span className="truncate">{e.action}</span>
                  {e.action_result !== 'success' && (
                    <Badge variant="destructive" className="text-[10px]">{e.action_result}</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
