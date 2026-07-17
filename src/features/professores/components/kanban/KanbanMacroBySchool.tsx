import { useMemo, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Building2, Search, ChevronDown, ChevronRight, Download, Send,
  ArrowUp, ArrowDown,
} from 'lucide-react';
import { KANBAN_COLUMNS, KanbanCard, KanbanColumn } from '../../hooks/useProfessorsKanban';
import { MacroIndicators } from './MacroIndicators';
import { MissingDocDrilldown } from './MissingDocDrilldown';

interface Props {
  cards: KanbanCard[];
  schools: { id: string; nome: string }[];
  onGenerateLink?: (card: KanbanCard) => void;
}

type RiskLevel = 'high' | 'medium' | 'low';
type SortKey = 'name' | 'pct' | 'total' | 'risk';

interface MissingAgg { value: string; label: string; count: number }

interface SchoolAggregate {
  schoolName: string;
  total: number;
  byColumn: Record<KanbanColumn, number>;
  completed: number;
  expired: number;
  noLink: number;
  inProgress: number;
  avgPct: number;
  pctCompleted: number;
  risk: RiskLevel;
  cards: KanbanCard[];
  topMissing: MissingAgg[];
}

const COLUMN_ACCENTS: Record<KanbanColumn, string> = {
  awaiting_link: 'bg-amber-500',
  link_sent:     'bg-sky-500',
  in_progress:   'bg-violet-500',
  completed:     'bg-emerald-500',
};
const COLUMN_TEXT: Record<KanbanColumn, string> = {
  awaiting_link: 'text-amber-700',
  link_sent:     'text-sky-700',
  in_progress:   'text-violet-700',
  completed:     'text-emerald-700',
};
const RISK_DOT: Record<RiskLevel, string> = {
  high:   'bg-destructive',
  medium: 'bg-amber-500',
  low:    'bg-emerald-500',
};
const RISK_LABEL: Record<RiskLevel, string> = {
  high:   'Alto',
  medium: 'Atenção',
  low:    'OK',
};

