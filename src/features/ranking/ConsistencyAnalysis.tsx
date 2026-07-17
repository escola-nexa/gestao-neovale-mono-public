import { TrendingUp, TrendingDown, Minus, BarChart3, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ConsistencyEntry } from './ConsistencyPodium';

interface ConsistencyAnalysisProps {
  entries: ConsistencyEntry[];
  allCount: number;
}

export function ConsistencyAnalysis({ entries, allCount }: ConsistencyAnalysisProps) {
  const consistent = entries.length;
  const nonConsistent = allCount - consistent;
  const avgStability = entries.length > 0 ? entries.reduce((s, e) => s + e.stability, 0) / entries.length : 0;
  const trendUp = entries.filter(e => e.trend === 'up').length;
  const trendDown = entries.filter(e => e.trend === 'down').length;
  const trendStable = entries.filter(e => e.trend === 'stable').length;

  // Generate insights
  const insights: { text: string; type: 'success' | 'warning' | 'info' }[] = [];

  const top10m = entries.filter(e => e.category === '10m');
  const top6m = entries.filter(e => e.category === '6m');
  const top3m = entries.filter(e => e.category === '3m');

  if (top10m.length > 0) {
    insights.push({
      text: `${top10m[0].professor.professor_name} manteve presença no pódio por 10 meses — elite de consistência.`,
      type: 'success',
    });
  }

  if (top6m.length > 0 && top10m.length === 0) {
    insights.push({
      text: `${top6m[0].professor.professor_name} sustentou alta performance por 6 meses consecutivos.`,
      type: 'success',
    });
  }

  if (trendDown > 0) {
    const falling = entries.filter(e => e.trend === 'down')[0];
    insights.push({
      text: `${falling.professor.professor_name} apresentou tendência de queda — atenção para manutenção do desempenho.`,
      type: 'warning',
    });
  }

  if (trendUp > trendDown) {
    insights.push({
      text: `${trendUp} professores apresentam tendência de crescimento — evolução positiva da equipe.`,
      type: 'info',
    });
  }

  if (consistent === 0) {
    insights.push({
      text: 'Dados históricos ainda sendo acumulados. Os indicadores de consistência serão gerados com o tempo.',
      type: 'info',
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground">Análise de Consistência Docente</CardTitle>
            <p className="text-xs text-muted-foreground">Desempenho sustentado vs performance pontual</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground uppercase font-medium">Consistentes</p>
            <p className="text-lg font-bold text-foreground">{consistent}</p>
            <p className="text-[10px] text-muted-foreground">de {allCount}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground uppercase font-medium">Estabilidade Média</p>
            <p className="text-lg font-bold text-foreground">{avgStability.toFixed(0)}%</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground uppercase font-medium">Em Crescimento</p>
            <p className="text-lg font-bold text-green-600 flex items-center justify-center gap-1">
              <TrendingUp className="h-4 w-4" /> {trendUp}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground uppercase font-medium">Em Queda</p>
            <p className="text-lg font-bold text-red-600 flex items-center justify-center gap-1">
              <TrendingDown className="h-4 w-4" /> {trendDown}
            </p>
          </div>
        </div>

        {/* Distribution */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] gap-1 border-amber-300 text-amber-700 bg-amber-50">
            <Clock className="h-2.5 w-2.5" /> 10 meses: {top10m.length}
          </Badge>
          <Badge variant="outline" className="text-[10px] gap-1 border-purple-300 text-purple-700 bg-purple-50">
            <Clock className="h-2.5 w-2.5" /> 6 meses: {top6m.length}
          </Badge>
          <Badge variant="outline" className="text-[10px] gap-1 border-blue-300 text-blue-700 bg-blue-50">
            <Clock className="h-2.5 w-2.5" /> 3 meses: {top3m.length}
          </Badge>
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Insights Automáticos</p>
            {insights.map((insight, i) => (
              <div
                key={i}
                className={cn(
                  'p-2.5 rounded-lg text-xs leading-relaxed border',
                  insight.type === 'success' && 'bg-green-50 border-green-200 text-green-800',
                  insight.type === 'warning' && 'bg-amber-50 border-amber-200 text-amber-800',
                  insight.type === 'info' && 'bg-blue-50 border-blue-200 text-blue-800',
                )}
              >
                {insight.text}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
