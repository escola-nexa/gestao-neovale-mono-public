import { ChartCard } from '@/components/bi/ChartCard';
import { ProfessorRanking } from '@/hooks/bi/useBIRankings';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface RankingComparisonChartProps {
  rankings: ProfessorRanking[];
  loading?: boolean;
}

export function RankingComparisonChart({ rankings, loading }: RankingComparisonChartProps) {
  const top10 = rankings.slice(0, 10);
  const truncName = (name: string, max = 14) => name.length > max ? name.slice(0, max) + '…' : name;

  const chartData = top10.map(r => ({
    name: truncName(r.professor_name),
    Planejamento: Number(r.planning_score.toFixed(1)),
    Frequência: Number(r.attendance_score.toFixed(1)),
    Notas: Number(r.grades_score.toFixed(1)),
    Orientações: Number(r.orientations_score.toFixed(1)),
  }));

  return (
    <ChartCard
      title="Top 10 — Comparativo por Critério"
      subtitle="Análise dimensional dos melhores professores"
      loading={loading}
    >
      <ResponsiveContainer width="100%" height={Math.max(280, top10.length * 35)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
          <Tooltip formatter={(v: number) => `${v}%`} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="Planejamento" fill="hsl(var(--primary))" radius={[0, 2, 2, 0]} stackId="a" />
          <Bar dataKey="Frequência" fill="#3b82f6" radius={[0, 2, 2, 0]} stackId="a" />
          <Bar dataKey="Notas" fill="#10b981" radius={[0, 2, 2, 0]} stackId="a" />
          <Bar dataKey="Orientações" fill="#f59e0b" radius={[0, 2, 2, 0]} stackId="a" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
