import { AlertTriangle, CalendarClock, Lightbulb } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface GradeConflictRow {
  professor?: string;
  school?: string;
  classGroup?: string;
  subject?: string;
  weekday?: string;
  start?: string;
  end?: string;
  /** Quando o conflito é entre duas indicações do próprio link, mostramos a outra turma */
  otherClass?: string;
}

export interface GradeErrorInfo {
  title: string;
  description: string;
  resolution: string[];
  rawMessage?: string;
  conflicts?: GradeConflictRow[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  info: GradeErrorInfo | null;
  onPrimaryAction?: { label: string; onClick: () => void };
}

export function GradeErrorModal({ open, onOpenChange, info, onPrimaryAction }: Props) {
  if (!info) return null;
  const conflicts = info.conflicts ?? [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-700">
            <AlertTriangle className="h-5 w-5" />
            {info.title}
          </DialogTitle>
          <DialogDescription className="text-foreground/80">
            {info.description}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-4">
            {conflicts.length > 0 && (
              <div className="rounded-md border border-rose-200 bg-rose-50/70 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-900">
                  <CalendarClock className="h-4 w-4" />
                  Horários em conflito ({conflicts.length})
                </div>
                <ul className="space-y-2">
                  {conflicts.map((c, i) => (
                    <li
                      key={i}
                      className="rounded-md border border-rose-200/70 bg-white p-2.5 text-sm"
                    >
                      <div className="font-medium text-rose-950">
                        {c.professor || 'Professor'}
                      </div>
                      <div className="mt-1 grid grid-cols-1 gap-x-4 gap-y-0.5 text-xs text-foreground/80 sm:grid-cols-2">
                        {c.school && (
                          <div>
                            <span className="text-muted-foreground">Escola: </span>
                            <span className="font-medium">{c.school}</span>
                          </div>
                        )}
                        {c.classGroup && (
                          <div>
                            <span className="text-muted-foreground">Turma: </span>
                            <span className="font-medium">{c.classGroup}</span>
                          </div>
                        )}
                        {c.subject && (
                          <div>
                            <span className="text-muted-foreground">Disciplina: </span>
                            <span className="font-medium">{c.subject}</span>
                          </div>
                        )}
                        {(c.weekday || (c.start && c.end)) && (
                          <div>
                            <span className="text-muted-foreground">Quando: </span>
                            <span className="font-medium">
                              {[c.weekday, c.start && c.end ? `${c.start}–${c.end}` : null]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          </div>
                        )}
                        {c.otherClass && (
                          <div className="sm:col-span-2">
                            <span className="text-muted-foreground">Choca com: </span>
                            <span className="font-medium">{c.otherClass}</span>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {info.resolution.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
                  <Lightbulb className="h-4 w-4" />
                  Como resolver
                </div>
                <ol className="ml-5 list-decimal space-y-1.5 text-sm text-amber-950">
                  {info.resolution.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            )}

            {info.rawMessage && (
              <details className="rounded-md border bg-muted/40 p-3 text-xs">
                <summary className="cursor-pointer font-medium text-muted-foreground">
                  Detalhes técnicos do erro
                </summary>
                <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] text-muted-foreground">
                  {info.rawMessage}
                </pre>
              </details>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          {onPrimaryAction && (
            <Button variant="default" onClick={onPrimaryAction.onClick}>
              {onPrimaryAction.label}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
