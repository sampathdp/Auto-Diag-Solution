"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { Input } from "@/components/admin/ui/Input";
import { Select } from "@/components/admin/ui/Select";
import { Badge } from "@/components/admin/ui/Badge";
import { actionsColumn } from "@/components/admin/columns";
import { SeoDrawerForm } from "@/components/admin/content/SeoDrawerForm";
import { buildSeoRows, type SeoRow } from "@/components/admin/content/seo-rows";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import type { PaginatedResponse } from "@/types/api";
import { toMediaItem, type RawMediaRow } from "@/lib/admin/mediaAdapter";
import type { Category } from "@/mocks/admin/db";
import type { Product } from "@/types/product";
import type { Page } from "@/types/page";
import type { SeoMeta } from "@/types/seo";

const TYPE_LABEL: Record<string, string> = {
  custom: "Home",
  category: "Category",
  product: "Product",
  page: "Page",
};

export default function AdminSeoPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeRow, setActiveRow] = useState<SeoRow | null>(null);

  // /seo, /categories, /products and /pages are all {items, meta}-paginated on the
  // real backend — only /settings is a flat array (see the Settings page).
  const seoQuery = useAdminQuery<PaginatedResponse<SeoMeta>>(adminQueryKeys.seo.all, "/seo", {
    per_page: 200,
  });
  const categoriesQuery = useAdminQuery<PaginatedResponse<Category>>(
    adminQueryKeys.categories.all,
    "/categories",
    { per_page: 100 }
  );
  const productsQuery = useAdminQuery<PaginatedResponse<Product>>(
    adminQueryKeys.products.list({ per_page: 200 }),
    "/products",
    { per_page: 200 }
  );
  const pagesQuery = useAdminQuery<PaginatedResponse<Page>>(adminQueryKeys.pages.all, "/pages", {
    per_page: 100,
  });
  // toMediaItem: the API returns raw media rows (path, not url; string ids on the
  // live host) — the adapter normalizes both so lookups by numeric id work.
  const mediaQuery = useAdminQuery<PaginatedResponse<RawMediaRow>>(
    adminQueryKeys.media.list({ per_page: 200 }),
    "/media",
    { per_page: 200 }
  );

  const isLoading = seoQuery.isLoading || categoriesQuery.isLoading || productsQuery.isLoading || pagesQuery.isLoading;

  const mediaById = useMemo(
    () => new Map((mediaQuery.data?.items ?? []).map(toMediaItem).map((m) => [m.id, m])),
    [mediaQuery.data]
  );

  const rows = useMemo(
    () =>
      buildSeoRows(
        seoQuery.data?.items ?? [],
        categoriesQuery.data?.items ?? [],
        productsQuery.data?.items ?? [],
        pagesQuery.data?.items ?? []
      ),
    [seoQuery.data, categoriesQuery.data, productsQuery.data, pagesQuery.data]
  );

  const filteredRows = useMemo(() => {
    let list = rows;
    if (typeFilter) list = list.filter((r) => r.page_type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q) || r.path.toLowerCase().includes(q));
    }
    return list;
  }, [rows, typeFilter, search]);

  const columns: ColumnDef<SeoRow, any>[] = [
    { accessorKey: "page_type", header: "Type", cell: ({ row }) => <Badge variant="neutral">{TYPE_LABEL[row.original.page_type]}</Badge> },
    {
      accessorKey: "name",
      header: "Page",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-ink">{row.original.name}</p>
          <p className="font-mono text-caption text-ink-muted">{row.original.path}</p>
        </div>
      ),
    },
    { accessorKey: "title_en", header: "SEO Title (EN)", cell: ({ row }) => <span className="line-clamp-1 max-w-xs">{row.original.title_en}</span> },
    {
      accessorKey: "title_ar",
      header: "SEO Title (AR)",
      cell: ({ row }) => (
        <span className="line-clamp-1 max-w-xs" dir="rtl">
          {row.original.title_ar}
        </span>
      ),
    },
    actionsColumn<SeoRow>((row) => [{ label: "Edit", onClick: () => setActiveRow(row) }]),
  ];

  return (
    <div>
      <PageHeader title="SEO Manager" description="Bilingual SEO metadata for every route on the storefront." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input placeholder="Search pages…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64 pl-10" />
        </div>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-40">
          <option value="">All types</option>
          <option value="custom">Home</option>
          <option value="category">Category</option>
          <option value="product">Product</option>
          <option value="page">Page</option>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filteredRows}
        isLoading={isLoading}
        getRowId={(r) => r.key}
        onRowClick={(row) => setActiveRow(row)}
      />

      <SeoDrawerForm row={activeRow} onClose={() => setActiveRow(null)} mediaById={mediaById} />
    </div>
  );
}
