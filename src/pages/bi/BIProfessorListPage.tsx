import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useNavigate } from 'react-router-dom';
import { UserRoundSearch, Search } from 'lucide-react';
import { GlobalFilterBar, BIFilters } from '@/components/bi/GlobalFilterBar';
import { AnalyticTable, AnalyticColumn } from '@/components/bi/AnalyticTable';
import { ScoreBadge } from '@/components/bi/ScoreBadge';
import { useBIExecutive, TeacherBISummary } from '@/hooks/bi/useBIExecutive';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function BIProfessorListPage() {
  const [filters, setFilters] = useState<BIFilters>({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const navigate = useNavigate();
  const { teachersQuery } = useBIExecutive(filters, page, 50);
  const teachers = (teachersQuery.data || []).filter(t =>
    !search || t.teacher_name.toLowerCase().includes(search.toLowerCase())
  );
  const totalCount = teachersQuery.data?.[0]?.total_count || 0;

  const columns: AnalyticColumn<TeacherBISummary>[] = [
    { key: 'name', header: 'Professor', render: (r) => <span className="font-medium">{r.teacher_name}</span> },
    { key: 'school', header: 'Escola(s)', render: (r) => <span className="text-xs">{r.school_names?.join(', ') || '—'}</span> },
    { key: 'compliance', header: 'Conformidade', render: (r) => <ScoreBadge score={r.compliance_score} size="md" showLabel />, className: 'text-center' },
    { key: 'risk', header: 'Risco', render: (r) => (
      <span className={`text-xs font-bold ${r.risk_score > 40 ? 'text-red-600' : r.risk_score > 25 ? 'text-yellow-600' : 'text-green-600'}`}>
        {r.risk_score.toFixed(0)}%
      </span>
    ), className: 'text-center' },
    { key: 'action', header: '', render: (r) => (
      <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => navigate(`/bi/professores/${r.teacher_id}`)}>
        <UserRoundSearch className="h-3.5 w-3.5" /> Analisar
      </Button>
    ) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'B.I.', href: '/bi' }, { label: 'Análise Individual' }]}
        title="Análise Individual do Professor"
        description="Selecione um professor para ver seu dossiê completo"
      />

      <GlobalFilterBar filters={filters} onChange={setFilters} />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar professor por nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <AnalyticTable columns={columns} data={teachers} loading={teachersQuery.isLoading} emptyMessage="Nenhum professor encontrado" />

      {totalCount > 50 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground self-center">Página {page + 1}</span>
          <Button variant="outline" size="sm" disabled={(page + 1) * 50 >= totalCount} onClick={() => setPage(p => p + 1)}>Próxima</Button>
        </div>
      )}
    </div>
  );
}
