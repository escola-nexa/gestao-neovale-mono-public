import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { escolasApi } from '@/features/escolas/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/PageHeader';
import { Loader2, Search, BookOpenCheck, Calendar, Settings2 } from 'lucide-react';

interface SchoolSubject {
  id: string;
  nome: string;
  codigo: string;
  semester: string;
  carga_horaria_semanal: number | null;
  status: string;
}

interface CourseGroup {
  id: string;
  nome: string;
  codigo: string;
  nivel_ensino: string;
  subjects: SchoolSubject[];
}

const semesterLabels: Record<string, string> = {
  FIRST: '1º Semestre',
  SECOND: '2º Semestre',
  ANNUAL: 'Anual',
};

const nivelLabels: Record<string, string> = {
  fundamental_1: 'Fundamental I',
  fundamental_2: 'Fundamental II',
  medio: 'Médio',
  tecnico: 'Técnico',
  eja: 'EJA',
  profissional: 'Profissional',
};

export default function SchoolSubjectsPage() {
  const { schoolId } = useParams<{ schoolId: string }>();
  const navigate = useNavigate();

  const [schoolName, setSchoolName] = useState('');
  const [groups, setGroups] = useState<CourseGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (schoolId) loadData();
  }, [schoolId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [schoolRes, courseLinks] = await Promise.all([
        escolasApi.client.from('schools').select('nome').eq('id', schoolId!).maybeSingle(),
        escolasApi.client.from('course_schools').select('course_id, courses:course_id(id, nome, codigo, nivel_ensino, status)').eq('school_id', schoolId!),
      ]);
      if (schoolRes.data) setSchoolName(schoolRes.data.nome);

      const courses = ((courseLinks.data || []) as any[])
        .map(r => r.courses)
        .filter((c: any) => c)
        .sort((a: any, b: any) => a.nome.localeCompare(b.nome));

      if (courses.length === 0) {
        setGroups([]);
        return;
      }

      const courseIds = courses.map((c: any) => c.id);
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, nome, codigo, semester, carga_horaria_semanal, status, course_id')
        .in('course_id', courseIds)
        .is('deleted_at', null)
        .order('nome');

      const byCourse = new Map<string, SchoolSubject[]>();
      for (const s of (subjects || []) as any[]) {
        const arr = byCourse.get(s.course_id) || [];
        arr.push({
          id: s.id,
          nome: s.nome,
          codigo: s.codigo,
          semester: s.semester,
          carga_horaria_semanal: s.carga_horaria_semanal,
          status: s.status,
        });
        byCourse.set(s.course_id, arr);
      }

      setGroups(courses.map((c: any) => ({
        id: c.id,
        nome: c.nome,
        codigo: c.codigo,
        nivel_ensino: c.nivel_ensino,
        subjects: byCourse.get(c.id) || [],
      })));
    } catch (error) {
      console.error('Erro ao carregar disciplinas da escola:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups
      .map(g => ({
        ...g,
        subjects: g.subjects.filter(s =>
          s.nome.toLowerCase().includes(q) ||
          s.codigo.toLowerCase().includes(q) ||
          g.nome.toLowerCase().includes(q)
        ),
      }))
      .filter(g => g.subjects.length > 0 || g.nome.toLowerCase().includes(q));
  }, [groups, search]);

  const totalSubjects = groups.reduce((acc, g) => acc + g.subjects.length, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Escolas', href: '/escolas' },
          { label: schoolName || 'Escola', href: `/escolas/${schoolId}` },
          { label: 'Disciplinas' },
        ]}
        title="Disciplinas da Escola"
        description={`${schoolName} · ${totalSubjects} disciplina${totalSubjects !== 1 ? 's' : ''} em ${groups.length} curso${groups.length !== 1 ? 's' : ''}`}
        backTo={`/escolas/${schoolId}`}
      />

      <Card>
        <CardHeader>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar disciplina ou curso..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpenCheck className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nenhum curso vinculado a esta escola</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate(`/escolas/${schoolId}/cursos`)}>
                Vincular cursos
              </Button>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Nenhuma disciplina encontrada para "{search}"
            </div>
          ) : (
            <div className="space-y-6">
              {filteredGroups.map(group => (
                <div key={group.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold">{group.nome}</h3>
                      <Badge variant="outline" className="font-mono text-xs">{group.codigo}</Badge>
                      <Badge variant="secondary" className="text-xs">{nivelLabels[group.nivel_ensino] || group.nivel_ensino}</Badge>
                      <span className="text-xs text-muted-foreground">
                        · {group.subjects.length} disciplina{group.subjects.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/cursos/${group.id}/disciplinas`, { state: { fromSchool: schoolId, schoolName } })}
                    >
                      <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Gerenciar disciplinas
                    </Button>
                  </div>

                  {group.subjects.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic px-3 py-3 border border-dashed rounded-md">
                      Nenhuma disciplina cadastrada para este curso ainda.
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Período</TableHead>
                            <TableHead>Carga Horária</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.subjects.map(s => (
                            <TableRow key={s.id}>
                              <TableCell className="font-mono text-muted-foreground text-xs">{s.codigo}</TableCell>
                              <TableCell className="font-medium">{s.nome}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{semesterLabels[s.semester] || s.semester}</Badge>
                              </TableCell>
                              <TableCell className="text-sm">{s.carga_horaria_semanal ? `${s.carga_horaria_semanal}h/sem` : '—'}</TableCell>
                              <TableCell>
                                <Badge variant={s.status === 'ativo' ? 'default' : 'secondary'} className="text-xs">
                                  {s.status === 'ativo' ? 'Ativo' : 'Inativo'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/disciplinas/${s.id}/calendario-semanal`)}
                                  title="Calendário semanal"
                                >
                                  <Calendar className="h-3.5 w-3.5 mr-1.5" /> Calendário
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
