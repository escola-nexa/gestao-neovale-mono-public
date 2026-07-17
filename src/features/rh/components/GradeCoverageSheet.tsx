import { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  ShieldCheck,
  Copy,
  ExternalLink,
  ListChecks,
  GraduationCap,
  Info,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import type { GradeCompletenessResult, SchoolIndicationLink } from '../lib/indicationLinksApi';
import { buildPublicUrl } from '../lib/indicationLinksApi';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  coverage?: GradeCompletenessResult;
  link?: SchoolIndicationLink;
  onReopenLink?: () => void;
  courseMap?: Map<string, string>;
}

export function GradeCoverageSheet({ open, onOpenChange, coverage, link, onReopenLink, courseMap }: Props) {

  const publicUrl = useMemo(() => (link?.token ? buildPublicUrl(link.token) : null), [link?.token]);

  const copyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Link copiado', { description: 'Envie para o diretor da escola.' });
    } catch {
      toast.error('Não foi possível copiar o link.');
    }
  };

  const copyKeyword = async () => {
    if (!link?.keyword) return;
    try {
      await navigator.clipboard.writeText(link.keyword);
      toast.success('Palavra-chave copiada');
    } catch {
      toast.error('Não foi possível copiar a palavra-chave.');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {coverage?.ok ? (
              <><ShieldCheck className="h-5 w-5 text-emerald-600" /> Cobertura completa</>
            ) : (
              <><AlertTriangle className="h-5 w-5 text-amber-600" /> O que falta para gerar a grade</>
            )}
          </SheetTitle>
          <SheetDescription>
            A grade só é gerada quando <strong>todas as turmas ativas do curso</strong> têm indicação
            e a <strong>carga horária semanal de cada disciplina</strong> está 100% alocada na turma.
          </SheetDescription>
        </SheetHeader>

        {!coverage ? (
          <div className="py-8 text-sm text-muted-foreground">Calculando cobertura…</div>
        ) : (
          <div className="space-y-6 py-5">
            {/* Resumo numérico */}
            <div className="grid grid-cols-3 gap-2">
              <SummaryBox
                label="Turmas faltando"
                value={coverage.total_missing_classes}
                tone={coverage.total_missing_classes ? 'amber' : 'ok'}
                hint="Turmas ativas do curso sem nenhuma indicação enviada pelo diretor."
              />
              <SummaryBox
                label="Turmas com CH parcial"
                value={coverage.total_incomplete_classes}
                tone={coverage.total_incomplete_classes ? 'amber' : 'ok'}
                hint="Turmas já indicadas, mas alguma disciplina ainda não atinge a CH semanal exigida."
              />
              <SummaryBox
                label="Disciplinas pendentes"
                value={coverage.total_subjects_missing}
                tone={coverage.total_subjects_missing ? 'amber' : 'ok'}
                hint="Conta apenas disciplinas faltantes dentro das turmas já indicadas. As turmas listadas em “Turmas faltando” ainda não foram abertas pelo diretor, então as disciplinas delas não são contadas aqui."
              />
            </div>

            {coverage.total_missing_classes > 0 && coverage.total_subjects_missing === 0 && (
              <div className="rounded-md border border-amber-300 bg-amber-50/70 px-3 py-2 text-[12px] text-amber-900 flex items-start gap-2 leading-snug">
                <Info className="h-4 w-4 mt-0.5 shrink-0 text-amber-700" />
                <span>
                  <strong>Atenção:</strong> “Disciplinas pendentes” está em <strong>0</strong> porque
                  esse contador só olha as turmas que <em>já foram indicadas</em>. Ainda existem{' '}
                  <strong>{coverage.total_missing_classes} turma(s) totalmente sem indicação</strong>{' '}
                  (listadas abaixo) — todas as disciplinas dessas turmas também precisam ser
                  preenchidas pelo diretor antes que a grade libere.
                </span>
              </div>
            )}


            {/* Como resolver — passo a passo */}
            {!coverage.ok && (
              <section className="rounded-lg border border-amber-300 bg-amber-50/60 p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
                  <ListChecks className="h-4 w-4" /> Como resolver
                </div>
                <ol className="list-decimal pl-5 text-[13px] text-amber-950 space-y-1.5 leading-snug">
                  <li>
                    <strong>Envie o link do portal</strong> para o diretor da escola (botão abaixo).
                    O diretor abre, informa a <em>palavra-chave</em> e completa cada turma indicando
                    professor (ou candidato), disciplina, dia e horário.
                  </li>
                  <li>
                    Para cada <strong>turma sem indicação</strong> listada abaixo, o diretor precisa
                    abrir aquela turma no portal e cadastrar todas as disciplinas da grade.
                  </li>
                  <li>
                    Para cada <strong>disciplina com CH parcial</strong>, o diretor precisa
                    acrescentar mais slots até completar a <em>CH semanal exigida</em> mostrada na
                    tabela.
                  </li>
                  <li>
                    Quando o diretor reenviar, esta tela atualiza sozinha. O botão{' '}
                    <em>Gerar grade de horário</em> só libera quando os <strong>três contadores
                    acima</strong> (Turmas faltando, Turmas com CH parcial e Disciplinas pendentes)
                    estiverem em <strong>0</strong> ao mesmo tempo.
                  </li>

                </ol>

                {(publicUrl || link?.keyword) && (
                  <div className="pt-2 border-t border-amber-200 mt-2 flex flex-wrap items-center gap-2">
                    {publicUrl && (
                      <>
                        <Button size="sm" variant="outline" className="h-8 border-amber-400 text-amber-900 hover:bg-amber-100" onClick={copyLink}>
                          <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar link do portal
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 border-amber-400 text-amber-900 hover:bg-amber-100" asChild>
                          <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Abrir portal
                          </a>
                        </Button>
                      </>
                    )}
                    {link?.keyword && (
                      <Button size="sm" variant="ghost" className="h-8 text-amber-900 hover:bg-amber-100" onClick={copyKeyword}>
                        <Copy className="h-3.5 w-3.5 mr-1.5" /> Palavra-chave: <code className="ml-1 font-mono">{link.keyword}</code>
                      </Button>
                    )}
                    {link?.submitted_at && onReopenLink && (
                      <Button size="sm" variant="outline" className="h-8 border-amber-400 text-amber-900 hover:bg-amber-100" onClick={onReopenLink}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reabrir portal para o diretor
                      </Button>
                    )}
                  </div>
                )}
                {link?.submitted_at && !onReopenLink && (
                  <p className="text-[11.5px] text-amber-800 pt-1 flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    O diretor já marcou as indicações como enviadas. Se ele precisar editar de novo,
                    peça ao administrador para <strong>reabrir o link</strong>.
                  </p>
                )}
              </section>
            )}

            {/* Turmas faltantes */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5" /> Turmas sem nenhuma indicação
                </div>
                <Badge variant={coverage.total_missing_classes ? 'destructive' : 'outline'} className="text-[11px]">
                  {coverage.total_missing_classes}
                </Badge>
              </div>
              {coverage.total_missing_classes === 0 ? (
                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                  Todas as turmas ativas do curso estão presentes neste link.
                </div>
              ) : (
                <>
                  <p className="text-[12px] text-muted-foreground mb-2 leading-snug">
                    Estas turmas existem no cadastro do curso mas o diretor <strong>ainda não enviou
                    nenhuma indicação</strong> para elas. Cada turma precisa ter <em>todas</em> as
                    disciplinas da grade preenchidas.
                  </p>
                  {(() => {
                    // Agrupa por curso
                    const byCourse = new Map<string, typeof coverage.missing_classes>();
                    coverage.missing_classes.forEach((c) => {
                      const arr = byCourse.get(c.course_id) ?? [];
                      arr.push(c);
                      byCourse.set(c.course_id, arr);
                    });
                    return (
                      <div className="space-y-2">
                        {Array.from(byCourse.entries()).map(([courseId, items]) => {
                          const courseName = courseMap?.get(courseId) ?? 'Curso não identificado';
                          return (
                            <div key={courseId} className="rounded-md border border-amber-300 bg-amber-50/50 p-2.5">
                              <div className="flex items-center gap-2 mb-1.5">
                                <GraduationCap className="h-3.5 w-3.5 text-amber-800" />
                                <span className="text-[12px] font-semibold text-amber-900">{courseName}</span>
                                <Badge variant="outline" className="text-[10.5px] h-5 border-amber-400 text-amber-900 bg-white/60">
                                  {items.length} turma(s)
                                </Badge>
                              </div>
                              <ul className="flex flex-wrap gap-1.5 pl-5">
                                {items.map((c) => (
                                  <li key={c.class_group_id}>
                                    <Badge variant="outline" className="border-amber-400 bg-white text-amber-900 text-[12px] py-1 px-2 font-normal">
                                      {c.class_name}
                                    </Badge>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                  <p className="text-[11.5px] text-muted-foreground mt-2 leading-snug">
                    <strong>Outra opção:</strong> se a escola realmente não atende mais alguma dessas
                    turmas, peça ao administrador para <em>inativá-la</em> em <em>Escolas › Turmas</em>;
                    ela some daqui automaticamente.
                  </p>
                </>
              )}

            </section>

            {/* Turmas com CH parcial */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1.5">
                  <ListChecks className="h-3.5 w-3.5" /> Turmas com carga horária parcial
                </div>
                <Badge variant={coverage.total_incomplete_classes ? 'destructive' : 'outline'} className="text-[11px]">
                  {coverage.total_incomplete_classes}
                </Badge>
              </div>
              {coverage.total_incomplete_classes === 0 ? (
                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                  Todas as turmas indicadas têm a CH semanal completa por disciplina.
                </div>
              ) : (
                <>
                  <p className="text-[12px] text-muted-foreground mb-2 leading-snug">
                    Estas turmas já receberam indicações, mas <strong>alguma(s) disciplina(s) ainda
                    não atingem a carga horária semanal exigida</strong> no cadastro
                    (<em>Cursos › Disciplinas › CH Semanal</em>). O diretor precisa abrir a turma no
                    portal e adicionar mais slots da disciplina até zerar a coluna “Falta”.
                  </p>
                  <div className="space-y-3">
                    {coverage.incomplete_classes.map((cl) => (
                      <div key={cl.indication_class_id} className="rounded-md border bg-muted/30">
                        <div className="px-3 py-2 border-b flex items-center justify-between">
                          <div className="font-medium text-sm">Turma {cl.class_name}</div>
                          <Badge variant="outline" className="text-[11px] border-amber-400 text-amber-900">
                            Falta {cl.total_missing_ch}h · {cl.subjects_missing} disciplina(s)
                          </Badge>
                        </div>
                        <table className="w-full text-xs">
                          <thead className="bg-muted/40">
                            <tr>
                              <th className="text-left px-3 py-1.5 font-medium">Disciplina</th>
                              <th className="text-right px-3 py-1.5 font-medium w-[80px]">CH exig.</th>
                              <th className="text-right px-3 py-1.5 font-medium w-[80px]">Indic.</th>
                              <th className="text-right px-3 py-1.5 font-medium w-[70px]">Falta</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(cl.missing_subjects ?? []).map((s) => (
                              <tr key={s.subject_id} className="border-t">
                                <td className="px-3 py-1.5">{s.subject_name}</td>
                                <td className="px-3 py-1.5 text-right tabular-nums">{s.ch_required}h</td>
                                <td className="px-3 py-1.5 text-right tabular-nums">{s.ch_indicated}h</td>
                                <td className="px-3 py-1.5 text-right tabular-nums text-amber-700 font-semibold">
                                  +{s.ch_missing}h
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <div className="rounded-md border bg-muted/30 px-3 py-2 text-[11.5px] text-muted-foreground leading-snug flex items-start gap-2">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                A cobertura é recalculada automaticamente sempre que o diretor envia novas
                indicações ou que você aprova/recusa alguma. Não é preciso recarregar a página.
              </span>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SummaryBox({ label, value, tone, hint }: { label: string; value: number; tone: 'ok' | 'amber'; hint?: string }) {
  const cls =
    tone === 'ok'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-amber-300 bg-amber-50 text-amber-900';
  return (
    <div className={`rounded-md border px-3 py-2 ${cls}`} title={hint}>
      <div className="text-[10.5px] uppercase tracking-wide font-semibold opacity-80">{label}</div>
      <div className="text-xl font-bold tabular-nums leading-tight">{value}</div>
    </div>
  );
}

