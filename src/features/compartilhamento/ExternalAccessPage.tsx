import { useState, useEffect, useRef, Fragment } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Sparkles, Lock, Download, ChevronDown, AlertTriangle, School, FileText,
  ShieldCheck, Stamp, BarChart3,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { drawBrandedHeader, drawBrandedFooter, BRAND } from '@/lib/pdfBranding';
import { getBrandLogoForPdf } from '@/lib/brandLogoCache';
import { ExternalBoletimCard } from './components/ExternalBoletimCard';
import { ExternalPortalFilters } from './components/ExternalPortalFilters';
import { useExternalFilters } from './hooks/useExternalFilters';
import { ExternalDocumentosProfessorView } from './components/ExternalDocumentosProfessorView';
import { ExternalHiringView } from './components/ExternalHiringView';
import { ExternalErrorBoundary } from './components/ExternalErrorBoundary';
import { compartilhamentoApi } from '@/features/compartilhamento/api';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function callEdgeFunction(body: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/validate-external-access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao acessar');
  return data;
}

async function uploadExternalProfessorFile(filePath: string, uploadToken: string, file: File) {
  const { error } = await compartilhamentoApi.client.storage
    .from('professor-documents')
    .uploadToSignedUrl(filePath, uploadToken, file);
  if (error) throw new Error(error.message || 'Erro ao enviar anexo');
}

interface LinkInfo {
  schoolName: string;
  schoolCity: string;
  contentType: string;
  requiresKeyword: boolean;
}

const contentTypeLabels: Record<string, string> = {
  planejamentos: 'Planejamentos Pedagógicos Oficiais',
  notas: 'Boletim de Notas Oficial',
  notas_boletins: 'Boletim de Notas Oficial',
  boletins: 'Boletim de Notas Oficial',
  faltas: 'Relatório de Frequência Oficial',
  frequencia_faltas: 'Relatório de Frequência Oficial',
  documentos_professor: 'Documentos do Professor',
  professor_contratacao: 'Documentos de Contratação',
};

