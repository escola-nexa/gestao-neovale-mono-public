import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Download, FileSpreadsheet, ArrowLeft, ArrowRight, CheckCircle2, XCircle, AlertCircle, FileDown } from 'lucide-react';
import { escolasApi } from '@/features/escolas/api';
import { useOrganization } from '@/hooks/useOrganization';
import { schoolsApi } from '@/services/supabaseApi';
import {
  SCHOOL_IMPORT_FIELDS,
  SchoolFieldKey,
  autoMapColumns,
  normalizeForMatch,
} from '../utils/schoolImportFields';
import { emptySchoolForm, SchoolFormData } from './SchoolFormDialog';
import {
  generateFailuresPdf,
  generateFullReportPdf,
  ImportFailureRow,
  ImportSuccessRow,
} from '../utils/schoolImportPdf';

type Step = 1 | 2 | 3 | 4;

interface SchoolImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedRow {
  rowNumber: number; // linha real na planilha (cabeçalho = 1)
  cells: string[];
}

interface DryRunIssue {
  rowNumber: number;
  codigo: string;
  nome: string;
  errors: string[];
}

const NOT_MAPPED = '__none__';

export function SchoolImportDialog({ open, onOpenChange, onSuccess }: SchoolImportDialogProps) {
  const { toast } = useToast();
  const { organizationId } = useOrganization();

  const [step, setStep] = useState<Step>(1);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Record<SchoolFieldKey, number | -1>>(
    () => Object.fromEntries(SCHOOL_IMPORT_FIELDS.map(f => [f.key, -1])) as any,
  );
  const [parsing, setParsing] = useState(false);
  const [dryRunIssues, setDryRunIssues] = useState<DryRunIssue[]>([]);
  const [validRowsCount, setValidRowsCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [successes, setSuccesses] = useState<ImportSuccessRow[]>([]);
  const [failures, setFailures] = useState<ImportFailureRow[]>([]);

  // dados de apoio
  const [existingCodes, setExistingCodes] = useState<Set<string>>(new Set());
  const [cityMap, setCityMap] = useState<Map<string, string>>(new Map()); // normalizado -> nome oficial

  useEffect(() => {
    if (!open) return;
    // reset on open
    setStep(1);
    setFileName('');
    setHeaders([]);
    setRows([]);
    setMapping(Object.fromEntries(SCHOOL_IMPORT_FIELDS.map(f => [f.key, -1])) as any);
    setDryRunIssues([]);
    setValidRowsCount(0);
    setSuccesses([]);
    setFailures([]);
    setProgress(0);
  }, [open]);

  useEffect(() => {
    if (!open || !organizationId) return;
    (async () => {
      const [{ data: schoolsData }, { data: citiesData }] = await Promise.all([
        escolasApi.client.from('schools').select('codigo').eq('organization_id', organizationId),
        escolasApi.client.from('cities').select('nome').eq('organization_id', organizationId),
      ]);
      setExistingCodes(new Set((schoolsData || []).map(s => (s.codigo || '').toUpperCase().trim())));
      const cm = new Map<string, string>();
      (citiesData || []).forEach(c => cm.set(normalizeForMatch(c.nome), c.nome));
      setCityMap(cm);
    })();
  }, [open, organizationId]);

  /* --------------------- STEP 1 --------------------- */

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      // raw:false preserva formatação (ex.: códigos "01" não viram número 1)
      const aoa: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false, raw: false });
      if (aoa.length < 2) {
        toast({ title: 'Planilha vazia', description: 'A planilha precisa ter cabeçalho e ao menos 1 linha.', variant: 'destructive' });
        return;
      }
      const hdrs = (aoa[0] as any[]).map(h => String(h ?? '').trim());
      const dataRows: ParsedRow[] = aoa.slice(1).map((r, i) => ({
        rowNumber: i + 2,
        cells: (r as any[]).map(c => (c == null ? '' : String(c).trim())),
      })).filter(r => r.cells.some(c => c !== ''));

      setFileName(file.name);
      setHeaders(hdrs);
      setRows(dataRows);
      setMapping(autoMapColumns(hdrs));
      setStep(2);
    } catch (e: any) {
      toast({ title: 'Erro ao ler planilha', description: e.message, variant: 'destructive' });
    } finally {
      setParsing(false);
    }
  };

  const downloadTemplate = () => {
    const headerRow = SCHOOL_IMPORT_FIELDS.map(f => f.label);
    const example = SCHOOL_IMPORT_FIELDS.map(f => {
      switch (f.key) {
        case 'codigo': return '01';
        case 'nome': return 'EE EXEMPLO';
        case 'status': return 'ativo';
        case 'cidade': return 'Campo Grande';
        case 'endereco_cep': return '79000-000';
        case 'endereco_rua': return 'Rua Exemplo';
        case 'endereco_numero': return '100';
        case 'endereco_bairro': return 'Centro';
        case 'email': return 'escola@exemplo.com';
        case 'telefone': return '(67) 99999-9999';
        default:
          if (f.key.endsWith('_email')) return 'pessoa@exemplo.com';
          if (f.key.endsWith('_telefone')) return '(67) 99999-9999';
          if (f.key.endsWith('_turno')) return 'matutino';
          if (f.key === 'diretor') return 'Nome do Diretor';
          return '';
      }
    });
    const ws = XLSX.utils.aoa_to_sheet([headerRow, example]);
    ws['!cols'] = headerRow.map(h => ({ wch: Math.max(14, h.length + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Escolas');
    XLSX.writeFile(wb, 'modelo-importacao-escolas.xlsx');
  };

  /* --------------------- STEP 2 --------------------- */

  const requiredFields = useMemo(() => SCHOOL_IMPORT_FIELDS.filter(f => f.required), []);
  const missingRequired = requiredFields.filter(f => mapping[f.key] === -1);

  const groupedFields = useMemo(() => {
    const map = new Map<string, typeof SCHOOL_IMPORT_FIELDS>();
    SCHOOL_IMPORT_FIELDS.forEach(f => {
      if (!map.has(f.group)) map.set(f.group, []);
      map.get(f.group)!.push(f);
    });
    return Array.from(map.entries());
  }, []);

  /* --------------------- STEP 3 (dry-run) --------------------- */

  const EMPTY_PLACEHOLDERS = new Set(['-', '--', 'n/a', 'na', 'nao informado', 'não informado', 'nao possui', 'não possui', 'a definir', 'sem', 'sem informacao', 'sem informação', 'nenhum', 'nenhuma']);
  const EMAIL_RE_LOCAL = /[^\s;,\/]+@[^\s;,\/]+\.[^\s;,\/]+/;

  const buildSchoolFromRow = (row: ParsedRow): SchoolFormData => {
    const data: any = { ...emptySchoolForm };
    SCHOOL_IMPORT_FIELDS.forEach(f => {
      const colIdx = mapping[f.key];
      if (colIdx >= 0 && colIdx < row.cells.length) {
        let v = (row.cells[colIdx] || '').trim();
        // remove placeholders comuns
        if (v && EMPTY_PLACEHOLDERS.has(v.toLowerCase())) v = '';
        if (f.key === 'status') {
          const norm = v.toLowerCase();
          v = norm === 'inativo' ? 'inativo' : 'ativo';
        }
        if (f.key === 'codigo') v = v.toUpperCase();
        if (f.key.endsWith('_turno')) v = v.toLowerCase();
        if (f.key.endsWith('_email')) {
          // se vier "a@x.com; b@y.com" pega o primeiro válido
          const match = v.match(EMAIL_RE_LOCAL);
          v = (match ? match[0] : v).toLowerCase();
        }
        data[f.key] = v;
      }
    });
    return data as SchoolFormData;
  };

  const runDryRun = () => {
    const issues: DryRunIssue[] = [];
    const seenCodes = new Map<string, number>(); // code -> first row
    let valid = 0;

    rows.forEach(row => {
      const errs: string[] = [];
      const data = buildSchoolFromRow(row);

      // required
      requiredFields.forEach(f => {
        if (!data[f.key]) errs.push(`Campo obrigatório vazio: ${f.label}`);
      });

      // codigo duplicado planilha
      if (data.codigo) {
        if (seenCodes.has(data.codigo)) {
          errs.push(`Código duplicado na planilha (linha ${seenCodes.get(data.codigo)})`);
        } else {
          seenCodes.set(data.codigo, row.rowNumber);
        }
        if (existingCodes.has(data.codigo)) {
          errs.push('Código já existe no sistema');
        }
      }

      // cidade — exige cadastro prévio na organização; usa nome oficial
      if (data.cidade) {
        const officialName = cityMap.get(normalizeForMatch(data.cidade));
        if (!officialName) {
          errs.push(`Cidade "${data.cidade}" não cadastrada na organização`);
        } else {
          data.cidade = officialName; // canonicaliza para o nome cadastrado
        }
      }

      // validators (e-mail, turno, status)
      SCHOOL_IMPORT_FIELDS.forEach(f => {
        if (!f.validator) return;
        const v = (data as any)[f.key];
        const msg = f.validator(v);
        if (msg) errs.push(`${f.label}: ${msg}`);
      });

      if (errs.length === 0) valid++;
      else issues.push({ rowNumber: row.rowNumber, codigo: data.codigo, nome: data.nome, errors: errs });
    });

    setDryRunIssues(issues);
    setValidRowsCount(valid);
    setStep(3);
  };

  /* --------------------- STEP 4 (import) --------------------- */

  const runImport = async () => {
    setImporting(true);
    setProgress(0);
    const succ: ImportSuccessRow[] = [];
    const fail: ImportFailureRow[] = [];

    // marca quem falhou no dry-run
    const failedRowNumbers = new Set(dryRunIssues.map(i => i.rowNumber));
    dryRunIssues.forEach(i => {
      fail.push({ rowNumber: i.rowNumber, codigo: i.codigo, nome: i.nome, motivo: i.errors.join(' | ') });
    });

    const toImport = rows.filter(r => !failedRowNumbers.has(r.rowNumber));
    const batchSize = 25;
    for (let i = 0; i < toImport.length; i += batchSize) {
      const batch = toImport.slice(i, i + batchSize);
      // sequencial dentro do lote para preservar mensagem por linha
      for (const row of batch) {
        const data = buildSchoolFromRow(row);
        // canonicaliza cidade pelo nome cadastrado
        if (data.cidade) {
          const officialName = cityMap.get(normalizeForMatch(data.cidade));
          if (officialName) data.cidade = officialName;
        }
        try {
          // monta endereço completo igual SchoolFormDialog
          const enderecoCompleto = [data.endereco_rua, data.endereco_numero, data.endereco_bairro].filter(Boolean).join(', ');
          await schoolsApi.create({ ...data, endereco: enderecoCompleto || data.endereco } as any);
          succ.push({ rowNumber: row.rowNumber, codigo: data.codigo, nome: data.nome });
        } catch (e: any) {
          fail.push({
            rowNumber: row.rowNumber,
            codigo: data.codigo,
            nome: data.nome,
            motivo: e?.message || 'Erro desconhecido ao salvar',
          });
        }
      }
      setProgress(Math.round(((i + batch.length) / toImport.length) * 100));
    }

    setSuccesses(succ);
    setFailures(fail);
    setProgress(100);
    setImporting(false);
    setStep(4);
    if (succ.length > 0) onSuccess();
  };

  /* --------------------- RENDER --------------------- */

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!importing) onOpenChange(o); }}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Escolas (XLSX)
          </DialogTitle>
          <DialogDescription>
            Etapa {step} de 4 — {step === 1 ? 'Upload da planilha' : step === 2 ? 'Mapeamento de colunas' : step === 3 ? 'Validação' : 'Resultado'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* STEP 1 — Upload */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-3">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Selecione um arquivo <strong>.xlsx</strong> ou <strong>.xls</strong> com as escolas a importar.
                </p>
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  disabled={parsing}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  className="max-w-sm mx-auto"
                />
                {parsing && <p className="text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin inline mr-1" /> Processando…</p>}
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Não tem um modelo?</p>
                  <p className="text-xs text-muted-foreground">Baixe a planilha modelo com todas as colunas já nomeadas.</p>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-1.5" /> Baixar modelo
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2 — Mapping */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-muted-foreground">Arquivo:</span> <strong>{fileName}</strong>
                  <span className="text-muted-foreground ml-3">Linhas:</span> <strong>{rows.length}</strong>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setMapping(autoMapColumns(headers))}>
                  Auto-mapear novamente
                </Button>
              </div>

              {missingRequired.length > 0 && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <span>Mapeie os campos obrigatórios: <strong>{missingRequired.map(f => f.label).join(', ')}</strong></span>
                </div>
              )}

              <div className="space-y-4">
                {groupedFields.map(([group, fields]) => (
                  <div key={group} className="border rounded-md p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">{group}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {fields.map(f => (
                        <div key={f.key} className="space-y-1">
                          <Label className="text-xs">
                            {f.label}{f.required && <span className="text-destructive ml-1">*</span>}
                          </Label>
                          <Select
                            value={mapping[f.key] === -1 ? NOT_MAPPED : String(mapping[f.key])}
                            onValueChange={(v) => setMapping(prev => ({ ...prev, [f.key]: v === NOT_MAPPED ? -1 : Number(v) }))}
                          >
                            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NOT_MAPPED}>— Não mapear —</SelectItem>
                              {headers.map((h, i) => (
                                <SelectItem key={i} value={String(i)}>{h || `(coluna ${i + 1})`}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3 — Dry-run */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-md border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total na planilha</p>
                  <p className="text-2xl font-bold">{rows.length}</p>
                </div>
                <div className="rounded-md border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-center">
                  <p className="text-xs text-emerald-800 dark:text-emerald-200">Válidas para importar</p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{validRowsCount}</p>
                </div>
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-center">
                  <p className="text-xs text-destructive">Com erro</p>
                  <p className="text-2xl font-bold text-destructive">{dryRunIssues.length}</p>
                </div>
              </div>

              {dryRunIssues.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Linhas com erro (não serão importadas)</p>
                  <ScrollArea className="max-h-72 border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Linha</TableHead>
                          <TableHead className="w-24">Código</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Motivo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dryRunIssues.map(i => (
                          <TableRow key={i.rowNumber}>
                            <TableCell className="text-center">{i.rowNumber}</TableCell>
                            <TableCell className="font-mono text-xs">{i.codigo || '—'}</TableCell>
                            <TableCell className="text-sm">{i.nome || '—'}</TableCell>
                            <TableCell className="text-xs text-destructive">{i.errors.join(' • ')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}

              {validRowsCount === 0 && (
                <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-200">
                  Nenhuma linha válida para importar. Corrija a planilha ou o mapeamento e tente novamente.
                </div>
              )}
            </div>
          )}

          {/* STEP 4 — Result */}
          {step === 4 && (
            <div className="space-y-4">
              {importing ? (
                <div className="space-y-3">
                  <Progress value={progress} />
                  <p className="text-sm text-center text-muted-foreground">Importando… {progress}%</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-center">
                      <CheckCircle2 className="h-7 w-7 mx-auto text-emerald-600 mb-1" />
                      <p className="text-xs text-emerald-800 dark:text-emerald-200">Importadas com sucesso</p>
                      <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{successes.length}</p>
                    </div>
                    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-center">
                      <XCircle className="h-7 w-7 mx-auto text-destructive mb-1" />
                      <p className="text-xs text-destructive">Falhas</p>
                      <p className="text-3xl font-bold text-destructive">{failures.length}</p>
                    </div>
                  </div>

                  {failures.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Detalhe das falhas</p>
                        <Button variant="outline" size="sm" onClick={() => generateFailuresPdf(failures)}>
                          <FileDown className="h-4 w-4 mr-1.5" /> Baixar falhas (PDF)
                        </Button>
                      </div>
                      <ScrollArea className="max-h-64 border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-16">Linha</TableHead>
                              <TableHead className="w-24">Código</TableHead>
                              <TableHead>Nome</TableHead>
                              <TableHead>Motivo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {failures.map(f => (
                              <TableRow key={`${f.rowNumber}-${f.codigo}`}>
                                <TableCell className="text-center">{f.rowNumber}</TableCell>
                                <TableCell className="font-mono text-xs">{f.codigo || '—'}</TableCell>
                                <TableCell className="text-sm">{f.nome || '—'}</TableCell>
                                <TableCell className="text-xs text-destructive">{f.motivo}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  )}

                  {successes.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Escolas importadas</p>
                      <ScrollArea className="max-h-48 border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-16">Linha</TableHead>
                              <TableHead className="w-24">Código</TableHead>
                              <TableHead>Nome</TableHead>
                              <TableHead className="w-24 text-right">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {successes.map(s => (
                              <TableRow key={`${s.rowNumber}-${s.codigo}`}>
                                <TableCell className="text-center">{s.rowNumber}</TableCell>
                                <TableCell className="font-mono text-xs">{s.codigo || '—'}</TableCell>
                                <TableCell className="text-sm">{s.nome || '—'}</TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">OK</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 pb-6 gap-2 sm:gap-2 flex-row justify-between border-t pt-4">
          <div>
            {step > 1 && step < 4 && !importing && (
              <Button variant="ghost" size="sm" onClick={() => setStep((step - 1) as Step)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step === 4 && !importing && (successes.length > 0 || failures.length > 0) && (
              <Button variant="outline" size="sm" onClick={() => generateFullReportPdf(successes, failures)}>
                <FileDown className="h-4 w-4 mr-1.5" /> Relatório completo (PDF)
              </Button>
            )}
            {step === 2 && (
              <Button size="sm" disabled={missingRequired.length > 0} onClick={runDryRun}>
                Validar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 3 && (
              <Button size="sm" disabled={validRowsCount === 0 || importing} onClick={runImport}>
                Importar {validRowsCount} escola{validRowsCount === 1 ? '' : 's'} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 4 && !importing && (
              <Button size="sm" onClick={() => onOpenChange(false)}>Concluir</Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
