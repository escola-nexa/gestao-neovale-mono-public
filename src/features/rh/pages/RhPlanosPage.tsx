import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LayoutDashboard, Plus, Trash2, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { hrApi } from '../api';
import { ApiAdapter } from '@/lib/api-adapter';
import { PERIOD_LABEL, type HrPlanStatus } from '../types';

const STATUS_LABEL: Record<HrPlanStatus, string> = {
  DRAFT: 'Rascunho',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Arquivado',
};
const STATUS_VARIANT: Record<HrPlanStatus, 'secondary' | 'default' | 'outline'> = {
  DRAFT: 'secondary',
  PUBLISHED: 'default',
  ARCHIVED: 'outline',
};

export default function RhPlanosPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const plansQuery = useQuery({ queryKey: ['hr', 'plans'], queryFn: () => hrApi.listPlans() });
  const plans = plansQuery.data ?? [];

  const refIds = useMemo(() => {
    const schools = new Set<string>();
    const courses = new Set<string>();
    plans.forEach((p) => { schools.add(p.school_id); courses.add(p.course_id); });
    return { schools: Array.from(schools), courses: Array.from(courses) };
  }, [plans]);

  const refsQuery = useQuery({
    queryKey: ['hr', 'plan-refs', refIds.schools.join(','), refIds.courses.join(',')],
    enabled: plans.length > 0,
    queryFn: async () => {
      const [schoolsData, coursesData] = await Promise.all([
        hrApi.listSchools(),
        ApiAdapter.cursos.getAll(),
      ]);
      return {
        schools: new Map<string, string>(schoolsData.filter(s => refIds.schools.includes(s.id)).map(s => [s.id, s.nome])),
        courses: new Map<string, string>(coursesData.filter((c: any) => refIds.courses.includes(c.id)).map((c: any) => [c.id, c.nome])),
      };
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => hrApi.deletePlan(id),
    onSuccess: () => { toast.success('Plano excluído'); qc.invalidateQueries({ queryKey: ['hr', 'plans'] }); },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao excluir'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'R.H.', href: '/rh' }, { label: 'Planos de Alocação' }]}
        title="Planos de Alocação"
        description="Rascunhos e planos publicados de alocação de professores por escola, curso e período."
        icon={LayoutDashboard}
        backTo="/rh"
        actions={
          <Button onClick={() => navigate('/rh/demanda')}>
            <Plus className="h-4 w-4 mr-2" />
            Novo plano (a partir da demanda)
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Todos os planos</CardTitle>
          <CardDescription>{plans.length} {plans.length === 1 ? 'plano' : 'planos'} no total.</CardDescription>
        </CardHeader>
        <CardContent>
          {plansQuery.isLoading ? (
            <p className="text-sm text-muted-foreground py-6">Carregando…</p>
          ) : plans.length === 0 ? (
            <div className="text-center py-12">
              <LayoutDashboard className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground mb-4">Nenhum plano de alocação ainda.</p>
              <Button onClick={() => navigate('/rh/demanda')}>
                <Plus className="h-4 w-4 mr-2" /> Criar primeiro plano
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Escola</TableHead>
                    <TableHead>Curso</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Ano</TableHead>
                    <TableHead className="text-center">Turmas</TableHead>
                    <TableHead className="text-center">Teto CH</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[140px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium whitespace-normal break-words">
                        {refsQuery.data?.schools.get(p.school_id) ?? '—'}
                      </TableCell>
                      <TableCell className="whitespace-normal break-words">
                        {refsQuery.data?.courses.get(p.course_id) ?? '—'}
                      </TableCell>
                      <TableCell>{PERIOD_LABEL[p.periodo]}</TableCell>
                      <TableCell>{p.ano_letivo}</TableCell>
                      <TableCell className="text-center">{p.qtd_turmas}</TableCell>
                      <TableCell className="text-center">{p.teto_ch_semanal}h</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button asChild size="sm" variant="ghost">
                            <Link to={`/rh/planos/${p.id}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                          {p.status !== 'PUBLISHED' && (
                            <DeletePlanButton onConfirm={() => deleteMut.mutate(p.id)} />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DeletePlanButton({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação remove o plano e todos os itens vinculados. Não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
