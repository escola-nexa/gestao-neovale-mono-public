import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo, useState, forwardRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileSpreadsheet, Upload, Loader2, CheckCircle2, AlertTriangle, FileDown, FileText, AlertCircle, Info,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { talentosApi } from '@/features/talentos/api';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  readTalentXlsx, applyMapping, validateMappedRows, ValidatedRow, ParseContext, ParsedSheet,
} from '../utils/talentImportParser';
import {
  TALENT_IMPORT_FIELDS, TalentFieldKey, autoMapTalentColumns,
} from '../utils/talentImportFields';
import { exportErrorsXlsx, exportErrorsPdf } from '../utils/talentImportExport';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCompleted?: () => void;
}

type Step = 'upload' | 'mapping' | 'preview' | 'result';

const BATCH = 25;
const NOT_MAPPED = '__none__';

export function TalentImportDialog({ open, onOpenChange, onCompleted }: Props) {
  const { organizationId } = useOrganization();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('upload');
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<Record<TalentFieldKey, number>>(
    () => Object.fromEntries(TALENT_IMPORT_FIELDS.map(f => [f.key, -1])) as any,
  );
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [insertedCount, setInsertedCount] = useState(0);
  const [finalErrors, setFinalErrors] = useState<ValidatedRow[]>([]);

  const okRows = useMemo(() => rows.filter(r => r.status === 'ok'), [rows]);
  const errRows = useMemo(() => rows.filter(r => r.status === 'error'), [rows]);

  const requiredFields = useMemo(() => TALENT_IMPORT_FIELDS.filter(f => f.required), []);
  const missingRequired = requiredFields.filter(f => mapping[f.key] === -1);

  const groupedFields = useMemo(() => {
    const map = new Map<string, typeof TALENT_IMPORT_FIELDS>();
    TALENT_IMPORT_FIELDS.forEach(f => {
      if (!map.has(f.group)) map.set(f.group, []);
      map.get(f.group)!.push(f);
    });
    return Array.from(map.entries());
  }, []);

  useEffect(() => {
    if (!open) {
      setStep('upload');
      setFileName('');
      setSheet(null);
      setMapping(Object.fromEntries(TALENT_IMPORT_FIELDS.map(f => [f.key, -1])) as any);
      setRows([]);
      setImporting(false);
      setProgress(0);
      setInsertedCount(0);
      setFinalErrors([]);
    }
  }, [open]);

  const handleFile = async (file: File) => {
    if (!organizationId) {
      toast.error('Organização não identificada');
      return;
    }
    setParsing(true);
    try {
      const buf = await file.arrayBuffer();
      const parsed = readTalentXlsx(buf);
      if ('error' in parsed) {
        toast.error(parsed.error);
        return;
      }
      if (parsed.rows.length === 0) {
        toast.error('Planilha sem candidatos');
        return;
      }
      setFileName(file.name);
      setSheet(parsed);
      setMapping(autoMapTalentColumns(parsed.headers));
      setStep('mapping');
    } catch (e: any) {
      toast.error('Erro ao ler planilha: ' + (e?.message || ''));
    } finally {
      setParsing(false);
    }
  };

  const runValidation = async () => {
    if (!sheet || !organizationId) return;
    if (missingRequired.length > 0) {
      toast.error('Mapeie os campos obrigatórios antes de continuar');
      return;
    }
    setValidating(true);
    try {
      const [statesRes, citiesRes, existingRes] = await Promise.all([
        talentosApi.client.from('states' as any).select('id, nome, sigla').eq('organization_id', organizationId),
        talentosApi.client.from('cities' as any).select('id, state_id, nome').eq('organization_id', organizationId),
        (supabase as any)
          .from('talent_pool_candidates')
          .select('phone, email')
          .eq('organization_id', organizationId)
          .is('deleted_at', null),
      ]);

      const existingPhones = new Set<string>(
        ((existingRes.data as any[]) || [])
          .map(r => String(r.phone || '').replace(/\D/g, ''))
          .filter(Boolean),
      );
      const existingEmails = new Set<string>(
        ((existingRes.data as any[]) || [])
          .map(r => String(r.email || '').trim().toLowerCase())
          .filter(Boolean),
      );

      const ctx: ParseContext = {
        organizationId,
        createdBy: user?.id || null,
        states: (statesRes.data as any[]) || [],
        cities: (citiesRes.data as any[]) || [],
        existingPhones,
        existingEmails,
      };

      const mapped = applyMapping(sheet, mapping);
      const validated = validateMappedRows(mapped, ctx);
      setRows(validated);
      setStep('preview');
    } catch (e: any) {
      toast.error('Erro ao validar: ' + (e?.message || ''));
    } finally {
      setValidating(false);
    }
  };

  const runImport = async () => {
    if (okRows.length === 0) return;
    setImporting(true);
    setProgress(0);
    let inserted = 0;
    const failedAtServer: ValidatedRow[] = [];

    for (let i = 0; i < okRows.length; i += BATCH) {
      const chunk = okRows.slice(i, i + BATCH);
      const payloads = chunk.map(r => r.parsed!);
      const { data, error } = await (supabase as any)
        .from('talent_pool_candidates')
        .insert(payloads)
        .select('id');
      if (error) {
        chunk.forEach(r => failedAtServer.push({
          ...r,
          status: 'error',
          errors: [`Erro ao salvar: ${error.message}`],
        }));
      } else {
        inserted += (data as any[])?.length ?? chunk.length;
      }
      setProgress(Math.round(((i + chunk.length) / okRows.length) * 100));
    }

    const allErrors = [...errRows, ...failedAtServer];
    setInsertedCount(inserted);
    setFinalErrors(allErrors);
    setImporting(false);

    // Toast com resumo + ação de exportar erros, se houver
    const summary = `${inserted} candidato(s) importado(s)${allErrors.length ? ` · ${allErrors.length} com erro` : ''}`;
    if (allErrors.length > 0) {
      toast.success(summary, {
        duration: 8000,
        action: {
          label: 'Baixar erros (XLSX)',
          onClick: () => exportErrorsXlsx(allErrors),
        },
      });
    } else {
      toast.success(summary);
    }

    onCompleted?.();
    // Fecha automaticamente ao concluir
    onOpenChange(false);
  };


  const close = () => {
    if (importing || validating) return;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto relative">
        {/* ===== OVERLAY: Importação em andamento ===== */}
        {importing && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-background/95 backdrop-blur-sm rounded-lg">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
              <img
                src="/nexa-logo.svg"
                alt="Importando"
                className="h-20 w-20 relative animate-spin"
                style={{ animationDuration: '2.5s' }}
              />
            </div>
            <div className="text-center space-y-1">
              <p className="text-base font-bold tracking-tight">Importando candidatos…</p>
              <p className="text-xs text-muted-foreground">Não feche esta janela</p>
            </div>
            <div className="w-64 space-y-1.5">
              <Progress value={progress} />
              <p className="text-xs font-mono text-center text-muted-foreground">{progress}%</p>
            </div>
          </div>
        )}

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar candidatos do Banco de Talentos
          </DialogTitle>
          <DialogDescription>
            Envie qualquer planilha XLSX. No próximo passo você associa cada coluna ao campo do sistema —
            não é necessário usar um modelo padrão.
          </DialogDescription>
        </DialogHeader>

        {/* STEP indicator */}
        <div className="flex items-center gap-2 text-xs">
          <StepDot active={step === 'upload'} done={step !== 'upload'} label="1. Upload" />
          <Sep />
          <StepDot active={step === 'mapping'} done={step === 'preview' || step === 'result'} label="2. Mapeamento" />
          <Sep />
          <StepDot active={step === 'preview'} done={step === 'result'} label="3. Prévia" />
          <Sep />
          <StepDot active={step === 'result'} done={false} label="4. Resultado" />
        </div>

        {/* ===== STEP 1: Upload ===== */}
        {step === 'upload' && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1">
              <p>
                Envie sua planilha como ela está. Os campos obrigatórios são <strong>Nome completo</strong> e <strong>Telefone</strong>;
                o restante é opcional.
              </p>
              <p className="text-xs text-muted-foreground">
                Para os anexos (currículo, escolaridade e pós/mestrado/doutorado) você pode informar <strong>links públicos do Google Drive</strong> (ou OneDrive) — eles serão salvos no candidato e abertos em nova aba. O upload de PDF direto continua disponível pela edição individual.
              </p>
            </div>
            <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition">
              {parsing ? (
                <>
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Lendo planilha...</p>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium">Clique para escolher o arquivo XLSX</p>
                  <p className="text-xs text-muted-foreground">ou arraste o arquivo aqui · .xlsx ou .xls</p>
                </>
              )}
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                disabled={parsing}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        )}

        {/* ===== STEP 2: Mapping ===== */}
        {step === 'mapping' && sheet && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="text-muted-foreground">Arquivo:</span> <strong>{fileName}</strong>
                <span className="text-muted-foreground ml-3">Linhas:</span> <strong>{sheet.rows.length}</strong>
                <span className="text-muted-foreground ml-3">Colunas:</span> <strong>{sheet.headers.length}</strong>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setMapping(autoMapTalentColumns(sheet.headers))}>
                Auto-mapear novamente
              </Button>
            </div>

            {missingRequired.length > 0 && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <span>Mapeie os campos obrigatórios: <strong>{missingRequired.map(f => f.label).join(', ')}</strong></span>
              </div>
            )}

            <div className="space-y-3">
              {groupedFields.map(([group, fields]) => (
                <div key={group} className="border rounded-md p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">{group}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {fields.map(f => (
                      <div key={f.key} className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          {f.label}{f.required && <span className="text-destructive">*</span>}
                        </Label>
                        <Select
                          value={mapping[f.key] === -1 ? NOT_MAPPED : String(mapping[f.key])}
                          onValueChange={(v) => setMapping(prev => ({ ...prev, [f.key]: v === NOT_MAPPED ? -1 : Number(v) }))}
                        >
                          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NOT_MAPPED}>— Não mapear —</SelectItem>
                            {sheet.headers.map((h, i) => (
                              <SelectItem key={i} value={String(i)}>{h || `(coluna ${i + 1})`}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {f.hint && <p className="text-[10px] text-muted-foreground leading-tight">{f.hint}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== STEP 3: Preview ===== */}
        {step === 'preview' && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <KpiCard tone="neutral" label="Total" value={rows.length} />
              <KpiCard tone="ok" label="A importar" value={okRows.length} icon={<CheckCircle2 className="h-4 w-4" />} />
              <KpiCard tone="err" label="Com erro" value={errRows.length} icon={<AlertTriangle className="h-4 w-4" />} />
            </div>

            <Tabs defaultValue={errRows.length > 0 ? 'err' : 'ok'}>
              <TabsList>
                <TabsTrigger value="ok">A importar ({okRows.length})</TabsTrigger>
                <TabsTrigger value="err">Com erro ({errRows.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="ok">
                <div className="border rounded-md max-h-[40vh] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14">Linha</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>UF/Cidade</TableHead>
                        <TableHead className="w-12 text-center">Avisos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {okRows.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhuma linha válida</TableCell></TableRow>
                      ) : okRows.map(r => (
                        <TableRow key={r.rowNumber} className={r.warnings && r.warnings.length > 0 ? 'bg-amber-500/5' : ''}>
                          <TableCell className="font-mono text-xs">{r.rowNumber}</TableCell>
                          <TableCell className="font-medium">{r.original.fullName}</TableCell>
                          <TableCell className="text-sm">{r.original.phone}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{r.original.uf || '—'}{r.original.city ? ` · ${r.original.city}` : ''}</span>
                              {r.warnings?.some(w => w.includes('inferida')) && (
                                <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-400">UF inferida</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {r.warnings && r.warnings.length > 0 ? (
                              <TooltipProvider delayDuration={150}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button type="button" className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition" aria-label="Ver avisos">
                                      <AlertCircle className="h-4 w-4" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="max-w-xs">
                                    <p className="text-xs font-semibold mb-1">Importado com avisos:</p>
                                    <ul className="text-xs space-y-0.5 list-disc list-inside">
                                      {r.warnings.map((w, i) => <li key={i}>{w}</li>)}
                                    </ul>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="text-muted-foreground/40 text-xs">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="err">
                <div className="border rounded-md max-h-[40vh] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14">Linha</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Motivos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errRows.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Sem erros 🎉</TableCell></TableRow>
                      ) : errRows.map(r => (
                        <TableRow key={r.rowNumber} className="bg-destructive/5">
                          <TableCell className="font-mono text-xs">{r.rowNumber}</TableCell>
                          <TableCell className="font-medium">{r.original.fullName || <span className="text-muted-foreground italic">sem nome</span>}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {r.errors.map((e, i) => (
                                <Badge key={i} variant="outline" className="text-[11px] border-destructive/40 text-destructive">{e}</Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>

          </div>
        )}

        {/* ===== STEP 4: Result ===== */}
        {step === 'result' && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <KpiCard tone="ok" label="Importados" value={insertedCount} icon={<CheckCircle2 className="h-4 w-4" />} />
              <KpiCard tone="err" label="Não importados" value={finalErrors.length} icon={<AlertTriangle className="h-4 w-4" />} />
            </div>

            {finalErrors.length > 0 && (
              <>
                <div className="rounded-lg border bg-destructive/5 p-3 text-sm">
                  Baixe o relatório dos candidatos que <strong>não foram importados</strong>, corrija e envie novamente:
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => exportErrorsXlsx(finalErrors)} className="flex-1">
                    <FileDown className="h-4 w-4 mr-2" /> Baixar erros (XLSX)
                  </Button>
                  <Button variant="outline" onClick={() => exportErrorsPdf(finalErrors, user?.email || undefined)} className="flex-1">
                    <FileText className="h-4 w-4 mr-2" /> Baixar erros (PDF)
                  </Button>
                </div>
                <div className="border rounded-md max-h-[35vh] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14">Linha</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {finalErrors.map(r => (
                        <TableRow key={`fe-${r.rowNumber}`} className="bg-destructive/5">
                          <TableCell className="font-mono text-xs">{r.rowNumber}</TableCell>
                          <TableCell className="font-medium">{r.original.fullName || '—'}</TableCell>
                          <TableCell className="text-xs">{r.errors.join(' · ')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'upload' && (
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={parsing}>Cancelar</Button>
          )}
          {step === 'mapping' && (
            <>
              <Button variant="ghost" onClick={() => { setSheet(null); setStep('upload'); }} disabled={validating}>
                Voltar
              </Button>
              <Button onClick={runValidation} disabled={validating || missingRequired.length > 0}>
                {validating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Validando…</> : 'Validar e ver prévia'}
              </Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button variant="ghost" onClick={() => setStep('mapping')} disabled={importing}>
                Voltar ao mapeamento
              </Button>
              <Button onClick={runImport} disabled={importing || okRows.length === 0}>
                {importing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importando…</> : `Confirmar importação (${okRows.length})`}
              </Button>
            </>
          )}
          {step === 'result' && (
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  const cls = active
    ? 'bg-primary text-[hsl(228_18%_14%)] border-primary'
    : done
    ? 'bg-primary/15 text-primary border-primary/30'
    : 'bg-muted text-muted-foreground border-border';
  return (
    <span className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wide border text-[10px] ${cls}`}>
      {label}
    </span>
  );
}
function Sep() { return <span className="h-px flex-1 bg-border" />; }

const KpiCard = forwardRef<HTMLDivElement, { label: string; value: number; tone: 'ok' | 'err' | 'neutral'; icon?: React.ReactNode }>(
  function KpiCard({ label, value, tone, icon }, ref) {
    const toneCls = tone === 'ok'
      ? 'border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-400'
      : tone === 'err'
      ? 'border-destructive/30 bg-destructive/5 text-destructive'
      : 'border-border bg-muted/30';
    return (
      <div ref={ref} className={`rounded-lg border p-3 ${toneCls}`}>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-80">
          {icon}{label}
        </div>
        <div className="text-2xl font-extrabold mt-1">{value}</div>
      </div>
    );
  }
);
