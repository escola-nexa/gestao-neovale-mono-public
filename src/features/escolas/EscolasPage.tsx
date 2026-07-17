import { Fragment, useState, useEffect, useMemo } from 'react';
import { SchoolData } from '@/services/supabaseApi';
import { ApiAdapter } from '@/lib/api-adapter';
import { escolasApi } from '@/features/escolas/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, Loader2, Clock, Eye, FileUp, MoreHorizontal, LogIn, AlertTriangle, Settings, Users, MapPin, ShieldAlert, FileSpreadsheet, ChevronRight, ChevronDown } from 'lucide-react';
import FeatureGuideCard from '@/components/FeatureGuideCard';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { SchoolFormDialog } from './components/SchoolFormDialog';
import { SchoolViewDialog } from './components/SchoolViewDialog';
import { SchoolImportDialog } from './components/SchoolImportDialog';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';

interface SchoolSetupStatus {
  hasSlots: boolean;
  hasClassGroups: boolean;
  hasProfessors: boolean;
}

export default function EscolasPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'admin';
  const [escolas, setEscolas] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewSchool, setViewSchool] = useState<SchoolData | null>(null);
  const [selected, setSelected] = useState<SchoolData | null>(null);
  const [setupStatus, setSetupStatus] = useState<Record<string, SchoolSetupStatus>>({});
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [expandedCities, setExpandedCities] = useState<Record<string, boolean>>({});

  const toggleCity = (cidade: string) => {
    setExpandedCities((prev) => ({ ...prev, [cidade]: !prev[cidade] }));
  };
  const isCityOpen = (cidade: string) => {
    // Se há busca ativa, sempre abre para mostrar resultados
    if (search.trim()) return true;
    return !!expandedCities[cidade];
  };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carrega TODAS as escolas (~centenas) e ordena/agrupa no client
      const schools = await ApiAdapter.escolas.getAll();

      // Ordenação: Campo Grande primeiro, depois alfabético por cidade, depois por nome da escola
      const sorted = [...(schools || [])].sort((a, b) => {
        const ca = (a.cidade || '').trim();
        const cb = (b.cidade || '').trim();
        const aIsCG = ca.toLowerCase() === 'campo grande';
        const bIsCG = cb.toLowerCase() === 'campo grande';
        if (aIsCG && !bIsCG) return -1;
        if (!aIsCG && bIsCG) return 1;
        const cityCmp = ca.localeCompare(cb, 'pt-BR', { sensitivity: 'base' });
        if (cityCmp !== 0) return cityCmp;
        return (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' });
      });

      setEscolas(sorted);

      // Setup status para todas
      if (sorted.length > 0) {
        const ids = sorted.map(s => s.id);
        const [slotsRes, classGroupsRes, profsRes] = await Promise.all([
          escolasApi.client.from('school_time_slots').select('school_id').in('school_id', ids).eq('status', 'ACTIVE'),
          escolasApi.client.from('class_groups').select('school_id').in('school_id', ids).eq('status', 'ativo'),
          escolasApi.client.from('professor_school_courses').select('school_id').in('school_id', ids).eq('status', 'ACTIVE'),
        ]);

        const slotsSet = new Set((slotsRes.data || []).map(s => s.school_id));
        const classGroupsSet = new Set((classGroupsRes.data || []).map(s => s.school_id));
        const profsSet = new Set((profsRes.data || []).map(s => s.school_id));

        const statusMap: Record<string, SchoolSetupStatus> = {};
        for (const school of sorted) {
          statusMap[school.id] = {
            hasSlots: slotsSet.has(school.id),
            hasClassGroups: classGroupsSet.has(school.id),
            hasProfessors: profsSet.has(school.id),
          };
        }
        setSetupStatus(statusMap);
      }
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao carregar escolas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Filtra por busca (nome, código ou cidade) e agrupa por cidade preservando a ordem
  const filteredSchools = useMemo(() => {
    if (!search.trim()) return escolas;
    const q = search.trim().toLowerCase();
    return escolas.filter(s =>
      (s.nome || '').toLowerCase().includes(q) ||
      (s.codigo || '').toLowerCase().includes(q) ||
      (s.cidade || '').toLowerCase().includes(q)
    );
  }, [escolas, search]);

  const groupedByCity = useMemo(() => {
    const groups: { cidade: string; schools: SchoolData[] }[] = [];
    for (const school of filteredSchools) {
      const cidade = (school.cidade || 'Sem cidade').trim() || 'Sem cidade';
      const last = groups[groups.length - 1];
      if (last && last.cidade.toLowerCase() === cidade.toLowerCase()) {
        last.schools.push(school);
      } else {
        groups.push({ cidade, schools: [school] });
      }
    }
    return groups;
  }, [filteredSchools]);

  const openDeleteDialog = (school: SchoolData) => {
    setSelected(school);
    setDeleteReason('');
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (deleteReason.trim().length < 5) {
      toast({ title: 'Motivo obrigatório', description: 'Descreva o motivo da exclusão (mínimo 5 caracteres).', variant: 'destructive' });
      return;
    }
    try {
      setDeleting(true);
      await ApiAdapter.escolas.delete(selected.id);
      toast({
        title: 'Escola excluída',
        description: `"${selected.nome}" foi removida com sucesso.`,
      });
      setDeleteDialogOpen(false);
      setDeleteReason('');
      loadData();
    } catch (error: any) {
      toast({
        title: 'Não foi possível excluir',
        description: error.message || 'Erro ao remover',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const getSetupWarnings = (schoolId: string): string[] => {
    const status = setupStatus[schoolId];
    if (!status) return [];
    const warnings: string[] = [];
    if (!status.hasSlots) warnings.push('Sem horários');
    if (!status.hasClassGroups) warnings.push('Sem turmas');
    if (!status.hasProfessors) warnings.push('Sem professores');
    return warnings;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <FeatureGuideCard title="Como usar Escolas" steps={[
        { icon: Plus, title: 'Cadastrar escola', description: 'Clique em "Nova Escola" e preencha nome, endereço e cidade.', color: 'blue' },
        { icon: Settings, title: 'Configurar escola', description: 'Após cadastrar, configure horários, turmas e professores no detalhe.', color: 'green' },
        { icon: Users, title: 'Vincular professores', description: 'Associe professores e cursos à escola pelo menu de ações.', color: 'purple' },
        { icon: MapPin, title: 'Organizar por cidade', description: 'Use a busca para filtrar escolas por nome ou cidade.', color: 'amber' },
      ]} />
      <PageHeader
        breadcrumbs={[{ label: 'Acadêmico' }, { label: 'Escolas' }]}
        title="Escolas"
        description="Cadastro e gerenciamento de unidades escolares"
        icon={MapPin}
        actions={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {isAdmin && (
              <Button variant="outline" onClick={() => setImportOpen(true)} className="w-full sm:w-auto">
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Importar (XLSX)
              </Button>
            )}
            <Button onClick={() => { setSelected(null); setDialogOpen(true); }} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />Nova Escola
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou código..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <TooltipProvider delayDuration={200}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead><TableHead>Nome</TableHead><TableHead>Cidade</TableHead>
                      <TableHead>Diretor</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedByCity.map((group) => {
                      const open = isCityOpen(group.cidade);
                      return (
                      <Fragment key={`g-${group.cidade}`}>
                        <TableRow
                          key={`city-${group.cidade}`}
                          className="bg-muted/40 hover:bg-muted/60 cursor-pointer"
                          onClick={() => toggleCity(group.cidade)}
                        >
                          <TableCell colSpan={6} className="py-2">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {open ? (
                                <ChevronDown className="h-3.5 w-3.5 text-primary" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-primary" />
                              )}
                              <MapPin className="h-3.5 w-3.5 text-primary" />
                              {group.cidade}
                              <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">
                                {group.schools.length}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                        {open && group.schools.map((item) => {
                          const warnings = getSetupWarnings(item.id);
                          return (
                            <TableRow key={item.id} className="group">
                              <TableCell className="font-mono text-muted-foreground">{item.codigo}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => navigate(`/escolas/${item.id}`)} className="font-medium text-left hover:text-primary transition-colors hover:underline underline-offset-2">{item.nome}</button>
                                  {warnings.length > 0 && (
                                    <Tooltip>
                                      <TooltipTrigger asChild><span className="flex items-center"><AlertTriangle className="h-3.5 w-3.5 text-amber-500" /></span></TooltipTrigger>
                                      <TooltipContent><p className="text-xs">Setup incompleto: {warnings.join(', ')}</p></TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{item.cidade}</TableCell>
                              <TableCell className="text-muted-foreground">{item.diretor}</TableCell>
                              <TableCell><Badge variant={item.status === 'ativo' ? 'default' : 'secondary'}>{item.status === 'ativo' ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                  <Tooltip><TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-primary" onClick={() => navigate(`/escolas/${item.id}`)}><LogIn className="h-4 w-4" /> Entrar</Button>
                                  </TooltipTrigger><TooltipContent>Entrar na Escola</TooltipContent></Tooltip>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuItem onClick={() => { setViewSchool(item); setViewDialogOpen(true); }}><Eye className="mr-2 h-4 w-4" /> Ver Responsáveis</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => navigate(`/escolas/${item.id}/horarios`)}><Clock className="mr-2 h-4 w-4" /> Horário Padrão</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => navigate(`/escolas/${item.id}/importacoes`)}><FileUp className="mr-2 h-4 w-4" /> Importações</DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => { setSelected(item); setDialogOpen(true); }}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                                      {isAdmin && (
                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openDeleteDialog(item)}><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </Fragment>
                      );
                    })}
                    {filteredSchools.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma escola encontrada</TableCell></TableRow>}
                  </TableBody>
                </Table>
                </TooltipProvider>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden">
                {groupedByCity.map((group) => {
                  const open = isCityOpen(group.cidade);
                  return (
                  <div key={`m-city-${group.cidade}`}>
                    <button
                      type="button"
                      onClick={() => toggleCity(group.cidade)}
                      className="w-full px-4 py-2 bg-muted/40 hover:bg-muted/60 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {open ? (
                        <ChevronDown className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-primary" />
                      )}
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {group.cidade}
                      <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">
                        {group.schools.length}
                      </Badge>
                    </button>
                    {open && (
                    <div className="divide-y">
                      {group.schools.map((item) => {
                        const warnings = getSetupWarnings(item.id);
                        return (
                          <div key={item.id} className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <button onClick={() => navigate(`/escolas/${item.id}`)} className="font-medium truncate text-left hover:text-primary transition-colors">{item.nome}</button>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs font-mono">{item.codigo}</Badge>
                                  <span className="text-xs text-muted-foreground">{item.cidade}</span>
                                </div>
                                {warnings.length > 0 && (
                                  <div className="flex items-center gap-1.5 mt-1.5">
                                    <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                                    <span className="text-xs text-amber-600 dark:text-amber-400">{warnings.join(' · ')}</span>
                                  </div>
                                )}
                              </div>
                              <Badge variant={item.status === 'ativo' ? 'default' : 'secondary'} className="shrink-0">{item.status === 'ativo' ? 'Ativo' : 'Inativo'}</Badge>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="default" size="sm" className="flex-1" onClick={() => navigate(`/escolas/${item.id}`)}><LogIn className="mr-1.5 h-3.5 w-3.5" /> Entrar na Escola</Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-9 w-9 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => { setViewSchool(item); setViewDialogOpen(true); }}><Eye className="mr-2 h-4 w-4" /> Ver Responsáveis</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => { setSelected(item); setDialogOpen(true); }}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                                  {isAdmin && (
                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openDeleteDialog(item)}><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    )}
                  </div>
                  );
                })}
                {filteredSchools.length === 0 && <div className="p-8 text-center text-muted-foreground">Nenhuma escola encontrada</div>}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <SchoolFormDialog open={dialogOpen} onOpenChange={setDialogOpen} school={selected} onSuccess={loadData} />
      <SchoolViewDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen} school={viewSchool} />
      <SchoolImportDialog open={importOpen} onOpenChange={setImportOpen} onSuccess={loadData} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!deleting) setDeleteDialogOpen(open); }}>
        <AlertDialogContent className="max-w-[92vw] sm:max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" /> Excluir escola em cascata
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  Você está prestes a excluir <strong className="text-foreground">"{selected?.nome}"</strong> e
                  <strong className="text-foreground"> todos os dados vinculados</strong> (turmas, matrículas, professores associados,
                  orientações, planejamentos, tickets, grade horária, configurações de notas, entregas, visitas, importações e links externos).
                </p>
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900">
                  <strong>Bloqueios:</strong> a exclusão será <strong>impedida</strong> se houver <strong>notas lançadas</strong> ou
                  <strong> registros de frequência</strong> dos alunos desta escola.
                </div>
                <p className="text-xs text-muted-foreground">
                  Esta ação é irreversível e ficará registrada na auditoria com seu nome, data/hora e o motivo informado abaixo.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-reason" className="text-sm">
              Motivo da exclusão <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="delete-reason"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Descreva o motivo (mínimo 5 caracteres)…"
              rows={3}
              disabled={deleting}
            />
          </div>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto" disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleting || deleteReason.trim().length < 5}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
