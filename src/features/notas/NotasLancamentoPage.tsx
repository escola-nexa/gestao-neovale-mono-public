import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { useProfessorId } from '@/hooks/useProfessorId';
import { useGrades } from './hooks/useGrades';
import { GradeConfigSetup } from './components/GradeConfigSetup';
import { GradeEntryGrid } from './components/GradeEntryGrid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, School, BookOpen, Users, GraduationCap, Calendar, Loader2, Settings, PenLine, Save, Lock, CheckSquare, Info, ChevronDown, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/PageHeader';
import { SubjectNameWithAnp } from '@/components/SubjectNameWithAnp';
import { useAnpSubjectMap } from '@/hooks/useAnpSubjectMap';
import { notasApi } from './api';

interface ContextInfo {
  schoolName: string;
  courseName: string;
  classGroupName: string;
  subjectName: string;
  professorId: string;
}

export default function NotasLancamentoPage() {
  const { classGroupId, subjectId, bimester } = useParams<{ classGroupId: string; subjectId: string; bimester: string }>();
  const navigate = useNavigate();
  const { organizationId } = useOrganization();
  const { professorId: myProfessorId, isProfessor } = useProfessorId();

  const [context, setContext] = useState<ContextInfo | null>(null);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const { data: anpMap } = useAnpSubjectMap();

  // We need school_id and course_id for the hook - get from class_groups
  const [classGroupMeta, setClassGroupMeta] = useState<{ school_id: string; course_id: string } | null>(null);

  // Resolve context info (school, course, class, subject names + professor)
  useEffect(() => {
    if (!classGroupId || !subjectId || !organizationId) return;
    const load = async () => {
      setIsLoadingContext(true);

      // Get class group info
      const cg = await notasApi.getClassGroupInfo(classGroupId);
      if (cg) {
        setClassGroupMeta({ school_id: cg.school_id, course_id: cg.course_id });
      }

      // Get subject name
      const subj = await notasApi.getSubjectInfo(subjectId);

      // Resolve professor: if user is professor use their id, else find from weekly_teaching_models
      let profId = myProfessorId;
      if (!isProfessor) {
        const wtm = await notasApi.getProfessorForClassSubject(classGroupId, subjectId);
        profId = wtm?.professor_id || null;
      }

      setContext({
        schoolName: (cg as any)?.schools?.nome || '',
        courseName: (cg as any)?.courses?.nome || '',
        classGroupName: cg?.nome || '',
        subjectName: subj?.nome || '',
        professorId: profId || '',
      });
      setIsLoadingContext(false);
    };
    load();
  }, [classGroupId, subjectId, organizationId, myProfessorId, isProfessor]);

  const grades = useGrades({
    organizationId,
    schoolId: classGroupMeta?.school_id || '',
    courseId: classGroupMeta?.course_id || '',
    classGroupId: classGroupId || '',
    subjectId: subjectId || '',
    professorId: context?.professorId || null,
    bimesterNumber: parseInt(bimester || '0'),
  });

  if (isLoadingContext || grades.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Pedagógico' },
          { label: 'Notas', href: '/notas' },
          { label: 'Lançamento' },
        ]}
        title="Lançamento de Notas"
        backTo="/notas"
        actions={
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => navigate(`/boletins?turma=${classGroupId}&bimestre=${bimester}`)}
          >
            <FileText className="h-3.5 w-3.5" /> Ver Boletim da Turma
          </Button>
        }
      />
      <div className="flex items-center gap-1.5 flex-wrap -mt-2">
        <Badge variant="outline" className="gap-1 text-[10px] sm:text-xs"><School className="h-3 w-3" />{context?.schoolName}</Badge>
        <Badge variant="outline" className="gap-1 text-[10px] sm:text-xs"><BookOpen className="h-3 w-3" />{context?.courseName}</Badge>
        <Badge variant="outline" className="gap-1 text-[10px] sm:text-xs"><Users className="h-3 w-3" />{context?.classGroupName}</Badge>
        <Badge variant="secondary" className="gap-1 text-[10px] sm:text-xs"><GraduationCap className="h-3 w-3" /><SubjectNameWithAnp name={context?.subjectName ?? ''} isAnp={subjectId ? anpMap?.bySubject.has(subjectId) : false} compact /></Badge>
        <Badge variant="default" className="gap-1 text-[10px] sm:text-xs"><Calendar className="h-3 w-3" />{bimester}º Bimestre</Badge>
      </div>

      {/* Instructional Guide - Collapsible */}
      <details className="group rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <summary className="flex items-center gap-3 px-5 py-3.5 cursor-pointer select-none hover:bg-muted/50 transition-colors">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Info className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold text-sm text-foreground">Como lançar notas — Passo a passo</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-5 pb-4 pt-1 border-t border-border/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-3">
            <div className="flex flex-col items-center text-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
              <div className="h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Settings className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-xs text-muted-foreground leading-snug"><strong className="text-foreground">1.</strong> Configure o tipo de avaliação e cadastre as atividades.</p>
            </div>
            <div className="flex flex-col items-center text-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30">
              <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <PenLine className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-xs text-muted-foreground leading-snug"><strong className="text-foreground">2.</strong> Lance as notas (0–10). A Média Final é calculada automaticamente.</p>
            </div>
            <div className="flex flex-col items-center text-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-800/30">
              <div className="h-9 w-9 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
                <CheckSquare className="h-4 w-4 text-rose-600" />
              </div>
              <p className="text-xs text-muted-foreground leading-snug"><strong className="text-foreground">3.</strong> Marque o <strong>checkbox</strong> se o aluno não possui nota (N/A).</p>
            </div>
            <div className="flex flex-col items-center text-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30">
              <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <Save className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-xs text-muted-foreground leading-snug"><strong className="text-foreground">4.</strong> <strong>"Salvar Rascunho"</strong> para salvar e continuar depois.</p>
            </div>
            <div className="flex flex-col items-center text-center gap-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-800/30">
              <div className="h-9 w-9 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                <Lock className="h-4 w-4 text-purple-600" />
              </div>
              <p className="text-xs text-muted-foreground leading-snug"><strong className="text-foreground">5.</strong> <strong>"Fechar Notas"</strong> para finalizar. Após, não poderá editar.</p>
            </div>
          </div>
        </div>
      </details>

      {/* Config or Grid */}
      {!grades.config ? (
        <GradeConfigSetup onSave={grades.saveConfig} isSaving={grades.isSaving} />
      ) : isEditingConfig ? (
        <GradeConfigSetup
          onSave={async (avgType, names) => {
            await grades.updateConfig(avgType, names);
            setIsEditingConfig(false);
          }}
          isSaving={grades.isSaving}
          initialAverageType={grades.config.average_type}
          initialActivityNames={grades.activities.map(a => a.name)}
          isEditing
          onCancel={() => setIsEditingConfig(false)}
        />
      ) : (
        <>
          {grades.config.status !== 'CLOSED' && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setIsEditingConfig(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Editar Critérios de Avaliação
              </Button>
            </div>
          )}
          <GradeEntryGrid
            activities={grades.activities}
            students={grades.students}
            averageType={grades.config.average_type}
            isClosed={grades.config.status === 'CLOSED'}
            isSaving={grades.isSaving}
            onSaveDraft={grades.saveGrades}
            onClose={grades.closeGrades}
          />
        </>
      )}
    </div>
  );
}
