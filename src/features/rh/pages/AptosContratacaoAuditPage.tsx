import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { ShieldCheck, Loader2, Search, Copy, ExternalLink, Link2, FileDown } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { hrApi } from '../api';
import { useOrganization } from '@/hooks/useOrganization';

const PUBLISHED_URL = 'https://nexa-gestao.lovable.app';

interface Row {
  id: string;
  status: string;
  professor: { id: string; full_name: string; cpf: string | null } | null;
  originals: number;
  signed: number;
  link?: { id: string; token: string; is_active: boolean; expires_at: string | null } | null;
  lastView: string | null;
  lastDownload: string | null;
}

export default function AptosContratacaoAuditPage() {
  const navigate = useNavigate();
  const { organizationId } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'doc_no_link' | 'link_never_accessed' | 'partially_signed' | 'concluded'>('all');
  const [pageSize, setPageSize] = useState<number>(30);
  const [page, setPage] = useState<number>(1);

  const load = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const candidates = await hrApi.listHiringCandidates();
      setRows(candidates);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [organizationId]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        const name = r.professor?.full_name?.toLowerCase() || '';
        if (!name.includes(q) && !(r.professor?.cpf || '').includes(q)) return false;
      }
      switch (filter) {
        case 'doc_no_link': return r.originals > 0 && !r.link;
        case 'link_never_accessed': return !!r.link && !r.lastView;
        case 'partially_signed': return r.originals > 0 && r.signed > 0 && r.signed < r.originals;
        case 'concluded': return r.status === 'ASSINADO' || r.status === 'CONCLUIDO';
        default: return true;
      }
    });
  }, [rows, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  );
  useEffect(() => { setPage(1); }, [search, filter, pageSize]);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'R.H.', href: '/rh' },
          { label: 'Aptos para Contratação', href: '/rh/aptos-contratacao' },
          { label: 'Auditoria' },
        ]}
        title="Auditoria — Aptos para Contratação"
        description="Visão consolidada: quem tem documento, quem tem link e quem já acessou."
        icon={ShieldCheck}
        backTo="/rh/aptos-contratacao"
      />

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Candidatos</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <SearchableSelect
              value={filter}
              onValueChange={(v) => setFilter(v as any)}
              placeholder="Filtro"
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'doc_no_link', label: 'Com documento, sem link' },
                { value: 'link_never_accessed', label: 'Com link, nunca acessou' },
                { value: 'partially_signed', label: 'Assinou parcialmente' },
                { value: 'concluded', label: 'Concluídos' },
              ]}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Sem registros para o filtro selecionado.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Professor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Originais</TableHead>
                  <TableHead>Assinados</TableHead>
                  <TableHead>Link gerado?</TableHead>
                  <TableHead>Último acesso</TableHead>
                  <TableHead>Último download</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.professor?.full_name || '—'}</div>
                      <div className="text-xs text-muted-foreground">{r.professor?.cpf || ''}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                    <TableCell>{r.originals}</TableCell>
                    <TableCell>{r.signed}</TableCell>
                    <TableCell>
                      {r.link ? (
                        <Badge className={r.link.is_active ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'}>
                          {r.link.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-xs">{r.lastView ? format(new Date(r.lastView), 'dd/MM HH:mm', { locale: ptBR }) : '—'}</TableCell>
                    <TableCell className="text-xs">{r.lastDownload ? format(new Date(r.lastDownload), 'dd/MM HH:mm', { locale: ptBR }) : '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/rh/aptos-contratacao/${r.id}`)}>Detalhe</Button>
                        {r.link && (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(`${PUBLISHED_URL}/acesso-externo/${r.link!.token}`); toast.success('Copiado!'); }}><Copy className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" asChild><a href={`${PUBLISHED_URL}/acesso-externo/${r.link!.token}`} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a></Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!loading && filtered.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t">
              <div className="text-xs text-muted-foreground">
                Mostrando {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} de {filtered.length}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Por página</span>
                <select
                  className="h-8 rounded-md border bg-background px-2 text-sm"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  {[30, 50, 70, 100].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Anterior
                </Button>
                <span className="text-xs text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
