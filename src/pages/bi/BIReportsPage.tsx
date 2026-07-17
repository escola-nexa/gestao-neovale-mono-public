import { useState } from 'react';
import { FileSpreadsheet, Download, Clock, Eye } from 'lucide-react';
import { GlobalFilterBar, BIFilters } from '@/components/bi/GlobalFilterBar';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { exportToPDF, exportToXLSX, previewPDF } from '@/services/bi/biExportService';
import { PDFPreviewDialog } from '@/components/bi/PDFPreviewDialog';
import { biApi as supabase } from '@/hooks/bi/api';
import { useOrganization } from '@/hooks/useOrganization';
import { TeacherBISummary, BISummaryKPIs } from '@/hooks/bi/useBIExecutive';
import { SchoolBISummary } from '@/hooks/bi/useBISchools';
import { CityBISummary } from '@/hooks/bi/useBICities';

interface ReportDef {
  id: string;
  name: string;
  description: string;
  formats: string[];
}

const REPORTS: ReportDef[] = [
  { id: 'executive', name: 'Relatório Executivo por Período', description: 'Resumo consolidado da conformidade docente com KPIs e semáforos', formats: ['pdf', 'xlsx'] },
  { id: 'teacher', name: 'Acompanhamento por Professor', description: 'Dossiê detalhado de cada professor com métricas e histórico', formats: ['pdf', 'xlsx'] },
  { id: 'school', name: 'Consolidado por Escola', description: 'Visão completa por unidade escolar com ranking interno', formats: ['pdf', 'xlsx'] },
  { id: 'city', name: 'Consolidado por Cidade', description: 'Análise territorial com comparativo entre escolas', formats: ['pdf', 'xlsx'] },
  { id: 'grades', name: 'Desempenho em Notas e Aprendizagem', description: 'Médias, alunos em risco e correlações pedagógicas', formats: ['pdf', 'xlsx'] },
  { id: 'risks', name: 'Pendências Críticas', description: 'Lista de alertas e professores em situação de risco', formats: ['pdf', 'xlsx'] },
  { id: 'rankings', name: 'Rankings e Comparativos', description: 'Rankings de professores, escolas e cidades por múltiplos critérios', formats: ['pdf', 'xlsx'] },
  { id: 'insights', name: 'Relatório de Insights Inteligentes', description: 'Principais descobertas e análises automáticas do período', formats: ['pdf', 'xlsx'] },
  { id: 'trends', name: 'Relatório de Tendências e Projeções', description: 'Evolução e projeções dos indicadores-chave', formats: ['pdf', 'xlsx'] },
  { id: 'prediction', name: 'Relatório de Previsão de Risco', description: 'Antecipação de criticidades por professor e escola', formats: ['pdf', 'xlsx'] },
  { id: 'recommendations', name: 'Relatório de Recomendações de Ação', description: 'Plano de ação priorizado com impacto e prazos', formats: ['pdf', 'xlsx'] },
  { id: 'monitoring', name: 'Relatório Executivo de Monitoramento', description: 'Painel consolidado para acompanhamento da gestão', formats: ['pdf', 'xlsx'] },
  { id: 'audit', name: 'Relatório de Auditoria do BI', description: 'Resultados da validação de qualidade visual e analítica', formats: ['pdf', 'xlsx'] },
];

async function fetchTeachers(orgId: string, filters: BIFilters): Promise<TeacherBISummary[]> {
  const { data } = await supabase.rpc('get_teacher_bi_summary', {
    p_org_id: orgId,
    p_school_id: filters.schoolId || null,
    p_course_id: filters.courseId || null,
    p_bimester_number: filters.bimester ? parseInt(filters.bimester) : null,
    p_limit: 1000,
    p_offset: 0,
  });
  return (data as unknown as TeacherBISummary[]) || [];
}

async function fetchKpis(orgId: string, filters: BIFilters): Promise<BISummaryKPIs | null> {
  const { data } = await supabase.rpc('get_bi_summary_kpis', {
    p_org_id: orgId,
    p_school_id: filters.schoolId || null,
    p_bimester_number: filters.bimester ? parseInt(filters.bimester) : null,
  });
  return (data as unknown as BISummaryKPIs[])?.[0] || null;
}

async function fetchSchools(orgId: string, filters: BIFilters): Promise<SchoolBISummary[]> {
  const { data } = await supabase.rpc('get_school_bi_summary', {
    p_org_id: orgId,
    p_bimester_number: filters.bimester ? parseInt(filters.bimester) : null,
  });
  return (data as unknown as SchoolBISummary[]) || [];
}

async function fetchCities(orgId: string, filters: BIFilters): Promise<CityBISummary[]> {
  const { data } = await supabase.rpc('get_city_bi_summary', {
    p_org_id: orgId,
    p_bimester_number: filters.bimester ? parseInt(filters.bimester) : null,
  });
  return (data as unknown as CityBISummary[]) || [];
}

function teacherHeaders() { return ['Professor', 'Escola', 'Planej.%', 'Freq.%', 'Notas%', 'Conform.%', 'Risco%']; }
function teacherRows(ts: TeacherBISummary[]) {
  return ts.map(t => [t.teacher_name, t.school_names?.[0] || '', t.planning_score.toFixed(0), t.attendance_score.toFixed(0), t.grades_score.toFixed(0), t.compliance_score.toFixed(0), t.risk_score.toFixed(0)]);
}

function schoolHeaders() { return ['Escola', 'Cidade', 'Professores', 'Conform.%', 'Risco%', 'Planej.Pend.', 'Freq.Pend.']; }
function schoolRows(ss: SchoolBISummary[]) {
  return ss.map(s => [s.school_name, s.city_name, String(s.total_teachers), s.compliance_avg.toFixed(0), s.risk_avg.toFixed(0), String(s.pending_plannings), String(s.pending_attendance)]);
}

