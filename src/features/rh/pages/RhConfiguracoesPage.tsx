import { useEffect, useMemo, useState } from 'react';
import { Settings, Save, RotateCcw, Search } from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

import { hrApi } from '../api';
import { classifyUCP, UCP_LABELS, UCP_COLORS, type UcpType } from '../lib/classifyUCP';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface SubjectRow {
  id: string;
  nome: string;
  course_nome: string;
  carga_horaria_semanal: number;
}

const UCP_OPTIONS: UcpType[] = ['UCP1', 'UCP2', 'UCP3', 'PEDAGOGICA', 'OUTRA'];

export default function RhConfiguracoesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  // Settings local state
  const [tetoCh, setTetoCh] = useState(24);
  const [u1, setU1] = useState(2);
  const [u2, setU2] = useState(4);
  const [u3, setU3] = useState(2);
  const [up, setUp] = useState(2);

  const settingsQuery = useQuery({
    queryKey: ['hr', 'settings'],
    queryFn: () => hrApi.getSettings(),
  });

  useEffect(() => {
    const s = settingsQuery.data;
    if (!s) return;
    setTetoCh(s.teto_ch_semanal);
    setU1(s.default_ucp1_aulas);
    setU2(s.default_ucp2_aulas);
    setU3(s.default_ucp3_aulas);
    setUp(s.default_pedagogica_aulas);
  }, [settingsQuery.data]);

  const subjectsQuery = useQuery({
    queryKey: ['hr', 'subjects-all'],
    queryFn: () => hrApi.listAllSubjects(),
  });

  const overridesQuery = useQuery({
    queryKey: ['hr', 'overrides'],
    queryFn: () => hrApi.listOverrides(),
  });

  const overridesMap = useMemo(() => {
    const m = new Map<string, UcpType>();
    for (const o of overridesQuery.data ?? []) m.set(o.subject_id, o.ucp_type);
    return m;
  }, [overridesQuery.data]);

  const saveSettingsMutation = useMutation({
    mutationFn: () =>
      hrApi.upsertSettings({
        teto_ch_semanal: tetoCh,
        default_ucp1_aulas: u1,
        default_ucp2_aulas: u2,
        default_ucp3_aulas: u3,
        default_pedagogica_aulas: up,
      }),
    onSuccess: () => {
      toast({ title: 'Configurações salvas', description: 'Defaults aplicados aos novos planos.' });
      qc.invalidateQueries({ queryKey: ['hr', 'settings'] });
    },
    onError: (e: any) => toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' }),
  });

  const setOverrideMutation = useMutation({
    mutationFn: ({ subjectId, ucp }: { subjectId: string; ucp: UcpType | null }) =>
      ucp === null ? hrApi.clearOverride(subjectId) : hrApi.setOverride(subjectId, ucp),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'overrides'] });
      toast({ title: 'Classificação atualizada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const filteredSubjects = useMemo(() => {
    const s = (subjectsQuery.data ?? []).filter(
      (r) =>
        !search ||
        r.nome.toLowerCase().includes(search.toLowerCase()) ||
        r.course_nome.toLowerCase().includes(search.toLowerCase()),
    );
    return s;
  }, [subjectsQuery.data, search]);

  if (user?.perfil !== 'admin') {
    return <Navigate to="/rh" replace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'R.H.', href: '/rh' }, { label: 'Configurações' }]}
        title="Configurações do R.H."
        description="Teto de carga horária semanal, defaults UCP e sobrescritas de classificação."
        icon={Settings}
        backTo="/rh"
      />

      <Card>
        <CardHeader>
          <CardTitle>Parâmetros gerais</CardTitle>
          <CardDescription>
            Aplicados como default em novos planos de alocação. Cada plano pode ajustar o teto individualmente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="teto">Teto CH semanal</Label>
              <Input id="teto" type="number" min={1} max={60} value={tetoCh} onChange={(e) => setTetoCh(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground mt-1">horas/semana por professor</p>
            </div>
            <div>
              <Label htmlFor="u1">UCP I (default)</Label>
              <Input id="u1" type="number" min={0} value={u1} onChange={(e) => setU1(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground mt-1">aulas/semana por turma</p>
            </div>
            <div>
              <Label htmlFor="u2">UCP II (default)</Label>
              <Input id="u2" type="number" min={0} value={u2} onChange={(e) => setU2(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground mt-1">aulas/semana por turma</p>
            </div>
            <div>
              <Label htmlFor="u3">UCP III (default)</Label>
              <Input id="u3" type="number" min={0} value={u3} onChange={(e) => setU3(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground mt-1">aulas/semana por turma</p>
            </div>
            <div>
              <Label htmlFor="up">Pedagógica (default)</Label>
              <Input id="up" type="number" min={0} value={up} onChange={(e) => setUp(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground mt-1">aulas/semana por turma</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => saveSettingsMutation.mutate()} disabled={saveSettingsMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Salvar parâmetros
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Observação: a CH real considerada para cálculo é sempre a do cadastro da disciplina (<code className="bg-muted px-1 rounded">subjects.carga_horaria_semanal</code>). Os defaults aqui só preenchem o wizard quando você cria uma UCP nova.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Classificação UCP por disciplina</CardTitle>
          <CardDescription>
            A classificação é automática pelo nome (<code className="bg-muted px-1 rounded">UCP I / UCP II / UCP III / Pedagógica</code>). Sobrescreva aqui apenas exceções.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por disciplina ou curso…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Disciplina</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead className="text-center">CH semanal</TableHead>
                  <TableHead>Auto</TableHead>
                  <TableHead className="w-[200px]">Classificação</TableHead>
                  <TableHead className="text-right w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjectsQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Carregando…
                    </TableCell>
                  </TableRow>
                )}
                {!subjectsQuery.isLoading && filteredSubjects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma disciplina encontrada.
                    </TableCell>
                  </TableRow>
                )}
                {filteredSubjects.map((s) => {
                  const auto = classifyUCP(s.nome);
                  const override = overridesMap.get(s.id);
                  const effective = override ?? auto;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium whitespace-normal break-words">{s.nome}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{s.course_nome}</TableCell>
                      <TableCell className="text-center">{s.carga_horaria_semanal}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${UCP_COLORS[auto]}`}>
                          {UCP_LABELS[auto]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={effective}
                          onValueChange={(v) => setOverrideMutation.mutate({ subjectId: s.id, ucp: v as UcpType })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UCP_OPTIONS.map((o) => (
                              <SelectItem key={o} value={o}>
                                {UCP_LABELS[o]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        {override && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setOverrideMutation.mutate({ subjectId: s.id, ucp: null })}
                            title="Remover sobrescrita (voltar ao automático)"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
