"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { DollarSign, ShoppingCart, TrendingUp, Package, Download } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { StatCard } from "@/components/admin/ui/StatCard";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { Button } from "@/components/admin/ui/Button";
import { formatAED, formatDate } from "@/lib/admin/utils";
import { exportRowsToCsv } from "@/lib/admin/csvExport";
import type { DateRange } from "./DateRangePicker";
import type { Order } from "@/mocks/admin/db";

export function SalesByDateReport({ orders, range }: { orders: Order[]; range: DateRange }) {
  const billable = orders.filter((o) => o.status !== "cancelled" && o.status !== "refunded");
  const totalRevenue = billable.reduce((sum, o) => sum + o.total, 0);
  const itemsSold = billable.reduce((sum, o) => sum + o.items.reduce((s, it) => s + it.quantity, 0), 0);
  const avgOrderValue = billable.length > 0 ? totalRevenue / billable.length : 0;

  const dailyRevenue = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of billable) {
      const day = o.created_at.slice(0, 10);
      map.set(day, (map.get(day) ?? 0) + o.total);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [billable]);

  const columns: ColumnDef<Order, any>[] = [
    { accessorKey: "order_number", header: "Order #" },
    { accessorKey: "customer_name", header: "Customer" },
    { accessorKey: "created_at", header: "Date", cell: ({ row }) => formatDate(row.original.created_at) },
    { accessorKey: "total", header: "Total", cell: ({ row }) => formatAED(row.original.total) },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  ];

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Revenue" value={formatAED(totalRevenue)} icon={DollarSign} />
        <StatCard label="Total Orders" value={String(orders.length)} icon={ShoppingCart} />
        <StatCard label="Avg Order Value" value={formatAED(Math.round(avgOrderValue))} icon={TrendingUp} />
        <StatCard label="Items Sold" value={String(itemsSold)} icon={Package} />
      </div>

      <div className="mb-6 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-4 text-h4 font-bold text-ink">
          Revenue — {range.from} to {range.to}
        </h2>
        {dailyRevenue.length === 0 ? (
          <p className="py-10 text-center text-body text-ink-muted">No orders in this range.</p>
        ) : (
          <Bar
            data={{
              labels: dailyRevenue.map(([day]) => formatDate(day)),
              datasets: [{ label: "Revenue (AED)", data: dailyRevenue.map(([, rev]) => rev), backgroundColor: "#E87722", borderRadius: 3 }],
            }}
            options={{ responsive: true, plugins: { legend: { display: false } } }}
          />
        )}
      </div>

      <div className="mb-3 flex justify-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            exportRowsToCsv(
              "sales-by-date.csv",
              ["Order #", "Customer", "Date", "Total", "Status"],
              orders.map((o) => [o.order_number, o.customer_name, o.created_at, o.total, o.status])
            )
          }
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>
      <DataTable columns={columns} data={orders} />
    </div>
  );
}
