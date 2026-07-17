import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LayoutDashboard, Send, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

import { ApiAdapter } from '@/lib/api-adapter';
import { hrApi } from '../api';
import { UCP_LABELS, UCP_COLORS } from '../lib/classifyUCP';
import { PERIOD_LABEL } from '../types';

const WEEKDAYS = [
  { value: 'SEGUNDA', label: 'Segunda' },
  { value: 'TERCA', label: 'Terça' },
  { value: 'QUARTA', label: 'Quarta' },
  { value: 'QUINTA', label: 'Quinta' },
  { value: 'SEXTA', label: 'Sexta' },
  { value: 'SABADO', label: 'Sábado' },
];

export default function RhPlanoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const planQuery = useQuery({
    queryKey: ['hr', 'plan', id],
    enabled: !!id,
    queryFn: () => hrApi.getPlan(id!),
  });
  const plan = planQuery.data;

  const itemsQuery = useQuery({
    queryKey: ['hr', 'plan', id, 'items'],
    enabled: !!id,
    queryFn: () => hrApi.listItems(id!),
  });
  const items = itemsQuery.data ?? [];

  const profsQuery = useQuery({
    queryKey: ['hr', 'plan', id, 'eligible-professors'],
    enabled: !!plan,
    queryFn: () => hrApi.listEligibleProfessors(plan!.school_id, plan!.course_id),
  });

  const subjectIds = useMemo(() => Array.from(new Set(items.map((i) => i.subject_id))), [items]);
  const slotsQuery = useQuery({
    queryKey: ['hr', 'plan', id, 'slots'],
    enabled: !!plan,
    queryFn: async (): Promise<Array<{ id: string; slot_number: number; slot_label: string; start_time: string; end_time: string; weekday: string }>> => {
      const data = await hrApi.listTimeSlots(plan!.school_id);
      return data;
    },
  });
  const subjectsQuery = useQuery({
    queryKey: ['hr', 'plan', id, 'subjects', plan?.course_id],
    enabled: !!plan?.course_id,
    queryFn: async () => {
      const data = await hrApi.listSubjects(plan!.course_id);
      return new Map(data.map((s) => [s.id, s.nome]));
    },
  });
  const refsQuery = useQuery({
    queryKey: ['hr', 'plan', id, 'refs', plan?.school_id, plan?.course_id],
    enabled: !!plan,
    queryFn: async () => {
      const [school, course] = await Promise.all([
        ApiAdapter.escolas.getById(plan!.school_id),
        ApiAdapter.cursos.getById(plan!.course_id),
      ]);
      return { schoolNome: school?.nome ?? '—', courseNome: course?.nome ?? '—' };
    },
  });

  const updateItemMut = useMutation({
    mutationFn: ({ itemId, patch }: { itemId: string; patch: any }) => hrApi.updateItem(itemId, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr', 'plan', id, 'items'] }),
    onError: (e: any) => toast.error(e.message ?? 'Erro ao salvar'),
  });

  const publishMut = useMutation({
    mutationFn: () => hrApi.publishToGrade(id!),
    onSuccess: (r) => {
      toast.success(`Plano publicado: ${r.published} aulas na grade${r.skipped ? `, ${r.skipped} pulados (faltam dados)` : ''}.`);
      qc.invalidateQueries({ queryKey: ['hr', 'plan', id] });
      qc.invalidateQueries({ queryKey: ['hr', 'plan', id, 'items'] });
      qc.invalidateQueries({ queryKey: ['hr', 'plans'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao publicar'),
  });

  if (planQuery.isLoading) return <p className="p-6 text-sm text-muted-foreground">Carregando…</p>;
  if (!plan) return <p className="p-6 text-sm text-muted-foreground">Plano não encontrado.</p>;

  const profOptions = (profsQuery.data ?? []).map((p) => ({ value: p.id, label: p.nome_completo }));
  const totalReady = items.filter((i) => i.professor_id && i.weekday && i.school_time_slot_id).length;
  const isPublished = plan.status === 'PUBLISHED';

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'R.H.', href: '/rh' },
          { label: 'Planos', href: '/rh/planos' },
          { label: refsQuery.data?.schoolNome ?? '...' },
        ]}
        title={`${refsQuery.data?.courseNome ?? 'Plano'} — ${PERIOD_LABEL[plan.periodo]}`}
        description={`${refsQuery.data?.schoolNome ?? ''} · ${plan.qtd_turmas} turma(s) · Teto ${plan.teto_ch_semanal}h/semana · Ano ${plan.ano_letivo}`}
        icon={LayoutDashboard}
        backTo="/rh/planos"
        actions={
          !isPublished ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={totalReady === 0 || publishMut.isPending}>
                  {publishMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Publicar na grade ({totalReady}/{items.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Publicar plano na grade horária?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Apenas itens com professor, dia da semana e horário definidos serão publicados.
                    {totalReady < items.length && (
                      <span className="block mt-2 text-amber-600">
                        {items.length - totalReady} {items.length - totalReady === 1 ? 'item ficará' : 'itens ficarão'} de fora.
                      </span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => publishMut.mutate()}>Publicar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Publicado</Badge>
          )
        }
      />

      {totalReady < items.length && !isPublished && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="py-3 flex items-start gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Atribua <strong>professor</strong>, <strong>dia da semana</strong> e <strong>horário</strong> em todos os itens antes de publicar na grade.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Itens do plano</CardTitle>
          <CardDescription>Edite as atribuições. Mudanças são salvas automaticamente.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>UCP</TableHead>
                  <TableHead>Disciplina</TableHead>
                  <TableHead>Vaga</TableHead>
                  <TableHead className="text-center">CH</TableHead>
                  <TableHead className="min-w-[220px]">Professor</TableHead>
                  <TableHead className="min-w-[140px]">Dia</TableHead>
                  <TableHead className="min-w-[180px]">Horário</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${UCP_COLORS[it.ucp_type]}`}>
                        {UCP_LABELS[it.ucp_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium whitespace-normal break-words">
                      {subjectsQuery.data?.get(it.subject_id) ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{it.vaga_label ?? '—'}</TableCell>
                    <TableCell className="text-center">{it.aulas}h</TableCell>
                    <TableCell>
                      <SearchableSelect
                        value={it.professor_id ?? ''}
                        onValueChange={(v) => updateItemMut.mutate({ itemId: it.id, patch: { professor_id: v || null } })}
                        options={profOptions}
                        placeholder="Selecione…"
                        searchPlaceholder="Buscar professor..."
                        emptyMessage="Nenhum vinculado"
                        disabled={isPublished}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={it.weekday ?? ''}
                        onValueChange={(v) => updateItemMut.mutate({ itemId: it.id, patch: { weekday: v } })}
                        disabled={isPublished}
                      >
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {WEEKDAYS.map((w) => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={it.school_time_slot_id ?? ''}
                        onValueChange={(v) => updateItemMut.mutate({ itemId: it.id, patch: { school_time_slot_id: v } })}
                        disabled={isPublished}
                      >
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {(slotsQuery.data ?? [])
                            .filter((s: any) => !it.weekday || s.weekday === it.weekday)
                            .map((s: any) => (
                              <SelectItem key={s.id} value={s.id}>
                                {String(s.start_time).slice(0, 5)} – {String(s.end_time).slice(0, 5)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={it.status === 'PUBLICADO' ? 'default' : 'secondary'} className="text-xs">
                        {it.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhum item neste plano.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
