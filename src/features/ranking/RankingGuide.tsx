import FeatureGuideCard from '@/components/FeatureGuideCard';
import { Trophy, BarChart3, Target, Lightbulb, Globe, Shield } from 'lucide-react';

export function RankingGuide() {
  return (
    <FeatureGuideCard
      title="Como Funciona o Ranking"
      steps={[
        {
          icon: BarChart3,
          title: 'Score Ponderado',
          description: 'O score é calculado com base em 5 critérios: Planejamento (30%), Frequência (25%), Notas (20%), Orientações (15%) e Regularidade (10%).',
          color: 'blue',
        },
        {
          icon: Globe,
          title: 'Pódio Estadual',
          description: 'Os 3 melhores professores de todo o estado recebem o reconhecimento máximo com medalhas de Ouro, Prata e Bronze estaduais.',
          color: 'amber',
        },
        {
          icon: Shield,
          title: 'Consistência Temporal',
          description: 'Professores que mantêm alta performance recebem selos de Consistência: 3 meses (azul), 6 meses (roxo) e 10 meses (dourado).',
          color: 'purple',
        },
        {
          icon: Target,
          title: 'Quase no Pódio',
          description: 'Análise dos professores próximos da medalha: motivos, gaps e recomendações para evolução.',
          color: 'green',
        },
      ]}
    />
  );
}
