"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import type { OnChangeFn, SortingState } from "@tanstack/react-table";

import useAsync from "@/src/hooks/use-async";
import { useDebounce } from "@/src/hooks/use-debounce";
import { runAsyncTask } from "@/src/lib/async";

export type PaginationSort<TKey extends string> = {
  key: TKey;
  descending: boolean;
};

export type PaginationRequest<TKey extends string, TFilters extends object> = {
  page: number;
  pageSize: number;
  query: string;
  sort: PaginationSort<TKey>;
  filters: TFilters;
};

export type PaginationResult<T> = {
  data: T;
  total: number;
};

type UsePaginationStateOptions<
  T,
  TSortKey extends string,
  TFilters extends object,
> = {
  fetchPage: (
    request: PaginationRequest<TSortKey, TFilters>,
  ) => Promise<PaginationResult<T>>;
  initialSort: PaginationSort<TSortKey>;
  initialFilters: TFilters;
  pageSize?: number;
  initialPage?: number;
  initialQuery?: string;
  queryDebounceMs?: number;
};

export function usePaginationState<
  T,
  TSortKey extends string,
  TFilters extends object,
>({
  fetchPage,
  initialSort,
  initialFilters,
  pageSize = 10,
  initialPage = 1,
  initialQuery = "",
  queryDebounceMs = 300,
}: UsePaginationStateOptions<T, TSortKey, TFilters>) {
  const effectivePageSize = Math.min(Math.max(pageSize, 1), 100);
  const [data, setData] = useState<T | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPageState] = useState(Math.max(initialPage, 1));
  const [query, setQueryState] = useState(initialQuery);
  const initialSortRef = useRef(initialSort);
  const [sortingState, setSortingState] = useState<SortingState>([
    { id: initialSort.key, desc: initialSort.descending },
  ]);
  const [filters, setFiltersState] = useState<TFilters>(initialFilters);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<unknown>(null);
  const requestSequence = useRef(0);
  const { isLoading, execute } = useAsync(true);
  const delayedQuery = useDebounce(query, queryDebounceMs);
  const debouncedQuery = query.trim() ? delayedQuery : "";
  const pageCount = Math.max(1, Math.ceil(total / effectivePageSize));
  const sort = useMemo<PaginationSort<TSortKey>>(() => {
    const [activeSort] = sortingState;

    return activeSort
      ? { key: activeSort.id as TSortKey, descending: activeSort.desc }
      : initialSortRef.current;
  }, [sortingState]);

  useEffect(() => {
    console.log("debouncedQuery", debouncedQuery);
    const request = ++requestSequence.current;

    setError(null);

    (async () => {
      const result = await execute<[], PaginationResult<T> | undefined>(() =>
        runAsyncTask({
          action: () =>
            fetchPage({
              page,
              pageSize: effectivePageSize,
              query: debouncedQuery,
              sort,
              filters,
            }),
          onError: (requestError) => {
            if (request === requestSequence.current) setError(requestError);
          },
        }),
      );

      if (!result || request !== requestSequence.current) return;

      setData(result.data);
      setTotal(result.total);
    })();

    return () => {
      if (request === requestSequence.current) requestSequence.current += 1;
    };
  }, [
    debouncedQuery,
    effectivePageSize,
    execute,
    fetchPage,
    filters,
    page,
    refreshKey,
    sort,
  ]);

  useEffect(() => {
    if (page > pageCount) setPageState(pageCount);
  }, [page, pageCount]);

  const setPage = useCallback((nextPage: number) => {
    setPageState(Math.max(1, Math.floor(nextPage)));
  }, []);

  const setQuery = useCallback((nextQuery: string) => {
    setQueryState(nextQuery);
    setPageState(1);
  }, []);

  const setSortState = useCallback<OnChangeFn<SortingState>>((updater) => {
    setSortingState((current) =>
      typeof updater === "function" ? updater(current) : updater,
    );
    setPageState(1);
  }, []);

  const setFilters = useCallback((nextFilters: SetStateAction<TFilters>) => {
    setFiltersState(nextFilters);
    setPageState(1);
  }, []);

  const resetQueryAndFilters = useCallback(
    (nextFilters: SetStateAction<TFilters>) => {
      setQueryState("");
      setFiltersState(nextFilters);
      setPageState(1);
    },
    [],
  );

  const refresh = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  return {
    data,
    total,
    page,
    pageSize: effectivePageSize,
    pageCount,
    query,
    sort,
    sortingState,
    filters,
    isLoading,
    error,
    setPage,
    setQuery,
    setSortState,
    setFilters,
    resetQueryAndFilters,
    refresh,
  };
}
