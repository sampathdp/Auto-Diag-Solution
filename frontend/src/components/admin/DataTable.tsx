"use client";

import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/admin/ui/Checkbox";
import { Select } from "@/components/admin/ui/Select";
import { EmptyState, type EmptyStateProps } from "@/components/admin/ui/EmptyState";
import { SkeletonRow, SkeletonCard } from "@/components/admin/ui/Skeleton";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  isLoading?: boolean;
  getRowId?: (row: TData, index: number) => string;

  /** Omit all four to render without a pagination footer (e.g. a fixed "last 10" widget). */
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];

  /** Omit to disable sorting UI entirely. */
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;

  selectable?: boolean;
  bulkActions?: (selectedRows: TData[], clearSelection: () => void) => React.ReactNode;

  toolbar?: React.ReactNode;
  emptyState?: EmptyStateProps;

  /** Custom mobile card renderer; falls back to a generic label/value stack. */
  renderMobileCard?: (row: TData) => React.ReactNode;

  /** Makes each row clickable (e.g. navigate to a detail page). Selection/action cells stop propagation. */
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData extends object>({
  columns,
  data,
  isLoading = false,
  getRowId,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  sorting = [],
  onSortingChange,
  selectable = false,
  bulkActions,
  toolbar,
  emptyState,
  renderMobileCard,
  onRowClick,
}: DataTableProps<TData>) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const allColumns: ColumnDef<TData, any>[] = selectable
    ? [
        {
          id: "__select",
          header: ({ table }) => (
            <Checkbox
              checked={table.getIsAllPageRowsSelected()}
              onChange={table.getToggleAllPageRowsSelectedHandler()}
            />
          ),
          cell: ({ row }) => <Checkbox checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />,
          enableSorting: false,
        },
        ...columns,
      ]
    : columns;

  const table = useReactTable({
    data,
    columns: allColumns,
    state: { sorting, rowSelection },
    manualPagination: true,
    manualSorting: true,
    enableSorting: Boolean(onSortingChange),
    enableRowSelection: selectable,
    getRowId,
    onRowSelectionChange: setRowSelection,
    onSortingChange: (updater) => {
      if (!onSortingChange) return;
      onSortingChange(typeof updater === "function" ? updater(sorting) : updater);
    },
    getCoreRowModel: getCoreRowModel(),
  });

  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);
  const clearSelection = () => setRowSelection({});

  const paginated = page !== undefined && pageSize !== undefined && total !== undefined && onPageChange && onPageSizeChange;
  const from = paginated && total! > 0 ? (page! - 1) * pageSize! + 1 : 0;
  const to = paginated ? Math.min(page! * pageSize!, total!) : 0;
  const totalPages = paginated ? Math.max(1, Math.ceil(total! / pageSize!)) : 1;

  const rows = table.getRowModel().rows;
  const isEmpty = !isLoading && rows.length === 0;

  return (
    <div className="space-y-3">
      {toolbar && <div className="flex flex-wrap items-center gap-3">{toolbar}</div>}

      {selectable && selectedRows.length > 0 && bulkActions && (
        <div className="flex flex-wrap items-center gap-3 rounded-sm border border-primary/20 bg-primary/5 px-4 py-2.5">
          <span className="text-body font-semibold text-ink">{selectedRows.length} selected</span>
          <div className="flex flex-wrap items-center gap-2">{bulkActions(selectedRows, clearSelection)}</div>
          <button
            type="button"
            onClick={clearSelection}
            className="ml-auto text-caption font-semibold text-ink-muted hover:text-ink"
          >
            Clear
          </button>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface shadow-sm md:block">
        <table className="w-full text-body">
          <thead className="sticky top-0 z-[1] bg-app text-left text-caption font-semibold uppercase tracking-wide text-ink-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className={cn("whitespace-nowrap px-4 py-3", canSort && "cursor-pointer select-none")}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <span className="inline-flex items-center gap-1">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort &&
                          (sorted === "asc" ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : sorted === "desc" ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 opacity-40" />
                          ))}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: Math.min(pageSize ?? 8, 8) }).map((_, i) => (
                <SkeletonRow key={i} columns={allColumns.length} />
              ))
            ) : isEmpty ? (
              <tr>
                <td colSpan={allColumns.length} className="px-4 py-2">
                  {emptyState ? (
                    <EmptyState {...emptyState} />
                  ) : (
                    <p className="py-10 text-center text-ink-muted">No records found.</p>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(
                    "hover:bg-app/60",
                    row.getIsSelected() && "bg-primary/5",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="whitespace-nowrap px-4 py-3 text-ink"
                      onClick={cell.column.id === "__select" || cell.column.id === "__actions" ? (e) => e.stopPropagation() : undefined}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="space-y-3 md:hidden">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
        ) : isEmpty ? (
          emptyState ? (
            <EmptyState {...emptyState} />
          ) : (
            <p className="py-10 text-center text-ink-muted">No records found.</p>
          )
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              className={cn("rounded-lg border border-border bg-surface p-4 shadow-sm", onRowClick && "cursor-pointer")}
            >
              {renderMobileCard ? (
                renderMobileCard(row.original)
              ) : (
                <dl className="space-y-2">
                  {row
                    .getVisibleCells()
                    .filter((cell) => cell.column.id !== "__select")
                    .map((cell) => {
                      const header = cell.column.columnDef.header;
                      const label = typeof header === "string" ? header : cell.column.id;
                      return (
                        <div key={cell.id} className="flex items-center justify-between gap-3 text-body">
                          {label && (
                            <dt className="text-caption font-semibold uppercase tracking-wide text-ink-muted">
                              {label}
                            </dt>
                          )}
                          <dd className="ml-auto text-right text-ink">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </dd>
                        </div>
                      );
                    })}
                </dl>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination footer */}
      {paginated && !isLoading && total! > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-1 py-3 sm:flex-row">
          <div className="flex items-center gap-3 text-caption text-ink-muted">
            <span>
              Showing {from} to {to} of {total}
            </span>
            <Select
              value={pageSize}
              onChange={(e) => onPageSizeChange!(Number(e.target.value))}
              className="h-8 w-auto py-0 pr-7 text-caption"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange!(page! - 1)}
              disabled={page! <= 1}
              aria-label="Previous page"
              className="rounded-sm p-1.5 text-ink-muted hover:bg-app disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-caption text-ink">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => onPageChange!(page! + 1)}
              disabled={page! >= totalPages}
              aria-label="Next page"
              className="rounded-sm p-1.5 text-ink-muted hover:bg-app disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
