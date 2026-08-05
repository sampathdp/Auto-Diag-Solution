"use client";

import { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { FullScreenLoader } from "@/components/admin/ui/FullScreenLoader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/admin/ui/Tabs";
import { DateRangePicker, type DateRange } from "@/components/admin/reports/DateRangePicker";
import { SalesByDateReport } from "@/components/admin/reports/SalesByDateReport";
import { SalesByCategoryReport } from "@/components/admin/reports/SalesByCategoryReport";
import { SalesByProductReport } from "@/components/admin/reports/SalesByProductReport";
import { TopCustomersReport } from "@/components/admin/reports/TopCustomersReport";
import { LowStockReport } from "@/components/admin/reports/LowStockReport";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import type { PaginatedResponse } from "@/types/api";
import type { Category, Order, Product } from "@/mocks/admin/db";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const REPORT_TABS = [
  { value: "date", label: "Sales by Date" },
  { value: "category", label: "Sales by Category" },
  { value: "product", label: "Sales by Product" },
  { value: "customers", label: "Top Customers" },
  { value: "stock", label: "Low Stock" },
];

function defaultRange(): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default function AdminReportsPage() {
  const [reportType, setReportType] = useState("date");
  const [range, setRange] = useState<DateRange>(defaultRange);

  const ordersQuery = useAdminQuery<PaginatedResponse<Order>>(
    adminQueryKeys.orders.list({ per_page: 500, with_items: true }),
    "/orders",
    { per_page: 500, with_items: true }
  );
  const productsQuery = useAdminQuery<PaginatedResponse<Product>>(
    adminQueryKeys.products.list({ per_page: 200 }),
    "/products",
    { per_page: 200 }
  );
  const categoriesQuery = useAdminQuery<PaginatedResponse<Category>>(
    adminQueryKeys.categories.all,
    "/categories",
    { per_page: 100 }
  );

  const isLoading = ordersQuery.isLoading || productsQuery.isLoading || categoriesQuery.isLoading;

  const products = productsQuery.data?.items ?? [];
  const categories = categoriesQuery.data?.items ?? [];

  const ordersInRange = useMemo(() => {
    const all = ordersQuery.data?.items ?? [];
    return all.filter((o) => {
      const day = o.created_at.slice(0, 10);
      return day >= range.from && day <= range.to;
    });
  }, [ordersQuery.data, range]);

  if (isLoading) return <FullScreenLoader label="Loading reports…" />;

  return (
    <div>
      <PageHeader title="Reports" description="Sales performance, top customers, and inventory health." />

      <Tabs value={reportType} onValueChange={setReportType}>
        <TabsList className="mb-4 flex-wrap">
          {REPORT_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {reportType !== "stock" && (
          <div className="mb-6">
            <DateRangePicker value={range} onChange={setRange} />
          </div>
        )}

        <TabsContent value="date">
          <SalesByDateReport orders={ordersInRange} range={range} />
        </TabsContent>
        <TabsContent value="category">
          <SalesByCategoryReport orders={ordersInRange} products={products} categories={categories} />
        </TabsContent>
        <TabsContent value="product">
          <SalesByProductReport orders={ordersInRange} products={products} />
        </TabsContent>
        <TabsContent value="customers">
          <TopCustomersReport orders={ordersInRange} />
        </TabsContent>
        <TabsContent value="stock">
          <LowStockReport products={products} categories={categories} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
