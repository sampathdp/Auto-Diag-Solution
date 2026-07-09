"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { AlertTriangle, Download, PackageX, Wallet } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { StatCard } from "@/components/admin/ui/StatCard";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/admin/ui/Button";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { formatAED } from "@/lib/admin/utils";
import { getProductStockStatus } from "@/lib/admin/utils";
import { exportRowsToCsv } from "@/lib/admin/csvExport";
import type { Category, Product } from "@/mocks/admin/db";

export function LowStockReport({ products, categories }: { products: Product[]; categories: Category[] }) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const lowStockProducts = useMemo(
    () =>
      products
        .filter((p) => p.track_inventory && getProductStockStatus(p) !== "in_stock")
        .sort((a, b) => a.stock_quantity - b.stock_quantity),
    [products]
  );

  const outOfStockCount = lowStockProducts.filter((p) => p.stock_quantity === 0).length;
  const valueAtRisk = lowStockProducts.reduce((sum, p) => sum + p.price * p.stock_quantity, 0);
  const bottom10 = lowStockProducts.slice(0, 10);

  const columns: ColumnDef<Product, any>[] = [
    { accessorKey: "name_en", header: "Product" },
    { accessorKey: "sku", header: "SKU", cell: ({ row }) => <span className="font-mono text-caption">{row.original.sku}</span> },
    {
      id: "category",
      header: "Category",
      cell: ({ row }) => categoryById.get(row.original.category_id)?.name_en ?? "—",
    },
    {
      accessorKey: "stock_quantity",
      header: "Stock",
      cell: ({ row }) => (
        <span className={row.original.stock_quantity === 0 ? "font-semibold text-danger" : ""}>{row.original.stock_quantity}</span>
      ),
    },
    { accessorKey: "low_stock_threshold", header: "Threshold" },
    { accessorKey: "price", header: "Price", cell: ({ row }) => formatAED(row.original.price) },
  ];

  if (lowStockProducts.length === 0) {
    return <EmptyState icon={PackageX} title="Nothing low on stock" message="Every tracked product is above its threshold." />;
  }

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Low Stock" value={String(lowStockProducts.length)} icon={AlertTriangle} tone="warning" />
        <StatCard label="Out of Stock" value={String(outOfStockCount)} icon={PackageX} tone="warning" />
        <StatCard label="Value at Risk" value={formatAED(valueAtRisk)} icon={Wallet} tone="warning" />
      </div>

      <div className="mb-6 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-4 text-h4 font-bold text-ink">Lowest stock levels</h2>
        <Bar
          data={{
            labels: bottom10.map((p) => p.name_en),
            datasets: [{ label: "Stock", data: bottom10.map((p) => p.stock_quantity), backgroundColor: "#EF4444", borderRadius: 3 }],
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
              "low-stock.csv",
              ["Product", "SKU", "Category", "Stock", "Threshold", "Price"],
              lowStockProducts.map((p) => [
                p.name_en,
                p.sku,
                categoryById.get(p.category_id)?.name_en ?? "",
                p.stock_quantity,
                p.low_stock_threshold,
                p.price,
              ])
            )
          }
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>
      <DataTable columns={columns} data={lowStockProducts} getRowId={(p) => String(p.id)} />
    </div>
  );
}