function cityHeaders() { return ['Cidade', 'Escolas', 'Professores', 'Conform.%', 'Risco%', 'Pendências', 'Críticos']; }
function cityRows(cs: CityBISummary[]) {
  return cs.map(c => [c.city_name, String(c.total_schools), String(c.total_teachers), c.compliance_avg.toFixed(0), c.risk_avg.toFixed(0), String(c.total_pending), String(c.critical_teachers)]);
}

export default function BIReportsPage() {
  const { organizationId } = useOrganization();
  const [filters, setFilters] = useState<BIFilters>({});
  const [generating, setGenerating] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPdfBuffer, setPreviewPdfBuffer] = useState<ArrayBuffer | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewDownloadFn, setPreviewDownloadFn] = useState<(() => void) | null>(null);

  const handleGenerate = async (reportId: string, format: string) => {
    if (!organizationId) return;
    setGenerating(`${reportId}-${format}`);

    try {
      const isPreview = format === 'preview';
      const exportFn = format === 'pdf' ? exportToPDF : isPreview ? previewPDF : exportToXLSX;

      let result: unknown;

      if (['executive', 'monitoring'].includes(reportId)) {
        const [kpis, teachers] = await Promise.all([fetchKpis(organizationId, filters), fetchTeachers(organizationId, filters)]);
        const summary = kpis ? {
          'Professores Ativos': kpis.total_active_teachers,
          'Conformidade Média': `${kpis.avg_compliance_score?.toFixed(1)}%`,
          'Risco Médio': `${kpis.avg_risk_score?.toFixed(1)}%`,
          'Professores Críticos': kpis.teachers_critical,
          'Pendências Totais': kpis.total_pending,
        } : undefined;
        result = exportFn(REPORTS.find(r => r.id === reportId)!.name, teacherHeaders(), teacherRows(teachers), filters, summary);
      } else if (reportId === 'teacher') {
        const teachers = await fetchTeachers(organizationId, filters);
        result = exportFn('Acompanhamento por Professor', teacherHeaders(), teacherRows(teachers), filters);
      } else if (reportId === 'school') {
        const schools = await fetchSchools(organizationId, filters);
        result = exportFn('Consolidado por Escola', schoolHeaders(), schoolRows(schools), filters);
      } else if (reportId === 'city') {
        const cities = await fetchCities(organizationId, filters);
        result = exportFn('Consolidado por Cidade', cityHeaders(), cityRows(cities), filters);
      } else if (['risks', 'prediction'].includes(reportId)) {
        const teachers = await fetchTeachers(organizationId, filters);
        const risky = teachers.filter(t => t.risk_score > 40).sort((a, b) => b.risk_score - a.risk_score);
        result = exportFn(reportId === 'risks' ? 'Pendências Críticas' : 'Previsão de Risco', teacherHeaders(), teacherRows(risky), filters);
      } else if (reportId === 'rankings') {
        const teachers = await fetchTeachers(organizationId, filters);
        const sorted = [...teachers].sort((a, b) => b.compliance_score - a.compliance_score);
        const headers = ['Rank', 'Professor', 'Escola', 'Conform.%', 'Risco%'];
        const rows = sorted.map((t, i) => [String(i + 1), t.teacher_name, t.school_names?.[0] || '', t.compliance_score.toFixed(0), t.risk_score.toFixed(0)]);
        result = exportFn('Rankings e Comparativos', headers, rows, filters);
      } else if (['grades', 'insights', 'trends', 'recommendations', 'audit'].includes(reportId)) {
        const teachers = await fetchTeachers(organizationId, filters);
        const name = REPORTS.find(r => r.id === reportId)!.name;
        result = exportFn(name, teacherHeaders(), teacherRows(teachers), filters);
      }

      const awaitedResult = result instanceof Promise ? await result : result;
      if (isPreview && awaitedResult instanceof ArrayBuffer) {
        const reportName = REPORTS.find(r => r.id === reportId)!.name;
        setPreviewPdfBuffer(awaitedResult);
        setPreviewTitle(reportName);
        setPreviewDownloadFn(() => () => handleGenerate(reportId, 'pdf'));
        setPreviewOpen(true);
        toast.success('Relatório gerado!', { description: 'Visualização aberta.' });
      } else {
        toast.success('Relatório gerado com sucesso!', { description: `${format.toUpperCase()} baixado.` });
      }
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Erro ao gerar relatório');
    } finally {
      setGenerating(null);
    }
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'B.I.', href: '/bi' }, { label: 'Relatórios' }]}
        title="Exportações e Relatórios"
        description="Relatórios executivos e operacionais da organização"
        icon={FileSpreadsheet}
      />

      <GlobalFilterBar filters={filters} onChange={setFilters} />

      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{activeFiltersCount} filtro(s) aplicado(s) — os relatórios serão gerados com estes parâmetros</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORTS.map(report => (
          <Card key={report.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <FileSpreadsheet className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">{report.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{report.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  disabled={generating === `${report.id}-preview`}
                  onClick={() => handleGenerate(report.id, 'preview')}
                >
                  {generating === `${report.id}-preview` ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                  Visualizar
                </Button>
                {report.formats.map(format => (
                  <Button
                    key={format}
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                    disabled={generating === `${report.id}-${format}`}
                    onClick={() => handleGenerate(report.id, format)}
                  >
                    {generating === `${report.id}-${format}` ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
                    ) : (
                      <Download className="h-3 w-3" />
                    )}
                    {format.toUpperCase()}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PDFPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        pdfBuffer={previewPdfBuffer}
        title={previewTitle}
        onDownload={previewDownloadFn || undefined}
      />
    </div>
  );
}
