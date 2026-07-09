"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DollarSign, ShoppingCart, Users, AlertTriangle, BarChart3, Eye, PackageX } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { StatCard } from "@/components/admin/ui/StatCard";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { SkeletonCard } from "@/components/admin/ui/Skeleton";
import { DataTable } from "@/components/admin/DataTable";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { formatAED, formatDate } from "@/lib/admin/utils";
import type { PaginatedResponse } from "@/types/api";
import type { Order, Product } from "@/mocks/admin/db";

// Real backend shape (backend/app/Services/DashboardService.php) — no day-over-day
// comparison fields exist yet (that requires date-partitioned aggregation, deferred
// along with the analytics/charts section below), so these are all-time totals.
interface DashboardStats {
  total_customers: number;
  total_admins: number;
  total_products: number;
  total_categories: number;
  total_orders: number;
  pending_orders: number;
  total_revenue: number;
  total_reviews: number;
  pending_reviews: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

const recentOrderColumns: ColumnDef<Order, any>[] = [
  { accessorKey: "order_number", header: "Order #" },
  { accessorKey: "customer_name", header: "Customer" },
  { accessorKey: "total", header: "Total", cell: ({ row }) => formatAED(row.original.total) },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { accessorKey: "created_at", header: "Date", cell: ({ row }) => formatDate(row.original.created_at) },
  {
    id: "view",
    header: "",
    cell: () => (
      <Link href="/admin/orders" className="inline-flex items-center gap-1 text-caption font-semibold text-primary hover:underline">
        <Eye className="h-3.5 w-3.5" />
        View
      </Link>
    ),
  },
];

export default function AdminDashboardPage() {
  const statsQuery = useAdminQuery<DashboardStats>(adminQueryKeys.dashboard.stats, "/dashboard/stats");
  const ordersQuery = useAdminQuery<PaginatedResponse<Order>>(
    adminQueryKeys.orders.list({ per_page: 10 }),
    "/orders",
    { per_page: 10 }
  );
  const lowStockQuery = useAdminQuery<PaginatedResponse<Product>>(
    adminQueryKeys.products.list({ per_page: 100 }),
    "/products",
    { per_page: 100 }
  );

  const stats = statsQuery.data;
  const recentOrders = ordersQuery.data?.items ?? [];
  // Mirrors DashboardService::stats()'s own low_stock_count definition
  // (track_inventory + an explicit per-product threshold), not a flat guess.
  const lowStockProducts = (lowStockQuery.data?.items ?? [])
    .filter((p) => p.track_inventory && p.low_stock_threshold != null && p.stock_quantity <= p.low_stock_threshold)
    .sort((a, b) => a.stock_quantity - b.stock_quantity)
    .slice(0, 6);

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of store performance." />

      {/* KPI row — all-time totals from the real backend; no day-over-day comparison
          data exists yet, so these show totals with a plain caption instead of a trend. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={stats ? formatAED(stats.total_revenue) : "—"}
          icon={DollarSign}
          caption={stats ? "from paid orders" : undefined}
        />
        <StatCard
          label="Total Orders"
          value={stats ? String(stats.total_orders) : "—"}
          icon={ShoppingCart}
          caption={stats ? `${stats.pending_orders} pending` : undefined}
        />
        <StatCard
          label="Total Customers"
          value={stats ? String(stats.total_customers) : "—"}
          icon={Users}
        />
        <StatCard
          label="Low Stock Alerts"
          value={stats ? String(stats.low_stock_count) : "—"}
          icon={AlertTriangle}
          tone="warning"
          caption={stats ? `${stats.out_of_stock_count} out of stock` : undefined}
        />
      </div>

      {/* Charts row — analytics/reporting aggregation isn't built on the backend yet
          (deferred deliberately, see ARCHITECTURE.md §8). Shown as a clear "coming
          soon" state rather than half-wired to nothing, so the layout stays intact
          for whenever that backend work happens. */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[
          { title: "Daily Traffic & Page Views — last 30 days" },
          { title: "Sales Revenue — last 14 days" },
        ].map(({ title }) => (
          <div key={title} className="rounded-lg border border-border bg-surface p-5 shadow-sm">
            <h2 className="mb-4 text-h4 font-bold text-ink">{title}</h2>
            <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-border bg-app text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-info/10 text-info">
                <BarChart3 className="h-5 w-5" />
              </span>
              <p className="max-w-xs text-body font-medium text-ink">Reporting &amp; analytics — coming soon</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-h3 font-bold text-ink">Recent Orders</h2>
          <Link href="/admin/orders" className="text-caption font-semibold text-primary hover:underline">
            View all orders
          </Link>
        </div>
        <DataTable
          columns={recentOrderColumns}
          data={recentOrders}
          isLoading={ordersQuery.isLoading}
          emptyState={{ icon: ShoppingCart, title: "No orders yet", message: "Orders will show up here once placed." }}
        />
      </div>

      {/* Low Stock */}
      <div className="mt-6 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-h4 font-bold text-ink">Low Stock</h2>
          <Link href="/admin/products" className="text-caption font-semibold text-primary hover:underline">
            View all products
          </Link>
        </div>
        {lowStockQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : lowStockProducts.length === 0 ? (
          <p className="py-6 text-center text-body text-ink-muted">Nothing is low on stock right now.</p>
        ) : (
          <ul className="divide-y divide-border">
            {lowStockProducts.map((product) => (
              <li key={product.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-body font-medium text-ink">{product.name_en}</p>
                  <p className="text-caption text-ink-muted">{product.sku}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1 text-caption font-semibold ${
                      product.stock_quantity === 0 ? "text-danger" : "text-warning"
                    }`}
                  >
                    <PackageX className="h-3.5 w-3.5" />
                    {product.stock_quantity} left
                  </span>
                  {/* No product-edit route exists yet — links back to the filtered list. */}
                  <Link
                    href={`/admin/products?q=${encodeURIComponent(product.sku)}`}
                    className="text-caption font-semibold text-primary hover:underline"
                  >
                    Restock
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
