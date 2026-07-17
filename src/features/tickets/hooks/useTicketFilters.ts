import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export type TicketView = 'mine' | 'assigned' | 'unassigned' | 'critical' | 'all';
export type DueFilter = 'all' | 'overdue' | 'dueSoon';
export type KpiFilter = 'all' | 'open' | 'risk' | 'overdue' | 'resolved';

export interface TicketFilters {
  view: TicketView;
  search: string;
  status: string;
  priority: string;
  type: string;
  schoolId: string;
  responsible: string;
  media: boolean;
  viewMode: 'list' | 'kanban';
  groupBy: 'none' | 'school' | 'priority' | 'status' | 'responsible';
  labels: string[];      // novos: ids de etiquetas (multi)
  dueFilter: DueFilter;  // overdue | dueSoon (≤2d) | all
  kpi: KpiFilter;        // recorte ativo de KPI (em aberto / risco / atrasados / resolvidos)
}

const DEFAULTS: TicketFilters = {
  view: 'all',
  search: '',
  status: 'all',
  priority: 'all',
  type: 'all',
  schoolId: 'all',
  responsible: 'all',
  media: false,
  viewMode: 'list',
  groupBy: 'none',
  labels: [],
  dueFilter: 'all',
  kpi: 'all',
};

export function useTicketFilters(defaultView: TicketView = 'all') {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<TicketFilters>(() => {
    const labelsRaw = params.get('labels');
    return {
      view: (params.get('view') as TicketView) || defaultView,
      search: params.get('q') || '',
      status: params.get('status') || 'all',
      priority: params.get('priority') || 'all',
      type: params.get('type') || 'all',
      schoolId: params.get('school') || 'all',
      responsible: params.get('resp') || 'all',
      media: params.get('media') === '1',
      viewMode: (params.get('mode') as 'list' | 'kanban') || 'list',
      groupBy: (params.get('group') as TicketFilters['groupBy']) || 'none',
      labels: labelsRaw ? labelsRaw.split(',').filter(Boolean) : [],
      dueFilter: (params.get('due') as DueFilter) || 'all',
      kpi: (params.get('kpi') as KpiFilter) || 'all',
    };
  }, [params, defaultView]);

  const update = useCallback((patch: Partial<TicketFilters>) => {
    setParams(prev => {
      const next = new URLSearchParams(prev);
      const map: Record<keyof TicketFilters, string> = {
        view: 'view', search: 'q', status: 'status', priority: 'priority',
        type: 'type', schoolId: 'school', responsible: 'resp', media: 'media',
        viewMode: 'mode', groupBy: 'group', labels: 'labels', dueFilter: 'due',
        kpi: 'kpi',
      };
      const alwaysPersist = new Set<keyof TicketFilters>(['view', 'viewMode']);

      Object.entries(patch).forEach(([k, v]) => {
        const key = map[k as keyof TicketFilters];
        const isIdentity = alwaysPersist.has(k as keyof TicketFilters);
        if (Array.isArray(v)) {
          if (v.length === 0) next.delete(key);
          else next.set(key, v.join(','));
          return;
        }
        if (!isIdentity && (v === undefined || v === null || v === '' || v === 'all' || v === false)) {
          next.delete(key);
        } else if (typeof v === 'boolean') {
          if (v) next.set(key, '1'); else next.delete(key);
        } else if (v === undefined || v === null) {
          next.delete(key);
        } else {
          next.set(key, String(v));
        }
      });
      return next;
    }, { replace: true });
  }, [setParams]);

  const toggleLabel = useCallback((labelId: string) => {
    const current = filters.labels;
    const next = current.includes(labelId)
      ? current.filter(id => id !== labelId)
      : [...current, labelId];
    update({ labels: next });
  }, [filters.labels, update]);

  const clearAdvanced = useCallback(() => {
    setParams(prev => {
      const next = new URLSearchParams(prev);
      ['status', 'priority', 'type', 'school', 'resp', 'media', 'labels', 'due', 'kpi'].forEach(k => next.delete(k));
      return next;
    }, { replace: true });
  }, [setParams]);

  const activeAdvancedCount = useMemo(() => {
    let n = 0;
    if (filters.status !== 'all') n++;
    if (filters.priority !== 'all') n++;
    if (filters.type !== 'all') n++;
    if (filters.schoolId !== 'all') n++;
    if (filters.responsible !== 'all') n++;
    if (filters.media) n++;
    if (filters.labels.length > 0) n++;
    if (filters.dueFilter !== 'all') n++;
    if (filters.kpi && filters.kpi !== 'all') n++;
    return n;
  }, [filters]);

  const hasViewParam = params.has('view');
  const hasViewModeParam = params.has('mode');

  return { filters, update, toggleLabel, clearAdvanced, activeAdvancedCount, hasViewParam, hasViewModeParam };
}
