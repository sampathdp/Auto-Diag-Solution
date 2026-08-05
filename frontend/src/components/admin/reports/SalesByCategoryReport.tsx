"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { Download, Layers } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/admin/ui/Button";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { formatAED } from "@/lib/admin/utils";
import { exportRowsToCsv } from "@/lib/admin/csvExport";
import type { Category, Order, Product } from "@/mocks/admin/db";

interface CategoryRow {
  category: string;
  ordersCount: number;
  unitsSold: number;
  revenue: number;
}

export function SalesByCategoryReport({
  orders,
  products,
  categories,
}: {
  orders: Order[];
  products: Product[];
  categories: Category[];
}) {
  const billable = orders.filter((o) => o.status !== "cancelled" && o.status !== "refunded");
  const productById = new Map(products.map((p) => [p.id, p]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const rows: CategoryRow[] = useMemo(() => {
    const map = new Map<number, { ordersIds: Set<number>; unitsSold: number; revenue: number }>();
    for (const o of billable) {
      for (const item of o.items ?? []) {
        const product = productById.get(item.product_id);
        if (!product) continue;
        if (!map.has(product.category_id)) map.set(product.category_id, { ordersIds: new Set(), unitsSold: 0, revenue: 0 });
        const entry = map.get(product.category_id)!;
        entry.ordersIds.add(o.id);
        entry.unitsSold += item.quantity;
        entry.revenue += item.unit_price * item.quantity;
      }
    }
    return [...map.entries()]
      .map(([categoryId, v]) => ({
        category: categoryById.get(categoryId)?.name_en ?? "Unknown",
        ordersCount: v.ordersIds.size,
        unitsSold: v.unitsSold,
        revenue: v.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [billable, productById, categoryById]);

  const columns: ColumnDef<CategoryRow, any>[] = [
    { accessorKey: "category", header: "Category" },
    { accessorKey: "ordersCount", header: "Orders" },
    { accessorKey: "unitsSold", header: "Units Sold" },
    { accessorKey: "revenue", header: "Revenue", cell: ({ row }) => formatAED(row.original.revenue) },
  ];

  if (rows.length === 0) {
    return <EmptyState icon={Layers} title="No sales in this range" />;
  }

  return (
    <div>
      <div className="mb-6 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-4 text-h4 font-bold text-ink">Revenue by category</h2>
        <Bar
          data={{
            labels: rows.map((r) => r.category),
            datasets: [{ label: "Revenue (AED)", data: rows.map((r) => r.revenue), backgroundColor: "#16233F", borderRadius: 3 }],
          }}
          options={{ responsive: true, plugins: { legend: { display: false } } }}
        />
      </div>

      <div className="mb-3 flex justify-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            exportRowsToCsv(
              "sales-by-category.csv",
              ["Category", "Orders", "Units Sold", "Revenue"],
              rows.map((r) => [r.category, r.ordersCount, r.unitsSold, r.revenue])
            )
          }
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>
      <DataTable columns={columns} data={rows} getRowId={(r) => r.category} />
    </div>
  );
}
