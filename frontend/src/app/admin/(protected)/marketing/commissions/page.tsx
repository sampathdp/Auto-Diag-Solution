"use client";

import { Suspense, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, DollarSign, TrendingUp, Wallet } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { Select } from "@/components/admin/ui/Select";
import { StatCard } from "@/components/admin/ui/StatCard";
import { FilterBar } from "@/components/admin/FilterBar";
import { actionsColumn } from "@/components/admin/columns";
import { showSuccess, showError } from "@/components/admin/ui/toast";
import { PayCommissionModal } from "@/components/admin/marketing/PayCommissionModal";
import { FullScreenLoader } from "@/components/admin/ui/FullScreenLoader";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { useDataTable } from "@/lib/admin/hooks/useDataTable";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { formatAED, formatDate } from "@/lib/admin/utils";
import type { RowAction } from "@/components/admin/ActionsMenu";
import type { PaginatedResponse } from "@/types/api";
import type { Commission, CommissionDashboardTotals } from "@/types/commission";

function AdminCommissionsPageContent() {
  const dt = useDataTable({ defaultPageSize: 20, defaultSort: { id: "created_at", desc: true } });
  const status = dt.getFilter("status");
  const queryClient = useQueryClient();

  const [payTarget, setPayTarget] = useState<Commission | null>(null);

  const dashboardQuery = useAdminQuery<CommissionDashboardTotals>(adminQueryKeys.commissions.dashboard, "/commissions/dashboard");
  const totals = dashboardQuery.data;

  const filters = {
    status: status || undefined,
    page: dt.page,
    per_page: dt.pageSize,
    sort_by: dt.sorting[0]?.id,
    sort_dir: dt.sorting[0]?.desc ? "desc" : "asc",
  };

  const commissionsQuery = useAdminQuery<PaginatedResponse<Commission>>(adminQueryKeys.commissions.list(filters), "/commissions", filters);
  const commissions = commissionsQuery.data?.items ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.commissions.all });
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.commissions.dashboard });
  };

  const approve = useMutation({
    mutationFn: (id: number) => adminApi.post(`/commissions/${id}/approve`),
    onSuccess: () => {
      showSuccess("Commission approved");
      invalidate();
    },
    onError: (err) => showError(err instanceof ApiError ? err.message : "Could not approve the commission."),
  });

  const columns: ColumnDef<Commission, any>[] = [
    { accessorKey: "order_number", header: "Order #" },
    { accessorKey: "customer_name", header: "Customer", cell: ({ row }) => row.original.customer_name ?? "—" },
    { accessorKey: "sales_rep_name", header: "Representative", cell: ({ row }) => row.original.sales_rep_name ?? "—" },
    { accessorKey: "promo_code", header: "Promo Code", cell: ({ row }) => row.original.promo_code ?? "—" },
    { accessorKey: "created_at", header: "Date", cell: ({ row }) => formatDate(row.original.created_at) },
    { accessorKey: "commission_amount", header: "Commission", cell: ({ row }) => formatAED(row.original.commission_amount) },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    actionsColumn<Commission>((commission) => {
      const actions: RowAction[] = [];
      if (commission.status === "pending") {
        actions.push({ label: "Approve", icon: CheckCircle2, onClick: () => approve.mutate(commission.id) });
      }
      if (commission.status === "approved") {
        actions.push({ label: "Mark as Paid", icon: DollarSign, onClick: () => setPayTarget(commission) });
      }
      return actions;
    }),
  ];

  return (
    <div>
      <PageHeader title="Commissions" description={`${commissionsQuery.data?.meta.total ?? "…"} commission records`} />

      {totals && (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total Commission" value={formatAED(totals.total_commission)} icon={TrendingUp} />
          <StatCard label="Pending" value={formatAED(totals.pending_commission)} icon={Wallet} tone="warning" />
          <StatCard label="Approved" value={formatAED(totals.approved_commission)} icon={CheckCircle2} />
          <StatCard label="Paid" value={formatAED(totals.paid_commission)} icon={DollarSign} />
        </div>
      )}

      <DataTable
        columns={columns}
        data={commissions}
        isLoading={commissionsQuery.isLoading}
        getRowId={(c) => String(c.id)}
        page={dt.page}
        pageSize={dt.pageSize}
        total={commissionsQuery.data?.meta.total ?? 0}
        onPageChange={dt.setPage}
        onPageSizeChange={dt.setPageSize}
        sorting={dt.sorting}
        onSortingChange={dt.setSorting}
        toolbar={
          <FilterBar chips={[]} onClearAll={() => dt.clearFilters(["status"])}>
            <Select value={status} onChange={(e) => dt.setFilter("status", e.target.value || null)} className="w-40">
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </FilterBar>
        }
        emptyState={{ icon: Wallet, title: "No commissions yet", message: "Commissions are created automatically when a customer uses a promo code." }}
      />

      <PayCommissionModal open={!!payTarget} onClose={() => setPayTarget(null)} commission={payTarget} />
    </div>
  );
}

export default function AdminCommissionsPage() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <AdminCommissionsPageContent />
    </Suspense>
  );
}
