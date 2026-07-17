import React, { useMemo } from 'react';
import { BoletimData } from '../hooks/useBoletimData';
import { SubjectNameWithAnp } from '@/components/SubjectNameWithAnp';
import { useAnpSubjectMap } from '@/hooks/useAnpSubjectMap';

interface RelatorioGeralTurmaProps {
  data: BoletimData;
}

export function RelatorioGeralTurma({ data }: RelatorioGeralTurmaProps) {
  const bimesterNumbers = data.students[0]?.subjects[0]?.bimesters.map(b => b.number) || [];
  const totalAlunos = data.students.length;
  const { data: anpMap } = useAnpSubjectMap();

  // Calculate summary stats per subject
  const subjectStats = useMemo(() => {
    if (data.students.length === 0) return [];
    const subjects = data.students[0].subjects;
    return subjects.map(sub => {
      let abaixo = 0;
      let acima = 0;
      data.students.forEach(student => {
        const studentSub = student.subjects.find(s => s.subjectId === sub.subjectId);
        if (studentSub && studentSub.mediaFinal !== null) {
          if (studentSub.mediaFinal < 6) abaixo++;
          else acima++;
        }
      });
      const total = abaixo + acima;
      return {
        subjectId: sub.subjectId,
        subjectName: sub.subjectName,
        abaixo,
        abaixoPct: total > 0 ? ((abaixo / total) * 100).toFixed(2) : '0,00',
        acima,
        acimaPct: total > 0 ? ((acima / total) * 100).toFixed(2) : '0,00',
      };
    });
  }, [data]);

  if (data.students.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Nenhum aluno encontrado.</p>;
  }

  return (
    <div className="boletim-page bg-white rounded-lg border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">Neovale - Gestão Acadêmica</h2>
            <p className="text-xs sm:text-sm opacity-80">RELATÓRIO GERAL DA TURMA - NOTAS COM TODAS AS UNIDADES CURRICULARES</p>
          </div>
          <div className="text-right text-xs opacity-70">
            <p>Emitido em: {data.emissionDate}</p>
          </div>
        </div>
      </div>

      {/* Class Info */}
      <div className="p-4 sm:p-6 border-b border-border">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
          <div><span className="font-semibold text-muted-foreground">Escola:</span> {data.school.nome}</div>
          <div><span className="font-semibold text-muted-foreground">Curso:</span> {data.course.nome}</div>
          <div><span className="font-semibold text-muted-foreground">Turma:</span> {data.classGroup.nome}</div>
          <div><span className="font-semibold text-muted-foreground">Ano Letivo:</span> {data.classGroup.anoLetivo}</div>
        </div>
      </div>

      {/* Grades Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] sm:text-xs border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-2 border-b border-border font-semibold min-w-[40px]">Id</th>
              <th className="text-left p-2 border-b border-border font-semibold min-w-[150px]">Nome do Aluno</th>
              <th className="text-left p-2 border-b border-l border-border font-semibold min-w-[120px]">Unidade Curricular</th>
              {bimesterNumbers.map(bim => (
                <th key={`h-${bim}`} colSpan={2} className="text-center p-2 border-b border-l border-border font-semibold">
                  {bim}º Bim
                </th>
              ))}
              <th className="text-center p-2 border-b border-l border-border font-semibold">Média Final</th>
              <th className="text-center p-2 border-b border-l border-border font-semibold">Total Faltas</th>
            </tr>
            <tr className="bg-muted/30">
              <th className="border-b border-border"></th>
              <th className="border-b border-border"></th>
              <th className="border-b border-l border-border"></th>
              {bimesterNumbers.map(bim => (
                <React.Fragment key={`sub-${bim}`}>
                  <th className="text-center p-1 border-b border-l border-border text-muted-foreground font-medium">Méd.</th>
                  <th className="text-center p-1 border-b border-l border-border text-muted-foreground font-medium">Falta</th>
                </React.Fragment>
              ))}
              <th className="border-b border-l border-border"></th>
              <th className="border-b border-l border-border"></th>
            </tr>
          </thead>
          <tbody>
            {data.students.map((student, studentIdx) =>
              student.subjects.map((sub, subIdx) => (
                <tr
                  key={`${student.id}-${sub.subjectId}`}
                  className={`${studentIdx % 2 === 0 ? 'bg-white' : 'bg-muted/10'} ${subIdx === 0 ? 'border-t-2 border-border' : ''}`}
                >
                  {subIdx === 0 && (
                    <>
                      <td className="p-2 border-b border-border font-medium align-top" rowSpan={student.subjects.length}>
                        {student.codigoMatricula}
                      </td>
                      <td className="p-2 border-b border-border font-medium align-top" rowSpan={student.subjects.length}>
                        {student.nome}
                      </td>
                    </>
                  )}
                  <td className="p-2 border-b border-l border-border">
                    <SubjectNameWithAnp name={sub.subjectName} isAnp={anpMap?.bySubject.has(sub.subjectId)} compact />
                  </td>
                  {sub.bimesters.map(bim => (
                    <React.Fragment key={`${student.id}-${sub.subjectId}-${bim.number}`}>
                      <td className={`text-center p-2 border-b border-l border-border font-semibold ${bim.media !== null && bim.media < 6 ? 'text-destructive' : ''}`}>
                        {bim.media !== null ? bim.media.toFixed(1) : '-'}
                      </td>
                      <td className="text-center p-2 border-b border-l border-border">
                        {bim.faltas || 0}
                      </td>
                    </React.Fragment>
                  ))}
                  <td className={`text-center p-2 border-b border-l border-border font-bold ${sub.mediaFinal !== null && sub.mediaFinal < 6 ? 'text-destructive' : ''}`}>
                    {sub.mediaFinal !== null ? sub.mediaFinal.toFixed(1) : '-'}
                  </td>
                  <td className="text-center p-2 border-b border-l border-border font-semibold">{sub.totalFaltas}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Statistics Table */}
      <div className="p-4 sm:p-6 border-t border-border">
        <h3 className="text-sm font-bold mb-3">Resumo por Unidade Curricular</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] sm:text-xs border-collapse border border-border">
            <thead>
              <tr className="bg-muted/50">
                <th rowSpan={2} className="text-center p-2 border border-border font-semibold min-w-[60px]">Qtd. Alunos Ativos</th>
                <th rowSpan={2} className="text-left p-2 border border-border font-semibold min-w-[180px]">Unidade Curricular</th>
                <th colSpan={2} className="text-center p-2 border border-border font-semibold">Abaixo da média</th>
                <th colSpan={2} className="text-center p-2 border border-border font-semibold">Igual ou acima da média</th>
              </tr>
              <tr className="bg-muted/30">
                <th className="text-center p-1 border border-border font-medium">Quantidade</th>
                <th className="text-center p-1 border border-border font-medium">Percentual</th>
                <th className="text-center p-1 border border-border font-medium">Quantidade</th>
                <th className="text-center p-1 border border-border font-medium">Percentual</th>
              </tr>
            </thead>
            <tbody>
              {subjectStats.map((stat, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-muted/10'}>
                  {idx === 0 && (
                    <td rowSpan={subjectStats.length} className="text-center p-2 border border-border font-bold align-middle">
                      {totalAlunos}
                    </td>
                  )}
                  <td className="p-2 border border-border">
                    <SubjectNameWithAnp name={stat.subjectName} isAnp={anpMap?.bySubject.has(stat.subjectId)} compact />
                  </td>
                  <td className="text-center p-2 border border-border font-semibold text-destructive">{stat.abaixo}</td>
                  <td className="text-center p-2 border border-border text-destructive">{stat.abaixoPct}%</td>
                  <td className="text-center p-2 border border-border font-semibold">{stat.acima}</td>
                  <td className="text-center p-2 border border-border">{stat.acimaPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 text-xs text-muted-foreground text-center border-t border-border">
        {data.school.nome} — {data.school.cidade} — Total de alunos: {data.students.length}
      </div>
    </div>
  );
}
