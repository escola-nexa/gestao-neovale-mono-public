import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { Loader2, ChevronDown, ChevronRight, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

interface ImportBatch {
  id: string;
  file_name: string;
  total_rows: number;
  success_count: number;
  error_count: number;
  status: string;
  ano_letivo: string | null;
  created_at: string;
  school: { nome: string } | null;
  course: { nome: string } | null;
  class_group: { nome: string } | null;
}

interface ImportBatchRow {
  id: string;
  row_number: number;
  student_name: string | null;
  codigo_matricula: string | null;
  status: string;
  error_message: string | null;
}

export default function ImportHistoryPage() {
  const { organizationId } = useOrganization();
  const { schoolId } = useParams<{ schoolId: string }>();
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [batchRows, setBatchRows] = useState<Record<string, ImportBatchRow[]>>({});
  const [loadingRows, setLoadingRows] = useState<string | null>(null);

  useEffect(() => {
    if (organizationId) loadBatches();
  }, [organizationId, schoolId]);

  useEffect(() => {
    if (schoolId) {
      supabase.from('schools').select('nome').eq('id', schoolId).single().then(({ data }) => {
        if (data) setSchoolName(data.nome);
      });
    }
  }, [schoolId]);

  // Realtime subscription for import_batches updates
  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel('import-batches-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'import_batches',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Add new batch at top
            const newBatch = payload.new as any;
            setBatches(prev => {
              if (prev.some(b => b.id === newBatch.id)) return prev;
              return [{ ...newBatch, school: null, course: null, class_group: null }, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            // Update existing batch
            const updated = payload.new as any;
            setBatches(prev => prev.map(b =>
              b.id === updated.id
                ? { ...b, ...updated }
                : b
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  const loadBatches = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('import_batches')
        .select(`*, school:school_id(nome), course:course_id(nome), class_group:class_group_id(nome)`)
        .eq('organization_id', organizationId!)
        .order('created_at', { ascending: false });

      if (schoolId) query = query.eq('school_id', schoolId);

      const { data, error } = await query;
      if (error) throw error;
      setBatches((data as any) || []);
    } catch {
      console.error('Error loading import batches');
    } finally {
      setLoading(false);
    }
  };

  const toggleBatch = async (batchId: string) => {
    if (expandedBatch === batchId) { setExpandedBatch(null); return; }
    setExpandedBatch(batchId);

    if (!batchRows[batchId]) {
      setLoadingRows(batchId);
      try {
        const { data, error } = await supabase
          .from('import_batch_rows')
          .select('*')
          .eq('batch_id', batchId)
          .order('row_number', { ascending: true });

        if (error) throw error;
        setBatchRows(prev => ({ ...prev, [batchId]: (data as ImportBatchRow[]) || [] }));
      } catch {
        console.error('Error loading batch rows');
      } finally {
        setLoadingRows(null);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'SUCCESS') return <Badge className="bg-green-600 text-white gap-1"><CheckCircle2 className="h-3 w-3" /> Sucesso</Badge>;
    if (status === 'ERROR') return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Erro</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  const getBatchStatusBadge = (batch: ImportBatch) => {
    if (batch.status === 'PROCESSING') {
      const pct = batch.total_rows > 0 ? Math.round(((batch.success_count + batch.error_count) / batch.total_rows) * 100) : 0;
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <Progress value={pct} className="h-2 w-20" />
          <span className="text-xs text-muted-foreground">{pct}%</span>
        </div>
      );
    }
    if (batch.status === 'COMPLETED') return <Badge className="bg-green-600 text-white">Concluído</Badge>;
    if (batch.status === 'PARTIAL') return <Badge variant="secondary" className="gap-1"><AlertTriangle className="h-3 w-3" /> Parcial</Badge>;
    return <Badge variant="outline">{batch.status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Escolas', href: '/escolas' },
          { label: schoolName || '...', href: `/escolas/${schoolId}` },
          { label: 'Importações' },
        ]}
        title="Histórico de Importações"
        description={schoolName || 'Importações de alunos'}
        backTo={`/escolas/${schoolId}`}
      />

      <Card>
        <CardHeader><CardTitle className="sr-only">Importações</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : batches.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileSpreadsheet className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Nenhuma importação realizada ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {batches.map((batch) => (
                <Collapsible key={batch.id} open={expandedBatch === batch.id}>
                  <div className="border rounded-lg">
                    <CollapsibleTrigger asChild>
                      <button
                        className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
                        onClick={() => toggleBatch(batch.id)}
                      >
                        {expandedBatch === batch.id
                          ? <ChevronDown className="h-4 w-4 shrink-0" />
                          : <ChevronRight className="h-4 w-4 shrink-0" />
                        }
                        <FileSpreadsheet className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{batch.file_name}</p>
                          <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{new Date(batch.created_at).toLocaleString('pt-BR')}</span>
                            {batch.school && <span>• {(batch.school as any).nome}</span>}
                            {batch.course && <span>• {(batch.course as any).nome}</span>}
                            {batch.class_group && <span>• {(batch.class_group as any).nome}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {getBatchStatusBadge(batch)}
                          <Badge variant="outline" className="gap-1">{batch.total_rows} total</Badge>
                          <Badge className="bg-green-600 text-white gap-1">
                            <CheckCircle2 className="h-3 w-3" /> {batch.success_count}
                          </Badge>
                          {batch.error_count > 0 && (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" /> {batch.error_count}
                            </Badge>
                          )}
                        </div>
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t px-4 pb-4">
                        {loadingRows === batch.id ? (
                          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
                        ) : (
                          <ScrollArea className="max-h-[400px]">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-16">#</TableHead>
                                  <TableHead>Nome do Aluno</TableHead>
                                  <TableHead>Matrícula</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Erro</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(batchRows[batch.id] || []).map((row) => (
                                  <TableRow key={row.id} className={row.status === 'ERROR' ? 'bg-destructive/5' : ''}>
                                    <TableCell className="text-muted-foreground">{row.row_number}</TableCell>
                                    <TableCell className="font-medium">{row.student_name || '—'}</TableCell>
                                    <TableCell className="font-mono text-sm">{row.codigo_matricula || '—'}</TableCell>
                                    <TableCell>{getStatusBadge(row.status)}</TableCell>
                                    <TableCell className="text-sm text-destructive max-w-[300px] truncate">
                                      {row.error_message || '—'}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                {(batchRows[batch.id] || []).length === 0 && (
                                  <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                                      Nenhum registro encontrado
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
