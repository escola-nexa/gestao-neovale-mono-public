import { supabase } from '@/integrations/supabase/client';
import React, { useMemo, useState } from 'react';
import JSZip from 'jszip';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Download, FileDown, X, School as SchoolIcon, Clock, AlertTriangle, ClockArrowDown, FilePlus2, ArrowLeft } from 'lucide-react';
import { useFolhaPontoTargets, targetSignature, type FolhaPontoTarget } from '../hooks/useFolhaPontoTargets';
import { generateFolhaPontoPdf } from '../utils/folhaPontoPdf';
import { aggregateCargaHoraria } from '../utils/cargaHorariaAggregator';
import { generateCargaHorariaSemanalPdf } from '../utils/cargaHorariaSemanalPdf';
import { generateCargaHorariaUnifiedPdf } from '../utils/cargaHorariaUnifiedPdf';
import { substitutionApi } from '@/features/presenca-professores/substituicao/api';
import { useOrganization } from '@/hooks/useOrganization';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useSemester } from '@/hooks/useSemester';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schools: Array<{ id: string; nome: string }>;
  professors: Array<{ id: string; full_name: string }>;
  defaultProfessorId?: string;
  defaultSchoolId?: string;
}

function targetKey(t: FolhaPontoTarget) {
  return `${t.professorId}__${t.schoolId}__${t.turno}`;
}

function sanitize(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_');
}

