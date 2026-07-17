/**
 * Régua de conferência da Folha Mensal.
 * Avalia um conjunto de entradas e retorna um selo único.
 */
export type ConferenceSeal = 'ok' | 'attention' | 'divergent' | 'empty';

interface EntryLike {
  slot_type?: string | null;
  final_status: string;
  computed_status: string;
  is_manual_adjusted?: boolean | null;
}

const CONFERRED_FINAL = new Set([
  'present',
  'present_with_delay',
  'justified_absence',
  'absent',
]);

const DIVERGENT_COMPUTED = new Set([
  'divergent_professor',
  'divergent_schedule',
]);

export function computeConferenceSeal(entries: EntryLike[]): ConferenceSeal {
  if (!entries || entries.length === 0) return 'empty';

  let hasDivergent = false;
  let hasPending = false;

  for (const e of entries) {
    if (DIVERGENT_COMPUTED.has(e.computed_status)) hasDivergent = true;
    if (e.final_status === 'pending' || e.final_status === 'manual_review_required') {
      hasPending = true;
    }
    if (!CONFERRED_FINAL.has(e.final_status) && e.final_status !== 'cancelled' && e.final_status !== 'ignored') {
      // qualquer status não final conta como pendência
      hasPending = true;
    }
  }

  if (hasDivergent) return 'divergent';
  if (hasPending) return 'attention';
  return 'ok';
}

export const SEAL_LABEL: Record<ConferenceSeal, string> = {
  ok: 'Conferido',
  attention: 'Atenção',
  divergent: 'Divergente',
  empty: 'Sem aulas',
};

export const SEAL_CLASS: Record<ConferenceSeal, string> = {
  ok: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  attention: 'bg-amber-100 text-amber-800 border-amber-200',
  divergent: 'bg-red-100 text-red-700 border-red-200',
  empty: 'bg-slate-100 text-slate-600 border-slate-200',
};
