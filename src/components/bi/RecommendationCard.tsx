import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface RecommendationCardProps {
  priority: 'alta' | 'media' | 'baixa';
  category: string;
  targetName: string;
  targetId?: string;
  targetType: 'teacher' | 'school' | 'system';
  action: string;
  reason: string;
  impact: string;
}

const priorityConfig = {
  alta: { label: 'Alta', className: 'bg-red-100 text-red-700 border-red-200' },
  media: { label: 'Média', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  baixa: { label: 'Baixa', className: 'bg-blue-100 text-blue-700 border-blue-200' },
};

export function RecommendationCard({ priority, category, targetName, targetId, targetType, action, reason, impact }: RecommendationCardProps) {
  const navigate = useNavigate();
  const config = priorityConfig[priority];

  const handleNavigate = () => {
    if (targetType === 'teacher' && targetId) navigate(`/bi/professores/${targetId}`);
    if (targetType === 'school' && targetId) navigate(`/bi/escolas-bi/${targetId}`);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={cn('text-[10px] font-bold', config.className)}>{config.label}</Badge>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{category}</span>
            </div>
            <h4 className="text-sm font-semibold text-foreground leading-tight">{action}</h4>
            <p className="text-xs text-muted-foreground mt-1">{reason}</p>
            <p className="text-xs text-emerald-600 mt-1 font-medium">Impacto: {impact}</p>
          </div>
          {targetId && (
            <Button variant="ghost" size="sm" className="flex-shrink-0 h-8 w-8 p-0" onClick={handleNavigate}>
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
