"use client";

import { useParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { DollarSign, Mail, Percent, Phone, ShoppingBag, UserCheck, Wallet } from "lucide-react";
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
import type { PaginatedResponse } from "@/types/api";
import type { SalesRep } from "@/types/salesRep";
import type { PromoCode } from "@/types/promoCode";
import type { Commission } from "@/types/commission";

const promoColumns: ColumnDef<PromoCode, any>[] = [
  { accessorKey: "code", header: "Code" },
  {
    id: "discount",
    header: "Discount",
    cell: ({ row }) =>
      row.original.discount_type === "percentage" ? `${row.original.discount_value}%` : formatAED(row.original.discount_value),
  },
  { accessorKey: "used_count", header: "Used" },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
];

const commissionColumns: ColumnDef<Commission, any>[] = [
  { accessorKey: "order_number", header: "Order #" },
  { accessorKey: "customer_name", header: "Customer", cell: ({ row }) => row.original.customer_name ?? "—" },
  { accessorKey: "created_at", header: "Date", cell: ({ row }) => formatDate(row.original.created_at) },
  { accessorKey: "commission_amount", header: "Commission", cell: ({ row }) => formatAED(row.original.commission_amount) },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
];

export default function AdminSalesRepDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const repQuery = useAdminQuery<SalesRep>(adminQueryKeys.salesReps.detail(id), `/sales-representatives/${id}`);
  const rep = repQuery.data;
  const stats = rep?.stats;

  const promoCodesQuery = useAdminQuery<PaginatedResponse<PromoCode>>(
    adminQueryKeys.promoCodes.list({ sales_rep_id: id, per_page: 100 }),
    "/promo-codes",
    { sales_rep_id: id, per_page: 100 }
  );
  const commissionsQuery = useAdminQuery<PaginatedResponse<Commission>>(
    adminQueryKeys.commissions.list({ sales_rep_id: id, per_page: 100 }),
    "/commissions",
    { sales_rep_id: id, per_page: 100 }
  );

  if (repQuery.isLoading) return <FullScreenLoader label="Loading representative…" />;
  if (!rep) return <EmptyState icon={UserCheck} title="Representative not found" message="It may have been deleted." />;

  return (
    <div>
      <PageHeader
        title={rep.name}
        breadcrumbs={[{ label: "Sales Representatives", href: "/admin/marketing/sales-representatives" }, { label: rep.name }]}
        actions={<StatusBadge status={rep.status} />}
      />

      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-center gap-4 text-body text-ink-muted">
          <span className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            {rep.email}
          </span>
          {rep.phone && (
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              {rep.phone}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Percent className="h-3.5 w-3.5" />
            {rep.commission_type === "percentage" ? `${rep.commission_value}% commission` : `${formatAED(rep.commission_value)} per order`}
          </span>
        </CardBody>
      </Card>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total Sales" value={formatAED(stats.total_sales)} icon={ShoppingBag} caption={`${stats.total_orders} orders`} />
          <StatCard label="Total Discount Given" value={formatAED(stats.total_discount_given)} icon={Percent} />
          <StatCard label="Outstanding Commission" value={formatAED(stats.outstanding_commission)} icon={Wallet} tone="warning" />
          <StatCard label="Paid Commission" value={formatAED(stats.paid_commission)} icon={DollarSign} />
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-h4 font-bold text-ink">Assigned Promo Codes</h2>
        </CardHeader>
        <CardBody className="p-0">
          <div className="p-5 pt-0">
            <DataTable
              columns={promoColumns}
              data={promoCodesQuery.data?.items ?? []}
              isLoading={promoCodesQuery.isLoading}
              getRowId={(p) => String(p.id)}
              emptyState={{ icon: Percent, title: "No promo codes assigned", message: "Create one from the Promo Codes page." }}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-h4 font-bold text-ink">Referred Orders</h2>
        </CardHeader>
        <CardBody className="p-0">
          <div className="p-5 pt-0">
            <DataTable
              columns={commissionColumns}
              data={commissionsQuery.data?.items ?? []}
              isLoading={commissionsQuery.isLoading}
              getRowId={(c) => String(c.id)}
              emptyState={{ icon: ShoppingBag, title: "No orders yet", message: "Orders placed with this rep's promo codes will show up here." }}
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
