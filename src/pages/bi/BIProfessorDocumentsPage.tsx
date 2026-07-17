import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck2, FileWarning, Search, ChevronRight, AlertTriangle, CheckCircle2, Users, Percent } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/bi/KpiCard';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function SimplePagination({ page, totalItems, pageSize, onChange }: { page: number; totalItems: number; pageSize: number; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-2 text-sm">
      <span className="text-muted-foreground">
        Página {page} de {totalPages} · {totalItems} registros
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => onChange(page - 1)}>Anterior</Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Próxima</Button>
      </div>
    </div>
  );
}
import { useBIProfessorDocuments, ProfessorDocStatus } from '@/hooks/bi/useBIProfessorDocuments';

const PAGE_SIZE = 25;

function ProfessorRow({ row, onOpen }: { row: ProfessorDocStatus; onOpen: (id: string) => void }) {
  return (
    <Card className={row.is_complete ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-destructive'}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{row.full_name}</span>
              {row.registration_code && (
                <Badge variant="outline" className="text-[10px] py-0">{row.registration_code}</Badge>
              )}
              {row.is_complete ? (
                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 gap-1 text-[10px]">
                  <CheckCircle2 className="h-3 w-3" /> Completo
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1 text-[10px]">
                  <AlertTriangle className="h-3 w-3" /> {row.missing.length} pendente{row.missing.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {row.school_names.length > 0 ? row.school_names.join(' • ') : 'Sem escola vinculada'}
            </p>
          </div>

          <div className="flex items-center gap-3 min-w-[200px]">
            <div className="flex-1">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-muted-foreground">{row.required_uploaded}/{row.required_total} documentos</span>
                <span className="font-bold">{row.completion_pct}%</span>
              </div>
              <Progress value={row.completion_pct} className="h-1.5" />
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpen(row.professor_id)} title="Abrir documentos">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!row.is_complete && row.missing.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Documentos faltantes</p>
            <div className="flex flex-wrap gap-1.5">
              {row.missing.map(m => (
                <Badge key={m.value} variant="outline" className="text-[10px] py-0 border-destructive/40 text-destructive bg-destructive/5">
                  {m.label}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function BIProfessorDocumentsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useBIProfessorDocuments();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'pending' | 'complete'>('pending');
  const [pagePending, setPagePending] = useState(1);
  const [pageComplete, setPageComplete] = useState(1);

  const all = data || [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(r =>
      r.full_name.toLowerCase().includes(q) ||
      r.registration_code?.toLowerCase().includes(q) ||
      r.school_names.some(s => s.toLowerCase().includes(q))
    );
  }, [all, search]);

  const pending = useMemo(
    () => filtered.filter(r => !r.is_complete).sort((a, b) => b.missing.length - a.missing.length),
    [filtered]
  );
  const complete = useMemo(
    () => filtered.filter(r => r.is_complete).sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [filtered]
  );

  const totalProfessors = all.length;
  const totalComplete = all.filter(r => r.is_complete).length;
  const totalPending = totalProfessors - totalComplete;
  const avgCompletion = totalProfessors > 0
    ? Math.round(all.reduce((sum, r) => sum + r.completion_pct, 0) / totalProfessors)
    : 0;

  const openProfessor = (id: string) => navigate(`/professores/${id}/documentos`);

  // Pagination slices
  const pendingPaged = pending.slice((pagePending - 1) * PAGE_SIZE, pagePending * PAGE_SIZE);
  const completePaged = complete.slice((pageComplete - 1) * PAGE_SIZE, pageComplete * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'B.I.', href: '/bi' }, { label: 'Documentos dos Professores' }]}
        title="Documentos dos Professores"
        description="Análise de conformidade documental — quem entregou todos os obrigatórios e quem ainda tem pendências"
        icon={FileCheck2}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard title="Total Professores" value={totalProfessors} icon={Users} variant="default" loading={isLoading} />
        <KpiCard title="Com Pendências" value={totalPending} icon={FileWarning} variant="danger" loading={isLoading} />
        <KpiCard title="Documentação OK" value={totalComplete} icon={FileCheck2} variant="success" loading={isLoading} />
        <KpiCard title="Conformidade Média" value={`${avgCompletion}%`} icon={Percent} variant={avgCompletion >= 80 ? 'success' : avgCompletion >= 50 ? 'warning' : 'danger'} loading={isLoading} />
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, matrícula ou escola..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPagePending(1); setPageComplete(1); }}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={v => setTab(v as 'pending' | 'complete')}>
        <TabsList className="grid grid-cols-2 w-full max-w-lg">
          <TabsTrigger value="pending" className="gap-2">
            <FileWarning className="h-4 w-4" />
            Pendentes <Badge variant="destructive" className="ml-1">{pending.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="complete" className="gap-2">
            <FileCheck2 className="h-4 w-4" />
            Completos <Badge className="ml-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">{complete.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
          ) : pending.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                <p className="font-semibold">Nenhum professor com documentos pendentes</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {search ? 'Nenhum resultado para sua busca.' : 'Todos os professores estão com a documentação completa!'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {pendingPaged.map(row => <ProfessorRow key={row.professor_id} row={row} onOpen={openProfessor} />)}
              <SimplePagination page={pagePending} totalItems={pending.length} pageSize={PAGE_SIZE} onChange={setPagePending} />
            </>
          )}
        </TabsContent>

        <TabsContent value="complete" className="space-y-3 mt-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
          ) : complete.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileWarning className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold">Nenhum professor com documentação completa</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {search ? 'Nenhum resultado para sua busca.' : 'Comece cobrando os documentos pendentes.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {completePaged.map(row => <ProfessorRow key={row.professor_id} row={row} onOpen={openProfessor} />)}
              <SimplePagination page={pageComplete} totalItems={complete.length} pageSize={PAGE_SIZE} onChange={setPageComplete} />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
