import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, Users, Loader2, GraduationCap, School, ExternalLink } from 'lucide-react';
import { alunosApi } from '@/features/alunos/api';
import { useOrganization } from '@/hooks/useOrganization';
import { PageHeader } from '@/components/PageHeader';

interface SearchResult {
  id: string;
  nome_completo: string;
  codigo_matricula: string;
  email: string | null;
  whatsapp: string | null;
  status: string;
  data_nascimento: string;
  enrollments: {
    school_name: string;
    school_id: string;
    course_name: string;
    class_group_name: string;
    status: string;
  }[];
}

export default function GlobalStudentSearchPage() {
  const { organizationId } = useOrganization();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim() || !organizationId) return;
    setLoading(true);
    setSearched(true);

    const term = `%${searchTerm.trim()}%`;

    const { data: students } = await supabase
      .from('students')
      .select('id, nome_completo, codigo_matricula, email, whatsapp, status, data_nascimento')
      .eq('organization_id', organizationId)
      .or(`nome_completo.ilike.${term},codigo_matricula.ilike.${term},email.ilike.${term}`)
      .order('nome_completo')
      .limit(50);

    if (!students || students.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    // Fetch active enrollments for found students
    const studentIds = students.map(s => s.id);
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`
        student_id, status,
        schools:school_id(id, nome),
        courses:course_id(nome),
        class_groups:class_group_id(nome)
      `)
      .in('student_id', studentIds)
      .eq('status', 'ativa');

    const enrollmentMap = new Map<string, SearchResult['enrollments']>();
    enrollments?.forEach((e: any) => {
      const list = enrollmentMap.get(e.student_id) || [];
      list.push({
        school_name: e.schools?.nome || '',
        school_id: e.schools?.id || '',
        course_name: e.courses?.nome || '',
        class_group_name: e.class_groups?.nome || '',
        status: e.status,
      });
      enrollmentMap.set(e.student_id, list);
    });

    setResults(students.map(s => ({
      ...s,
      enrollments: enrollmentMap.get(s.id) || [],
    })));
    setLoading(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Acadêmico' }, { label: 'Alunos', href: '/alunos' }, { label: 'Buscar Alunos' }]}
        title="Buscar Alunos"
        description="Pesquise alunos por nome, matrícula ou email em todas as escolas."
        icon={Users}
      />

      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Nome, matrícula ou email do aluno..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading || !searchTerm.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="hidden sm:inline ml-2">Buscar</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <Card className="border-dashed border-2 border-muted-foreground/20">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <p className="text-lg font-semibold text-foreground mb-1">Nenhum aluno encontrado</p>
            <p className="text-sm text-muted-foreground">Tente buscar com outros termos.</p>
          </CardContent>
        </Card>
      )}

      {!loading && results.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant="secondary">{results.length}</Badge> aluno{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {/* Desktop */}
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matrícula</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Escola / Turma</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-sm">{s.codigo_matricula}</TableCell>
                      <TableCell className="font-medium">{s.nome_completo}</TableCell>
                      <TableCell>
                        {s.enrollments.length > 0 ? (
                          <div className="space-y-1">
                            {s.enrollments.map((e, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <School className="h-3 w-3 shrink-0" />
                                <span className="truncate">{e.school_name} • {e.class_group_name} • {e.course_name}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem matrícula ativa</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.status === 'ativo' ? 'default' : 'secondary'}>
                          {s.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {s.enrollments.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => navigate(`/escolas/${s.enrollments[0].school_id}/alunos`)}
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Ver na Escola
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <div className="lg:hidden divide-y">
              {results.map(s => (
                <div key={s.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{s.nome_completo}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs font-mono">{s.codigo_matricula}</Badge>
                        <Badge variant={s.status === 'ativo' ? 'default' : 'secondary'} className="text-xs">
                          {s.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {s.enrollments.length > 0 && (
                    <div className="space-y-1">
                      {s.enrollments.map((e, i) => (
                        <p key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                          <School className="h-3 w-3 shrink-0" />
                          {e.school_name} • {e.class_group_name}
                        </p>
                      ))}
                    </div>
                  )}
                  {s.enrollments.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5"
                      onClick={() => navigate(`/escolas/${s.enrollments[0].school_id}/alunos`)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Ver na Escola
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!searched && (
        <Card className="border-dashed border-2 border-muted-foreground/20">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-primary/60" />
            </div>
            <p className="text-lg font-semibold text-foreground mb-1">Pesquise por um aluno</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Digite o nome, código de matrícula ou email para buscar em todas as escolas da organização.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
