import { useConfigurationStatus, ConfigStep } from '@/hooks/useConfigurationStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/PageHeader';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  Lock,
  ArrowRight,
  Loader2,
  Settings2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function StepCard({
  step,
  blocked,
  missingPrereqs,
}: {
  step: ConfigStep;
  blocked: boolean;
  missingPrereqs: string[];
}) {
  return (
    <Card
      className={cn(
        'border-l-4 transition-all',
        step.completed
          ? 'border-l-emerald-500 bg-emerald-500/5'
          : blocked
            ? 'border-l-muted opacity-70'
            : 'border-l-amber-500 bg-amber-500/5',
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="pt-0.5">
            {step.completed ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : blocked ? (
              <Lock className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Circle className="h-5 w-5 text-amber-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm">
                {step.order}. {step.label}
              </h3>
              {step.completed ? (
                <Badge variant="default" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-[10px]">
                  Concluído
                </Badge>
              ) : blocked ? (
                <Badge variant="secondary" className="text-[10px]">Bloqueado</Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                  Pendente
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
            {step.completed && (
              <p className="text-xs font-medium mt-1.5 text-foreground">
                {step.count} registro{step.count !== 1 ? 's' : ''} cadastrado{step.count !== 1 ? 's' : ''}
              </p>
            )}
            {blocked && missingPrereqs.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Depende de: {missingPrereqs.join(', ')}
              </p>
            )}
            {!step.completed && !blocked && (
              <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" asChild>
                <Link to={step.path}>
                  Configurar <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ConfigurationStatusPage() {
  const { steps, overallPercent, isFullyConfigured, loading, getMissingPrerequisites, isBlocked } =
    useConfigurationStatus();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const completedCount = steps.filter((s) => s.completed).length;
  const pendingSteps = steps.filter((s) => !s.completed && !isBlocked(s.key));
  const nextStep = pendingSteps[0];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Status de Configuração' }]}
        title="Status de Configuração"
        description="Acompanhe a configuração inicial do sistema e libere os módulos."
        icon={Settings2}
      />

      {/* Summary Card */}
      <Card className={cn(
        'border-0 shadow-lg',
        isFullyConfigured
          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
          : 'bg-nexa-gradient text-white',
      )}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {isFullyConfigured ? (
                  <Sparkles className="h-5 w-5" />
                ) : (
                  <Settings2 className="h-5 w-5" />
                )}
                <h1 className="text-xl font-bold">
                  {isFullyConfigured
                    ? 'Configuração Completa!'
                    : 'Status de Configuração'}
                </h1>
              </div>
              <p className="text-sm text-primary-foreground/80">
                {isFullyConfigured
                  ? 'Todos os módulos estão configurados. O sistema está pronto para uso completo.'
                  : `${completedCount} de ${steps.length} etapas concluídas. Complete todas para habilitar o sistema.`}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Progress value={overallPercent} className="flex-1 h-2.5 bg-white/20" />
                <span className="text-sm font-bold">{overallPercent}%</span>
              </div>
            </div>
            {nextStep && (
              <Button variant="secondary" asChild size="sm">
                <Link to={nextStep.path}>
                  Próxima Etapa: {nextStep.label}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Steps Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step) => (
          <StepCard
            key={step.key}
            step={step}
            blocked={isBlocked(step.key)}
            missingPrereqs={getMissingPrerequisites(step.key)}
          />
        ))}
      </div>
    </div>
  );
}
