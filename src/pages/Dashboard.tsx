import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowRight, AlertTriangle, Settings2 } from 'lucide-react';
import { KeywordExpiryWarning } from './dashboard/components/KeywordExpiryWarning';
import { UnauthorizedAccessAlert } from './dashboard/components/UnauthorizedAccessAlert';
import { Link } from 'react-router-dom';
import { useDashboardData } from './dashboard/hooks/useDashboardData';
import { StatCard } from './dashboard/components/StatCard';
import { PlanningOverview } from './dashboard/components/PlanningOverview';
import { TodayClassesCard } from './dashboard/components/TodayClassesCard';
import { WeeklyCalendarCard } from './dashboard/components/WeeklyCalendarCard';
import { QuickActionsCard } from './dashboard/components/QuickActionsCard';
import { PendingOrientationsCard } from './dashboard/components/PendingOrientationsCard';
import { CoordinatorPendenciesCard } from './dashboard/components/CoordinatorPendenciesCard';
import { BimesterCountdownCard } from './dashboard/components/BimesterCountdownCard';
import { ProfessorPendenciesCard } from './dashboard/components/ProfessorPendenciesCard';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { School, Users, GraduationCap, BookOpen } from 'lucide-react';
import { useConfigurationStatus } from '@/hooks/useConfigurationStatus';
import { CurrentPeriodBadge } from '@/components/CurrentPeriodBadge';