function aggMissing(cards: KanbanCard[]): MissingAgg[] {
  const map = new Map<string, MissingAgg>();
  cards.forEach(c => {
    (c.missing || []).forEach(m => {
      const cur = map.get(m.value);
      if (cur) cur.count += 1;
      else map.set(m.value, { value: m.value, label: m.label, count: 1 });
    });
  });
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function calcRisk(noLinkPct: number, expiredPct: number): RiskLevel {
  if (noLinkPct >= 50 || expiredPct >= 30) return 'high';
  if (noLinkPct >= 20) return 'medium';
  return 'low';
}

function csvEscape(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function KanbanMacroBySchool({ cards, schools, onGenerateLink }: Props) {
  const [filterSchoolId, setFilterSchoolId] = useState('all');
  const [searchSchool, setSearchSchool] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('risk');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [missingDoc, setMissingDoc] = useState<{ value: string; label: string } | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const handleSchoolDrill = (schoolName: string) => {
    setExpanded(schoolName);
    setTimeout(() => {
      rowRefs.current[schoolName]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  const aggregates = useMemo<SchoolAggregate[]>(() => {
    const buckets = new Map<string, KanbanCard[]>();
    cards.forEach(c => {
      const names = c.school_names && c.school_names.length > 0
        ? c.school_names
        : ['(Sem escola vinculada)'];
      names.forEach(name => {
        const arr = buckets.get(name) ?? [];
        arr.push(c);
        buckets.set(name, arr);
      });
    });

    const out: SchoolAggregate[] = [];
    buckets.forEach((arr, schoolName) => {
      const byColumn: Record<KanbanColumn, number> = { awaiting_link: 0, link_sent: 0, in_progress: 0, completed: 0 };
      let completed = 0, expired = 0, noLink = 0, inProgress = 0, sumPct = 0;
      arr.forEach(c => {
        byColumn[c.effective_column] += 1;
        if (c.is_complete) completed += 1;
        if (c.link_status === 'expired') expired += 1;
        if (c.link_status === 'none') noLink += 1;
        if (c.effective_column === 'in_progress') inProgress += 1;
        sumPct += (c.completion_pct ?? 0);
      });
      const total = arr.length;
      const noLinkPct = total > 0 ? (noLink / total) * 100 : 0;
      const expiredPct = total > 0 ? (expired / total) * 100 : 0;
      out.push({
        schoolName,
        total,
        byColumn,
        completed,
        expired,
        noLink,
        inProgress,
        avgPct: total > 0 ? Math.round(sumPct / total) : 0,
        pctCompleted: total > 0 ? Math.round((completed / total) * 100) : 0,
        risk: calcRisk(noLinkPct, expiredPct),
        cards: arr.slice().sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR')),
        topMissing: aggMissing(arr).slice(0, 3),
      });
    });
    return out;
  }, [cards]);

  const filtered = useMemo(() => {
    let r = aggregates;
    if (filterSchoolId !== 'all') {
      const target = schools.find(s => s.id === filterSchoolId)?.nome;
      r = target ? r.filter(a => a.schoolName === target) : [];
    }
    const q = searchSchool.trim().toLowerCase();
    if (q) r = r.filter(a => a.schoolName.toLowerCase().includes(q));
    return r;
  }, [aggregates, filterSchoolId, searchSchool, schools]);

  const sorted = useMemo(() => {
    const riskWeight: Record<RiskLevel, number> = { high: 3, medium: 2, low: 1 };
    const arr = filtered.slice();
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':  cmp = a.schoolName.localeCompare(b.schoolName, 'pt-BR'); break;
        case 'pct':   cmp = a.pctCompleted - b.pctCompleted; break;
        case 'total': cmp = a.total - b.total; break;
        case 'risk':  cmp = riskWeight[a.risk] - riskWeight[b.risk]; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  const totals = useMemo(() => {
    const t = filtered.reduce(
      (acc, a) => {
        acc.total += a.total;
        acc.completed += a.completed;
        acc.pending += (a.noLink + a.expired);
        return acc;
      },
      { total: 0, completed: 0, pending: 0 }
    );
    const avg = filtered.length
      ? Math.round(filtered.reduce((s, a) => s + a.avgPct, 0) / filtered.length)
      : 0;
    return { ...t, avg };
  }, [filtered]);

  const toggleSort = (k: SortKey) => {
    if (sortBy === k) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(k); setSortDir(k === 'name' ? 'asc' : 'desc'); }
  };

  const exportCsv = () => {
    const header = ['Escola', 'Professor', 'Matrícula', 'Status', '% Conclusão', 'Link', 'Documentos faltantes'];
    const lines: string[] = [header.map(csvEscape).join(',')];
    filtered.forEach(agg => {
      agg.cards.forEach(c => {
        const status = KANBAN_COLUMNS.find(k => k.id === c.effective_column)?.title ?? c.effective_column;
        const linkLabel = c.link_status === 'active' ? 'Ativo' : c.link_status === 'expired' ? 'Expirado' : 'Sem link';
        const missing = (c.missing || []).map(m => m.label).join(' · ');
        lines.push([
          agg.schoolName,
          c.full_name,
          c.registration_code ?? '',
          status,
          c.completion_pct ?? 0,
          linkLabel,
          missing,
        ].map(csvEscape).join(','));
      });
    });
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kanban-professores-por-escola-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortBtn = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className={`inline-flex items-center gap-1 hover:text-foreground transition ${sortBy === k ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
    >
      {children}
      {sortBy === k && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
    </button>
  );

  return (
    <div className="space-y-3">
      {/* Barra única: filtros + KPIs inline + export */}
      <Card>
        <CardContent className="p-3 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          <div className="flex flex-col sm:flex-row gap-2 flex-1 min-w-0">
            <SearchableSelect
              value={filterSchoolId}
              onValueChange={setFilterSchoolId}
              placeholder="Todas as escolas"
              triggerClassName="w-full sm:w-[240px]"
              options={[
                { value: 'all', label: `Todas as escolas (${aggregates.length})` },
                ...schools.map(s => ({ value: s.id, label: s.nome })),
              ]}
            />
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar escola..."
                value={searchSchool}
                onChange={e => setSearchSchool(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex items-center gap-5 text-sm shrink-0 px-1">
            <div>
              <span className="text-muted-foreground">Profs: </span>
              <span className="font-semibold tabular-nums">{totals.total}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Completos: </span>
              <span className="font-semibold tabular-nums text-emerald-700">{totals.completed}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Pendentes link: </span>
              <span className="font-semibold tabular-nums text-amber-700">{totals.pending}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Média: </span>
              <span className="font-semibold tabular-nums">{totals.avg}%</span>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-2 shrink-0">
            <Download className="h-4 w-4" /> CSV
          </Button>
        </CardContent>
      </Card>

      {/* Painel de indicadores (KPIs + gráficos) */}
      <MacroIndicators
        aggregates={filtered}
        cards={cards}
        onSchoolClick={handleSchoolDrill}
        onMissingDocClick={(value, label) => setMissingDoc({ value, label })}
      />

      {missingDoc && (
        <MissingDocDrilldown
          cards={cards}
          docValue={missingDoc.value}
          docLabel={missingDoc.label}
          onClose={() => setMissingDoc(null)}
          onGenerateLink={onGenerateLink}
        />
      )}

      {/* Tabela enxuta */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {sorted.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Nenhuma escola encontrada.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs border-b">
                <tr className="text-left">
                  <th className="p-3 w-8" />
                  <th className="p-3"><SortBtn k="name">Escola</SortBtn></th>
                  <th className="p-3 text-center w-20"><SortBtn k="total">Profs</SortBtn></th>
                  <th className="p-3 text-center w-32"><SortBtn k="pct">Completos</SortBtn></th>
                  <th className="p-3 min-w-[160px]">Distribuição</th>
                  <th className="p-3 text-center w-24"><SortBtn k="risk">Risco</SortBtn></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(agg => {
                  const isOpen = expanded === agg.schoolName;
                  return (
                    <>
                      <tr
                        key={agg.schoolName}
                        ref={el => { rowRefs.current[agg.schoolName] = el; }}
                        className="border-b hover:bg-muted/30 cursor-pointer"
                        onClick={() => setExpanded(isOpen ? null : agg.schoolName)}
                      >
                        <td className="p-3 text-muted-foreground">
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium break-words">{agg.schoolName}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center tabular-nums text-muted-foreground">{agg.total}</td>
                        <td className="p-3 text-center tabular-nums">
                          <span className="font-semibold">{agg.completed}</span>
                          <span className="text-muted-foreground"> · {agg.pctCompleted}%</span>
                        </td>
                        <td className="p-3">
                          <div
                            className="flex h-1.5 rounded-full overflow-hidden bg-muted"
                            title={KANBAN_COLUMNS.map(c => `${c.title}: ${agg.byColumn[c.id]}`).join(' · ')}
                          >
                            {KANBAN_COLUMNS.map(col => {
                              const v = agg.byColumn[col.id];
                              if (v === 0) return null;
                              return (
                                <div
                                  key={col.id}
                                  className={COLUMN_ACCENTS[col.id]}
                                  style={{ width: `${(v / Math.max(agg.total, 1)) * 100}%` }}
                                />
                              );
                            })}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className={`h-2 w-2 rounded-full ${RISK_DOT[agg.risk]}`} />
                            {RISK_LABEL[agg.risk]}
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr key={`${agg.schoolName}-exp`} className="border-b bg-muted/20">
                          <td />
                          <td colSpan={5} className="p-4 space-y-3">
                            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
                              {KANBAN_COLUMNS.map(col => (
                                <div key={col.id} className="inline-flex items-center gap-1.5">
                                  <span className={`h-2 w-2 rounded-full ${COLUMN_ACCENTS[col.id]}`} />
                                  <span className="text-muted-foreground">{col.title}:</span>
                                  <span className={`font-semibold ${COLUMN_TEXT[col.id]}`}>{agg.byColumn[col.id]}</span>
                                </div>
                              ))}
                              <div className="inline-flex items-center gap-1.5 ml-auto">
                                <span className="text-muted-foreground">Média preench.:</span>
                                <span className="font-semibold">{agg.avgPct}%</span>
                              </div>
                            </div>

                            {agg.topMissing.length > 0 && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">Mais faltantes: </span>
                                {agg.topMissing.map((m, i) => (
                                  <span key={m.value}>
                                    <span className="font-medium">{m.label}</span>
                                    <span className="text-muted-foreground"> ({m.count})</span>
                                    {i < agg.topMissing.length - 1 && <span className="text-muted-foreground"> · </span>}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                              {agg.cards.map(c => {
                                const showAction = onGenerateLink && (c.link_status === 'none' || c.link_status === 'expired');
                                return (
                                  <div key={c.professor_id} className="flex items-center gap-2 px-2 py-1.5 rounded border bg-background text-xs">
                                    <span className={`h-2 w-2 rounded-full shrink-0 ${COLUMN_ACCENTS[c.effective_column]}`} />
                                    <span className="flex-1 truncate" title={c.full_name}>{c.full_name}</span>
                                    <span className="text-muted-foreground tabular-nums">{c.completion_pct}%</span>
                                    {showAction && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 shrink-0"
                                        title={c.link_status === 'expired' ? 'Renovar link' : 'Gerar link'}
                                        onClick={(e) => { e.stopPropagation(); onGenerateLink!(c); }}
                                      >
                                        <Send className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
