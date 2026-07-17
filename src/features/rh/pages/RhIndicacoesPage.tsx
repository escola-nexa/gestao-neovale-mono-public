import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, Check, X, Trash2, Mail, Phone, School as SchoolIcon, UserPlus,
  ExternalLink, Search, Filter, ArrowRight,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { hrApi } from '../api';
import { PERIOD_LABEL } from '../types';

type Status = 'PENDENTE' | 'EM_ANALISE' | 'APROVADA' | 'ALOCADA' | 'CONVERTIDA' | 'RECUSADA';

const COLUMNS: { key: Status; label: string; tone: string }[] = [
  { key: 'PENDENTE', label: 'Pendentes', tone: 'border-amber-300' },
  { key: 'EM_ANALISE', label: 'Em análise', tone: 'border-sky-300' },
  { key: 'APROVADA', label: 'Aprovadas', tone: 'border-emerald-300' },
  { key: 'ALOCADA', label: 'Alocadas', tone: 'border-primary/40' },
  { key: 'CONVERTIDA', label: 'Convertidas', tone: 'border-violet-300' },
  { key: 'RECUSADA', label: 'Recusadas', tone: 'border-destructive/40' },
];

export default function RhIndicacoesPage() {
  const qc = useQueryClient();
  const [schoolFilter, setSchoolFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [search, setSearch] = useState('');

  const schoolsQuery = useQuery({
    queryKey: ['rh-ind', 'schools'],
    queryFn: async () => {
      return hrApi.listSchools();
    },
  });
  const coursesQuery = useQuery({
    queryKey: ['rh-ind', 'courses', schoolFilter],
    enabled: !!schoolFilter,
    queryFn: async () => {
      return hrApi.listCoursesBySchool(schoolFilter);
    },
  });

  const listQuery = useQuery({
    queryKey: ['rh-ind', 'all', schoolFilter, courseFilter],
    queryFn: () =>
      hrApi.listIndicationsByContext({
        school_id: schoolFilter || undefined,
        course_id: courseFilter || undefined,
      }),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status, motivo }: { id: string; status: Status; motivo?: string }) =>
      hrApi.setIndicationStatus(id, status, motivo),
    onSuccess: () => {
      toast.success('Status atualizado');
      qc.invalidateQueries({ queryKey: ['rh-ind', 'all'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro'),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await hrApi.deleteIndication(id);
    },
    onSuccess: () => {
      toast.success('Indicação removida');
      qc.invalidateQueries({ queryKey: ['rh-ind', 'all'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro'),
  });

  const convertMut = useMutation({
    mutationFn: (id: string) => hrApi.convertIndicationToTalent(id),
    onSuccess: () => {
      toast.success('Indicação convertida em candidato');
      qc.invalidateQueries({ queryKey: ['rh-ind', 'all'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao converter'),
  });

  const items = listQuery.data ?? [];
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term
      ? items.filter((i: any) =>
          (i.candidato_nome ?? '').toLowerCase().includes(term) ||
          (i.indicado_por_nome ?? '').toLowerCase().includes(term))
      : items;
  }, [items, search]);

  const grouped = useMemo(() => {
    const m: Record<Status, any[]> = {
      PENDENTE: [], EM_ANALISE: [], APROVADA: [], ALOCADA: [], CONVERTIDA: [], RECUSADA: [],
    };
    filtered.forEach((i: any) => {
      const s = (i.status as Status) ?? 'PENDENTE';
      if (m[s]) m[s].push(i);
    });
    return m;
  }, [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'R.H.', href: '/rh' }, { label: 'Indicações das Escolas' }]}
        title="Indicações das Escolas"
        description="Fila de candidatos enviados pelos diretores via portal externo. Mova entre colunas, atribua a vagas e converta para o Banco de Talentos."
        icon={Inbox}
        backTo="/rh"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/rh/alocacao"><ArrowRight className="h-4 w-4 mr-1" /> Ir para Alocação</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Filter className="h-4 w-4" /> Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Escola</Label>
              <SearchableSelect
                value={schoolFilter}
                onValueChange={(v) => { setSchoolFilter(v); setCourseFilter(''); }}
                options={(schoolsQuery.data ?? []).map((s) => ({ value: s.id, label: s.nome }))}
                placeholder="Todas as escolas"
                searchPlaceholder="Buscar..."
                emptyMessage="Nenhuma escola"
                allowClear
              />
            </div>
            <div>
              <Label>Curso</Label>
              <SearchableSelect
                value={courseFilter}
                onValueChange={setCourseFilter}
                options={(coursesQuery.data ?? []).map((c) => ({ value: c.id, label: c.nome }))}
                placeholder={schoolFilter ? 'Todos os cursos' : 'Escolha a escola antes'}
                searchPlaceholder="Buscar..."
                emptyMessage="Nenhum curso"
                disabled={!schoolFilter}
                allowClear
              />
            </div>
            <div>
              <Label>Buscar candidato</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Nome do candidato ou indicador" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        {COLUMNS.map((col) => (
          <Card key={col.key} className={`border-t-4 ${col.tone}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                {col.label}
                <Badge variant="secondary">{grouped[col.key].length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[70vh] overflow-y-auto">
              {grouped[col.key].length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">—</p>
              ) : (
                grouped[col.key].map((it: any) => (
                  <IndicationCard
                    key={it.id}
                    item={it}
                    onSetStatus={(status, motivo) => setStatus.mutate({ id: it.id, status, motivo })}
                    onDelete={() => deleteMut.mutate(it.id)}
                    onConvert={() => convertMut.mutate(it.id)}
                    isPending={setStatus.isPending || convertMut.isPending}
                  />
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function IndicationCard({
  item, onSetStatus, onDelete, onConvert, isPending,
}: {
  item: any;
  onSetStatus: (status: Status, motivo?: string) => void;
  onDelete: () => void;
  onConvert: () => void;
  isPending: boolean;
}) {
  const [motivo, setMotivo] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const status = item.status as Status;

  return (
    <div className="border rounded-md p-3 bg-card text-sm space-y-2">
      <div>
        <div className="font-medium leading-tight">{item.candidato_nome}</div>
        <div className="text-[11px] text-muted-foreground">
          Indicado por {item.indicado_por_nome}
          {item.indicado_por_cargo ? ` (${item.indicado_por_cargo})` : ''}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {item.created_at ? format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '—'}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 text-[10px]">
        {item.schools?.nome && (
          <Badge variant="outline" className="gap-1 text-[10px]">
            <SchoolIcon className="h-3 w-3" />{item.schools.nome}
          </Badge>
        )}
        {item.courses?.nome && <Badge variant="outline" className="text-[10px]">{item.courses.nome}</Badge>}
        {item.periodo && PERIOD_LABEL[item.periodo as keyof typeof PERIOD_LABEL] && <Badge variant="outline" className="text-[10px]">{PERIOD_LABEL[item.periodo as keyof typeof PERIOD_LABEL]}</Badge>}
        {item.indication_class?.nome && (
          <Badge variant="outline" className="text-[10px]">
            Turma {item.indication_class.nome}
            {item.indication_class.turno ? ` · ${item.indication_class.turno}` : ''}
          </Badge>
        )}
      </div>

      {item.candidato_disciplinas && (
        <p className="text-xs"><span className="text-muted-foreground">Função:</span> {item.candidato_disciplinas}</p>
      )}
      {(item as any).candidato_formacao && (
        <p className="text-xs"><span className="text-muted-foreground">Formação:</span> {(item as any).candidato_formacao}</p>
      )}
      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        {item.candidato_email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{item.candidato_email}</span>}
        {item.candidato_telefone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{item.candidato_telefone}</span>}
      </div>

      {item.motivo_recusa && (
        <p className="text-[11px] bg-destructive/10 text-destructive rounded p-2">
          <strong>Motivo:</strong> {item.motivo_recusa}
        </p>
      )}

      {/* Ações por status */}
      <div className="pt-2 flex flex-wrap gap-1 border-t">
        {status === 'PENDENTE' && (
          <>
            <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => onSetStatus('EM_ANALISE')} disabled={isPending}>
              Analisar
            </Button>
            <Button size="sm" className="h-7 text-xs flex-1" onClick={() => onSetStatus('APROVADA')} disabled={isPending}>
              <Check className="h-3 w-3 mr-1" /> Aprovar
            </Button>
          </>
        )}
        {status === 'EM_ANALISE' && (
          <>
            <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => onSetStatus('PENDENTE')} disabled={isPending}>
              Voltar
            </Button>
            <Button size="sm" className="h-7 text-xs flex-1" onClick={() => onSetStatus('APROVADA')} disabled={isPending}>
              <Check className="h-3 w-3 mr-1" /> Aprovar
            </Button>
          </>
        )}
        {status === 'APROVADA' && (
          <>
            <Button size="sm" className="h-7 text-xs flex-1" onClick={onConvert} disabled={isPending}>
              <UserPlus className="h-3 w-3 mr-1" /> Banco
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs flex-1" asChild>
              <Link to={`/rh/alocacao?schoolId=${item.school_id}${item.course_id ? `&courseId=${item.course_id}` : ''}`}>
                Atribuir vaga
              </Link>
            </Button>
          </>
        )}
        {status === 'CONVERTIDA' && (
          <Button size="sm" variant="outline" className="h-7 text-xs w-full" asChild>
            <Link to="/banco-talentos"><ExternalLink className="h-3 w-3 mr-1" /> Banco de Talentos</Link>
          </Button>
        )}
        {status === 'ALOCADA' && (
          <Badge variant="default" className="text-[10px] w-full justify-center py-1">
            <Check className="h-3 w-3 mr-1" /> Atribuído à vaga
          </Badge>
        )}

        {(status === 'PENDENTE' || status === 'EM_ANALISE' || status === 'APROVADA') && (
          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive">
                <X className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Recusar indicação</DialogTitle>
                <DialogDescription>Informe o motivo.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label>Motivo *</Label>
                <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={4} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancelar</Button>
                <Button
                  variant="destructive"
                  disabled={!motivo.trim()}
                  onClick={() => { onSetStatus('RECUSADA', motivo); setRejectOpen(false); setMotivo(''); }}
                >
                  Recusar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground">
              <Trash2 className="h-3 w-3" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir indicação?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
