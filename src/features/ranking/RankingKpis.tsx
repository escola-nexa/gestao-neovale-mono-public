import { Users, Trophy, Target, School, MapPin, TrendingUp, Shield } from 'lucide-react';
import { KpiCard } from '@/components/bi/KpiCard';

interface RankingKpisProps {
  kpis: {
    totalAvaliados: number;
    melhorScore: number;
    mediaGeral: number;
    medalhistas: number;
    proximosPodio: number;
    consistentes: number;
    melhorEscola: string;
    melhorCidade: string;
  };
  loading?: boolean;
}

export function RankingKpis({ kpis, loading }: RankingKpisProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      <KpiCard title="Professores Avaliados" value={kpis.totalAvaliados} icon={Users} variant="info" loading={loading} />
      <KpiCard title="Melhor Score" value={`${kpis.melhorScore.toFixed(1)}%`} icon={Trophy} variant="success" loading={loading} />
      <KpiCard title="Média Geral" value={`${kpis.mediaGeral.toFixed(1)}%`} icon={TrendingUp} variant="default" loading={loading} />
      <KpiCard title="Medalhistas" value={kpis.medalhistas} icon={Trophy} variant="warning" loading={loading} />
      <KpiCard title="Próximos Pódio" value={kpis.proximosPodio} icon={Target} variant="default" loading={loading} />
      <KpiCard title="Consistentes" value={kpis.consistentes} icon={Shield} variant="info" loading={loading} />
      <KpiCard title="Melhor Escola" value={kpis.melhorEscola} icon={School} variant="success" loading={loading} />
      <KpiCard title="Melhor Cidade" value={kpis.melhorCidade} icon={MapPin} variant="info" loading={loading} />
    </div>
  );
}
