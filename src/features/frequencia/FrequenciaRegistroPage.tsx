import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { AttendanceGrid } from './components/AttendanceGrid';
import { useProfessorId } from '@/hooks/useProfessorId';
import { frequenciaApi } from './api';
import { useAnpSubjectMap } from '@/hooks/useAnpSubjectMap';
import { formatSubjectName } from '@/components/SubjectNameWithAnp';

export default function FrequenciaRegistroPage() {
  const { classGroupId, subjectId } = useParams<{ classGroupId: string; subjectId: string }>();
  const navigate = useNavigate();
  const { professorId } = useProfessorId();
  const [contextInfo, setContextInfo] = useState({ className: '', subjectName: '', schoolName: '', courseName: '' });
  const { data: anpMap } = useAnpSubjectMap();
  const isAnp = subjectId ? !!anpMap?.bySubject.has(subjectId) : false;

  useEffect(() => {
    if (!classGroupId || !subjectId) return;
    const load = async () => {
      const [cg, sub] = await Promise.all([
        frequenciaApi.getClassGroupInfo(classGroupId),
        frequenciaApi.getSubjectInfo(subjectId),
      ]);
      setContextInfo({
        className: cg?.nome || '',
        subjectName: sub?.nome || '',
        schoolName: (cg as any)?.schools?.nome || '',
        courseName: (cg as any)?.courses?.nome || '',
      });
    };
    load();
  }, [classGroupId, subjectId]);

  const handleFinish = useCallback(() => {
    navigate('/frequencia');
  }, [navigate]);

  if (!classGroupId || !subjectId) return null;

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Pedagógico' },
          { label: 'Frequência', href: '/frequencia' },
          { label: 'Registro' },
        ]}
        title="Registro de Frequência"
        description={`${contextInfo.className} • ${formatSubjectName(contextInfo.subjectName, isAnp)}${contextInfo.schoolName ? ` • ${contextInfo.schoolName}` : ''}`}
        backTo="/frequencia"
      />

      <Card>
        <CardContent className="pt-6">
          <AttendanceGrid
            classGroupId={classGroupId}
            subjectId={subjectId}
            professorId={professorId}
            onFinish={handleFinish}
          />
        </CardContent>
      </Card>
    </div>
  );
}
