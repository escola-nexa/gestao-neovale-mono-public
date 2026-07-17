import { Loader2, CheckCircle2, AlertTriangle, XCircle, Minimize2, Maximize2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export type GenerateAllProgressState =
  | {
      state: 'processing';
      schoolsCount: number;
      current?: number;
      total?: number;
      schoolName?: string;
      itemLabel?: string;
      typeLabel?: 'Aula' | 'Planejamento';
    }
  | {
      state: 'done';
      successClasses: number;
      successPlannings: number;
      schoolsProcessed: number;
      skipped: number;
      errors: string[];
    }
  | { state: 'error'; message: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: GenerateAllProgressState | null;
  minimized?: boolean;
  onMinimize?: () => void;
  onRestore?: () => void;
}

export function GenerateAllProgressDialog({ open, onOpenChange, status, minimized, onMinimize, onRestore }: Props) {
  if (!status) return null;

  const processing = status.state === 'processing';

  // Floating mini indicator when minimized and still processing
  if (minimized && processing) {
    const pct =
      typeof status.current === 'number' && typeof status.total === 'number' && status.total > 0
        ? Math.round((status.current / status.total) * 100)
        : null;
    return (
      <button
        type="button"
        onClick={onRestore}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg hover:shadow-xl transition-shadow text-left max-w-sm"
        title="Clique para abrir o painel de processamento"
      >
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFDA45]">
          <Loader2 className="h-5 w-5 animate-spin text-[#1B1E2C]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1B1E2C]" style={{ fontFamily: 'Sora, system-ui, sans-serif' }}>
            Gerando aulas em segundo plano
            {pct !== null && <span className="text-muted-foreground font-medium">· {pct}%</span>}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground" title={status.schoolName}>
            {status.schoolName || `${status.schoolsCount} escola(s)`}
            {typeof status.current === 'number' && typeof status.total === 'number' && (
              <span> — {status.current}/{status.total}</span>
            )}
          </div>
          {pct !== null && (
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-[#FFDA45] transition-all duration-200" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
        <Maximize2 className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    );
  }

  return (
    <Dialog
      open={open && !minimized}
      onOpenChange={(o) => {
        // Enquanto processa, fechar = minimizar (não cancelar)
        if (processing && !o) {
          onMinimize?.();
          return;
        }
        onOpenChange(o);
      }}
    >
      <DialogContent
        className="max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1B1E2C]" style={{ fontFamily: 'Sora, system-ui, sans-serif' }}>
            {status.state === 'processing' && (
              <>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#FFDA45]">
                  <Loader2 className="h-5 w-5 animate-spin text-[#1B1E2C]" />
                </span>
                Processando geração de aulas…
              </>
            )}
            {status.state === 'done' && status.errors.length === 0 && (
              <>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                </span>
                Geração concluída com sucesso
              </>
            )}
            {status.state === 'done' && status.errors.length > 0 && (
              <>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                  <AlertTriangle className="h-5 w-5 text-amber-700" />
                </span>
                Geração concluída com avisos
              </>
            )}
            {status.state === 'error' && (
              <>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-100">
                  <XCircle className="h-5 w-5 text-rose-700" />
                </span>
                Falha ao gerar aulas
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {status.state === 'processing'
              ? `Gerando aulas e planejamentos para ${status.schoolsCount} escola(s). Você pode minimizar esta janela e continuar usando o sistema — avisaremos quando terminar.`
              : status.state === 'done'
              ? 'Veja abaixo o resultado detalhado do processamento.'
              : 'Ocorreu um erro inesperado. Veja os detalhes abaixo.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          {status.state === 'processing' && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-[#FFDA45]" />
              {typeof status.current === 'number' && typeof status.total === 'number' && status.total > 0 ? (
                <div className="mt-5 w-full max-w-md space-y-3">
                  <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <span>Item {status.current} de {status.total}</span>
                    <span>{Math.round((status.current / status.total) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-[#FFDA45] transition-all duration-200"
                      style={{ width: `${Math.min(100, (status.current / status.total) * 100)}%` }}
                    />
                  </div>
                  <div className="rounded-md border bg-card px-3 py-2 text-left">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Processando agora
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold text-[#1B1E2C]" title={status.schoolName}>
                      {status.schoolName || '—'}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge
                        variant="secondary"
                        className={
                          status.typeLabel === 'Planejamento'
                            ? 'bg-amber-100 text-amber-900 hover:bg-amber-100'
                            : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-100'
                        }
                      >
                        {status.typeLabel}
                      </Badge>
                      <span className="truncate" title={status.itemLabel}>{status.itemLabel || '—'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-4 text-sm font-medium text-[#1B1E2C]">
                    Processando {status.schoolsCount} escola(s)…
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Preparando geração de aulas e planejamentos…
                  </p>
                </>
              )}
            </div>
          )}


          {status.state === 'done' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg border bg-card px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Escolas</div>
                  <div className="mt-1 text-2xl font-bold text-[#1B1E2C]" style={{ fontFamily: 'Sora, system-ui, sans-serif' }}>
                    {status.schoolsProcessed}
                  </div>
                </div>
                <div className="rounded-lg border bg-card px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Aulas</div>
                  <div className="mt-1 text-2xl font-bold text-emerald-700" style={{ fontFamily: 'Sora, system-ui, sans-serif' }}>
                    {status.successClasses}
                  </div>
                </div>
                <div className="rounded-lg border bg-card px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Planejamentos</div>
                  <div className="mt-1 text-2xl font-bold text-amber-700" style={{ fontFamily: 'Sora, system-ui, sans-serif' }}>
                    {status.successPlannings}
                  </div>
                </div>
                <div className="rounded-lg border bg-card px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Erros</div>
                  <div className={`mt-1 text-2xl font-bold ${status.errors.length > 0 ? 'text-rose-700' : 'text-muted-foreground'}`} style={{ fontFamily: 'Sora, system-ui, sans-serif' }}>
                    {status.errors.length}
                  </div>
                </div>
              </div>

              {status.errors.length === 0 ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="h-4 w-4" /> Tudo certo!
                  </div>
                  <p className="mt-1 text-emerald-800">
                    Todas as aulas e planejamentos foram gerados sem erros.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-800">
                    <AlertTriangle className="h-4 w-4" />
                    Erros encontrados ({status.errors.length})
                  </div>
                  <div className="space-y-2">
                    {status.errors.map((err, i) => (
                      <div
                        key={i}
                        className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm"
                      >
                        <div className="flex items-start gap-2">
                          <Badge variant="destructive" className="shrink-0">
                            #{i + 1}
                          </Badge>
                          <pre className="whitespace-pre-wrap break-words font-mono text-[12px] text-rose-950">
                            {err}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {status.state === 'error' && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-3 text-sm">
              <div className="mb-1 flex items-center gap-2 font-semibold text-rose-800">
                <XCircle className="h-4 w-4" /> Erro
              </div>
              <pre className="whitespace-pre-wrap break-words font-mono text-[12px] text-rose-950">
                {status.message}
              </pre>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2 sm:justify-between">
          {processing ? (
            <>
              <Button
                variant="outline"
                onClick={() => onMinimize?.()}
                className="gap-2"
              >
                <Minimize2 className="h-4 w-4" />
                Minimizar e continuar usando
              </Button>
              <Button
                disabled
                className="bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45]/90 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando…
              </Button>
            </>
          ) : (
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45]/90 ml-auto"
            >
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
