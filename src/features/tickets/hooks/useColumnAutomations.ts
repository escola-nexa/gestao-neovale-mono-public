import { useState, useEffect, useCallback } from 'react';
import type { DropEffect } from '../components/DropEffectOverlay';

/**
 * Automações por coluna (Butler enxuto).
 * Persistido em localStorage por organização para simplicidade,
 * já que o trigger SQL `tg_complete_checklists_on_resolve` é universal e
 * as demais regras são heurísticas client-side.
 */
export interface ColumnAutomations {
  completeChecklistsOnResolve: boolean;
  notifyDueSoon: boolean;
  autoStatusOnEnter: boolean;
  /** Efeito visual disparado quando um ticket é solto nesta coluna. */
  dropEffect: DropEffect;
}

const DEFAULTS: ColumnAutomations = {
  completeChecklistsOnResolve: true,
  notifyDueSoon: true,
  autoStatusOnEnter: true,
  dropEffect: 'none',
};

const KEY = (orgId: string, listId: string) => `nexa.kanban.automations.${orgId}.${listId}`;

/** Leitura síncrona (sem React) — usada pelo handler de drop. */
export function readColumnAutomations(organizationId: string | null, listId: string): ColumnAutomations {
  if (!organizationId || !listId) return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY(organizationId, listId));
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULTS;
}

export function useColumnAutomations(organizationId: string | null, listId: string) {
  const [config, setConfig] = useState<ColumnAutomations>(DEFAULTS);

  useEffect(() => {
    setConfig(readColumnAutomations(organizationId, listId));
  }, [organizationId, listId]);

  const update = useCallback((patch: Partial<ColumnAutomations>) => {
    setConfig(prev => {
      const next = { ...prev, ...patch };
      if (organizationId && listId) {
        try { localStorage.setItem(KEY(organizationId, listId), JSON.stringify(next)); } catch {}
      }
      return next;
    });
  }, [organizationId, listId]);

  return { config, update };
}
