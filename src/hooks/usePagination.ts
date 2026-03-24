import { useState, useMemo } from 'react';

interface PaginationOptions {
  total: number;
  pageSize?: number;
  initialPage?: number;
}

interface PaginationResult {
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  hasPrev: boolean;
  hasNext: boolean;
  setPage: (page: number) => void;
  prevPage: () => void;
  nextPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  /** Slice an array to the current page */
  paginate: <T>(arr: T[]) => T[];
}

/**
 * Pagination state management.
 * Reset page to 1 whenever total changes (new search results).
 */
export function usePagination({
  total,
  pageSize = 25,
  initialPage = 1,
}: PaginationOptions): PaginationResult {
  const [page, setPageRaw] = useState(initialPage);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const setPage = (p: number) => setPageRaw(Math.max(1, Math.min(totalPages, p)));
  const from = Math.min(total, (page - 1) * pageSize + 1);
  const to = Math.min(total, page * pageSize);

  const paginate = useMemo(
    () =>
      <T>(arr: T[]): T[] =>
        arr.slice((page - 1) * pageSize, page * pageSize),
    [page, pageSize],
  );

  return {
    page,
    pageSize,
    totalPages,
    total,
    from,
    to,
    hasPrev: page > 1,
    hasNext: page < totalPages,
    setPage,
    prevPage: () => setPage(page - 1),
    nextPage: () => setPage(page + 1),
    firstPage: () => setPage(1),
    lastPage: () => setPage(totalPages),
    paginate,
  };
}
