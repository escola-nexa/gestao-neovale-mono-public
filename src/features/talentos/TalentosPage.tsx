import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Plus, Search, Loader2, Sparkles, FileText, Trash2, Pencil,
  Phone, MessageCircle, MapPin, Award, Users, FileSpreadsheet,
  Sun, Sunset, Moon, GraduationCap, Mail,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTalentPool, EMPTY_FILTERS } from './hooks/useTalentPool';
import {
  TalentCandidate, PERIOD_LABELS, WEEKDAYS,
  CLASSIFICATIONS, CLASSIFICATION_META, TalentClassification,
} from './types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tag, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBranding } from '@/hooks/useBranding';
import { useAuth } from '@/contexts/AuthContext';
import { isManagerRole } from '@/lib/roles';
import { TalentImportDialog } from './components/TalentImportDialog';

export default function TalentosPage() {
  const navigate = useNavigate();
  const { branding } = useBranding();
  const { user } = useAuth();
  const canImport = user?.perfil === 'admin' || isManagerRole(user?.perfil);
  const {
    filtered, items, states, cities, loading,
    filters, setFilters, remove, getSignedUrl, reload,
    toggleClassification, clearClassifications,
  } = useTalentPool();

  const [deleteTarget, setDeleteTarget] = useState<TalentCandidate | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [pageSize, setPageSize] = useState<number>(30);
  const [page, setPage] = useState<number>(1);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  );
  useEffect(() => { setPage(1); }, [filters, pageSize]);

  const filteredCities = useMemo(
    () => filters.stateId === 'all' ? [] : cities.filter(c => c.state_id === filters.stateId),
    [cities, filters.stateId],
  );

  const openNew = () => navigate('/banco-talentos/novo');
  const openEdit = (c: TalentCandidate) => navigate(`/banco-talentos/${c.id}/editar`);

  const normalizeDriveUrl = (raw: string) => {
    const url = raw.trim();
    // https://drive.google.com/open?id=ID  ->  https://drive.google.com/file/d/ID/view
    const m = url.match(/drive\.google\.com\/open\?id=([\w-]+)/i);
    if (m) return `https://drive.google.com/file/d/${m[1]}/view`;
    // https://drive.google.com/uc?id=ID  ->  view
    const m2 = url.match(/drive\.google\.com\/uc\?(?:export=\w+&)?id=([\w-]+)/i);
    if (m2) return `https://drive.google.com/file/d/${m2[1]}/view`;
    return url;
  };

  const splitUrls = (path: string): string[] =>
    path.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);

  const handleOpenFile = async (path: string | null) => {
    if (!path) return;
    // Links externos (ex.: Google Drive vindos da importação XLSX) — pode ter múltiplos separados por vírgula
    if (/^https?:\/\//i.test(path)) {
      const urls = splitUrls(path);
      urls.forEach(u => window.open(normalizeDriveUrl(u), '_blank', 'noopener'));
      return;
    }
    const url = await getSignedUrl(path);
    if (url) window.open(url, '_blank');
  };

  const stats = useMemo(() => ({
    total: items.length,
    licensed: items.filter(i => i.has_licentiate).length,
    withGraduate: items.filter(i => i.graduate_path).length,
    byClass: CLASSIFICATIONS.reduce((acc, c) => {
      acc[c] = items.filter(i => i.classifications?.includes(c)).length;
      return acc;
    }, {} as Record<TalentClassification, number>),
    untagged: items.filter(i => !i.classifications?.length).length,
  }), [items]);

  return (
    <div className="space-y-6">
      {/* HERO Neovale */}
      <div className="relative overflow-hidden rounded-2xl bg-[hsl(228_18%_14%)] text-white px-6 py-7 sm:px-8">
        {/* diagonal bars */}
        <div className="absolute top-6 right-8 flex gap-1.5 rotate-[-20deg] pointer-events-none">
          <span className="block h-8 w-1 bg-primary rounded-full" />
          <span className="block h-8 w-1 bg-primary rounded-full" />
          <span className="block h-8 w-1 bg-primary rounded-full" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="absolute -bottom-16 -right-10 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center shadow-[0_8px_30px_-6px_hsl(48_100%_64%/0.7)] flex-shrink-0 overflow-hidden ring-2 ring-primary/40">
            <img
              src={branding.icon_url || '/nexa-logo.svg'}
              alt="Neovale"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-primary/80">
              Neovale · R.H. Pedagógico
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5">
              Banco de Talentos Docente
            </h1>
            <p className="text-sm text-white/60 italic mt-1">
              "Onde o talento encontra a oportunidade certa."
            </p>
          </div>
        </div>

        {/* Ações + KPIs */}
        <div className="relative flex flex-col sm:flex-row sm:items-end gap-4 mt-6">
          <div className="flex flex-col sm:flex-row gap-2 self-start">
            <Button
              onClick={openNew}
              size="lg"
              className="bg-primary text-[hsl(228_18%_14%)] hover:bg-primary/90 font-bold shadow-[0_8px_24px_-6px_hsl(48_100%_64%/0.5)]"
            >
              <Plus className="h-4 w-4 mr-2" /> Novo talento
            </Button>
            {canImport && (
              <Button
                onClick={() => setImportOpen(true)}
                size="lg"
                variant="outline"
                className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-primary font-semibold"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Importar XLSX
              </Button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 sm:ml-auto sm:max-w-md w-full">
            <KpiPill label="Cadastrados" value={stats.total} />
            <KpiPill label="Licenciados" value={stats.licensed} />
            <KpiPill label="C/ pós" value={stats.withGraduate} />
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, área, e-mail ou telefone..."
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
            <Select value={filters.stateId} onValueChange={v => setFilters({ ...filters, stateId: v, cityId: 'all' })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos estados</SelectItem>
                {states.map(s => <SelectItem key={s.id} value={s.id}>{s.sigla}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.cityId} onValueChange={v => setFilters({ ...filters, cityId: v })} disabled={filters.stateId === 'all'}>
              <SelectTrigger><SelectValue placeholder="Cidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas cidades</SelectItem>
                {filteredCities.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.hasLicentiate} onValueChange={v => setFilters({ ...filters, hasLicentiate: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos (licenciatura)</SelectItem>
                <SelectItem value="yes">Com licenciatura</SelectItem>
                <SelectItem value="no">Sem licenciatura</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por etiqueta — destaque para R.H. */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground mr-1 inline-flex items-center gap-1">
              <Tag className="h-3 w-3" /> Etiqueta:
            </span>
            <ClassificationFilterChip
              active={filters.classification === 'all'}
              onClick={() => setFilters({ ...filters, classification: 'all' })}
              label={`Todos (${stats.total})`}
            />
            {CLASSIFICATIONS.map(c => {
              const meta = CLASSIFICATION_META[c];
              return (
                <ClassificationFilterChip
                  key={c}
                  active={filters.classification === c}
                  onClick={() => setFilters({ ...filters, classification: c })}
                  label={`${meta.short} (${stats.byClass[c] || 0})`}
                  dot={meta.dotClass}
                  activeClass={meta.badgeClass}
                />
              );
            })}
            <ClassificationFilterChip
              active={filters.classification === 'none'}
              onClick={() => setFilters({ ...filters, classification: 'none' })}
              label={`Sem etiqueta (${stats.untagged})`}
              dot="bg-muted-foreground/40"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1">Dia livre:</span>
            <button
              onClick={() => setFilters({ ...filters, weekday: 'all' })}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border ${filters.weekday === 'all' ? 'bg-primary text-[hsl(228_18%_14%)] border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
            >Todos</button>
            {WEEKDAYS.map(d => (
              <button key={d}
                onClick={() => setFilters({ ...filters, weekday: d })}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border ${filters.weekday === d ? 'bg-primary text-[hsl(228_18%_14%)] border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
              >{d}</button>
            ))}
            {(filters.search || filters.stateId !== 'all' || filters.cityId !== 'all' || filters.hasLicentiate !== 'all' || filters.weekday !== 'all' || filters.classification !== 'all') && (
              <Button variant="ghost" size="sm" className="ml-auto text-xs" onClick={() => setFilters(EMPTY_FILTERS)}>
                Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* LISTA */}
      <Card>
        <CardContent className="p-0 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-14 w-14 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">
                {items.length === 0 ? 'Nenhum talento cadastrado ainda' : 'Nenhum candidato encontrado para os filtros'}
              </p>
              {items.length === 0 && (
                <Button onClick={openNew} variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" /> Cadastrar primeiro talento
                </Button>
              )}
            </div>
          ) : (
            <TooltipProvider delayDuration={200}>
              {/* DESKTOP */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="w-[28%] text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Candidato</TableHead>
                      <TableHead className="w-[16%] text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Localização</TableHead>
                      <TableHead className="w-[24%] text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Disponibilidade</TableHead>
                      <TableHead className="w-[18%] text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Formação</TableHead>
                      <TableHead className="w-[10%] text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Anexos</TableHead>
                      <TableHead className="w-[4%] text-right text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map(c => (
                      <TableRow key={c.id} className="group align-middle">
                        {/* Candidato */}
                        <TableCell className="py-3.5">
                          <div className="flex items-start gap-3">
                            <Avatar name={c.full_name} classifications={c.classifications} />
                            <div className="min-w-0 space-y-0.5">
                              <p className="font-semibold text-sm leading-tight break-words">{c.full_name}</p>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                {c.phone_is_whatsapp
                                  ? <MessageCircle className="h-3 w-3 text-emerald-600 shrink-0" />
                                  : <Phone className="h-3 w-3 shrink-0" />}
                                <span className="font-mono">{c.phone}</span>
                              </div>
                              {c.email && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
                                  <Mail className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{c.email}</span>
                                </div>
                              )}
                              <div className="pt-1">
                                <ClassificationChips
                                  values={c.classifications || []}
                                  onToggle={(v) => toggleClassification(c.id, v)}
                                  onClear={() => clearClassifications(c.id)}
                                />
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Localização */}
                        <TableCell className="py-3.5">
                          {c.city_name ? (
                            <div className="flex items-center gap-1.5 text-sm">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="leading-tight">
                                {c.city_name}
                                {c.state_sigla && <span className="text-muted-foreground"> · {c.state_sigla}</span>}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">—</span>
                          )}
                        </TableCell>

                        {/* Disponibilidade */}
                        <TableCell className="py-3.5">
                          <div className="space-y-1.5">
                            <PeriodIcons periods={c.free_periods} />
                            <WeekdayDots weekdays={c.free_weekdays} />
                          </div>
                        </TableCell>

                        {/* Formação */}
                        <TableCell className="py-3.5">
                          <div className="space-y-1">
                            <p className="text-sm leading-tight">{c.formation_area || <span className="text-muted-foreground/60">—</span>}</p>
                            {c.has_licentiate && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-primary text-[hsl(228_18%_14%)] rounded px-1.5 py-0.5">
                                <Award className="h-2.5 w-2.5" /> Licenciatura
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Anexos */}
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-1">
                            <FileIcon label="Currículo" path={c.resume_path} short="CV" onOpen={handleOpenFile} />
                            <FileIcon label="Escolaridade" path={c.schooling_path} short="ES" onOpen={handleOpenFile} />
                            <FileIcon label="Pós-graduação" path={c.graduate_path} short="PG" onOpen={handleOpenFile} />
                          </div>
                        </TableCell>

                        {/* Ações */}
                        <TableCell className="py-3.5 text-right">
                          <div className="inline-flex opacity-60 group-hover:opacity-100 transition-opacity">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(c)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Remover</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* MOBILE */}
              <div className="lg:hidden divide-y">
                {paged.map(c => (
                  <div key={c.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Avatar name={c.full_name} classifications={c.classifications} />
                        <div className="min-w-0">
                          <p className="font-semibold text-sm break-words leading-tight">{c.full_name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            {c.phone_is_whatsapp ? <MessageCircle className="h-3 w-3 text-emerald-600" /> : <Phone className="h-3 w-3" />}
                            <span className="font-mono">{c.phone}</span>
                          </p>
                          {c.city_name && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" />
                              {c.city_name}{c.state_sigla ? ` · ${c.state_sigla}` : ''}
                            </p>
                          )}
                          <div className="pt-1.5">
                            <ClassificationChips
                              values={c.classifications || []}
                              onToggle={(v) => toggleClassification(c.id, v)}
                              onClear={() => clearClassifications(c.id)}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 -mr-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(c)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    {c.formation_area && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{c.formation_area}</span>
                        {c.has_licentiate && <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-primary text-[hsl(228_18%_14%)] rounded px-1.5 py-0.5"><Award className="h-2.5 w-2.5" />Licenciatura</span>}
                      </div>
                    )}
                    <div className="space-y-1">
                      <PeriodIcons periods={c.free_periods} />
                      <WeekdayDots weekdays={c.free_weekdays} />
                    </div>
                    <div className="flex gap-1 pt-0.5">
                      <FileIcon label="Currículo" path={c.resume_path} short="CV" onOpen={handleOpenFile} />
                      <FileIcon label="Escolaridade" path={c.schooling_path} short="ES" onOpen={handleOpenFile} />
                      <FileIcon label="Pós-graduação" path={c.graduate_path} short="PG" onOpen={handleOpenFile} />
                    </div>
                  </div>
                ))}
              </div>
            </TooltipProvider>
          )}
          {!loading && filtered.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t">
              <div className="text-xs text-muted-foreground">
                Mostrando {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} de {filtered.length}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Por página</span>
                <select
                  className="h-8 rounded-md border bg-background px-2 text-sm"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  {[30, 50, 70, 100].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Anterior
                </Button>
                <span className="text-xs text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>



      {canImport && (
        <TalentImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          onCompleted={reload}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover candidato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deleteTarget?.full_name}</strong> do banco de talentos?
              Os arquivos PDF anexados também serão excluídos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => { if (deleteTarget) { await remove(deleteTarget); setDeleteTarget(null); } }}
            >Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function KpiPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
      <p className="text-[9px] uppercase tracking-widest text-white/50 font-bold">{label}</p>
      <p className="text-xl font-extrabold text-primary">{value}</p>
    </div>
  );
}

function FileIcon({ label, short, path, onOpen }: { label: string; short: string; path: string | null; onOpen: (p: string | null) => void }) {
  if (!path) {
    return (
      <span
        title={`${label} não enviado`}
        className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-dashed border-muted-foreground/20 text-[9px] font-bold text-muted-foreground/40"
      >
        {short}
      </span>
    );
  }
  const count = path.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean).length;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => onOpen(path)}
          className="relative inline-flex items-center justify-center h-7 w-7 rounded-md border border-border bg-background hover:bg-primary hover:border-primary hover:text-[hsl(228_18%_14%)] transition-colors text-[9px] font-bold"
        >
          {short}
          {count > 1 && (
            <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center h-3.5 min-w-[14px] px-1 rounded-full bg-primary text-[hsl(228_18%_14%)] text-[8px] font-extrabold border border-background">
              {count}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>{count > 1 ? `Abrir ${count} ${label.toLowerCase()}s` : `Abrir ${label.toLowerCase()}`}</TooltipContent>
    </Tooltip>
  );
}

function Avatar({ name, classifications }: { name: string; classifications?: TalentClassification[] }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() || '')
    .join('');
  const tags = (classifications || []).slice(0, 3);
  return (
    <div className="relative shrink-0">
      <div className="h-9 w-9 rounded-full bg-primary/15 text-foreground flex items-center justify-center text-xs font-bold ring-1 ring-primary/30">
        {initials || '?'}
      </div>
      {tags.length > 0 && (
        <div className="absolute -top-1 -right-1 flex -space-x-1">
          {tags.map(t => {
            const m = CLASSIFICATION_META[t];
            return (
              <span
                key={t}
                title={m.label}
                className={cn('h-3 w-3 rounded-full ring-2 ring-background', m.dotClass)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ClassificationFilterChip({
  active, onClick, label, dot, activeClass,
}: { active: boolean; onClick: () => void; label: string; dot?: string; activeClass?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide border transition-colors',
        active
          ? (activeClass || 'bg-primary text-[hsl(228_18%_14%)] border-primary')
          : 'border-border text-muted-foreground hover:border-foreground/40',
      )}
    >
      {dot && <span className={cn('h-2 w-2 rounded-full', dot)} />}
      {label}
    </button>
  );
}

function ClassificationChips({
  values, onToggle, onClear,
}: {
  values: TalentClassification[];
  onToggle: (v: TalentClassification) => void;
  onClear: () => void;
}) {
  const hasAny = values.length > 0;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {values.map(v => {
        const m = CLASSIFICATION_META[v];
        return (
          <button
            key={v}
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggle(v); }}
            title={`${m.label} — clique para remover`}
            className={cn(
              'group inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border',
              m.badgeClass,
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', m.dotClass)} />
            {m.short}
            <X className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        );
      })}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border border-dashed transition-colors',
              hasAny
                ? 'border-muted-foreground/30 text-muted-foreground/70 hover:border-foreground/50 hover:text-foreground'
                : 'border-muted-foreground/40 text-muted-foreground/70 hover:border-foreground/50 hover:text-foreground',
            )}
          >
            <Tag className="h-2.5 w-2.5" />
            {hasAny ? '+ etiqueta' : 'Adicionar etiqueta'}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-1.5" align="start">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1.5 font-semibold">
            Etiquetas (várias permitidas)
          </p>
          <div className="space-y-0.5">
            {CLASSIFICATIONS.map(c => {
              const m = CLASSIFICATION_META[c];
              const active = values.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => onToggle(c)}
                  className={cn(
                    'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent transition-colors',
                    active && 'bg-accent',
                  )}
                >
                  <span className={cn(
                    'h-4 w-4 rounded border flex items-center justify-center shrink-0',
                    active ? 'bg-foreground border-foreground' : 'border-muted-foreground/40',
                  )}>
                    {active && <Check className="h-3 w-3 text-background" />}
                  </span>
                  <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', m.dotClass)} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold leading-tight">{m.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{m.description}</p>
                  </div>
                </button>
              );
            })}
            {hasAny && (
              <>
                <div className="h-px bg-border my-1" />
                <button
                  onClick={onClear}
                  className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5" /> Limpar todas as etiquetas
                </button>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

const PERIOD_ICON: Record<string, { icon: typeof Sun; label: string }> = {
  MANHA: { icon: Sun, label: 'Manhã' },
  TARDE: { icon: Sunset, label: 'Tarde' },
  NOITE: { icon: Moon, label: 'Noite' },
};

function PeriodIcons({ periods }: { periods: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {(['MANHA', 'TARDE', 'NOITE'] as const).map(p => {
        const active = periods?.includes(p);
        const meta = PERIOD_ICON[p];
        const Icon = meta.icon;
        return (
          <Tooltip key={p}>
            <TooltipTrigger asChild>
              <span
                className={`inline-flex items-center justify-center h-6 w-6 rounded-md ${
                  active
                    ? 'bg-primary text-[hsl(228_18%_14%)] shadow-sm'
                    : 'bg-muted/50 text-muted-foreground/30'
                }`}
              >
                <Icon className="h-3 w-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {meta.label}{active ? ' — disponível' : ' — indisponível'}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

function WeekdayDots({ weekdays }: { weekdays: string[] }) {
  return (
    <div className="flex items-center gap-0.5">
      {WEEKDAYS.map(d => {
        const active = weekdays.includes(d);
        return (
          <span
            key={d}
            title={d}
            className={`inline-flex items-center justify-center h-5 min-w-[22px] px-1 rounded text-[9px] font-bold uppercase tracking-tight ${
              active
                ? 'bg-primary text-[hsl(228_18%_14%)]'
                : 'bg-muted/50 text-muted-foreground/40'
            }`}
          >
            {d.slice(0, 3)}
          </span>
        );
      })}
    </div>
  );
}
