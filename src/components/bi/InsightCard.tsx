import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, CheckCircle2, Lightbulb, TrendingDown, TrendingUp } from 'lucide-react';

interface InsightCardProps {
  category: 'risk' | 'opportunity' | 'trend' | 'operational';
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  targetName?: string;
  metricValue?: number;
}

const severityConfig = {
  critical: { icon: AlertCircle, bg: 'bg-red-50 border-red-200', iconColor: 'text-red-600', title: 'text-red-900' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50 border-amber-200', iconColor: 'text-amber-600', title: 'text-amber-900' },
  info: { icon: Lightbulb, bg: 'bg-blue-50 border-blue-200', iconColor: 'text-blue-600', title: 'text-blue-900' },
  success: { icon: CheckCircle2, bg: 'bg-emerald-50 border-emerald-200', iconColor: 'text-emerald-600', title: 'text-emerald-900' },
};

const categoryLabels = {
  risk: 'Risco',
  opportunity: 'Oportunidade',
  trend: 'Tendência',
  operational: 'Operacional',
};

export function InsightCard({ category, severity, title, description, targetName }: InsightCardProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <Card className={cn('border transition-shadow hover:shadow-md', config.bg)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0', config.iconColor, 'bg-white/70')}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded', config.bg)}>{categoryLabels[category]}</span>
              {targetName && <span className="text-[10px] text-muted-foreground truncate">• {targetName}</span>}
            </div>
            <h4 className={cn('text-sm font-semibold leading-tight', config.title)}>{title}</h4>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
