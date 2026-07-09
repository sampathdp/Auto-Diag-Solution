"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { SortingState } from "@tanstack/react-table";

export interface UseDataTableOptions {
  defaultPageSize?: number;
  defaultSort?: { id: string; desc: boolean } | null;
}

/**
 * Page/sort/search/filter state stored in the URL query string, so a page
 * refresh (or a shared link) keeps the same table state. Every admin list
 * page should drive its DataTable off this hook rather than local useState.
 */
export function useDataTable({ defaultPageSize = 20, defaultSort = null }: UseDataTableOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("per_page") ?? defaultPageSize);
  const search = searchParams.get("q") ?? "";

  const sorting: SortingState = useMemo(() => {
    const sortId = searchParams.get("sort");
    if (sortId) return [{ id: sortId, desc: searchParams.get("order") === "desc" }];
    return defaultSort ? [defaultSort] : [];
  }, [searchParams, defaultSort]);

  const setParams = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === "") params.delete(key);
        else params.set(key, String(value));
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  return {
    page,
    pageSize,
    search,
    sorting,
    setPage: (next: number) => setParams({ page: next === 1 ? null : next }),
    setPageSize: (next: number) => setParams({ per_page: next === defaultPageSize ? null : next, page: null }),
    setSearch: (next: string) => setParams({ q: next || null, page: null }),
    setSorting: (next: SortingState) => {
      const first = next[0];
      setParams({ sort: first?.id ?? null, order: first?.desc ? "desc" : null, page: null });
    },
    getFilter: (key: string) => searchParams.get(key) ?? "",
    setFilter: (key: string, value: string | null) => setParams({ [key]: value, page: null }),
    clearFilters: (keys: string[]) => setParams(Object.fromEntries(keys.map((k) => [k, null]))),
  };
}
