import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/PageHeader';
import { acompanhamentoApi } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { Search, Loader2, FileText, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function RelatoriosPage() {
  const { organizationId } = useOrganization();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => { loadRecords(); }, [organizationId]);

  const loadRecords = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const recordsData = await acompanhamentoApi.getRecords(organizationId);
      setRecords(recordsData);
    } catch { } finally { setLoading(false); }
  };

  const filteredRecords = records.filter((r) => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (search) { const s = search.toLowerCase(); return r.title?.toLowerCase().includes(s) || r.schoolName?.toLowerCase().includes(s) || r.actionName?.toLowerCase().includes(s); }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Acompanhamento', href: '/acompanhamento' }, { label: 'Relatórios e Registros' }]}
        title="Relatórios e Registros"
        description="Consulte registros consolidados de visitas e entregas"
      />
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar registro..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os tipos</SelectItem><SelectItem value="visita">Visitas</SelectItem></SelectContent></Select>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filteredRecords.length === 0 ? (
        <Card><CardContent className="p-12 text-center"><FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" /><h3 className="font-semibold text-lg">Nenhum registro encontrado</h3><p className="text-sm text-muted-foreground mt-1">Registros de visitas e entregas aparecerão aqui</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((r) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold truncate">{r.title || 'Registro sem título'}</h3>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"><MapPin className="mr-1 h-3 w-3" /> Visita</Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                  {r.schoolName && <span>{r.schoolName}</span>}
                  {r.actionName && <span>Ação: {r.actionName}</span>}
                  <span>{format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                </div>
                {r.executive_summary && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.executive_summary}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