export function FolhaPontoManualDialog({
  open, onOpenChange, schools, professors, defaultProfessorId, defaultSchoolId,
}: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [professorId, setProfessorId] = useState(defaultProfessorId || '');
  const [schoolId, setSchoolId] = useState(defaultSchoolId || '');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // 'generated' = só folhas já geradas no mês; 'pending' = ainda não geradas
  const [mode, setMode] = useState<'generated' | 'pending'>('generated');
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const { toast } = useToast();
  const { organizationId } = useOrganization();
  const { currentSemester } = useSemester();
  const queryClient = useQueryClient();

  const { data, isLoading } = useFolhaPontoTargets({
    year, month,
    professorId: professorId || undefined,
    schoolId: schoolId || undefined,
    enabled: open,
  });

  const allTargets = data?.targets || [];
  const events = data?.events || [];
  const generatedKeys = data?.generatedKeys || new Set<string>();
  const generatedSig = data?.generatedSig || {};

  // Filtra targets conforme o modo (geradas vs pendentes)
  const targets = useMemo(() => {
    if (mode === 'pending') {
      return allTargets.filter((t) => !generatedKeys.has(targetKey(t)));
    }
    return allTargets.filter((t) => generatedKeys.has(targetKey(t)));
  }, [allTargets, generatedKeys, mode]);

  const pendingCount = useMemo(
    () => allTargets.filter((t) => !generatedKeys.has(targetKey(t))).length,
    [allTargets, generatedKeys],
  );

  // Reseta seleção ao trocar de modo/mês/ano/filtros
  React.useEffect(() => {
    setSelected(new Set());
  }, [mode, year, month, professorId, schoolId]);

  // Agrupar por escola → turno
  const grouped = useMemo(() => {
    const bySchool = new Map<string, { schoolName: string; byTurno: Map<string, FolhaPontoTarget[]> }>();
    for (const t of targets) {
      if (!bySchool.has(t.schoolId)) {
        bySchool.set(t.schoolId, { schoolName: t.schoolName, byTurno: new Map() });
      }
      const s = bySchool.get(t.schoolId)!;
      if (!s.byTurno.has(t.turno)) s.byTurno.set(t.turno, []);
      s.byTurno.get(t.turno)!.push(t);
    }
    return bySchool;
  }, [targets]);

  const allKeys = useMemo(() => targets.map(targetKey), [targets]);
  const allSelected = allKeys.length > 0 && selected.size === allKeys.length;

  function toggle(key: string, v: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (v) next.add(key); else next.delete(key);
      return next;
    });
  }
  function toggleAll(v: boolean) {
    setSelected(v ? new Set(allKeys) : new Set());
  }
  function toggleGroup(items: FolhaPontoTarget[], v: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      items.forEach((t) => { const k = targetKey(t); if (v) next.add(k); else next.delete(k); });
      return next;
    });
  }

  function fileNameFor(t: FolhaPontoTarget) {
    const mes = String(month).padStart(2, '0');
    return `FolhaPonto_${sanitize(t.professorName)}_${sanitize(t.schoolName)}_${sanitize(t.turno)}_${mes}-${year}.pdf`;
  }

  async function logGenerated(items: FolhaPontoTarget[]) {
    if (!organizationId || items.length === 0) return;
    const { data: auth } = await substitutionApi.getUser();
    const uid = auth?.user?.id;
    const rows = items.map((t) => ({
      organization_id: organizationId,
      professor_id: t.professorId,
      school_id: t.schoolId,
      turno: t.turno,
      year,
      month,
      signature: targetSignature(t),
      generated_at: new Date().toISOString(),
      generated_by: uid ?? null,
    }));
    const { error } = await supabase
      .from('folha_ponto_generated_log')
      .upsert(rows, { onConflict: 'organization_id,professor_id,school_id,turno,year,month' });
    if (error) {
      console.error('[folha_ponto_generated_log] upsert error', error);
    }
    queryClient.invalidateQueries({ queryKey: ['folha-ponto-targets', organizationId] });
  }

  async function markAsGenerated(items: FolhaPontoTarget[]) {
    if (items.length === 0) return;
    try {
      await logGenerated(items);
      setSelected((prev) => {
        const next = new Set(prev);
        for (const t of items) next.delete(targetKey(t));
        return next;
      });
      toast({
        title: items.length === 1 ? 'Marcada como gerada' : `${items.length} marcadas como geradas`,
        description: 'Movidas para a aba Geradas.',
      });
    } catch (e: any) {
      toast({ title: 'Erro ao marcar', description: e?.message || String(e), variant: 'destructive' });
    }
  }

  async function downloadOne(t: FolhaPontoTarget) {
    setDownloading(true);
    setProgress({ current: 1, total: 1, label: `${t.professorName} · ${t.schoolName}` });
    try {
      const blob = await generateFolhaPontoPdf({
        professorName: t.professorName,
        schoolName: t.schoolName,
        turno: t.turno,
        year, month,
        slots: t.slots,
        models: t.models,
        events,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileNameFor(t); a.click();
      URL.revokeObjectURL(url);
      await logGenerated([t]);
      toast({ title: 'PDF gerado', description: fileNameFor(t) });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar PDF', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setDownloading(false);
      setProgress(null);
    }
  }

  async function downloadSelected() {
    const items = targets.filter((t) => selected.has(targetKey(t)));
    if (items.length === 0) return;
    setDownloading(true);
    try {
      if (items.length === 1) {
        await downloadOne(items[0]);
        return;
      }
      const zip = new JSZip();
      for (let i = 0; i < items.length; i++) {
        const t = items[i];
        setProgress({ current: i + 1, total: items.length, label: `${t.professorName} · ${t.schoolName}` });
        const blob = await generateFolhaPontoPdf({
          professorName: t.professorName,
          schoolName: t.schoolName,
          turno: t.turno,
          year, month,
          slots: t.slots,
          models: t.models,
          events,
        });
        zip.file(fileNameFor(t), blob);
      }
      setProgress({ current: items.length, total: items.length, label: 'Compactando ZIP...' });
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FolhasPonto_${String(month).padStart(2, '0')}-${year}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      await logGenerated(items);
      toast({ title: 'Download concluído', description: `${items.length} folhas geradas.` });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar PDFs', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setDownloading(false);
      setProgress(null);
    }
  }

  // ----- Relatório · Carga Horária Semanal (PDF unificado Neovale, sem PLANNING) -----
  async function downloadCargaHorariaSelected() {
    // Sempre gera: usa os selecionados; se nada estiver selecionado, usa TODOS os targets visíveis.
    const sel = targets.filter((t) => selected.has(targetKey(t)));
    const baseItems = sel.length > 0 ? sel : targets;
    if (baseItems.length === 0) {
      toast({ title: 'Sem dados', description: 'Nenhum professor/turno disponível para gerar o relatório.' });
      return;
    }

    // Expande para incluir TODOS os turnos do mesmo (professor × escola) presentes em
    // `allTargets`. Sem isso, um par (disciplina × turma) lecionado em turno fora da
    // seleção não aparece no relatório — gerando divergência com o KPI da Grade
    // Horária, que soma a CH semanal real de todas as disciplinas do professor.
    const psKeys = new Set(baseItems.map((t) => `${t.professorId}__${t.schoolId}`));
    const items = allTargets.filter((t) => psKeys.has(`${t.professorId}__${t.schoolId}`));

    // Valida que existe pelo menos uma aula CLASS nos selecionados.
    const profs = aggregateCargaHoraria(items);
    if (profs.length === 0) {
      toast({ title: 'Nada para gerar', description: 'Nenhuma aula (CLASS) encontrada nos itens selecionados.' });
      return;
    }

    const mes = String(month).padStart(2, '0');
    setDownloading(true);
    try {
      setProgress({ current: 1, total: 1, label: 'Gerando relatório unificado...' });
      const sem = currentSemester === 'FIRST' || currentSemester === 'SECOND' ? currentSemester : null;
      const blob = await generateCargaHorariaUnifiedPdf({ targets: items, year, month, currentSemester: sem });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Relatorio_CargaHorariaSemanal_${mes}-${year}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Relatório gerado', description: `Carga horária semanal · ${profs.length} professor(es).` });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar relatório', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setDownloading(false);
      setProgress(null);
    }
  }

  // Suprime aviso de import não utilizado quando o gerador por-professor fica fora do fluxo padrão.
  void generateCargaHorariaSemanalPdf;



  const years = [today.getFullYear() - 2, today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[95vw] max-w-[calc(100vw-1rem)] sm:max-w-[1400px] p-0 overflow-hidden bg-background flex flex-col h-[calc(100vh-1rem)] sm:h-[95vh] max-h-[calc(100vh-1rem)] sm:max-h-[95vh]">
        {downloading && (
          <div className="absolute inset-0 z-50 bg-[#1B1E2C]/85 backdrop-blur-sm flex flex-col items-center justify-center gap-4 text-white">
            <div className="relative">
              <FileDown className="h-14 w-14 text-[#FFDA45] animate-pulse" />
              <Loader2 className="h-6 w-6 absolute -bottom-1 -right-1 animate-spin text-white" />
            </div>
            <div className="text-center px-6">
              <div className="text-lg font-semibold">Gerando Folha de Ponto...</div>
              {progress && (
                <>
                  <div className="text-sm text-slate-300 mt-1">
                    {progress.current} de {progress.total}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 max-w-md mx-auto truncate">
                    {progress.label}
                  </div>
                  <div className="mt-3 w-64 h-1.5 bg-white/10 rounded-full overflow-hidden mx-auto">
                    <div
                      className="h-full bg-[#FFDA45] transition-all"
                      style={{ width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        <div className="bg-[#1B1E2C] text-white px-6 py-5 border-b-4 border-[#FFDA45] shrink-0">
          <DialogHeader>
            <DialogTitle className="text-xl text-white flex items-center gap-2">
              <FileDown className="h-5 w-5 text-[#FFDA45]" />
              Folha de Ponto manual
            </DialogTitle>
            <DialogDescription className="text-slate-300 mt-1">
              Gera o PDF oficial Neovale (Folha de Frequência Parcial) por escola e turno do professor.
              Pode baixar individual ou em massa, no mês vigente ou em qualquer mês retroativo.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pt-4 pb-2 space-y-3 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

            <div className="space-y-1.5">
              <Label className="text-xs">Mês</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ano</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Escola</Label>
              <SearchableSelect
                value={schoolId}
                onValueChange={setSchoolId}
                options={[{ value: '', label: 'Todas as escolas' }, ...schools.map((s) => ({ value: s.id, label: s.nome }))]}
                placeholder="Todas as escolas"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Professor</Label>
              <SearchableSelect
                value={professorId}
                onValueChange={setProfessorId}
                options={[{ value: '', label: 'Todos os professores' }, ...professors.map((p) => ({ value: p.id, label: p.full_name }))]}
                placeholder="Todos os professores"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(c) => toggleAll(!!c)}
                disabled={allKeys.length === 0}
                id="select-all-fp"
              />
              <Label htmlFor="select-all-fp" className="text-xs cursor-pointer">
                Selecionar todos ({allKeys.length})
              </Label>
              {selected.size > 0 && (
                <Badge variant="secondary" className="ml-1 gap-1 pl-2 pr-1">
                  {selected.size} selecionada(s)
                  <button onClick={() => setSelected(new Set())} className="hover:bg-muted-foreground/10 rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {mode === 'generated'
                ? `${targets.length} folha(s) gerada(s)`
                : `${targets.length} pendente(s)`}
            </div>
          </div>

          {/* Toggle Geradas / Pendentes */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant={mode === 'generated' ? 'default' : 'outline'}
              onClick={() => setMode('generated')}
              className={mode === 'generated' ? 'bg-[#1B1E2C] text-white hover:bg-[#1B1E2C]/90' : ''}
            >
              Geradas ({allTargets.filter((t) => generatedKeys.has(targetKey(t))).length})
            </Button>
            <Button
              size="sm"
              variant={mode === 'pending' ? 'default' : 'outline'}
              onClick={() => setMode('pending')}
              className={mode === 'pending' ? 'bg-[#1B1E2C] text-white hover:bg-[#1B1E2C]/90' : ''}
            >
              <FilePlus2 className="h-3.5 w-3.5 mr-1" />
              Pendentes ({pendingCount})
            </Button>
            {mode === 'pending' && (
              <Button size="sm" variant="ghost" onClick={() => setMode('generated')} className="ml-auto">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Voltar para Geradas
              </Button>
            )}
          </div>
        </div>

        <div className="px-6 flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-4 pb-4">
            {isLoading ? (
              <div className="py-12 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
            ) : targets.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground space-y-3">
                {mode === 'generated' && pendingCount > 0 ? (
                  <>
                    <div>
                      Nenhuma folha gerada para {MONTHS[month - 1]}/{year} ainda.
                      <br />Gere a primeira folha para que ela apareça aqui.
                    </div>
                    <Button
                      onClick={() => setMode('pending')}
                      className="bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#ffd320]"
                    >
                      <FilePlus2 className="h-4 w-4 mr-2" />
                      Gerar primeira folha ({pendingCount} pendente(s))
                    </Button>
                  </>
                ) : mode === 'pending' && pendingCount === 0 ? (
                  <div>Todos os professores com grade ativa já têm folha gerada neste mês. 🎉</div>
                ) : (
                  <div>Nenhum professor com grade horária ativa para o período selecionado.</div>
                )}
              </div>
            ) : Array.from(grouped.entries()).map(([sid, sg]) => (
              <div key={sid} className="border rounded-lg overflow-hidden">
                <div className="bg-[#1B1E2C] text-white px-4 py-2 flex items-center gap-2">
                  <SchoolIcon className="h-4 w-4 text-[#FFDA45]" />
                  <span className="font-semibold text-sm">{sg.schoolName}</span>
                </div>
                {Array.from(sg.byTurno.entries()).map(([turno, items]) => {
                  const allG = items.every((t) => selected.has(targetKey(t)));
                  return (
                    <div key={turno} className="border-t">
                      <div className="bg-muted/40 px-4 py-1.5 flex items-center gap-2 text-xs">
                        <Checkbox
                          checked={allG}
                          onCheckedChange={(c) => toggleGroup(items, !!c)}
                        />
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{turno}</span>
                        <Badge variant="outline" className="ml-auto">{items.length} professor(es)</Badge>
                      </div>
                      <div className="divide-y">
                        {items.map((t) => {
                          const k = targetKey(t);
                          const isSel = selected.has(k);
                          const prevSig = generatedSig[k];
                          const isStale = !!prevSig && prevSig !== targetSignature(t);
                          return (
                            <div
                              key={k}
                              className={`px-4 py-2 flex items-center gap-3 ${
                                isStale
                                  ? 'bg-red-50 border-l-4 border-red-500'
                                  : isSel
                                  ? 'bg-yellow-50/50'
                                  : ''
                              }`}
                            >
                              <Checkbox checked={isSel} onCheckedChange={(c) => toggle(k, !!c)} />
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm font-medium break-words flex items-center gap-2 ${isStale ? 'text-red-700' : ''}`}>
                                  {t.professorName}
                                  {isStale && (
                                    <Badge variant="destructive" className="gap-1 text-[10px] py-0 px-1.5">
                                      <AlertTriangle className="h-3 w-3" />
                                      Grade alterada — gerar novamente
                                    </Badge>
                                  )}
                                </div>
                                <div className={`text-[11px] ${isStale ? 'text-red-600' : 'text-muted-foreground'}`}>
                                  {t.classCount} aula(s)/semana · {t.slots.length} tempo(s) cadastrado(s) no turno
                                </div>
                              </div>
                              {mode === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => markAsGenerated([t])}
                                  disabled={downloading}
                                  className="text-[#1B1E2C] hover:bg-muted"
                                  title="Marcar como já gerada (backfill, sem baixar PDF)"
                                >
                                  Já gerada
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant={isStale ? 'destructive' : 'outline'}
                                onClick={() => downloadOne(t)}
                                disabled={downloading}
                              >
                                <Download className="h-3.5 w-3.5 mr-1" />
                                {isStale ? 'Gerar novamente' : 'PDF'}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30 shrink-0 flex-col-reverse sm:flex-row gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button
            variant="outline"
            onClick={downloadCargaHorariaSelected}
            disabled={downloading}
            className="border-[#1B1E2C] text-[#1B1E2C] hover:bg-[#1B1E2C] hover:text-white"
            title="Gera UM PDF unificado da Carga Horária Semanal agrupado por Escola · Turno · Professor (sem Planejamento). Se nada estiver selecionado, inclui todos."
          >
            {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ClockArrowDown className="h-4 w-4 mr-2" />}
            Relatório · Carga horária semanal {selected.size > 0 ? `(${selected.size})` : `(${targets.length})`}
          </Button>
          {mode === 'pending' && (
            <Button
              variant="outline"
              onClick={() => markAsGenerated(targets.filter((t) => selected.has(targetKey(t))))}
              disabled={downloading || selected.size === 0}
              title="Marca os selecionados como já gerados (backfill, sem baixar PDF)"
            >
              Marcar como já gerada {selected.size > 0 ? `(${selected.size})` : ''}
            </Button>
          )}
          <Button
            onClick={downloadSelected}
            disabled={downloading || selected.size === 0}
            className="bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#ffd320]"
          >
            {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Baixar selecionados {selected.size > 0 ? `(${selected.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
