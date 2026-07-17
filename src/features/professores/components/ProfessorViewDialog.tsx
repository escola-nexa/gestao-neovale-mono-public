import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, ExternalLink, FileText, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { professoresApi } from '@/features/professores/api';
import { loadAllData, buildSections } from '../utils/exportProfessorRegistration';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  professorId: string | null;
  professorName?: string | null;
}

type Sections = ReturnType<typeof buildSections>;

const REQUIRED_LABELS: Record<string, string> = {
  aso: 'ASO', foto_3x4: 'Foto 3x4', carteira_trabalho: 'CTPS', rg: 'RG',
  cpf: 'CPF', titulo_eleitor: 'Título de Eleitor', comprovante_residencia: 'Comprovante de residência',
  diploma: 'Diploma', reservista: 'Reservista', declaracao_etnia: 'Declaração de etnia',
  atestado_sanidade: 'Atestado de sanidade', certidao_justica_eleitoral: 'Certidão Justiça Eleitoral',
  certidao_estadual_criminal: 'Certidão Estadual Criminal',
  certidao_acoes_criminais: 'Certidão Ações Criminais',
  certidao_judicial_criminal_negativa: 'Cert. Judicial Criminal Negativa',
  certidao_antecedentes_criminais: 'Cert. Antecedentes Criminais',
  certidao_acoes_civeis: 'Cert. Ações Cíveis',
  certidao_judicial_civel: 'Cert. Judicial Cível',
};

function KV({ rows }: { rows: any[][] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
      {rows.map(([k, v], i) => (
        <div key={i} className="flex flex-col border-b border-border/40 pb-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</span>
          <span className="text-sm break-words">{v ?? '—'}</span>
        </div>
      ))}
    </div>
  );
}

export function ProfessorViewDialog({ open, onOpenChange, professorId, professorName }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof loadAllData>> | null>(null);
  const [sections, setSections] = useState<Sections | null>(null);

  useEffect(() => {
    if (!open || !professorId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const d = await loadAllData(professorId);
        if (cancelled) return;
        setData(d);
        setSections(buildSections(d));
      } catch (e: any) {
        toast.error(e?.message || 'Erro ao carregar cadastro');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, professorId]);

  const openAttachment = async (path: string) => {
    const tid = toast.loading('Gerando link de visualização...');
    const { data: signed, error } = await professoresApi.client.storage
      .from('professor-documents')
      .createSignedUrl(path, 300);
    if (error || !signed?.signedUrl) {
      toast.error(error?.message || 'Erro ao gerar link', { id: tid });
      return;
    }
    toast.dismiss(tid);
    window.open(signed.signedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" /> Visualizar cadastro
          </DialogTitle>
          <DialogDescription>
            {professorName || data?.professor?.full_name || 'Carregando...'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading || !sections || !data ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue="ident" className="w-full">
              <TabsList className="flex flex-wrap h-auto gap-1 justify-start">
                <TabsTrigger value="ident">Identificação</TabsTrigger>
                <TabsTrigger value="pess">Pessoais</TabsTrigger>
                <TabsTrigger value="doc">Documentos</TabsTrigger>
                <TabsTrigger value="end">Endereço</TabsTrigger>
                <TabsTrigger value="banc">Bancário</TabsTrigger>
                <TabsTrigger value="fam">Família</TabsTrigger>
                <TabsTrigger value="vinc">Vínculos</TabsTrigger>
                <TabsTrigger value="anex">Anexos ({data.files.length})</TabsTrigger>
              </TabsList>

              <div className="mt-4 space-y-4">
                <TabsContent value="ident"><KV rows={[...sections.identificacao, ...sections.admissional]} /></TabsContent>
                <TabsContent value="pess"><KV rows={sections.pessoais} /></TabsContent>
                <TabsContent value="doc"><KV rows={sections.documentos} /></TabsContent>
                <TabsContent value="end"><KV rows={sections.endereco} /></TabsContent>
                <TabsContent value="banc"><KV rows={sections.bancarios} /></TabsContent>
                <TabsContent value="fam">
                  <KV rows={sections.familia} />
                  {sections.children.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Filhos</div>
                      <div className="rounded-md border divide-y">
                        {sections.children.map((c: any[], i: number) => (
                          <div key={i} className="p-2 text-sm flex flex-wrap gap-x-4">
                            <span className="font-medium">{c[0]}</span>
                            <span className="text-muted-foreground">Nasc.: {c[1]}</span>
                            <span className="text-muted-foreground">CPF: {c[2]}</span>
                            <span className="text-muted-foreground">{c[3]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="vinc">
                  {sections.bindings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem vínculos.</p>
                  ) : (
                    <div className="rounded-md border divide-y">
                      {sections.bindings.map((b: any[], i: number) => (
                        <div key={i} className="p-2 text-sm flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="font-medium">{b[0]}</span>
                          <span className="text-muted-foreground">{b[1]}</span>
                          {b[2] === 'Sim' && <Badge variant="secondary">Coordenador</Badge>}
                          <Badge variant={b[3] === 'Ativo' ? 'default' : 'outline'}>{b[3]}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="anex">
                  {data.files.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum anexo enviado.</p>
                  ) : (
                    <div className="rounded-md border divide-y">
                      {data.files.map((f: any) => (
                        <div key={f.id} className="p-3 flex items-center gap-3 flex-wrap">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{f.file_name || f.category}</div>
                            <div className="text-xs text-muted-foreground">
                              {REQUIRED_LABELS[f.category] || f.category}
                              {f.uploaded_at ? ` • ${new Date(f.uploaded_at).toLocaleString('pt-BR')}` : ''}
                            </div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => openAttachment(f.file_path)}>
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Abrir
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              const { data: s } = await professoresApi.client.storage.from('professor-documents').createSignedUrl(f.file_path, 300, { download: f.file_name || true });
                              if (s?.signedUrl) window.location.href = s.signedUrl;
                            }}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