// ============ MAIN COMPONENT ============
export default function ExternalAccessPage() {
  const { token } = useParams<{ token: string }>();
  const [keyword, setKeyword] = useState('');
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);
  const [contentData, setContentData] = useState<any>(null);
  const [error, setError] = useState('');
  const [accessedAt, setAccessedAt] = useState('');

  const {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    filterOptions,
    filteredData,
    activeChips,
    isNotas,
    isPlanejamentos,
    isFaltas,
  } = useExternalFilters(contentData);

  const infoMutation = useMutation({
    mutationFn: async () => {
      const result = await callEdgeFunction({ token, action: 'info' });
      return result.data;
    },
    onSuccess: (data) => setLinkInfo(data),
    onError: (err: any) => setError(err.message || 'Link não encontrado ou inválido'),
  });

  const accessMutation = useMutation({
    mutationFn: async () => {
      const requiresKeyword = linkInfo?.requiresKeyword !== false;
      if (requiresKeyword && !keyword.trim()) throw new Error('Informe a palavra-chave');
      const result = await callEdgeFunction({
        token,
        keyword: requiresKeyword ? keyword.trim() : '',
        action: 'view',
      });
      return result.data;
    },
    onSuccess: (data) => {
      setContentData(data);
      setAccessedAt(data?.accessedAt || new Date().toISOString());
      setError('');
    },
    onError: (err: any) => setError(err.message),
  });

  const hasCalledInfo = useRef(false);
  useEffect(() => {
    if (!hasCalledInfo.current && token) {
      hasCalledInfo.current = true;
      infoMutation.mutate();
    }
  }, [token]);

  // Auto-acessa quando o link não exige palavra-chave (ex.: documentos_professor)
  const hasAutoAccessed = useRef(false);
  useEffect(() => {
    if (linkInfo && linkInfo.requiresKeyword === false && !contentData && !hasAutoAccessed.current) {
      hasAutoAccessed.current = true;
      accessMutation.mutate();
    }
  }, [linkInfo, contentData]);

  // Group content for planejamentos/faltas by course > class > prof > subject
  const groupContent = (items: any[]) => {
    if (!Array.isArray(items)) return [];
    const grouped: Record<string, any> = {};
    items.forEach((item) => {
      const courseName = item?.courses?.nome || item?.class_groups?.courses?.nome || 'Sem Curso';
      const className = item?.class_groups?.nome || 'Sem Turma';
      const profName = item?.professors?.full_name || 'Sem Professor';
      const subjName = item?.subjects?.nome || 'Sem Disciplina';
      const key = `${courseName}|||${className}|||${profName}|||${subjName}`;
      if (!grouped[key]) {
        grouped[key] = { courseName, className, profName, subjName, items: [] };
      }
      grouped[key].items.push(item);
    });
    return Object.values(grouped);
  };

  // ============ Build applied filters label for PDF ============
  const buildAppliedFiltersLabel = (): string => {
    if (activeChips.length === 0) return '';
    return activeChips.map(c => `${c.label}: ${c.value}`).join(' • ');
  };

  // ============ OFFICIAL PDF: PLANEJAMENTOS ============
  const generatePlanningPDF = async (group: any) => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    let y = 15;
    const filtersLabel = buildAppliedFiltersLabel();
    const brandLogo = await getBrandLogoForPdf();

    const addHeader = () => {
      y = drawBrandedHeader(doc, {
        title: 'Planejamentos Pedagógicos Oficiais',
        subtitle: 'Documento Oficial',
        logo: brandLogo,
      });

      // Applied filters
      if (filtersLabel) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        const filterLines = doc.splitTextToSize(`Filtros aplicados: ${filtersLabel}`, pw - 30);
        doc.text(filterLines, 15, y);
        y += filterLines.length * 3.5 + 2;
        doc.setTextColor(0, 0, 0);
      }
    };

    const addReferenceBlock = () => {
      doc.setFillColor(...BRAND.bgSoft);
      doc.rect(15, y, pw - 30, 28, 'F');
      doc.setDrawColor(...BRAND.yellow);
      doc.rect(15, y, pw - 30, 28, 'S');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BRAND.navy);
      doc.text(`Escola: ${contentData?.schoolName || ''}`, 20, y + 7);
      doc.text(`Curso: ${group.courseName}`, 20, y + 13);
      doc.text(`Turma: ${group.className}`, pw / 2, y + 7);
      doc.text(`Professor: ${group.profName}`, pw / 2, y + 13);
      doc.text(`Disciplina: ${group.subjName}`, 20, y + 19);
      if (contentData?.schoolCity) doc.text(`Cidade: ${contentData.schoolCity}`, pw / 2, y + 19);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      y += 34;
    };

    const checkPage = (needed: number) => { if (y + needed > ph - 20) { doc.addPage(); y = 20; } };

    addHeader();
    addReferenceBlock();

    group.items.forEach((item: any, idx: number) => {
      checkPage(60);
      doc.setFillColor(...BRAND.yellow);
      doc.rect(15, y, pw - 30, 8, 'F');
      doc.setTextColor(...BRAND.navy);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const weekLabel = item.week_number ? `Semana ${item.week_number}` : `Item ${idx + 1}`;
      doc.text(`${item.bimester_number}º Bimestre — ${weekLabel}`, 20, y + 5.5);
      if (item.week_start_date && item.week_end_date) {
        doc.setFontSize(8);
        doc.text(`${item.week_start_date} a ${item.week_end_date}`, pw - 20, y + 5.5, { align: 'right' });
      }
      doc.setTextColor(0, 0, 0);
      y += 12;

      [
        { label: 'Objetivo', value: item.objective },
        { label: 'Competências', value: item.competencies },
        { label: 'Conteúdos', value: item.contents },
        { label: 'Metodologia', value: item.methodology },
        { label: 'Recursos', value: item.resources },
        { label: 'Avaliação', value: item.evaluation },
        { label: 'Produto/Registro', value: item.product },
        { label: 'Próximos Passos', value: item.next_steps },
      ].forEach(f => {
        if (!f.value) return;
        checkPage(12);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BRAND.navy);
        doc.text(f.label + ':', 20, y);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(f.value, pw - 45);
        doc.text(lines, 20, y + 4);
        y += 4 + lines.length * 3.5 + 2;
      });

      if (item.professor_signed || item.coordinator_signed) {
        checkPage(15);
        doc.setDrawColor(200, 200, 200);
        doc.line(15, y, pw - 15, y);
        y += 4;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(34, 139, 34);
        if (item.professor_signed) doc.text('✓ Assinado pelo Professor', 20, y);
        if (item.coordinator_signed) doc.text('✓ Assinado pelo Coordenador', pw / 2, y);
        if (item.finalized_at) {
          y += 4;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 100, 100);
          doc.text(`Finalizado em: ${format(new Date(item.finalized_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 20, y);
        }
        doc.setTextColor(0, 0, 0);
        y += 8;
      }
      y += 4;
    });

    drawBrandedFooter(doc, 'Documento Oficial — Acesso Monitorado');

    const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    doc.save(`planejamento_oficial_${sanitize(group.courseName)}_${sanitize(group.className)}.pdf`);
    callEdgeFunction({ token, keyword: keyword.trim(), action: 'download' }).catch(() => {});
  };

  // ============ OFFICIAL PDF: FREQUÊNCIA ============
  const generateAttendancePDF = async (group: any) => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    let y = 15;
    const filtersLabel = buildAppliedFiltersLabel();
    const brandLogo = await getBrandLogoForPdf();

    y = drawBrandedHeader(doc, {
      title: 'Relatório de Frequência Oficial',
      subtitle: 'Documento Oficial',
      logo: brandLogo,
    });

    // Applied filters
    if (filtersLabel) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      const filterLines = doc.splitTextToSize(`Filtros aplicados: ${filtersLabel}`, pw - 30);
      doc.text(filterLines, 15, y);
      y += filterLines.length * 3.5 + 2;
      doc.setTextColor(0, 0, 0);
    }

    doc.setFillColor(...BRAND.bgSoft);
    doc.rect(15, y, pw - 30, 22, 'F');
    doc.setDrawColor(...BRAND.yellow);
    doc.rect(15, y, pw - 30, 22, 'S');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.navy);
    doc.text(`Escola: ${contentData?.schoolName || ''}`, 20, y + 7);
    doc.text(`Curso: ${group.courseName}`, 20, y + 13);
    doc.text(`Turma: ${group.className}`, pw / 2, y + 7);
    doc.text(`Professor: ${group.profName} • ${group.subjName}`, pw / 2, y + 13);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    y += 28;

    const byStudent: Record<string, { nome: string; matricula: string; records: any[] }> = {};
    group.items.forEach((item: any) => {
      const sid = item.student_id;
      if (!byStudent[sid]) {
        byStudent[sid] = { nome: item.students?.nome_completo || '—', matricula: item.students?.codigo_matricula || '', records: [] };
      }
      byStudent[sid].records.push(item);
    });

    doc.setFillColor(...BRAND.yellow);
    doc.rect(15, y, pw - 30, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.navy);
    doc.text('Aluno', 20, y + 5);
    doc.text('Total Faltas', pw / 2, y + 5, { align: 'center' });
    doc.text('Última Falta', pw - 40, y + 5, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y += 9;

    const checkPage = (n: number) => { if (y + n > ph - 20) { doc.addPage(); y = 20; } };

    Object.values(byStudent).sort((a, b) => a.nome.localeCompare(b.nome)).forEach((student, si) => {
      checkPage(5);
      if (si % 2 === 0) {
        doc.setFillColor(...BRAND.bgSoft);
        doc.rect(15, y - 3, pw - 30, 5, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(student.nome.substring(0, 35), 20, y);
      const faltaCount = student.records.filter((r: any) => r.status === 'FALTA').length;
      doc.text(String(faltaCount), pw / 2, y, { align: 'center' });
      const lastDate = student.records
        .filter((r: any) => r.status === 'FALTA')
        .sort((a: any, b: any) => b.occurrence_date.localeCompare(a.occurrence_date))[0]?.occurrence_date || '';
      doc.text(lastDate, pw - 40, y, { align: 'center' });
      y += 4.5;
    });

    drawBrandedFooter(doc, 'Documento Oficial — Acesso Monitorado');

    const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    doc.save(`frequencia_oficial_${sanitize(group.courseName)}_${sanitize(group.className)}.pdf`);
    callEdgeFunction({ token, keyword: keyword.trim(), action: 'download' }).catch(() => {});
  };

  // ============ RENDER: Loading ============
  if (infoMutation.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // ============ RENDER: Error ============
  if (error && !linkInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <h2 className="text-lg font-semibold text-foreground">Acesso Indisponível</h2>
            <p className="text-sm text-muted-foreground text-center">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============ RENDER: Content ============
  if (contentData) {
    const isDocumentos = contentData?.contentType === 'documentos_professor';
    const isHiring = contentData?.contentType === 'professor_contratacao';
    const groups = !isNotas && !isDocumentos && !isHiring ? groupContent(filteredData.items) : [];

    return (
      <div className="min-h-screen bg-background">
        {/* Official header */}
        <header className="border-b-2 border-primary bg-card px-4 sm:px-6 py-4 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-foreground text-lg">Neovale - Gestão Acadêmica</h1>
                <p className="text-sm text-muted-foreground">{contentData.schoolName} • {contentData.schoolCity}</p>
              </div>
            </div>
            <div className="text-right space-y-1 hidden sm:block">
              <Badge className="bg-primary/10 text-primary border-primary/20">
                <ShieldCheck className="h-3 w-3 mr-1" /> Documento Oficial
              </Badge>
              <p className="text-xs text-muted-foreground">
                Consultado em: {accessedAt ? format(new Date(accessedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '—'}
              </p>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
          {/* Title + info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {contentTypeLabels[contentData.contentType] || contentData.contentType}
              </h2>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <School className="h-4 w-4" /> {contentData.schoolName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                <Stamp className="h-3 w-3 mr-1" /> Somente Visualização
              </Badge>
              {!isDocumentos && !isHiring && (
                <Badge variant="outline" className="text-xs gap-1">
                  <BarChart3 className="h-3 w-3" /> {filteredData.count} resultado(s)
                </Badge>
              )}
            </div>
          </div>

          {/* ===== APTOS PARA CONTRATAÇÃO ===== */}
          {isHiring && (
            <ExternalErrorBoundary>
              <ExternalHiringView
                data={contentData.content}
                onLogDownload={(documentId) => {
                  callEdgeFunction({ token, action: 'log_download', documentId }).catch(() => {});
                }}
                onUploadSigned={async (parentDocumentId, file) => {
                  const fileBase64: string = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                  });
                  const result = await callEdgeFunction({
                    token,
                    action: 'upload_signed',
                    parentDocumentId,
                    fileBase64,
                    fileName: file.name,
                    fileSize: file.size,
                    mimeType: file.type || 'application/pdf',
                  });
                  setContentData((prev: any) => ({ ...prev, content: result.data.content }));
                }}
              />
            </ExternalErrorBoundary>
          )}

          {/* ===== DOCUMENTOS DO PROFESSOR ===== */}
          {contentData.contentType === 'documentos_professor' && (
            <ExternalErrorBoundary>
              <ExternalDocumentosProfessorView
                data={contentData.content}
                saving={accessMutation.isPending}
                onSave={async (patch) => {
                  const result = await callEdgeFunction({ token, keyword: keyword.trim(), action: 'update_professor_document', patch });
                  setContentData((prev: any) => ({ ...prev, content: result.data.content }));
                }}
                onAddChild={async (child) => {
                  const result = await callEdgeFunction({ token, keyword: keyword.trim(), action: 'add_professor_child', child });
                  setContentData((prev: any) => ({ ...prev, content: result.data.content }));
                }}
                onUpdateChild={async (childId, patch) => {
                  const result = await callEdgeFunction({ token, keyword: keyword.trim(), action: 'update_professor_child', childId, patch });
                  setContentData((prev: any) => ({ ...prev, content: result.data.content }));
                }}
                onDeleteChild={async (childId) => {
                  const result = await callEdgeFunction({ token, keyword: keyword.trim(), action: 'delete_professor_child', childId });
                  setContentData((prev: any) => ({ ...prev, content: result.data.content }));
                }}
                onUpload={async (file, category) => {
                  const prepared = await callEdgeFunction({
                    token,
                    keyword: keyword.trim(),
                    action: 'create_professor_file_upload',
                    fileName: file.name,
                    fileSize: file.size,
                    mimeType: file.type,
                    category,
                  });
                  await uploadExternalProfessorFile(prepared.data.filePath, prepared.data.uploadToken, file);
                  const result = await callEdgeFunction({
                    token,
                    keyword: keyword.trim(),
                    action: 'register_professor_file',
                    fileName: file.name,
                    fileSize: file.size,
                    mimeType: file.type,
                    category,
                    filePath: prepared.data.filePath,
                  });
                  setContentData((prev: any) => ({ ...prev, content: result.data.content }));
                }}
                onDeleteFile={async (file) => {
                  const result = await callEdgeFunction({ token, keyword: keyword.trim(), action: 'delete_professor_file', fileId: file.id });
                  setContentData((prev: any) => ({ ...prev, content: result.data.content }));
                }}
                onGetUrl={async (path) => {
                  const result = await callEdgeFunction({ token, keyword: keyword.trim(), action: 'get_professor_file_url', filePath: path });
                  return result.data.signedUrl || null;
                }}
              />
            </ExternalErrorBoundary>
          )}

          {/* Filter bar (não aplicável a documentos do professor) */}
          {!isDocumentos && !isHiring && (
            <ExternalPortalFilters
              filters={filters}
              options={filterOptions}
              activeChips={activeChips}
              resultCount={filteredData.count}
              hasActiveFilters={hasActiveFilters}
              isNotas={isNotas}
              isPlanejamentos={isPlanejamentos}
              isFaltas={isFaltas}
              onFilterChange={updateFilter}
              onClear={clearFilters}
            />
          )}

          {/* ===== NOTAS / BOLETINS ===== */}
          {isNotas && !isDocumentos && filteredData.boletins.length === 0 && (
            <EmptyState message="Nenhum boletim oficial corresponde aos filtros aplicados" />
          )}

          {isNotas && !isDocumentos && filteredData.boletins.map((boletim: any, idx: number) => (
            <ExternalBoletimCard
              key={`${boletim?.classGroupId || 'boletim'}-${idx}`}
              boletim={boletim}
              onDownloadPdf={(reportModel) => {
                callEdgeFunction({
                  token,
                  keyword: keyword.trim(),
                  action: 'download',
                  reportModel,
                }).catch(() => {});
              }}
            />
          ))}

          {/* ===== PLANEJAMENTOS / FALTAS ===== */}
          {!isNotas && !isDocumentos && !isHiring && groups.length === 0 && (
            <EmptyState
              message={hasActiveFilters
                ? 'Nenhum documento corresponde aos filtros aplicados'
                : 'Nenhum documento oficial disponível'}
              subtitle={hasActiveFilters
                ? 'Tente ajustar os filtros para encontrar os documentos desejados.'
                : 'Apenas documentos finalizados e assinados são disponibilizados externamente.'}
            />
          )}

          {!isNotas && !isDocumentos && !isHiring && groups.map((group: any, idx: number) => (
            <Collapsible key={idx} defaultOpen={groups.length <= 3 || idx === 0}>
              <Card className="border-l-4 border-l-primary">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold">{group.courseName} › {group.className}</div>
                        <div className="text-xs font-normal text-muted-foreground">{group.profName} • {group.subjName}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{group.items.length} doc(s)</Badge>
                        <Button size="sm" variant="outline" onClick={(e) => {
                          e.stopPropagation();
                          if (isPlanejamentos) generatePlanningPDF(group);
                          else generateAttendancePDF(group);
                        }}>
                          <Download className="h-4 w-4 mr-1" /> PDF
                        </Button>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {group.items.map((item: any, i: number) => (
                        <OfficialDocumentView key={i} item={item} type={contentData.contentType} />
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </main>

        <footer className="border-t-2 border-primary bg-card px-4 sm:px-6 py-4 mt-8">
          <div className="max-w-7xl mx-auto text-center text-xs text-muted-foreground space-y-1">
            <p className="flex items-center justify-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              Documento Oficial disponibilizado apenas para consulta — Acesso monitorado
            </p>
            <p>Neovale - Gestão Acadêmica • Acesso em {accessedAt ? format(new Date(accessedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—'}</p>
          </div>
        </footer>
      </div>
    );
  }

  // ============ RENDER: Keyword entry ============
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-3">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl">Neovale - Gestão Acadêmica</CardTitle>
          {linkInfo && (
            <div className="space-y-1 mt-2">
              <p className="text-sm font-semibold text-foreground flex items-center justify-center gap-1">
                <School className="h-4 w-4" /> {linkInfo.schoolName}
              </p>
              <Badge variant="outline">{contentTypeLabels[linkInfo.contentType] || linkInfo.contentType}</Badge>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Informe a palavra-chave para acessar os documentos oficiais</p>
          </div>
          <Input
            type="password"
            placeholder="Palavra-chave"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && accessMutation.mutate()}
          />
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <Button onClick={() => accessMutation.mutate()} disabled={accessMutation.isPending} className="w-full">
            {accessMutation.isPending ? 'Validando...' : 'Acessar Documentos Oficiais'}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            Acesso monitorado. Todas as tentativas são registradas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ EMPTY STATE ============
function EmptyState({ message, subtitle }: { message: string; subtitle?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-8">
        <FileText className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground font-medium text-center">{message}</p>
        {subtitle && <p className="text-xs text-muted-foreground text-center">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

// ============ DOCUMENT VIEW COMPONENTS ============
function OfficialDocumentView({ item, type }: { item: any; type: string }) {
  if (type === 'planejamentos') return <PlanningDocView item={item} />;
  if (type === 'faltas') return <AttendanceDocView item={item} />;
  return null;
}

function PlanningDocView({ item }: { item: any }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="bg-primary px-4 py-2 flex items-center justify-between">
        <span className="text-primary-foreground text-sm font-semibold">
          {item.bimester_number}º Bimestre {item.week_number ? `— Semana ${item.week_number}` : ''}
        </span>
        <div className="flex items-center gap-2">
          {item.professor_signed && (
            <Badge className="bg-green-500/20 text-green-100 border-green-500/30 text-xs">
              <Stamp className="h-3 w-3 mr-1" /> Professor
            </Badge>
          )}
          {item.coordinator_signed && (
            <Badge className="bg-green-500/20 text-green-100 border-green-500/30 text-xs">
              <Stamp className="h-3 w-3 mr-1" /> Coordenador
            </Badge>
          )}
        </div>
      </div>
      <div className="p-4 space-y-3">
        {item.week_start_date && item.week_end_date && (
          <p className="text-xs text-muted-foreground">Período: {item.week_start_date} a {item.week_end_date}</p>
        )}
        {[
          { label: 'Objetivo', value: item.objective },
          { label: 'Competências', value: item.competencies },
          { label: 'Conteúdos', value: item.contents },
          { label: 'Metodologia', value: item.methodology },
          { label: 'Recursos', value: item.resources },
          { label: 'Avaliação', value: item.evaluation },
          { label: 'Produto/Registro', value: item.product },
          { label: 'Próximos Passos', value: item.next_steps },
        ].filter(f => f.value).map((f, i) => (
          <div key={i}>
            <span className="text-xs font-semibold text-primary">{f.label}:</span>
            <p className="text-sm text-foreground whitespace-pre-wrap">{f.value}</p>
          </div>
        ))}
        {item.finalized_at && (
          <div className="border-t border-border pt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 text-green-600">
              <ShieldCheck className="h-3 w-3" /> Documento Finalizado
            </span>
            <span>
              em {Number.isNaN(new Date(item.finalized_at).getTime())
                ? String(item.finalized_at)
                : format(new Date(item.finalized_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function AttendanceDocView({ item }: { item: any }) {
  return (
    <div className="flex items-center justify-between border border-border rounded-lg px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{item.students?.nome_completo}</p>
        <p className="text-xs text-muted-foreground">{item.students?.codigo_matricula}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{item.subjects?.nome}</p>
          <p className="text-xs text-foreground">{item.occurrence_date}</p>
        </div>
        <Badge variant={item.status === 'FALTA' ? 'destructive' : 'outline'} className="text-xs">
          {item.status === 'FALTA' ? 'Falta' : item.status === 'PRESENTE' ? 'Presente' : item.status}
        </Badge>
      </div>
    </div>
  );
}
