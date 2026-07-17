import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSchoolsWithCourses } from '@/lib/schoolsWithCourses';
import { notasApi } from '../api';
import { useOrganization } from '@/hooks/useOrganization';
import { CascadingFilterBar } from '@/components/CascadingFilterBar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, School, BookOpen, Calendar, CheckCircle2, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { SubjectNameWithAnp } from '@/components/SubjectNameWithAnp';
import { useAnpSubjectMap } from '@/hooks/useAnpSubjectMap';

interface FilterOption {
  id: string;
  name: string;
}

interface GradeMatrixEntry {
  classGroupId: string;
  classGroupName: string;
  subjects: {
    subjectId: string;
    subjectName: string;
    status: 'none' | 'open' | 'closed';
    professorName: string;
  }[];
}

export function GradesOverviewMatrix() {
  const navigate = useNavigate();
  const { organizationId } = useOrganization();

  const [schools, setSchools] = useState<FilterOption[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [bimesters, setBimesters] = useState<FilterOption[]>([]);
  const [selectedBimester, setSelectedBimester] = useState('');

  const [matrixData, setMatrixData] = useState<GradeMatrixEntry[]>([]);
  const [allSubjects, setAllSubjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const { data: anpMap } = useAnpSubjectMap();

  // Load schools
  useEffect(() => {
    if (!organizationId) return;
    const load = async () => {
      const data = await fetchSchoolsWithCourses<{ id: string; nome: string }>({ organizationId });
      const result = data.map(s => ({ id: s.id, name: s.nome }));
      setSchools(result);
      if (result.length === 1) setSelectedSchool(result[0].id);
    };
    load();
  }, [organizationId]);

  // Load bimesters
  useEffect(() => {
    setBimesters([]); setSelectedBimester('');
    if (!organizationId) return;
    const load = async () => {
      const data = await notasApi.getBimesters(organizationId);
      if (data.length > 0) {
        const result = data.map(b => ({ id: b.id, name: b.name }));
        setBimesters(result);
        // Auto-select current bimester
        const today = new Date().toISOString().split('T')[0];
        const current = data.find(b => today >= b.start_date && today <= b.end_date);
        if (current) setSelectedBimester(String(current.number));
        else setSelectedBimester(result[0].id);
      }
    };
    load();
  }, [organizationId]);

  // Load matrix data
  useEffect(() => {
    if (!selectedSchool || !selectedBimester || !organizationId) {
      setMatrixData([]); setAllSubjects([]);
      return;
    }

    const load = async () => {
      setLoading(true);

      const result = await notasApi.getGradesMatrix({
        schoolId: selectedSchool,
        bimesterNumber: Number(selectedBimester)
      });

      setAllSubjects(result.subjectsList);
      setMatrixData(result.matrix);
      setLoading(false);
    };
    load();
  }, [selectedSchool, selectedBimester, organizationId]);

  // Overall stats
  const stats = useMemo(() => {
    let total = 0, open = 0, closed = 0;
    matrixData.forEach(row => {
      row.subjects.forEach(s => {
        if (s.professorName !== '-') { // only count subjects that have a teacher
          total++;
          if (s.status === 'open') open++;
          if (s.status === 'closed') closed++;
        }
      });
    });
    const pending = total - open - closed;
    const pct = total > 0 ? Math.round(((open + closed) / total) * 100) : 0;
    return { total, open, closed, pending, pct };
  }, [matrixData]);

  return (
    <div className="space-y-4">
      <CascadingFilterBar
        fields={[
          {
            key: 'school', label: 'Escola', icon: School,
            options: schools, value: selectedSchool, onChange: setSelectedSchool,
          },
          {
            key: 'bimester', label: 'Bimestre', icon: Calendar,
            options: bimesters, value: selectedBimester, onChange: setSelectedBimester,
          },
        ]}
      />

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Carregando visão geral...</span>
        </div>
      )}

      {!loading && selectedSchool && selectedBimester && matrixData.length > 0 && (
        <>
          {/* Stats bar */}
          <Card className="shadow-sm border-primary/10">
            <CardContent className="py-3 px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                    <span className="text-muted-foreground">{stats.pending} pendente{stats.pending !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                    <span className="text-muted-foreground">{stats.open} lançada{stats.open !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                    <span className="text-muted-foreground">{stats.closed} fechada{stats.closed !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="sm:ml-auto flex items-center gap-2 min-w-[140px]">
                  <Progress value={stats.pct} className="h-2 flex-1" />
                  <span className="text-xs font-semibold text-muted-foreground w-8 text-right">{stats.pct}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Matrix table */}
          <Card>
            <div className="overflow-x-auto">
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-semibold sticky left-0 bg-muted/30 z-10 min-w-[140px]">Turma</TableHead>
                      {allSubjects.map(s => (
                        <TableHead key={s.id} className="text-xs font-semibold text-center min-w-[80px] max-w-[120px]">
                          <span className="block truncate">
                            <SubjectNameWithAnp name={s.name} isAnp={anpMap?.bySubject.has(s.id)} compact />
                          </span>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matrixData.map(row => {
                      const rowTotal = row.subjects.filter(s => s.professorName !== '-').length;
                      const rowDone = row.subjects.filter(s => s.status === 'open' || s.status === 'closed').length;
                      return (
                        <TableRow key={row.classGroupId} className="hover:bg-muted/20">
                          <TableCell className="font-medium text-sm sticky left-0 bg-background z-10">
                            <div className="flex items-center gap-2">
                              <span className="truncate">{row.classGroupName}</span>
                              <Badge variant="outline" className="text-[10px] px-1 shrink-0">
                                {rowDone}/{rowTotal}
                              </Badge>
                            </div>
                          </TableCell>
                          {row.subjects.map(s => (
                            <TableCell key={s.subjectId} className="text-center p-1">
                              {s.professorName === '-' ? (
                                <span className="text-muted-foreground/30">—</span>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className={`h-8 w-8 p-0 rounded-md ${
                                        s.status === 'closed'
                                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                          : s.status === 'open'
                                            ? 'bg-primary/10 text-primary hover:bg-primary/20'
                                            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                      }`}
                                      onClick={() => navigate(`/notas/lancamento/${row.classGroupId}/${s.subjectId}/${selectedBimester}`)}
                                    >
                                      {s.status === 'closed' ? <Lock className="h-3.5 w-3.5" /> :
                                       s.status === 'open' ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                                       <AlertCircle className="h-3.5 w-3.5" />}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs font-medium">
                                      <SubjectNameWithAnp name={s.subjectName} isAnp={anpMap?.bySubject.has(s.subjectId)} compact />
                                    </p>
                                    <p className="text-xs text-muted-foreground">{s.professorName}</p>
                                    <p className="text-xs">
                                      {s.status === 'closed' ? 'Fechada' : s.status === 'open' ? 'Lançada' : 'Pendente'}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </div>
          </Card>
        </>
      )}

      {!loading && selectedSchool && selectedBimester && matrixData.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma turma encontrada para esta escola.</p>
        </div>
      )}

      {!loading && (!selectedSchool || !selectedBimester) && (
        <div className="text-center py-12 text-muted-foreground">
          <School className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Selecione escola e bimestre para ver a visão geral.</p>
        </div>
      )}
    </div>
  );
}