export default function Dashboard() {
  const { user } = useAuth();
  const {
    stats,
    planningStats,
    todayClasses,
    pendingOrientations,
    attendanceOverview,
    bimesterInfo,
    academicYear,
    loading,
    isProfessor,
    hasActiveCalendar,
    coordinatorPendencies,
    professorPendencies,
  } = useDashboardData();
  const { overallPercent, isFullyConfigured, loading: configLoading } = useConfigurationStatus();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const totalCoordPendencies = coordinatorPendencies
    ? coordinatorPendencies.planningsToReview + coordinatorPendencies.orientationsOverdue + coordinatorPendencies.attendancePendingToday
    : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Banner — editorial Neovale (estilo folder institucional) */}
      <Card className="bg-nexa-gradient text-white border-0 shadow-2xl shadow-[hsl(228_27%_11%)]/20 overflow-hidden relative">
        {/* Bloco amarelo diagonal — assinatura visual do folder */}
        <div
          className="absolute -bottom-16 -right-12 w-[280px] h-[280px] neovale-yellow-block opacity-95 pointer-events-none"
          style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
          aria-hidden
        />
        {/* 3 barras diagonais decorativas (motivo da marca) */}
        <div className="absolute bottom-6 right-6 hidden sm:flex gap-1.5 opacity-90 z-[1]" aria-hidden>
          <div className="w-1.5 h-12 bg-[hsl(228_27%_11%)] rotate-[-15deg]" />
          <div className="w-1.5 h-12 bg-[hsl(228_27%_11%)] rotate-[-15deg]" />
          <div className="w-1.5 h-12 bg-[hsl(228_27%_11%)] rotate-[-15deg]" />
        </div>
        {/* Linhas decorativas de fundo */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        <CardContent className="p-5 sm:p-7 relative z-[2]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0 max-w-2xl">
              {/* Tag editorial */}
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] uppercase tracking-[0.22em] text-primary font-bold">
                  Painel · Neovale
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl xl:text-4xl font-bold tracking-tight leading-[1.1]">
                {getGreeting()},{' '}
                <span className="text-primary">
                  {user?.nomeCompleto?.split(' ')[0]}.
                </span>
              </h1>
              <p className="text-white/65 mt-2 text-sm sm:text-base leading-relaxed">
                {bimesterInfo ? (
                  <>
                    Ano Letivo <span className="text-white font-semibold">{bimesterInfo.academicYear}</span>
                    {' · '}
                    <span className="text-white font-semibold">{bimesterInfo.currentBimester}º Bimestre</span>
                    {bimesterInfo.daysRemaining !== null && (
                      <span className="text-white/55">
                        {' · '}
                        {bimesterInfo.daysRemaining} dia{bimesterInfo.daysRemaining !== 1 ? 's' : ''} restante{bimesterInfo.daysRemaining !== 1 ? 's' : ''}
                      </span>
                    )}
                  </>
                ) : (
                  'Plataforma de Gestão Acadêmica'
                )}
              </p>
            </div>
            {/* CTA contextual */}
            <div className="relative z-[3] sm:max-w-[200px]">
              {!isProfessor && totalCoordPendencies > 0 ? (
                <Button asChild size="default" className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-[hsl(48_100%_70%)] font-bold uppercase tracking-wider text-xs shadow-[0_8px_24px_-8px_hsl(48_100%_64%/0.6)]">
                  <Link to="/planejamento">
                    {totalCoordPendencies} pendência{totalCoordPendencies > 1 ? 's' : ''}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : isProfessor && professorPendencies && (professorPendencies.planningsReturned + professorPendencies.planningsToSign + professorPendencies.orientationsToSign) > 0 ? (
                <Button asChild size="default" className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-[hsl(48_100%_70%)] font-bold uppercase tracking-wider text-xs shadow-[0_8px_24px_-8px_hsl(48_100%_64%/0.6)]">
                  <Link to="/planejamento">
                    Ver Pendências
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="default" variant="outline" className="w-full sm:w-auto border-primary/40 bg-white/5 text-white hover:bg-primary hover:text-primary-foreground font-bold uppercase tracking-wider text-xs">
                  <Link to="/planejamento">
                    Ver Planejamento
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Alert */}
      {!isProfessor && !loading && !hasActiveCalendar && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Calendário Acadêmico não configurado</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span>Nenhum calendário ativo encontrado. Configure-o para habilitar planejamentos, notas e frequência.</span>
            <Button variant="outline" size="sm" asChild className="w-fit">
              <Link to="/calendario">Configurar Calendário</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Keyword Expiry Alert — Admin only */}
      {!isProfessor && !loading && (
        <KeywordExpiryWarning />
      )}

      {/* Unauthorized Access Alert — Admin only */}
      {!isProfessor && !loading && (
        <UnauthorizedAccessAlert />
      )}

      {/* Configuration Status Alert */}
      {!isProfessor && !loading && !configLoading && !isFullyConfigured && (
        <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <Settings2 className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-400">Configuração Incompleta ({overallPercent}%)</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex-1">
              <Progress value={overallPercent} className="h-2 mt-1 bg-amber-200 dark:bg-amber-900" />
            </div>
            <Button variant="outline" size="sm" asChild className="w-fit border-amber-400 text-amber-700">
              <Link to="/configuracoes/status">Ver Detalhes</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {!isProfessor && (
        <>
          {/* PRIORITY: Pendencies first — drives daily action */}
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <CoordinatorPendenciesCard pendencies={coordinatorPendencies} loading={loading} />
            <BimesterCountdownCard bimesterInfo={bimesterInfo} planningStats={planningStats} loading={loading} isProfessor={false} />
          </div>

          {/* Stats Grid — secondary, overview context */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
            <StatCard title="Escolas Ativas" value={stats?.totalEscolas ?? 0} icon={School} description="Unidades cadastradas" loading={loading} index={0} />
            <StatCard title="Professores" value={stats?.totalProfessores ?? 0} icon={Users} description="Ativos no sistema" loading={loading} index={1} />
            <StatCard title="Alunos" value={stats?.totalAlunos?.toLocaleString('pt-BR') ?? '0'} icon={GraduationCap} description="Matriculados" loading={loading} index={2} />
            <StatCard title="Turmas" value={stats?.totalTurmas ?? 0} icon={BookOpen} description={academicYear ? `Ano letivo ${academicYear}` : 'Cadastradas'} loading={loading} index={3} />
          </div>

          {/* Planning Overview + Quick Actions */}
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <PlanningOverview stats={planningStats} loading={loading} isProfessor={false} />
            <QuickActionsCard isProfessor={false} />
          </div>
        </>
      )}

      {/* ====== PROFESSOR VIEW ====== */}
      {isProfessor && (
        <>
          <div className="flex justify-end">
            <CurrentPeriodBadge />
          </div>
          {/* PRIORITY: Pendencies first */}
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <ProfessorPendenciesCard pendencies={professorPendencies} loading={loading} />
            <BimesterCountdownCard bimesterInfo={bimesterInfo} planningStats={planningStats} loading={loading} isProfessor={true} />
          </div>

          {/* Weekly Calendar (semana toda) + card "Aulas de Hoje" (filtrado por dia atual) */}
          <WeeklyCalendarCard classes={todayClasses} loading={loading} />
          <TodayClassesCard classes={todayClasses.filter(c => {
            const weekdays = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'];
            return c.weekday === weekdays[new Date().getDay()];
          })} loading={loading} />

          {/* Planning + Quick Actions */}
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <PlanningOverview stats={planningStats} loading={loading} isProfessor={true} />
            <QuickActionsCard isProfessor={true} />
          </div>

          {/* Pending Orientations */}
          <PendingOrientationsCard orientations={pendingOrientations} loading={loading} />
        </>
      )}
    </div>
  );
}
