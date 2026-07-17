import { useState, useCallback, useMemo } from 'react';

export interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface UseServerPaginationReturn {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  from: number;
  to: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotalCount: (count: number) => void;
  resetPage: () => void;
  /** Supabase .range() args */
  rangeFrom: number;
  rangeTo: number;
  canPreviousPage: boolean;
  canNextPage: boolean;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  goToPreviousPage: () => void;
  goToNextPage: () => void;
}

export function useServerPagination(initialPageSize = 25): UseServerPaginationReturn {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / pageSize)), [totalCount, pageSize]);
  const rangeFrom = (page - 1) * pageSize;
  const rangeTo = rangeFrom + pageSize - 1;
  const from = totalCount === 0 ? 0 : rangeFrom + 1;
  const to = Math.min(rangeFrom + pageSize, totalCount);

  const canPreviousPage = page > 1;
  const canNextPage = page < totalPages;

  const resetPage = useCallback(() => setPage(1), []);
  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  const goToFirstPage = useCallback(() => setPage(1), []);
  const goToLastPage = useCallback(() => setPage(totalPages), [totalPages]);
  const goToPreviousPage = useCallback(() => setPage(p => Math.max(1, p - 1)), []);
  const goToNextPage = useCallback(() => setPage(p => Math.min(totalPages, p + 1)), [totalPages]);

  return {
    page, pageSize, totalCount, totalPages,
    from, to, rangeFrom, rangeTo,
    setPage, setPageSize, setTotalCount, resetPage,
    canPreviousPage, canNextPage,
    goToFirstPage, goToLastPage, goToPreviousPage, goToNextPage,
  };
}
