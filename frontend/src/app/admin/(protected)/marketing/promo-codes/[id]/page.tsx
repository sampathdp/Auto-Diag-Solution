"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DollarSign, Percent, ShoppingBag, UserCheck, Wallet } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { FullScreenLoader } from "@/components/admin/ui/FullScreenLoader";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { Card, CardHeader, CardBody } from "@/components/admin/ui/Card";
import { StatCard } from "@/components/admin/ui/StatCard";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DataTable } from "@/components/admin/DataTable";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { formatAED, formatDate } from "@/lib/admin/utils";
import type { PromoCode, PromoCodeOrderRow } from "@/types/promoCode";

const orderColumns: ColumnDef<PromoCodeOrderRow, any>[] = [
  { accessorKey: "order_number", header: "Order #" },
  { accessorKey: "created_at", header: "Date", cell: ({ row }) => formatDate(row.original.created_at) },
  { accessorKey: "customer_name", header: "Customer", cell: ({ row }) => row.original.customer_name ?? "—" },
  { accessorKey: "total", header: "Order Amount", cell: ({ row }) => formatAED(row.original.total) },
  { accessorKey: "discount_amount", header: "Discount", cell: ({ row }) => formatAED(row.original.discount_amount) },
  { accessorKey: "commission_amount", header: "Commission", cell: ({ row }) => formatAED(row.original.commission_amount) },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
];

export default function AdminPromoCodeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const promoQuery = useAdminQuery<PromoCode & { orders: PromoCodeOrderRow[] }>(
    adminQueryKeys.promoCodes.report(id),
    `/promo-codes/${id}/report`
  );
  const promo = promoQuery.data;
  const stats = promo?.stats;

  if (promoQuery.isLoading) return <FullScreenLoader label="Loading promo code…" />;
  if (!promo) return <EmptyState icon={Percent} title="Promo code not found" message="It may have been deleted." />;

  return (
    <div>
      <PageHeader
        title={promo.code}
        breadcrumbs={[{ label: "Promo Codes", href: "/admin/marketing/promo-codes" }, { label: promo.code }]}
        actions={<StatusBadge status={promo.status} />}
      />

      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-center gap-4 text-body text-ink-muted">
          <span className="flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5" />
            {promo.sales_rep?.id ? (
              <Link href={`/admin/marketing/sales-representatives/${promo.sales_rep.id}`} className="text-primary hover:underline">
                {promo.sales_rep.name}
              </Link>
            ) : (
              (promo.sales_rep_name ?? "—")
            )}
          </span>
          <span className="flex items-center gap-1.5">
            <Percent className="h-3.5 w-3.5" />
            {promo.discount_type === "percentage" ? `${promo.discount_value}% customer discount` : `${formatAED(promo.discount_value)} customer discount`}
          </span>
          <span className="flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            {promo.commission_type === "percentage" ? `${promo.commission_value}% commission` : `${formatAED(promo.commission_value)} commission`}
            {" "}
            ({promo.commission_base.replace("_", " ")})
          </span>
        </CardBody>
      </Card>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total Usage" value={String(stats.total_usage)} icon={ShoppingBag} caption={`${stats.completed_orders} completed`} />
          <StatCard label="Total Sales" value={formatAED(stats.total_sales)} icon={DollarSign} />
          <StatCard label="Total Discount" value={formatAED(stats.total_discount)} icon={Percent} />
          <StatCard label="Total Commission" value={formatAED(stats.total_commission)} icon={Wallet} />
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-h4 font-bold text-ink">Orders</h2>
        </CardHeader>
        <CardBody className="p-0">
          <div className="p-5 pt-0">
            <DataTable
              columns={orderColumns}
              data={promo.orders ?? []}
              isLoading={promoQuery.isLoading}
              getRowId={(o) => String(o.id)}
              emptyState={{ icon: ShoppingBag, title: "No orders yet", message: "Orders placed with this code will show up here." }}
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
