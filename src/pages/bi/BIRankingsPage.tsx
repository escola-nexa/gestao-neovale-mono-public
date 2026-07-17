import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Trophy, Crown, Search, Globe, Shield } from 'lucide-react';
import { GlobalFilterBar, BIFilters } from '@/components/bi/GlobalFilterBar';
import { MethodologyDrawer } from '@/components/bi/MethodologyDrawer';
import { useBIRankings, ProfessorRanking } from '@/hooks/bi/useBIRankings';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { RankingPodium } from '@/features/ranking/RankingPodium';
import { StatePodium } from '@/features/ranking/StatePodium';
import { RankingTable } from '@/features/ranking/RankingTable';
import { RankingKpis } from '@/features/ranking/RankingKpis';
import { NearPodiumAnalysis } from '@/features/ranking/NearPodiumAnalysis';
import { RankingSchoolView } from '@/features/ranking/RankingSchoolView';
import { RankingCityView } from '@/features/ranking/RankingCityView';
import { RankingComparisonChart } from '@/features/ranking/RankingComparisonChart';
import { RankingGuide } from '@/features/ranking/RankingGuide';
import { ProfessorRankingDetail } from '@/features/ranking/ProfessorRankingDetail';
import { ConsistencyPodium } from '@/features/ranking/ConsistencyPodium';
import { ConsistencyAnalysis } from '@/features/ranking/ConsistencyAnalysis';

export default function BIRankingsPage() {
  const [filters, setFilters] = useState<BIFilters>({});
  const [tab, setTab] = useState('estadual');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProfessor, setSelectedProfessor] = useState<ProfessorRanking | null>(null);

  const {
    rankingsQuery, rankings, podium, statePodium, nearPodiumAnalysis,
    allRanked, bySchool, byCity, kpis, cities, consistencyEntries, getHighlight
  } = useBIRankings(filters);
  const loading = rankingsQuery.isLoading;

  const filteredRankings = searchTerm
    ? rankings.filter(r => r.professor_name.toLowerCase().includes(searchTerm.toLowerCase()))
    : rankings;

  if (selectedProfessor) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb items={[{ label: 'B.I.', href: '/bi' }, { label: 'Rankings', href: '/bi/rankings' }, { label: selectedProfessor.professor_name }]} />
        <ProfessorRankingDetail
          professor={selectedProfessor}
          allRankings={allRanked}
          consistencyEntries={consistencyEntries}
          onBack={() => setSelectedProfessor(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'B.I.', href: '/bi' }, { label: 'Ranking de Professores' }]}
        title="Ranking de Professores"
        description="Reconhecimento, análise comparativa e consistência temporal"
        icon={Crown}
        actions={<MethodologyDrawer />}
      />

      <GlobalFilterBar filters={filters} onChange={setFilters} />

      {/* KPIs */}
      <RankingKpis kpis={kpis} loading={loading} />

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList className="flex-wrap h-auto gap-0.5">
            <TabsTrigger value="estadual" className="text-xs gap-1"><Globe className="h-3.5 w-3.5" /> Estadual</TabsTrigger>
            <TabsTrigger value="escola" className="text-xs">Por Escola</TabsTrigger>
            <TabsTrigger value="cidade" className="text-xs">Por Cidade</TabsTrigger>
            <TabsTrigger value="consistencia" className="text-xs gap-1"><Shield className="h-3.5 w-3.5" /> Consistência</TabsTrigger>
            <TabsTrigger value="geral" className="text-xs gap-1"><Trophy className="h-3.5 w-3.5" /> Ranking Completo</TabsTrigger>
          </TabsList>
          <div className="relative w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar professor..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-8 text-xs pl-8"
            />
          </div>
        </div>

        {/* === ESTADUAL TAB === */}
        <TabsContent value="estadual" className="space-y-6 mt-4">
          {statePodium.length >= 3 && (
            <StatePodium podium={statePodium} onSelect={setSelectedProfessor} getHighlight={getHighlight} />
          )}

          <RankingComparisonChart rankings={filteredRankings} loading={loading} />

          {nearPodiumAnalysis.length > 0 && (
            <NearPodiumAnalysis data={nearPodiumAnalysis} onSelectProfessor={setSelectedProfessor} />
          )}

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Ranking Estadual Completo
            </h2>
            <RankingTable data={filteredRankings} loading={loading} onSelect={setSelectedProfessor} />
          </div>
        </TabsContent>

        {/* === ESCOLA TAB === */}
        <TabsContent value="escola" className="mt-4">
          <RankingSchoolView
            bySchool={bySchool}
            loading={loading}
            onSelectProfessor={setSelectedProfessor}
            getHighlight={getHighlight}
          />
        </TabsContent>

        {/* === CIDADE TAB === */}
        <TabsContent value="cidade" className="mt-4">
          <RankingCityView
            byCity={byCity}
            cities={cities}
            loading={loading}
            onSelectProfessor={setSelectedProfessor}
            getHighlight={getHighlight}
          />
        </TabsContent>

        {/* === CONSISTÊNCIA TAB === */}
        <TabsContent value="consistencia" className="space-y-6 mt-4">
          <ConsistencyPodium entries={consistencyEntries} onSelect={setSelectedProfessor} />
          <ConsistencyAnalysis entries={consistencyEntries} allCount={rankings.length} />
        </TabsContent>

        {/* === GERAL TAB === */}
        <TabsContent value="geral" className="space-y-6 mt-4">
          {podium.length >= 3 && (
            <RankingPodium podium={podium} onSelect={setSelectedProfessor} getHighlight={getHighlight} />
          )}

          <RankingComparisonChart rankings={filteredRankings} loading={loading} />

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Ranking Completo
            </h2>
            <RankingTable data={filteredRankings} loading={loading} onSelect={setSelectedProfessor} />
          </div>

          {nearPodiumAnalysis.length > 0 && (
            <NearPodiumAnalysis data={nearPodiumAnalysis} onSelectProfessor={setSelectedProfessor} />
          )}
        </TabsContent>
      </Tabs>

      {/* Guide */}
      <RankingGuide />
    </div>
  );
}
