import { Fragment, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BoletimData } from '../hooks/useBoletimData';
import { SubjectNameWithAnp } from '@/components/SubjectNameWithAnp';
import { useAnpSubjectMap } from '@/hooks/useAnpSubjectMap';

interface BoletimIndividualProps {
  data: BoletimData;
  selectedStudentId?: string;
  showAll?: boolean;
}

function StudentBoletimCard({ student, data }: { student: BoletimIndividualProps['data']['students'][0]; data: BoletimData }) {
  const bimesterNumbers = student.subjects[0]?.bimesters.map(b => b.number) || [];
  const { data: anpMap } = useAnpSubjectMap();

  return (
    <div className="boletim-page bg-white rounded-lg border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">Neovale - Gestão Acadêmica</h2>
            <p className="text-xs sm:text-sm opacity-80">BOLETIM ESCOLAR (PARCIAL)</p>
          </div>
          <div className="text-right text-xs opacity-70">
            <p>Emitido em: {data.emissionDate}</p>
          </div>
        </div>
      </div>

      {/* Student Info */}
      <div className="p-4 sm:p-6 border-b border-border">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
          <div><span className="font-semibold text-muted-foreground">Id:</span> {student.codigoMatricula}</div>
          <div className="sm:col-span-2"><span className="font-semibold text-muted-foreground">Nome:</span> {student.nome}</div>
          <div><span className="font-semibold text-muted-foreground">Nº:</span> {student.numero}</div>
          <div><span className="font-semibold text-muted-foreground">Curso:</span> {data.course.nome}</div>
          <div><span className="font-semibold text-muted-foreground">Turma:</span> {data.classGroup.nome}</div>
          {data.formativeTrack && (
            <div><span className="font-semibold text-muted-foreground">Itinerário:</span> {data.formativeTrack}</div>
          )}
          <div><span className="font-semibold text-muted-foreground">Qualificação:</span> {data.course.qualificacao}</div>
          <div><span className="font-semibold text-muted-foreground">Ano Letivo:</span> {data.classGroup.anoLetivo}</div>
        </div>
      </div>

      {/* Grades Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-2 sm:p-3 border-b border-border font-semibold min-w-[180px]">Unidade Curricular</th>
              {bimesterNumbers.map(bim => (
                <th key={`h-${bim}`} colSpan={2} className="text-center p-2 sm:p-3 border-b border-l border-border font-semibold">
                  {bim}º Bim
                </th>
              ))}
              <th className="text-center p-2 sm:p-3 border-b border-l border-border font-semibold">Total Faltas</th>
              <th className="text-center p-2 sm:p-3 border-b border-l border-border font-semibold">Média Final</th>
            </tr>
            <tr className="bg-muted/30">
              <th className="border-b border-border"></th>
              {bimesterNumbers.map(bim => (
                <Fragment key={`sub-${bim}`}>
                  <th className="text-center p-1.5 border-b border-l border-border text-muted-foreground font-medium text-[10px] sm:text-xs">Méd.</th>
                  <th className="text-center p-1.5 border-b border-l border-border text-muted-foreground font-medium text-[10px] sm:text-xs">Falta</th>
                </Fragment>
              ))}
              <th className="border-b border-l border-border"></th>
              <th className="border-b border-l border-border"></th>
            </tr>
          </thead>
          <tbody>
            {student.subjects.map((sub, idx) => (
              <tr key={sub.subjectId} className={idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'}>
                <td className="p-2 sm:p-3 border-b border-border font-medium">
                  <SubjectNameWithAnp name={sub.subjectName} isAnp={anpMap?.bySubject.has(sub.subjectId)} compact />
                </td>
                {sub.bimesters.map(bim => (
                  <Fragment key={`${sub.subjectId}-${bim.number}`}>
                    <td className={`text-center p-2 border-b border-l border-border font-semibold ${bim.media !== null && bim.media < 6 ? 'text-destructive' : ''}`}>
                      {bim.media !== null ? bim.media.toFixed(1) : '-'}
                    </td>
                    <td className="text-center p-2 border-b border-l border-border">
                      {bim.faltas || 0}
                    </td>
                  </Fragment>
                ))}
                <td className="text-center p-2 border-b border-l border-border font-semibold">{sub.totalFaltas}</td>
                <td className={`text-center p-2 border-b border-l border-border font-bold ${sub.mediaFinal !== null && sub.mediaFinal < 6 ? 'text-destructive' : ''}`}>
                  {sub.mediaFinal !== null ? sub.mediaFinal.toFixed(1) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-4 text-xs text-muted-foreground text-center border-t border-border">
        {data.school.nome} — {data.school.cidade}
      </div>
    </div>
  );
}

export function BoletimIndividual({ data, selectedStudentId, showAll }: BoletimIndividualProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const students = selectedStudentId
    ? data.students.filter(s => s.id === selectedStudentId)
    : data.students;

  if (students.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Nenhum aluno encontrado.</p>;
  }

  // When showAll is true, render all students separately (for PDF generation)
  if (showAll && !selectedStudentId) {
    return (
      <div className="space-y-8">
        {students.map(student => (
          <div key={student.id} className="boletim-page-break">
            <StudentBoletimCard student={student} data={data} />
          </div>
        ))}
      </div>
    );
  }

  const student = students[currentIndex];

  return (
    <div>
      {/* Navigation */}
      {students.length > 1 && (
        <div className="flex items-center justify-between mb-4 print:hidden">
          <Button variant="outline" size="sm" onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Aluno {currentIndex + 1} de {students.length}
          </span>
          <Button variant="outline" size="sm" onClick={() => setCurrentIndex(i => Math.min(students.length - 1, i + 1))} disabled={currentIndex === students.length - 1}>
            Próximo <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      <StudentBoletimCard student={student} data={data} />
    </div>
  );
}