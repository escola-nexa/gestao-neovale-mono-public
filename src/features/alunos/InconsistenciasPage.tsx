import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Download, Loader2, Search, ExternalLink, FileWarning } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useStudentDuplicates, DuplicateGroup, StudentDuplicateRow } from './hooks/useStudentDuplicates';
import { useStudentImportConflicts, ImportConflictRow } from './hooks/useStudentImportConflicts';
import { maskCPF } from './utils/cpf';

function exportCsv(groups: DuplicateGroup[]) {
  const head = 'tipo;valor;aluno;codigo_matricula;cpf;status;escolas;criado_em';
  const rows: string[] = [head];
  for (const g of groups) {
    for (const a of g.alunos) {
      const escolas = a.schools.map(s => s.nome).join(' | ');
      rows.push([
        g.tipo,
        g.valor,
        a.nome_completo.replace(/;/g, ','),
        a.codigo_matricula ?? '',
        a.cpf ?? '',
        a.status,
        escolas.replace(/;/g, ','),
        new Date(a.created_at).toLocaleString('pt-BR'),
      ].join(';'));
    }
  }
  const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'inconsistencias_alunos.csv'; a.click();
  URL.revokeObjectURL(url);
}

function GroupCard({ group }: { group: DuplicateGroup }) {
  const valorDisplay = group.tipo === 'cpf' ? maskCPF(group.valor) : group.valor;
  return (
    <Card className="border-amber-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-900">
                {group.tipo === 'matricula' ? 'Matrícula duplicada' : 'CPF duplicado'}
              </Badge>
              <code className="rounded bg-muted px-2 py-0.5 text-sm font-medium">{valorDisplay}</code>
            </div>
            <p className="text-xs text-muted-foreground">{group.alunos.length} alunos compartilham este valor</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y rounded-md border">
          {group.alunos.map((a: StudentDuplicateRow) => {
            const firstSchool = a.schools[0];
            return (
              <div key={a.student_id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{a.nome_completo}</span>
                    <Badge variant={a.status === 'ativo' ? 'default' : 'secondary'} className="text-[10px]">
                      {a.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Matrícula: <span className="font-mono">{a.codigo_matricula || '—'}</span>
                    {a.cpf && <> · CPF: <span className="font-mono">{maskCPF(a.cpf)}</span></>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.schools.length
                      ? <>Escolas: {a.schools.map(s => s.nome).join(', ')}</>
                      : <span className="italic">Sem matrícula ativa</span>}
                  </p>
                </div>
                {firstSchool && (
                  <Button asChild size="sm" variant="ghost">
                    <Link to={`/escolas/${firstSchool.id}/alunos?busca=${encodeURIComponent(a.codigo_matricula || a.nome_completo)}`}>
                      Abrir cadastro <ExternalLink className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function InconsistenciasPage() {
  const [searchParams] = useSearchParams();
  const escolaFilter = searchParams.get('escola') || '';
  const { data, isLoading, error } = useStudentDuplicates();
  const { data: conflicts, isLoading: loadingConflicts } = useStudentImportConflicts();
  const [search, setSearch] = useState('');

  const filterGroups = (groups: DuplicateGroup[]) => {
    const s = search.trim().toLowerCase();
    return groups.filter(g => {
      if (escolaFilter && !g.alunos.some(a => a.schools.some(sc => sc.id === escolaFilter))) return false;
      if (!s) return true;
      if (g.valor.toLowerCase().includes(s)) return true;
      return g.alunos.some(a =>
        a.nome_completo.toLowerCase().includes(s) ||
        (a.codigo_matricula || '').toLowerCase().includes(s) ||
        (a.cpf || '').toLowerCase().includes(s),
      );
    });
  };

  const matriculaGroups = useMemo(() => filterGroups(data?.matriculaGroups || []), [data, search, escolaFilter]);
  const cpfGroups = useMemo(() => filterGroups(data?.cpfGroups || []), [data, search, escolaFilter]);
  const filteredConflicts = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (conflicts || []).filter(c => {
      if (escolaFilter && !c.existing_schools.some(sc => sc.id === escolaFilter)) return false;
      if (!s) return true;
      return (
        (c.attempted_name || '').toLowerCase().includes(s) ||
        (c.attempted_matricula || '').toLowerCase().includes(s) ||
        (c.existing_name || '').toLowerCase().includes(s) ||
        (c.existing_matricula || '').toLowerCase().includes(s)
      );
    });
  }, [conflicts, search, escolaFilter]);
  const totalAlunos = (data?.affectedStudents.size) || 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Alunos', href: '/alunos' }, { label: 'Inconsistências' }]}
        title="Inconsistências de alunos"
        description="Alunos com mesmo Código de Matrícula ou CPF dentro da organização"
        icon={FileWarning}
        actions={
          <Button variant="outline" size="sm" disabled={!data} onClick={() => data && exportCsv([...matriculaGroups, ...cpfGroups])}>
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
        }
      />

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Página somente leitura</AlertTitle>
        <AlertDescription>
          Esta tela apenas exibe os registros conflitantes. Para corrigir, abra o cadastro do aluno e edite, inative
          ou ajuste a matrícula pelos fluxos normais. As regras de negócio e validações não foram alteradas.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Matrículas duplicadas</p><p className="text-2xl font-semibold">{data?.matriculaGroups.length ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">CPFs duplicados</p><p className="text-2xl font-semibold">{data?.cpfGroups.length ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Alunos afetados</p><p className="text-2xl font-semibold">{totalAlunos}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Importações rejeitadas</p><p className="text-2xl font-semibold">{conflicts?.length ?? 0}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="sr-only">Lista de inconsistências</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por matrícula, CPF ou nome..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : error ? (
            <p className="text-sm text-destructive">Erro ao carregar inconsistências.</p>
          ) : (
            <Tabs defaultValue="matricula">
              <TabsList>
                <TabsTrigger value="matricula">Matrícula ({matriculaGroups.length})</TabsTrigger>
                <TabsTrigger value="cpf">CPF ({cpfGroups.length})</TabsTrigger>
                <TabsTrigger value="import">Importação ({filteredConflicts.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="matricula" className="space-y-3 pt-4">
                {matriculaGroups.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma matrícula duplicada encontrada.</p>
                ) : matriculaGroups.map(g => <GroupCard key={`m-${g.valor}`} group={g} />)}
              </TabsContent>
              <TabsContent value="cpf" className="space-y-3 pt-4">
                {cpfGroups.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nenhum CPF duplicado encontrado.</p>
                ) : cpfGroups.map(g => <GroupCard key={`c-${g.valor}`} group={g} />)}
              </TabsContent>
              <TabsContent value="import" className="space-y-3 pt-4">
                {loadingConflicts ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : filteredConflicts.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma tentativa de importação duplicada encontrada.</p>
                ) : filteredConflicts.map((c, i) => <ImportConflictCard key={`${c.batch_id}-${c.row_number}-${i}`} c={c} />)}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ImportConflictCard({ c }: { c: ImportConflictRow }) {
  const firstSchool = c.existing_schools[0];
  return (
    <Card className="border-amber-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-900">
                Importação rejeitada
              </Badge>
              <code className="rounded bg-muted px-2 py-0.5 text-sm font-medium">
                Matrícula {c.attempted_matricula || '—'}
              </code>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(c.attempted_at).toLocaleString('pt-BR')} · Linha {c.row_number}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-xs font-semibold uppercase text-destructive">Tentativa bloqueada</p>
          <p className="text-sm font-medium">{c.attempted_name || '—'}</p>
          <p className="mt-1 text-xs text-muted-foreground break-words">{c.error_message}</p>
        </div>
        {c.existing_student_id ? (
          <div className="rounded-md border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Aluno já cadastrado</p>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.existing_name}</span>
                  <Badge variant={c.existing_status === 'ativo' ? 'default' : 'secondary'} className="text-[10px]">
                    {c.existing_status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Matrícula: <span className="font-mono">{c.existing_matricula || '—'}</span>
                  {c.existing_cpf && <> · CPF: <span className="font-mono">{maskCPF(c.existing_cpf)}</span></>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.existing_schools.length
                    ? <>Escolas: {c.existing_schools.map(s => s.nome).join(', ')}</>
                    : <span className="italic">Sem matrícula ativa</span>}
                </p>
              </div>
              {firstSchool && (
                <Button asChild size="sm" variant="ghost">
                  <Link to={`/escolas/${firstSchool.id}/alunos?busca=${encodeURIComponent(c.existing_matricula || c.existing_name || '')}`}>
                    Abrir cadastro <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs italic text-muted-foreground">
            Nenhum aluno com essa matrícula foi encontrado no banco (pode ter sido excluído depois da tentativa).
          </p>
        )}
      </CardContent>
    </Card>
  );
}
