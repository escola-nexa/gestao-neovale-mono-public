import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Briefcase, FileText, Upload, Loader2, Download, Trash2, Link2, Activity,
  CheckCircle2, FilePlus2, Copy, ExternalLink, XCircle, ArrowLeft, ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { UploadHiringDocDialog } from '../components/UploadHiringDocDialog';

import { hrApi } from '../api';
import { ApiAdapter } from '@/lib/api-adapter';

const PUBLISHED_URL = 'https://nexa-gestao.lovable.app';
const STATUS_LABELS: Record<string, string> = {
  PENDENTE_DOC: 'Pendente documento',
  AGUARDANDO_ASSINATURA: 'Aguardando assinatura',
  ASSINADO: 'Assinado',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

const DOC_KIND_LABELS: Record<string, string> = {
  CONTRATO: 'Contrato',
  TERMO: 'Termo',
  ADITIVO: 'Aditivo',
  FICHA_REGISTRO: 'Ficha de registro',
  RENUNCIA_VT: 'Renúncia de vale transporte',
  DECLARACAO_VT: 'Declaração de vale transporte',
  DEPENDENTE_IR: 'Dependente de imposto de renda',
  OUTRO: 'Outro',
};

export default function AptosContratacaoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState<any>(null);
  const [professor, setProfessor] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await hrApi.getHiringCandidateDetail(id);
      if (!data) { setCandidate(null); setLoading(false); return; }
      setCandidate(data.candidate);
      setProfessor(data.professor);
      setDocuments(data.documents);
      setLinks(data.links);
      setAudit(data.audit);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar candidato');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const originals = useMemo(() => documents.filter(d => d.kind === 'ORIGINAL'), [documents]);
  const signedByParent = useMemo(() => {
    const m = new Map<string, any>();
    documents.filter(d => d.kind === 'ASSINADO' && d.parent_document_id).forEach(d => m.set(d.parent_document_id, d));
    return m;
  }, [documents]);

  const activeLink = links.find(l => l.is_active && (!l.expires_at || new Date(l.expires_at) > new Date()));

  const downloadDoc = async (filePath: string, fileName: string) => {
    const tid = toast.loading('Baixando...');
    try {
      const { data: blob, error } = await ApiAdapter.storage.download('hiring-documents', filePath);
      if (error) throw error;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Download iniciado', { id: tid });
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao baixar', { id: tid });
    }
  };

  const removeDoc = async (doc: any) => {
    if (!confirm('Remover este documento? Esta ação fica registrada na auditoria.')) return;
    try {
      await hrApi.removeHiringDocument(doc.id, id!, candidate?.professor_id || null, doc.file_name);
      toast.success('Documento removido');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao remover documento');
    }
  };

  const generateLink = async () => {
    if (!organizationId || !candidate || !professor) return;
    const tid = toast.loading('Gerando link...');
    try {
      const { url } = await hrApi.generateExternalLinkForHiring(candidate.id, professor.id, professor.full_name);
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success('Link gerado e copiado', { id: tid });
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao gerar link', { id: tid });
    }
  };

  const revokeLink = async (link: any) => {
    try {
      await hrApi.revokeExternalLink(link.id, candidate?.id, candidate?.professor_id);
      toast.success('Link revogado');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao revogar link');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!candidate) {
    return (
      <Card><CardContent className="py-12 text-center">
        <p className="text-muted-foreground">Candidato não encontrado.</p>
        <Button variant="link" onClick={() => navigate('/rh/aptos-contratacao')}>Voltar à lista</Button>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'R.H.', href: '/rh' },
          { label: 'Aptos para Contratação', href: '/rh/aptos-contratacao' },
          { label: professor?.full_name || 'Candidato' },
        ]}
        title={professor?.full_name || 'Candidato'}
        description={`CPF: ${professor?.cpf || '—'} • Status: ${STATUS_LABELS[candidate.status] || candidate.status}`}
        icon={Briefcase}
        backTo="/rh/aptos-contratacao"
      />

      <Tabs defaultValue="documentos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="documentos"><FileText className="mr-1.5 h-4 w-4" />Documentos contratuais</TabsTrigger>
          <TabsTrigger value="link"><Link2 className="mr-1.5 h-4 w-4" />Link externo</TabsTrigger>
          <TabsTrigger value="auditoria"><Activity className="mr-1.5 h-4 w-4" />Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="documentos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Contratos, termos e aditivos</CardTitle>
              <Button onClick={() => setUploadOpen(true)} className={originals.length === 0 ? 'bg-[#FFDA45] hover:bg-[#FFDA45]/90 text-[#1B1E2C]' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}>
                <FilePlus2 className="mr-2 h-4 w-4" /> Adicionar documento para assinatura
              </Button>
            </CardHeader>
            <CardContent>
              {originals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Nenhum documento anexado ainda.</div>
              ) : (
                <ul className="divide-y">
                  {originals.map((doc) => {
                    const signed = signedByParent.get(doc.id);
                    return (
                      <li key={doc.id} className="py-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{DOC_KIND_LABELS[doc.doc_kind] || doc.doc_kind}</Badge>
                            <Badge variant="secondary">Original</Badge>
                          </div>
                          <p className="font-medium text-sm">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">Enviado em {format(new Date(doc.uploaded_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" variant="outline" onClick={() => downloadDoc(doc.file_path, doc.file_name)}>
                              <Download className="mr-1.5 h-3.5 w-3.5" /> Baixar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => removeDoc(doc)}>
                              <Trash2 className="mr-1.5 h-3.5 w-3.5 text-destructive" /> Remover
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1 md:border-l md:pl-4">
                          {signed ? (
                            <>
                              <Badge className="bg-emerald-600 text-white"><CheckCircle2 className="mr-1 h-3 w-3" /> Assinado</Badge>
                              <p className="font-medium text-sm pt-1">{signed.file_name}</p>
                              <p className="text-xs text-muted-foreground">Recebido em {format(new Date(signed.uploaded_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                              {signed.external_ip && <p className="text-xs text-muted-foreground">IP: {signed.external_ip}</p>}
                              <Button size="sm" variant="outline" className="mt-1" onClick={() => downloadDoc(signed.file_path, signed.file_name)}>
                                <Download className="mr-1.5 h-3.5 w-3.5" /> Baixar assinado
                              </Button>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">Aguardando devolução assinada pelo professor.</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="link">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" /> Link externo para o professor</CardTitle>
              <Button onClick={generateLink} disabled={originals.length === 0}>
                <Link2 className="mr-2 h-4 w-4" /> Gerar novo link
              </Button>
            </CardHeader>
            <CardContent>
              {originals.length === 0 && (
                <p className="text-xs text-amber-700 mb-3">Anexe pelo menos um documento original antes de gerar o link.</p>
              )}
              {links.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Nenhum link gerado ainda.</div>
              ) : (
                <ul className="divide-y">
                  {links.map((l) => {
                    const expired = l.expires_at ? new Date(l.expires_at) < new Date() : false;
                    const status = !l.is_active ? 'Revogado' : expired ? 'Expirado' : 'Ativo';
                    const url = `${PUBLISHED_URL}/acesso-externo/${l.token}`;
                    const cls = !l.is_active ? 'bg-muted text-muted-foreground' : expired ? 'bg-destructive text-destructive-foreground' : 'bg-emerald-600 text-white';
                    return (
                      <li key={l.id} className="py-3 flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <Badge className={cls}>{status}</Badge>
                          <code className="text-xs break-all flex-1">{url}</code>
                          <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(url); toast.success('Copiado!'); }}><Copy className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" asChild><a href={url} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a></Button>
                          {l.is_active && !expired && (
                            <Button size="icon" variant="ghost" onClick={() => revokeLink(l)}><XCircle className="h-3.5 w-3.5 text-destructive" /></Button>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Criado em {format(new Date(l.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          {l.expires_at && ` • expira ${format(new Date(l.expires_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auditoria">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Histórico de auditoria</CardTitle>
            </CardHeader>
            <CardContent>
              {audit.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Sem eventos registrados.</div>
              ) : (
                <ul className="space-y-2">
                  {audit.map((a) => (
                    <li key={a.id} className="text-xs border-l-2 border-primary/40 pl-3 py-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{a.event}</Badge>
                        <span className="text-muted-foreground">{format(new Date(a.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}</span>
                        {a.actor_label && <span className="text-muted-foreground">• {a.actor_label}</span>}
                      </div>
                      {a.payload && Object.keys(a.payload).length > 0 && (
                        <pre className="mt-1 text-[10px] bg-muted/40 rounded p-1.5 overflow-x-auto">{JSON.stringify(a.payload, null, 2)}</pre>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <UploadHiringDocDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        candidate={candidate}
        professor={professor}
        organizationId={organizationId}
        userId={user?.id || ''}
        onUploaded={load}
      />
    </div>
  );
}


