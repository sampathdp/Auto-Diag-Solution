"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { Download, Users } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/admin/ui/Button";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { formatAED } from "@/lib/admin/utils";
import { exportRowsToCsv } from "@/lib/admin/csvExport";
import type { Order } from "@/mocks/admin/db";

interface CustomerRow {
  customerId: number;
  name: string;
  email: string;
  ordersCount: number;
  totalSpent: number;
  avgOrderValue: number;
}

export function TopCustomersReport({ orders }: { orders: Order[] }) {
  const billable = orders.filter((o) => o.status !== "cancelled" && o.status !== "refunded");

  const rows: CustomerRow[] = useMemo(() => {
    const map = new Map<number, { name: string; email: string; ordersCount: number; totalSpent: number }>();
    for (const o of billable) {
      if (!map.has(o.customer_id)) {
        map.set(o.customer_id, { name: o.customer_name, email: o.customer_email, ordersCount: 0, totalSpent: 0 });
      }
      const entry = map.get(o.customer_id)!;
      entry.ordersCount += 1;
      entry.totalSpent += o.total;
    }
    return [...map.entries()]
      .map(([customerId, v]) => ({
        customerId,
        ...v,
        avgOrderValue: v.totalSpent / v.ordersCount,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }, [billable]);

  const top10 = rows.slice(0, 10);

  const columns: ColumnDef<CustomerRow, any>[] = [
    {
      accessorKey: "name",
      header: "Customer",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-ink">{row.original.name}</p>
          <p className="text-caption text-ink-muted">{row.original.email}</p>
        </div>
      ),
    },
    { accessorKey: "ordersCount", header: "Orders" },
    { accessorKey: "totalSpent", header: "Total Spent", cell: ({ row }) => formatAED(row.original.totalSpent) },
    { accessorKey: "avgOrderValue", header: "Avg Order Value", cell: ({ row }) => formatAED(Math.round(row.original.avgOrderValue)) },
  ];

  if (rows.length === 0) {
    return <EmptyState icon={Users} title="No customer activity in this range" />;
  }

  return (
    <div>
      <div className="mb-6 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-4 text-h4 font-bold text-ink">Top 10 customers by spend</h2>
        <Bar
          data={{
            labels: top10.map((r) => r.name),
            datasets: [{ label: "Total Spent (AED)", data: top10.map((r) => r.totalSpent), backgroundColor: "#16233F", borderRadius: 3 }],
          }}
          options={{ responsive: true, indexAxis: "y" as const, plugins: { legend: { display: false } } }}
        />
      </div>

      <div className="mb-3 flex justify-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            exportRowsToCsv(
              "top-customers.csv",
              ["Customer", "Email", "Orders", "Total Spent", "Avg Order Value"],
              rows.map((r) => [r.name, r.email, r.ordersCount, r.totalSpent, Math.round(r.avgOrderValue)])
            )
          }
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>
      <DataTable columns={columns} data={rows} getRowId={(r) => String(r.customerId)} />
    </div>
  );
}
