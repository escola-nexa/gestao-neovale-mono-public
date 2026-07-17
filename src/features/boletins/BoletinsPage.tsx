import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { FileSpreadsheet, Loader2, Users, Download, Filter, Cloud } from 'lucide-react';
import FeatureGuideCard from '@/components/FeatureGuideCard';
import { PageHeader } from '@/components/PageHeader';
import { BoletimFilters } from './components/BoletimFilters';
import { BoletimIndividual } from './components/BoletimIndividual';
import { RelatorioGeralTurma } from './components/RelatorioGeralTurma';
import { useBoletimData } from './hooks/useBoletimData';
import { useToast } from '@/hooks/use-toast';
import { generateBoletimPdf, generateRelatorioGeralPdf } from './utils/generateBoletimPdf';
import { boletimApi } from './api';

export default function BoletinsPage() {
  const { data, isLoading, fetchData } = useBoletimData();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('individual');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [lastFilterParams, setLastFilterParams] = useState<any>(null);

  const handleSearch = (params: Parameters<typeof fetchData>[0]) => {
    setSelectedStudentId('');
    setLastFilterParams(params);
    fetchData(params);
  };

  const handleServerPdf = async () => {
    if (!lastFilterParams || !data) return;
    setGeneratingPdf(true);
    try {
      const payload: { schoolId: string; courseId: string; classGroupId: string; bimesters: number[]; reportType: string; studentId?: string } = {
        schoolId: lastFilterParams.schoolId,
        courseId: lastFilterParams.courseId,
        classGroupId: lastFilterParams.classGroupId,
        bimesters: lastFilterParams.bimesters,
        reportType: activeTab === 'geral' ? 'relatorio_geral' : 'boletim_individual',
      };

      if (activeTab === 'individual' && selectedStudentId && selectedStudentId !== 'all') {
        payload.studentId = selectedStudentId;
      }

      const result = await boletimApi.generateServerPdf(payload);

      // Open download URL
      window.open(result.downloadUrl, '_blank');

      toast({
        title: 'PDF gerado com sucesso!',
        description: `${result.studentCount} aluno(s) incluídos. Link válido por 1 hora.`,
      });
    } catch (err: any) {
      console.error('Server PDF error:', err);
      toast({ title: 'Erro ao gerar PDF no servidor', description: err.message, variant: 'destructive' });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleClientPdf = () => {
    if (!data) return;
    if (activeTab === 'geral') {
      generateRelatorioGeralPdf(data);
    } else {
      generateBoletimPdf(data, selectedStudentId && selectedStudentId !== 'all' ? selectedStudentId : undefined);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4">
      <FeatureGuideCard title="Como usar Boletins" steps={[
        { icon: Filter, title: 'Selecionar contexto', description: 'Escolha escola, curso, turma e bimestre para carregar os dados.', color: 'blue' },
        { icon: Users, title: 'Boletim individual', description: 'Navegue entre alunos para ver o boletim individual de cada um.', color: 'green' },
        { icon: FileSpreadsheet, title: 'Relatório geral', description: 'Visualize o relatório completo da turma com notas e faltas.', color: 'purple' },
        { icon: Download, title: 'Exportar PDF', description: 'Gere o PDF no servidor (ideal para turmas grandes) ou localmente.', color: 'amber' },
      ]} />

      <PageHeader
        breadcrumbs={[{ label: 'Pedagógico' }, { label: 'Boletins' }]}
        title="Boletins"
        description="Emissão de boletins individuais e relatórios gerais da turma"
        icon={FileSpreadsheet}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <BoletimFilters onSearch={handleSearch} isLoading={isLoading} />
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Carregando dados do boletim...</span>
        </div>
      )}

      {data && !isLoading && (
        <Card>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 print:hidden">
                <TabsList>
                  <TabsTrigger value="individual">Boletim Individual</TabsTrigger>
                  <TabsTrigger value="geral">Relatório Geral</TabsTrigger>
                </TabsList>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {activeTab === 'individual' && data.students.length > 0 && (
                    <SearchableSelect
                      value={selectedStudentId}
                      onValueChange={setSelectedStudentId}
                      placeholder="Todos os alunos"
                      searchPlaceholder="Buscar aluno..."
                      triggerClassName="w-full sm:w-[250px]"
                      options={[
                        { value: 'all', label: 'Todos os alunos' },
                        ...data.students.map(s => ({ value: s.id, label: `${s.numero}. ${s.nome}` })),
                      ]}
                    />
                  )}

                  <Button
                    onClick={handleServerPdf}
                    disabled={generatingPdf}
                    className="w-full sm:w-auto"
                  >
                    {generatingPdf ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Cloud className="h-4 w-4 mr-2" />
                    )}
                    {generatingPdf ? 'Gerando...' : 'Gerar PDF (Servidor)'}
                  </Button>

                  <Button onClick={handleClientPdf} variant="outline" className="w-full sm:w-auto">
                    <Download className="h-4 w-4 mr-2" />
                    PDF Local
                  </Button>
                </div>
              </div>

              <TabsContent value="individual">
                <BoletimIndividual
                  data={data}
                  selectedStudentId={selectedStudentId && selectedStudentId !== 'all' ? selectedStudentId : undefined}
                  showAll={!selectedStudentId || selectedStudentId === 'all'}
                />
              </TabsContent>
              <TabsContent value="geral">
                <RelatorioGeralTurma data={data} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
