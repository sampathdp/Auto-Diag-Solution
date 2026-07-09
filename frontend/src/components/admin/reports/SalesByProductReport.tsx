"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { Download, Package } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/admin/ui/Button";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { formatAED } from "@/lib/admin/utils";
import { exportRowsToCsv } from "@/lib/admin/csvExport";
import type { Order, Product } from "@/mocks/admin/db";

interface ProductRow {
  productId: number;
  name: string;
  sku: string;
  unitsSold: number;
  revenue: number;
}

export function SalesByProductReport({ orders, products }: { orders: Order[]; products: Product[] }) {
  const billable = orders.filter((o) => o.status !== "cancelled" && o.status !== "refunded");
  const productById = new Map(products.map((p) => [p.id, p]));

  const rows: ProductRow[] = useMemo(() => {
    const map = new Map<number, { unitsSold: number; revenue: number }>();
    for (const o of billable) {
      for (const item of o.items) {
        if (!map.has(item.product_id)) map.set(item.product_id, { unitsSold: 0, revenue: 0 });
        const entry = map.get(item.product_id)!;
        entry.unitsSold += item.quantity;
        entry.revenue += item.unit_price * item.quantity;
      }
    }
    return [...map.entries()]
      .map(([productId, v]) => ({
        productId,
        name: productById.get(productId)?.name_en ?? "Unknown product",
        sku: productById.get(productId)?.sku ?? "—",
        unitsSold: v.unitsSold,
        revenue: v.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [billable, productById]);

  const top10 = rows.slice(0, 10);

  const columns: ColumnDef<ProductRow, any>[] = [
    { accessorKey: "name", header: "Product" },
    { accessorKey: "sku", header: "SKU", cell: ({ row }) => <span className="font-mono text-caption">{row.original.sku}</span> },
    { accessorKey: "unitsSold", header: "Units Sold" },
    { accessorKey: "revenue", header: "Revenue", cell: ({ row }) => formatAED(row.original.revenue) },
  ];

  if (rows.length === 0) {
    return <EmptyState icon={Package} title="No sales in this range" />;
  }

  return (
    <div>
      <div className="mb-6 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-4 text-h4 font-bold text-ink">Top 10 products by revenue</h2>
        <Bar
          data={{
            labels: top10.map((r) => r.name),
            datasets: [{ label: "Revenue (AED)", data: top10.map((r) => r.revenue), backgroundColor: "#E87722", borderRadius: 3 }],
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
              "sales-by-product.csv",
              ["Product", "SKU", "Units Sold", "Revenue"],
              rows.map((r) => [r.name, r.sku, r.unitsSold, r.revenue])
            )
          }
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>
      <DataTable columns={columns} data={rows} getRowId={(r) => String(r.productId)} />
    </div>
  );
}
