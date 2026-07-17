import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download } from 'lucide-react';
import { BoletimIndividual } from '@/features/boletins/components/BoletimIndividual';
import { RelatorioGeralTurma } from '@/features/boletins/components/RelatorioGeralTurma';
import { generateBoletimPdf, generateRelatorioGeralPdf } from '@/features/boletins/utils/generateBoletimPdf';
import type { BoletimData, StudentBoletimData } from '@/features/boletins/hooks/useBoletimData';

type ReportModel = 'individual' | 'geral';

interface ExternalBoletimCardProps {
  boletim: any;
  onDownloadPdf: (model: ReportModel) => void;
}

function normalizeBoletimData(boletim: any): BoletimData {
  const students: StudentBoletimData[] = Array.isArray(boletim?.students)
    ? boletim.students.map((student: any) => ({
        id: student?.id || '',
        nome: student?.nome || 'Aluno',
        codigoMatricula: student?.codigoMatricula || '',
        numero: Number(student?.numero || 0),
        subjects: Array.isArray(student?.subjects)
          ? student.subjects.map((subject: any) => ({
              subjectId: subject?.subjectId || '',
              subjectName: subject?.subjectName || 'Unidade Curricular',
              bimesters: Array.isArray(subject?.bimesters)
                ? subject.bimesters.map((bim: any) => ({
                    number: Number(bim?.number || 0),
                    media: bim?.media === null || bim?.media === undefined ? null : Number(bim.media),
                    faltas: Number(bim?.faltas || 0),
                  }))
                : [],
              totalFaltas: Number(subject?.totalFaltas || 0),
              mediaFinal: subject?.mediaFinal === null || subject?.mediaFinal === undefined ? null : Number(subject.mediaFinal),
            }))
          : [],
      }))
    : [];

  return {
    school: {
      nome: boletim?.school?.nome || '',
      endereco: boletim?.school?.endereco || '',
      cidade: boletim?.school?.cidade || '',
    },
    course: {
      nome: boletim?.course?.nome || '',
      qualificacao: boletim?.course?.qualificacao || boletim?.course?.nome || '',
    },
    classGroup: {
      nome: boletim?.classGroup?.nome || '',
      anoLetivo: boletim?.classGroup?.anoLetivo || '',
    },
    formativeTrack: boletim?.formativeTrack || '',
    students,
    emissionDate: boletim?.emissionDate || new Date().toLocaleDateString('pt-BR'),
  };
}

export function ExternalBoletimCard({ boletim, onDownloadPdf }: ExternalBoletimCardProps) {
  const [model, setModel] = useState<ReportModel>('geral');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');

  const data = useMemo(() => normalizeBoletimData(boletim), [boletim]);
  const periodLabel = Array.isArray(boletim?.bimesterNumbers) && boletim.bimesterNumbers.length > 0
    ? boletim.bimesterNumbers.map((n: number) => `${n}º`).join(', ')
    : 'Todos os bimestres';

  const handleDownloadPdf = () => {
    if (model === 'individual') {
      generateBoletimPdf(data, selectedStudentId !== 'all' ? selectedStudentId : undefined);
    } else {
      generateRelatorioGeralPdf(data);
    }
    onDownloadPdf(model);
  };

  return (
    <Card className="border-l-4 border-l-primary overflow-hidden">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">
              {data.school.nome} • {data.course.nome} • {data.classGroup.nome}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {data.formativeTrack ? `Itinerário: ${data.formativeTrack} • ` : ''}
              Período: {periodLabel} • Status: {boletim?.documentStatus || 'Disponível'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary">{data.students.length} aluno(s)</Badge>
            <Badge variant="outline">PDF Oficial</Badge>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between print:hidden">
          <Tabs value={model} onValueChange={(value) => setModel(value as ReportModel)}>
            <TabsList>
              <TabsTrigger value="individual" className="text-xs">Boletim Individual</TabsTrigger>
              <TabsTrigger value="geral" className="text-xs">Relatório Geral</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {model === 'individual' && data.students.length > 0 && (
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger className="w-full sm:w-[280px]">
                  <SelectValue placeholder="Todos os alunos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os alunos</SelectItem>
                  {data.students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.numero}. {student.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button type="button" variant="outline" onClick={handleDownloadPdf}>
              <Download className="h-4 w-4 mr-2" />
              Baixar PDF Oficial
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Visible preview */}
        <div>
          {model === 'individual' ? (
            <BoletimIndividual
              data={data}
              selectedStudentId={selectedStudentId !== 'all' ? selectedStudentId : undefined}
            />
          ) : (
            <RelatorioGeralTurma data={data} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
