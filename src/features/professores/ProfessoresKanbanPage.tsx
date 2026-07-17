import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { LayoutDashboard, Search, Loader2, ArrowLeft, FileText } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useProfessorsKanban, KANBAN_COLUMNS, KanbanColumn, KanbanCard } from './hooks/useProfessorsKanban';
import { KanbanColumnView } from './components/kanban/KanbanColumnView';
import { CardEditDialog } from './components/kanban/CardEditDialog';
import { ShareProfessorDialog } from './components/ShareProfessorDialog';
import { KanbanMacroBySchool } from './components/kanban/KanbanMacroBySchool';
import { RelatorioProfessoresDialog } from './components/kanban/RelatorioProfessoresDialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { professoresApi } from '@/features/professores/api';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

type LinkFilter = 'all' | 'active' | 'expired' | 'none';
type StatusFilter = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'all';

export default function ProfessoresKanbanPage() {
  const navigate = useNavigate();
  const { organizationId } = useOrganization();
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('ACTIVE');
  const { cards, isLoading, upsert, refetch } = useProfessorsKanban({ statusFilter: filterStatus });
  const [search, setSearch] = useState('');
  const [filterSchoolId, setFilterSchoolId] = useState('all');
  const [filterLink, setFilterLink] = useState<LinkFilter>('all');
  const [editing, setEditing] = useState<KanbanCard | null>(null);
  const [shareCard, setShareCard] = useState<KanbanCard | null>(null);
  const [relatorioOpen, setRelatorioOpen] = useState(false);

  // Schools for filter
  const { data: schools } = useQuery({
    queryKey: ['kanban-schools', organizationId],
    queryFn: async () => {
      const { data } = await professoresApi.client.from('schools').select('id, nome')
        .eq('organization_id', organizationId!).eq('status', 'ativo').order('nome');
      return data || [];
    },
    enabled: !!organizationId,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards.filter(c => {
      if (q && !c.full_name.toLowerCase().includes(q) && !(c.registration_code || '').toLowerCase().includes(q)) return false;
      if (filterSchoolId !== 'all') {
        const schoolName = (schools || []).find(s => s.id === filterSchoolId)?.nome;
        if (!schoolName || !c.school_names.includes(schoolName)) return false;
      }
      if (filterLink !== 'all' && c.link_status !== filterLink) return false;
      return true;
    });
  }, [cards, search, filterSchoolId, filterLink, schools]);

  // KPIs (sobre todos os cards, não filtrados)
  const kpis = useMemo(() => {
    const total = cards.length;
    const completed = cards.filter(c => c.is_complete).length;
    const expired = cards.filter(c => c.link_status === 'expired').length;
    const noLink = cards.filter(c => c.link_status === 'none').length;
    const avg = total > 0 ? Math.round(cards.reduce((s, c) => s + c.completion_pct, 0) / total) : 0;
    return { total, completed, expired, noLink, avg };
  }, [cards]);

  const byColumn = useMemo(() => {
    const map: Record<KanbanColumn, KanbanCard[]> = {
      awaiting_link: [], link_sent: [], in_progress: [], completed: [],
    };
    filtered.forEach(c => map[c.effective_column].push(c));
    // ordenar por nome
    Object.values(map).forEach(arr => arr.sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR')));
    return map;
  }, [filtered]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const card = cards.find(c => c.professor_id === active.id);
    const targetCol = over.id as KanbanColumn;
    if (!card || card.effective_column === targetCol) return;
    if (!KANBAN_COLUMNS.find(c => c.id === targetCol)) return;
    try {
      await upsert.mutateAsync({ professor_id: card.professor_id, manual_column: targetCol });
      toast.success('Card movido');
    } catch {/* já tratado */}
  };

  const handleClearManual = async (card: KanbanCard) => {
    await upsert.mutateAsync({ professor_id: card.professor_id, manual_column: null });
    toast.success('Card voltou para automático');
  };

  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('/professores')}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Professores
      </Button>

      <PageHeader
        breadcrumbs={[{ label: 'Acadêmico' }, { label: 'Professores', href: '/professores' }, { label: 'Kanban' }]}
        title="Kanban de Professores"
        description="Acompanhe o envio de documentos por professor com cards visuais e movimentação manual"
        icon={LayoutDashboard}
      />

      <Tabs defaultValue="kanban" className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <TabsList>
            <TabsTrigger value="kanban">Visão Kanban</TabsTrigger>
            <TabsTrigger value="macro">Visão Macro por Escola</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={() => setRelatorioOpen(true)} className="gap-2">
            <FileText className="h-4 w-4" />
            Relatório
          </Button>
        </div>

        <TabsContent value="kanban" className="space-y-4 mt-0">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { label: 'Professores', value: kpis.total, color: 'text-foreground' },
              { label: 'Completos', value: kpis.completed, color: 'text-emerald-600' },
              { label: 'Sem link', value: kpis.noLink, color: 'text-amber-600' },
              { label: 'Link expirado', value: kpis.expired, color: 'text-destructive' },
              { label: 'Média conclusão', value: `${kpis.avg}%`, color: 'text-sky-600' },
            ].map(k => (
              <Card key={k.label}>
                <CardContent className="p-3">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{k.label}</div>
                  <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-3 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar professor por nome ou matrícula..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <SearchableSelect
                value={filterSchoolId}
                onValueChange={setFilterSchoolId}
                placeholder="Todas as escolas"
                triggerClassName="w-full sm:w-[220px]"
                options={[
                  { value: 'all', label: 'Todas as escolas' },
                  ...((schools || []).map(s => ({ value: s.id, label: s.nome }))),
                ]}
              />
              <SearchableSelect
                value={filterLink}
                onValueChange={(v) => setFilterLink(v as LinkFilter)}
                placeholder="Status do link"
                triggerClassName="w-full sm:w-[200px]"
                options={[
                  { value: 'all', label: 'Todos os links' },
                  { value: 'active', label: 'Link ativo' },
                  { value: 'expired', label: 'Link expirado' },
                  { value: 'none', label: 'Sem link gerado' },
                ]}
              />
              <SearchableSelect
                value={filterStatus}
                onValueChange={(v) => setFilterStatus(v as StatusFilter)}
                placeholder="Status do professor"
                triggerClassName="w-full sm:w-[200px]"
                options={[
                  { value: 'ACTIVE', label: 'Ativos' },
                  { value: 'INACTIVE', label: 'Inativos' },
                  { value: 'ON_LEAVE', label: 'Afastados' },
                  { value: 'all', label: 'Todos os status' },
                ]}
              />
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {KANBAN_COLUMNS.map(col => (
                  <KanbanColumnView
                    key={col.id}
                    id={col.id}
                    title={col.title}
                    description={col.description}
                    accent={col.accent}
                    cards={byColumn[col.id]}
                    onEdit={setEditing}
                    onClearManual={handleClearManual}
                    onGenerateLink={setShareCard}
                  />
                ))}
              </div>
            </DndContext>
          )}
        </TabsContent>

        <TabsContent value="macro" className="mt-0">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <KanbanMacroBySchool cards={cards} schools={schools || []} onGenerateLink={setShareCard} />
          )}
        </TabsContent>
      </Tabs>

      <CardEditDialog
        card={editing}
        open={!!editing}
        onOpenChange={v => { if (!v) setEditing(null); }}
        saving={upsert.isPending}
        onSave={async ({ description, labels }) => {
          if (!editing) return;
          await upsert.mutateAsync({ professor_id: editing.professor_id, description, labels });
          toast.success('Card atualizado');
        }}
      />

      {shareCard && (
        <ShareProfessorDialog
          open={!!shareCard}
          onOpenChange={v => { if (!v) { setShareCard(null); refetch(); } }}
          professorId={shareCard.professor_id}
          professorName={shareCard.full_name}
        />
      )}

      <RelatorioProfessoresDialog open={relatorioOpen} onOpenChange={setRelatorioOpen} />
    </div>
  );
}
