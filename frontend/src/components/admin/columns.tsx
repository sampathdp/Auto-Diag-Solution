import type { ColumnDef } from "@tanstack/react-table";
import { formatAED, formatDate } from "@/lib/admin/utils";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { ActionsMenu, type RowAction } from "./ActionsMenu";

/**
 * Built-in column types for the reusable DataTable. These are factory
 * functions returning a plain @tanstack/react-table ColumnDef — pages can
 * still hand-write a ColumnDef for anything bespoke and mix it into the same
 * array, DataTable itself doesn't care how a column was built.
 */

export function textColumn<TData>(accessorKey: keyof TData & string, header: string): ColumnDef<TData, any> {
  return {
    accessorKey,
    header,
    cell: ({ getValue }) => <span>{String(getValue() ?? "")}</span>,
  };
}

export function badgeColumn<TData>(accessorKey: keyof TData & string, header: string): ColumnDef<TData, any> {
  return {
    accessorKey,
    header,
    cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
  };
}

export function currencyColumn<TData>(accessorKey: keyof TData & string, header: string): ColumnDef<TData, any> {
  return {
    accessorKey,
    header,
    cell: ({ getValue }) => formatAED(Number(getValue() ?? 0)),
  };
}

export function dateColumn<TData>(accessorKey: keyof TData & string, header: string): ColumnDef<TData, any> {
  return {
    accessorKey,
    header,
    cell: ({ getValue }) => formatDate(String(getValue())),
  };
}

export function imageColumn<TData>(accessorKey: keyof TData & string, header: string): ColumnDef<TData, any> {
  return {
    accessorKey,
    header,
    enableSorting: false,
    cell: ({ getValue }) => {
      const src = getValue() as string | null | undefined;
      return src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-10 w-10 rounded-sm object-cover" />
      ) : (
        <div className="h-10 w-10 rounded-sm bg-app" />
      );
    },
  };
}

export function actionsColumn<TData>(getActions: (row: TData) => RowAction[]): ColumnDef<TData, any> {
  return {
    id: "__actions",
    header: "",
    enableSorting: false,
    cell: ({ row }) => <ActionsMenu actions={getActions(row.original)} />,
  };
}
