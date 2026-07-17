import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  Inbox, Send, Lock, CheckCircle2, AlertTriangle, Loader2, ArrowRight, ArrowLeft, Plus, Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { indicationLinksApi } from '../lib/indicationLinksApi';

interface Course { id: string; nome: string; }
interface Subject { id: string; nome: string; course_id: string; carga_horaria_semanal: number; }

interface Context {
  school_id: string;
  school_nome: string;
  requires_keyword: boolean;
  courses: Course[];
  subjects: Subject[];
}

interface Vaga {
  course_id: string;
  qtd_turmas: number;
  periodo: '' | 'MANHA' | 'TARDE' | 'NOITE';
  subject_ids: string[];
}

interface Candidato {
  id: string; // local
  candidato_nome: string;
  candidato_email: string;
  candidato_telefone: string;
  candidato_disciplinas: string;
  observacoes: string;
}

const newCandidato = (): Candidato => ({
  id: crypto.randomUUID(),
  candidato_nome: '',
  candidato_email: '',
  candidato_telefone: '',
  candidato_disciplinas: '',
  observacoes: '',
});

export default function ExternalIndicationPage() {
  const { token } = useParams<{ token: string }>();
  const [keyword, setKeyword] = useState('');
  const [ctx, setCtx] = useState<Context | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ count: number } | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [indicador, setIndicador] = useState({ nome: '', cargo: 'Diretor(a)', email: '' });
  const [vaga, setVaga] = useState<Vaga>({ course_id: '', qtd_turmas: 1, periodo: '', subject_ids: [] });
  const [candidatos, setCandidatos] = useState<Candidato[]>([newCandidato()]);

  const ctxMut = useMutation({
    mutationFn: async () => {
      const data = await indicationLinksApi.getExternalContext(token || '');
      const r = data as any;
      if (!r?.success) throw new Error(r?.error || 'Link inválido');
      return r as Context & { success: true };
    },
    onSuccess: (data) => {
      setCtx({
        school_id: data.school_id,
        school_nome: '',
        requires_keyword: false,
        courses: data.courses ?? [],
        subjects: data.subjects ?? [],
      });
      // Buscar nome da escola via RPC original
      indicationLinksApi.getExternalLinkInfo(token || '').then((info) => {
        const r = info as any;
        if (r?.success) {
          setCtx((c) => c ? { ...c, school_nome: r.school_nome, requires_keyword: r.requires_keyword } : c);
          if (!r.requires_keyword) setUnlocked(true);
        }
      });
    },
    onError: (e: any) => setError(e.message ?? 'Erro ao carregar link'),
  });

  useEffect(() => { if (token) ctxMut.mutate(); /* eslint-disable-next-line */ }, [token]);

  const subjectsOfCourse = useMemo(
    () => ctx?.subjects.filter((s) => s.course_id === vaga.course_id) ?? [],
    [ctx, vaga.course_id],
  );

  const submitMut = useMutation({
    mutationFn: async () => {
      // Para cada candidato envia 1 indicação. Disciplinas selecionadas viram texto consolidado.
      const subjectsText = vaga.subject_ids.length > 0
        ? ctx!.subjects.filter((s) => vaga.subject_ids.includes(s.id)).map((s) => s.nome).join(', ')
        : '';
      let okCount = 0;
      for (const c of candidatos) {
        if (!c.candidato_nome.trim()) continue;
        const payload = {
          indicado_por_nome: indicador.nome,
          indicado_por_cargo: indicador.cargo,
          indicado_por_email: indicador.email,
          candidato_nome: c.candidato_nome,
          candidato_email: c.candidato_email,
          candidato_telefone: c.candidato_telefone,
          candidato_disciplinas: c.candidato_disciplinas || subjectsText,
          course_id: vaga.course_id,
          periodo: vaga.periodo,
          qtd_turmas: vaga.qtd_turmas,
          observacoes: c.observacoes,
        };
        const data = await indicationLinksApi.submitExternalIndication(token || '', keyword, payload);
        const r = data as any;
        if (!r?.success) throw new Error(r?.error || 'Falha ao enviar');
        okCount++;
      }
      return okCount;
    },
    onSuccess: (count) => setSuccess({ count }),
    onError: (e: any) => setError(e.message ?? 'Erro ao enviar'),
  });

  if (error && !ctx) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardContent className="py-10 text-center space-y-3">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <p className="font-bold">Link inválido</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ctx) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardContent className="py-10 text-center space-y-3">
            <CheckCircle2 className="h-14 w-14 text-primary mx-auto" />
            <p className="text-xl font-bold">Indicação enviada!</p>
            <p className="text-sm text-muted-foreground">
              {success.count} candidato(s) indicado(s) para a {ctx.school_nome}. O R.H. fará a análise. Obrigado!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-muted/30">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5 text-primary" />
              Indicação de Professor
            </CardTitle>
            <CardDescription>
              Portal de indicações da <strong>{ctx.school_nome}</strong>. Em 2 passos: descreva a vaga e indique os candidatos.
            </CardDescription>
          </CardHeader>
        </Card>

        {ctx.requires_keyword && !unlocked && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4" /> Palavra-chave de acesso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Digite a palavra-chave"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <Button onClick={() => setUnlocked(true)} disabled={!keyword.trim()}>Continuar</Button>
            </CardContent>
          </Card>
        )}

        {unlocked && (
          <>
            {/* Stepper */}
            <div className="flex items-center justify-center gap-2 text-xs">
              <Badge variant={step >= 1 ? 'default' : 'outline'}>1. Vaga</Badge>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <Badge variant={step >= 2 ? 'default' : 'outline'}>2. Candidatos</Badge>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <Badge variant={step >= 3 ? 'default' : 'outline'}>3. Confirmar</Badge>
            </div>

            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Passo 1 — Sobre a vaga</CardTitle>
                  <CardDescription>Para qual curso, turmas e período você precisa de professor?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <section className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quem indica</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>Seu nome *</Label>
                        <Input value={indicador.nome} onChange={(e) => setIndicador({ ...indicador, nome: e.target.value })} />
                      </div>
                      <div>
                        <Label>Cargo</Label>
                        <Input value={indicador.cargo} onChange={(e) => setIndicador({ ...indicador, cargo: e.target.value })} />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Seu e-mail (opcional)</Label>
                        <Input type="email" value={indicador.email} onChange={(e) => setIndicador({ ...indicador, email: e.target.value })} />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">A vaga</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <Label>Curso *</Label>
                        <Select value={vaga.course_id} onValueChange={(v) => setVaga({ ...vaga, course_id: v, subject_ids: [] })}>
                          <SelectTrigger><SelectValue placeholder="Selecione o curso" /></SelectTrigger>
                          <SelectContent>
                            {ctx.courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Quantidade de turmas *</Label>
                        <Input
                          type="number" min={1}
                          value={vaga.qtd_turmas}
                          onChange={(e) => setVaga({ ...vaga, qtd_turmas: Math.max(1, +e.target.value || 1) })}
                        />
                      </div>
                      <div>
                        <Label>Período</Label>
                        <Select value={vaga.periodo} onValueChange={(v: any) => setVaga({ ...vaga, periodo: v })}>
                          <SelectTrigger><SelectValue placeholder="Indiferente" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MANHA">Matutino</SelectItem>
                            <SelectItem value="TARDE">Vespertino</SelectItem>
                            <SelectItem value="NOITE">Noturno</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {subjectsOfCourse.length > 0 && (
                        <div className="md:col-span-2">
                          <Label>Disciplinas em que precisa de professor</Label>
                          <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-1">
                            {subjectsOfCourse.map((s) => {
                              const checked = vaga.subject_ids.includes(s.id);
                              return (
                                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      setVaga((v) => ({
                                        ...v,
                                        subject_ids: e.target.checked
                                          ? [...v.subject_ids, s.id]
                                          : v.subject_ids.filter((x) => x !== s.id),
                                      }));
                                    }}
                                  />
                                  <span className="flex-1">{s.nome}</span>
                                  <span className="text-xs text-muted-foreground">{s.carga_horaria_semanal}h/sem</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  <Button
                    className="w-full"
                    onClick={() => { setError(''); setStep(2); }}
                    disabled={!indicador.nome.trim() || !vaga.course_id}
                  >
                    Próximo: indicar candidatos <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Passo 2 — Indique candidatos</CardTitle>
                  <CardDescription>Você pode indicar mais de um candidato para a mesma vaga.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {candidatos.map((c, idx) => (
                    <div key={c.id} className="border rounded-md p-3 space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Candidato {idx + 1}</h4>
                        {candidatos.length > 1 && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive"
                            onClick={() => setCandidatos((arr) => arr.filter((x) => x.id !== c.id))}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <Label>Nome completo *</Label>
                          <Input value={c.candidato_nome} onChange={(e) => updateCand(setCandidatos, c.id, { candidato_nome: e.target.value })} />
                        </div>
                        <div>
                          <Label>Telefone</Label>
                          <Input value={c.candidato_telefone} onChange={(e) => updateCand(setCandidatos, c.id, { candidato_telefone: e.target.value })} />
                        </div>
                        <div>
                          <Label>E-mail</Label>
                          <Input type="email" value={c.candidato_email} onChange={(e) => updateCand(setCandidatos, c.id, { candidato_email: e.target.value })} />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Disciplinas que pode lecionar</Label>
                          <Input
                            placeholder="Padrão: as selecionadas no passo 1"
                            value={c.candidato_disciplinas}
                            onChange={(e) => updateCand(setCandidatos, c.id, { candidato_disciplinas: e.target.value })}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Observações</Label>
                          <Textarea rows={2} value={c.observacoes} onChange={(e) => updateCand(setCandidatos, c.id, { observacoes: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button variant="outline" className="w-full" onClick={() => setCandidatos((arr) => [...arr, newCandidato()])}>
                    <Plus className="h-4 w-4 mr-2" /> Indicar outro candidato
                  </Button>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => { setError(''); setStep(3); }}
                      disabled={!candidatos.some((c) => c.candidato_nome.trim())}
                    >
                      Revisar e enviar <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Passo 3 — Confirmar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-medium">Vaga</h4>
                    <p className="text-muted-foreground">
                      Curso: <strong>{ctx.courses.find((c) => c.id === vaga.course_id)?.nome ?? '—'}</strong> · {vaga.qtd_turmas} turma(s)
                      {vaga.periodo && ` · ${vaga.periodo === 'MANHA' ? 'Matutino' : vaga.periodo === 'TARDE' ? 'Vespertino' : 'Noturno'}`}
                    </p>
                    {vaga.subject_ids.length > 0 && (
                      <p className="text-muted-foreground text-xs mt-1">
                        Disciplinas: {ctx.subjects.filter((s) => vaga.subject_ids.includes(s.id)).map((s) => s.nome).join(', ')}
                      </p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium">Candidatos a indicar</h4>
                    <ul className="list-disc list-inside text-muted-foreground">
                      {candidatos.filter((c) => c.candidato_nome.trim()).map((c) => (
                        <li key={c.id}>
                          {c.candidato_nome}
                          {c.candidato_telefone && ` · ${c.candidato_telefone}`}
                          {c.candidato_email && ` · ${c.candidato_email}`}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {error && (
                    <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                    </Button>
                    <Button
                      className="flex-1"
                      size="lg"
                      onClick={() => { setError(''); submitMut.mutate(); }}
                      disabled={submitMut.isPending}
                    >
                      {submitMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                      Enviar indicações
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function updateCand(
  setter: React.Dispatch<React.SetStateAction<Candidato[]>>,
  id: string,
  patch: Partial<Candidato>,
) {
  setter((arr) => arr.map((c) => (c.id === id ? { ...c, ...patch } : c)));
}
