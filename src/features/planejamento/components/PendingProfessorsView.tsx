import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Building2, ChevronDown, User, AlertTriangle, CheckCircle, Clock, Send } from 'lucide-react';
import { TeacherPlanningData, CourseData, SubjectData, SchoolData, ClassGroupData } from '@/services/supabaseApi';

interface PendingProfessorsViewProps {
  plannings: TeacherPlanningData[];
  schools: SchoolData[];
  courses: CourseData[];
  subjects: SubjectData[];
  classGroups: ClassGroupData[];
  professors: Record<string, string>;
}

interface ProfessorSummary {
  professorId: string;
  professorName: string;
  total: number;
  draft: number;
  enviado: number;
  devolvido: number;
  assinado: number;
  progress: number;
}

interface SchoolGroup {
  school: SchoolData;
  professors: ProfessorSummary[];
  totalPlannings: number;
  completedPlannings: number;
}

const DONE_STATUSES = ['ASSINADO', 'APPROVED', 'AGUARDANDO_ASSINATURA', 'AGUARDANDO_ASSINATURA_COORDENADOR'];
const PENDING_STATUSES = ['DRAFT', 'CONCLUIDO', 'DEVOLVIDO', 'REJECTED'];

export function PendingProfessorsView({ plannings, schools, courses, subjects, classGroups, professors }: PendingProfessorsViewProps) {
  const navigate = useNavigate();

  const schoolGroups = useMemo((): SchoolGroup[] => {
    // Group by school -> professor
    const schoolMap = new Map<string, Map<string, TeacherPlanningData[]>>();

    plannings.forEach(tp => {
      const schoolId = tp.school_id || 'unknown';
      if (!schoolMap.has(schoolId)) schoolMap.set(schoolId, new Map());
      const profMap = schoolMap.get(schoolId)!;
      const profId = tp.professor_id;
      if (!profMap.has(profId)) profMap.set(profId, []);
      profMap.get(profId)!.push(tp);
    });

    const groups: SchoolGroup[] = [];

    schoolMap.forEach((profMap, schoolId) => {
      const school = schools.find(s => s.id === schoolId);
      if (!school) return;

      const profSummaries: ProfessorSummary[] = [];
      let totalPlannings = 0;
      let completedPlannings = 0;

      profMap.forEach((tps, profId) => {
        const draft = tps.filter(t => PENDING_STATUSES.includes(t.status)).length;
        const enviado = tps.filter(t => ['ENVIADO', 'PENDING'].includes(t.status)).length;
        const devolvido = tps.filter(t => ['DEVOLVIDO', 'REJECTED'].includes(t.status)).length;
        const assinado = tps.filter(t => DONE_STATUSES.includes(t.status)).length;
        const total = tps.length;
        const progress = total > 0 ? Math.round(((assinado + enviado) / total) * 100) : 0;

        totalPlannings += total;
        completedPlannings += assinado + enviado;

        profSummaries.push({
          professorId: profId,
          professorName: professors[profId] || 'Professor',
          total, draft, enviado, devolvido, assinado, progress,
        });
      });

      // Sort: professors with most pending work first
      profSummaries.sort((a, b) => a.progress - b.progress);

      groups.push({
        school,
        professors: profSummaries,
        totalPlannings,
        completedPlannings,
      });
    });

    // Sort schools by least progress first
    groups.sort((a, b) => {
      const progA = a.totalPlannings > 0 ? a.completedPlannings / a.totalPlannings : 1;
      const progB = b.totalPlannings > 0 ? b.completedPlannings / b.totalPlannings : 1;
      return progA - progB;
    });

    return groups;
  }, [plannings, schools, professors]);

  if (schoolGroups.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CheckCircle className="h-8 w-8 mx-auto mb-3 text-emerald-500" />
        <p className="font-medium">Nenhum planejamento pendente</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {schoolGroups.map(group => {
        const schoolProgress = group.totalPlannings > 0 ? Math.round((group.completedPlannings / group.totalPlannings) * 100) : 0;
        const pendingProfs = group.professors.filter(p => p.draft > 0 || p.devolvido > 0);

        return (
          <Collapsible key={group.school.id} defaultOpen={pendingProfs.length > 0}>
            <Card className="shadow-sm">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-semibold truncate">{group.school.nome}</CardTitle>
                        <p className="text-[11px] text-muted-foreground">
                          {group.professors.length} professor(es) · {group.totalPlannings} planejamentos
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="hidden sm:flex items-center gap-2 w-32">
                        <Progress value={schoolProgress} className="h-2" />
                        <span className="text-xs font-medium text-muted-foreground w-8">{schoolProgress}%</span>
                      </div>
                      {pendingProfs.length > 0 && (
                        <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 text-[10px]">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {pendingProfs.length} pendente(s)
                        </Badge>
                      )}
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 px-4 pb-3 space-y-2">
                  {group.professors.map(prof => (
                    <div key={prof.professorId} className="flex items-center justify-between rounded-lg border bg-card p-3 gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{prof.professorName}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>{prof.total} sem.</span>
                            <span>·</span>
                            <span className="text-emerald-600">{prof.assinado} ok</span>
                            {prof.enviado > 0 && <><span>·</span><span className="text-amber-600">{prof.enviado} env.</span></>}
                            {prof.devolvido > 0 && <><span>·</span><span className="text-destructive">{prof.devolvido} dev.</span></>}
                            {prof.draft > 0 && <><span>·</span><span className="text-slate-500">{prof.draft} pend.</span></>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden sm:flex items-center gap-1.5 w-20">
                          <Progress value={prof.progress} className="h-1.5" />
                          <span className="text-[10px] font-medium text-muted-foreground">{prof.progress}%</span>
                        </div>
                        {(prof.draft > 0 || prof.devolvido > 0) && (
                          <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 text-[10px] px-1.5">
                            <Clock className="h-3 w-3" />
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
}
