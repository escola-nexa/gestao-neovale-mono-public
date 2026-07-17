import { ArrowLeft, Trophy, Medal, Award, Star, TrendingUp, School, MapPin, BarChart3, Shield, Clock, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScoreBadge } from '@/components/bi/ScoreBadge';
import { ChartCard } from '@/components/bi/ChartCard';
import { ProfessorRanking } from '@/hooks/bi/useBIRankings';
import { ConsistencyEntry } from './ConsistencyPodium';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';

interface ProfessorRankingDetailProps {
  professor: ProfessorRanking;
  allRankings: ProfessorRanking[];
  consistencyEntries: ConsistencyEntry[];
  onBack: () => void;
}

const MEDAL_CONFIG = {
  gold: { icon: Trophy, color: '#FFD700', label: 'Ouro' },
  silver: { icon: Medal, color: '#C0C0C0', label: 'Prata' },
  bronze: { icon: Award, color: '#CD7F32', label: 'Bronze' },
};

const CONSISTENCY_COLORS = { '3m': 'border-blue-300 bg-blue-50 text-blue-700', '6m': 'border-purple-300 bg-purple-50 text-purple-700', '10m': 'border-amber-300 bg-amber-50 text-amber-700' };

export function ProfessorRankingDetail({ professor: p, allRankings, consistencyEntries, onBack }: ProfessorRankingDetailProps) {
  const medal = p.medal ? MEDAL_CONFIG[p.medal] : null;
  const MedalIcon = medal?.icon || Star;

  const schoolRankings = allRankings.filter(r => r.school_id === p.school_id);
  const schoolPosition = schoolRankings.findIndex(r => r.professor_id === p.professor_id) + 1;
  const cityRankings = allRankings.filter(r => r.city === p.city);
  const cityPosition = cityRankings.findIndex(r => r.professor_id === p.professor_id) + 1;

  const avgAll = allRankings.length > 0 ? allRankings.reduce((s, r) => s + r.total_score, 0) / allRankings.length : 0;
  const avgSchool = schoolRankings.length > 0 ? schoolRankings.reduce((s, r) => s + r.total_score, 0) / schoolRankings.length : 0;
  const avgCity = cityRankings.length > 0 ? cityRankings.reduce((s, r) => s + r.total_score, 0) / cityRankings.length : 0;

  const consistency = consistencyEntries.find(e => e.professor.professor_id === p.professor_id);

  const radarData = [
    { subject: 'Planejamento', professor: p.planning_score, media: allRankings.reduce((s, r) => s + r.planning_score, 0) / Math.max(1, allRankings.length) },
    { subject: 'Frequência', professor: p.attendance_score, media: allRankings.reduce((s, r) => s + r.attendance_score, 0) / Math.max(1, allRankings.length) },
    { subject: 'Notas', professor: p.grades_score, media: allRankings.reduce((s, r) => s + r.grades_score, 0) / Math.max(1, allRankings.length) },
    { subject: 'Orientações', professor: p.orientations_score, media: allRankings.reduce((s, r) => s + r.orientations_score, 0) / Math.max(1, allRankings.length) },
    { subject: 'Regularidade', professor: p.regularity_score, media: allRankings.reduce((s, r) => s + r.regularity_score, 0) / Math.max(1, allRankings.length) },
  ];

  const compData = [
    { label: 'Professor', score: p.total_score },
    { label: 'Média Geral', score: avgAll },
    { label: 'Média Escola', score: avgSchool },
    { label: 'Média Cidade', score: avgCity },
  ];

  const dimensions = [
    { label: 'Planejamento Pedagógico', score: p.planning_score, weight: '30%', detail: `${p.planning_approved}/${p.planning_total} aprovados, ${p.planning_signed} assinados, ${p.planning_returned} devolvidos` },
    { label: 'Frequência', score: p.attendance_score, weight: '25%', detail: `${p.attendance_total} sessões registradas` },
    { label: 'Notas', score: p.grades_score, weight: '20%', detail: `${p.grades_closed}/${p.grades_total} configurações fechadas` },
    { label: 'Orientações', score: p.orientations_score, weight: '15%', detail: `${p.orientations_signed}/${p.orientations_total} assinadas` },
    { label: 'Regularidade Operacional', score: p.regularity_score, weight: '10%', detail: 'Presença em múltiplas dimensões' },
  ];

  const sorted = [...dimensions].sort((a, b) => b.score - a.score);
  const strengths = sorted.filter(d => d.score >= 70).slice(0, 3);
  const weaknesses = sorted.filter(d => d.score < 70).reverse().slice(0, 3);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-xs -ml-2">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao ranking
      </Button>

      {/* Header Card */}
      <Card className={cn(
        'overflow-hidden',
        medal && 'border-2',
        p.medal === 'gold' && 'border-amber-300 bg-gradient-to-r from-amber-50/50 to-background',
        p.medal === 'silver' && 'border-gray-300 bg-gradient-to-r from-gray-50/50 to-background',
        p.medal === 'bronze' && 'border-orange-300 bg-gradient-to-r from-orange-50/50 to-background',
      )}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 ring-2 ring-primary/20 flex-shrink-0">
              <AvatarImage src={p.avatar_url || undefined} />
              <AvatarFallback className="text-lg font-bold bg-muted">
                {p.professor_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-foreground">{p.professor_name}</h2>
                {medal && (
                  <Badge className="text-xs font-bold gap-1" style={{ backgroundColor: `${medal.color}20`, color: medal.color === '#C0C0C0' ? '#666' : medal.color, borderColor: medal.color }}>
                    <MedalIcon className="h-3 w-3" /> {medal.label}
                  </Badge>
                )}
                {p.rank_position <= 3 && (
                  <Badge variant="outline" className="text-[10px] gap-0.5 border-primary/30 text-primary bg-primary/5">
                    <Globe className="h-2.5 w-2.5" /> Top Estadual
                  </Badge>
                )}
                {consistency && (
                  <Badge variant="outline" className={cn('text-[10px] gap-0.5', CONSISTENCY_COLORS[consistency.category])}>
                    <Shield className="h-2.5 w-2.5" /> Consistente {consistency.category === '3m' ? '3m' : consistency.category === '6m' ? '6m' : '10m'}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><School className="h-3 w-3" /> {p.school_name}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.city}</span>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Estadual</p>
                  <Badge variant="secondary" className="text-xs font-bold">{p.rank_position}º / {allRankings.length}</Badge>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Escola</p>
                  <Badge variant="secondary" className="text-xs font-bold">{schoolPosition}º / {schoolRankings.length}</Badge>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Cidade</p>
                  <Badge variant="secondary" className="text-xs font-bold">{cityPosition}º / {cityRankings.length}</Badge>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Score</p>
                  <ScoreBadge score={p.total_score} size="md" showLabel />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Consistency card if applicable */}
      {consistency && (
        <Card className={cn('border', CONSISTENCY_COLORS[consistency.category])}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">
                  Professor de Alta Consistência — {consistency.category === '3m' ? '3 Meses' : consistency.category === '6m' ? '6 Meses' : '10 Meses'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Posição média: {consistency.avgPosition}º • Score médio: {consistency.avgScore.toFixed(1)}% • Estabilidade: {consistency.stability}% • Presença no pódio: {consistency.podiumCount}x
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Perfil de Desempenho" subtitle="Professor vs Média Geral">
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid strokeDasharray="3 3" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
              <Radar name="Professor" dataKey="professor" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
              <Radar name="Média" dataKey="media" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.1} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Comparativo de Score" subtitle="Professor vs Médias (Escola, Cidade, Geral)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={compData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" domain={[0, 100]} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={100} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Breakdown da Pontuação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dimensions.map(d => (
            <div key={d.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{d.label} <span className="text-muted-foreground">({d.weight})</span></span>
                <span className={cn('font-bold', d.score >= 75 ? 'text-green-600' : d.score >= 50 ? 'text-yellow-600' : 'text-red-600')}>
                  {d.score.toFixed(1)}%
                </span>
              </div>
              <Progress value={d.score} className="h-2" />
              <p className="text-[10px] text-muted-foreground">{d.detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-green-700">✅ Pontos Fortes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {strengths.length > 0 ? strengths.map(s => (
              <div key={s.label} className="flex items-center justify-between text-xs">
                <span className="text-foreground">{s.label}</span>
                <Badge variant="outline" className="text-[10px] border-green-300 text-green-600">{s.score.toFixed(0)}%</Badge>
              </div>
            )) : <p className="text-xs text-muted-foreground">Nenhum critério acima de 70%</p>}
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-red-700">⚠️ Pontos a Melhorar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {weaknesses.length > 0 ? weaknesses.map(s => (
              <div key={s.label} className="flex items-center justify-between text-xs">
                <span className="text-foreground">{s.label}</span>
                <Badge variant="outline" className="text-[10px] border-red-300 text-red-600">{s.score.toFixed(0)}%</Badge>
              </div>
            )) : <p className="text-xs text-muted-foreground">Todos os critérios acima de 70% 🎉</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
