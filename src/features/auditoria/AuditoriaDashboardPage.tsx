import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserCheck, UserX, UserMinus, Activity, Eye,
  Calendar, TrendingUp, ArrowRight, Shield, Clock, BarChart3, Filter
} from 'lucide-react';
import FeatureGuideCard from '@/components/FeatureGuideCard';
import { useAuditDashboard } from './hooks/useAuditDashboard';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import {
  classifyUser, classificationLabel, classificationColor,
  type UserActivityRow
} from './hooks/useAuditDashboard';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  coordenador: 'Coordenador',
  rh: 'R.H.',
  professor: 'Professor',
};

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 72%, 51%)',
  'hsl(var(--muted-foreground))',
];

export default function AuditoriaDashboardPage() {
  const navigate = useNavigate();
  const { kpisQuery, usersQuery, dailyAccessQuery } = useAuditDashboard();
  const kpis = kpisQuery.data;
  const users = usersQuery.data || [];
  const dailyAccess = dailyAccessQuery.data || [];

  const isLoading = kpisQuery.isLoading;

  // Compute distributions
  const roleDistribution = users.reduce((acc, u) => {
    const role = u.user_role || 'professor';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const rolePieData = Object.entries(roleDistribution).map(([role, count]) => ({
    name: ROLE_LABELS[role] || role,
    value: count,
  }));

  // Classification distribution
  const classDistribution = users.reduce((acc, u) => {
    const cls = classifyUser(u.last_access_at, u.total_access_count);
    const label = classificationLabel(cls);
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const classBarData = Object.entries(classDistribution)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // School distribution
  const schoolDistribution = users.reduce((acc, u) => {
    const schools = u.school_names || [];
    if (schools.length === 0) {
      acc['Sem escola'] = (acc['Sem escola'] || 0) + 1;
    } else {
      schools.forEach(s => {
        acc[s] = (acc[s] || 0) + 1;
      });
    }
    return acc;
  }, {} as Record<string, number>);

  const schoolBarData = Object.entries(schoolDistribution)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Critical users
  const criticalUsers = users.filter(u => {
    const cls = classifyUser(u.last_access_at, u.total_access_count);
    return ['situacao_critica', 'inativo_90d', 'inativo_60d', 'nunca_acessou'].includes(cls);
  }).slice(0, 5);

  const adhesionPercent = kpis && kpis.total_users > 0
    ? Math.round((kpis.active_30_days / kpis.total_users) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <FeatureGuideCard title="Como usar a Auditoria de Acesso" steps={[
        { icon: Users, title: 'Visão geral', description: 'Acompanhe quantos usuários estão ativos, inativos ou nunca acessaram.', color: 'blue' },
        { icon: Eye, title: 'Detalhe por usuário', description: 'Clique em um usuário para ver histórico, módulos e engajamento.', color: 'green' },
        { icon: BarChart3, title: 'Tendências', description: 'Analise gráficos de acessos por dia, perfil e escola.', color: 'purple' },
        { icon: Filter, title: 'Filtros avançados', description: 'Filtre por perfil, escola, status e período de inatividade.', color: 'amber' },
      ]} />
      <PageHeader
        breadcrumbs={[{ label: 'Acompanhamento' }, { label: 'Auditoria' }]}
        title="Auditoria de Acesso"
        description="Painel gerencial de adesão e uso do sistema"
        icon={Shield}
        actions={
          <Button onClick={() => navigate('/auditoria/usuarios')} className="gap-2">
            <Users className="h-4 w-4" />
            Ver Todos os Usuários
            <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))
        ) : (
          <>
            <KpiCard icon={Users} label="Total Usuários" value={kpis?.total_users || 0} />
            <KpiCard icon={UserCheck} label="Ativos Hoje" value={kpis?.active_today || 0} variant="success" />
            <KpiCard icon={Activity} label="Últimos 7 dias" value={kpis?.active_7_days || 0} variant="info" />
            <KpiCard icon={Calendar} label="Últimos 30 dias" value={kpis?.active_30_days || 0} variant="info" />
            <KpiCard icon={UserMinus} label="Nunca Acessaram" value={kpis?.never_accessed || 0} variant="warning" />
            <KpiCard icon={UserX} label="Inativos 30d+" value={kpis?.inactive_users || 0} variant="danger" />
          </>
        )}
      </div>

      {/* Adhesion Banner */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Adesão Geral ao Sistema</p>
              <p className="text-3xl font-bold text-foreground">{adhesionPercent}%</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground max-w-xs text-right">
            Percentual de usuários que acessaram nos últimos 30 dias em relação ao total cadastrado.
          </p>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Access Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Acessos Diários (últimos 30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailyAccess}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => {
                    const d = new Date(v + 'T12:00:00');
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(v) => {
                    const d = new Date(v + 'T12:00:00');
                    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                  }}
                  formatter={(value: number) => [value, 'Acessos']}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.15)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Role Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Distribuição por Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={rolePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {rolePieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Classification + School Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Classificação de Atividade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={classBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Adesão por Escola (top 10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={schoolBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  width={140}
                  tickFormatter={(v) => v.length > 20 ? v.slice(0, 20) + '…' : v}
                />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(142, 76%, 36%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Critical Users */}
      {criticalUsers.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
              <UserX className="h-4 w-4" />
              Usuários em Situação Crítica
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalUsers.map(u => {
                const cls = classifyUser(u.last_access_at, u.total_access_count);
                return (
                  <div
                    key={u.user_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => navigate(`/auditoria/usuarios/${u.user_id}`)}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{u.user_name || u.user_email}</p>
                      <p className="text-xs text-muted-foreground">{ROLE_LABELS[u.user_role] || u.user_role} • {u.user_email}</p>
                    </div>
                    <Badge className={classificationColor(cls) + ' text-xs'}>
                      {classificationLabel(cls)}
                    </Badge>
                  </div>
                );
              })}
            </div>
            <Button
              variant="outline"
              className="w-full mt-3"
              onClick={() => navigate('/auditoria/usuarios?status=critico')}
            >
              Ver todos os usuários críticos
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  variant = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  variant?: 'default' | 'success' | 'info' | 'warning' | 'danger';
}) {
  const variantStyles: Record<string, string> = {
    default: 'bg-card',
    success: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800',
    warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800',
    danger: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800',
  };
  const iconStyles: Record<string, string> = {
    default: 'text-primary',
    success: 'text-emerald-600',
    info: 'text-blue-600',
    warning: 'text-amber-600',
    danger: 'text-red-600',
  };

  return (
    <Card className={variantStyles[variant]}>
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${iconStyles[variant]}`} />
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
