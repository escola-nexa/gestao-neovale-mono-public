import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface AlertCardProps {
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  count?: number;
  className?: string;
}

const severityConfig = {
  critical: { icon: AlertCircle, bg: 'bg-red-50 border-red-200', iconColor: 'text-red-500', text: 'text-red-800' },
  warning: { icon: AlertTriangle, bg: 'bg-yellow-50 border-yellow-200', iconColor: 'text-yellow-500', text: 'text-yellow-800' },
  info: { icon: Info, bg: 'bg-blue-50 border-blue-200', iconColor: 'text-blue-500', text: 'text-blue-800' },
};

export function AlertCard({ title, description, severity, count, className }: AlertCardProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <Card className={cn('border', config.bg, className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', config.iconColor)} />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className={cn('text-sm font-semibold', config.text)}>{title}</h4>
              {count !== undefined && (
                <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', config.bg, config.text)}>
                  {count}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
