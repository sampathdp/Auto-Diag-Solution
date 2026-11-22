"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Mail, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { Select } from "@/components/admin/ui/Select";
import { Button } from "@/components/admin/ui/Button";
import { showSuccess, showError } from "@/components/admin/ui/toast";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { formatDateTime } from "@/lib/admin/utils";
import { hasPermission, PERMISSIONS } from "@/lib/admin/permissions";
import { useAuthStore } from "@/store/useAuthStore";
import type { OutboxEmail, OutboxResponse } from "@/types/staff";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All emails" },
  { value: "failed", label: "Failed" },
  { value: "pending", label: "Waiting to send" },
  { value: "sent", label: "Sent" },
  { value: "skipped", label: "Not sent (email not set up)" },
];

export default function AdminEmailLogPage() {
  const queryClient = useQueryClient();
  const canResend = hasPermission(useAuthStore((s) => s.permissions), PERMISSIONS.STAFF_MANAGE);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filters = { status: status || undefined, page, per_page: pageSize };
  const query = useAdminQuery<OutboxResponse>(adminQueryKeys.outbox.list(filters), "/notifications/outbox", filters);
  const summary = query.data?.summary;

  const resend = useMutation({
    mutationFn: (id: number) => adminApi.post<{ status: string }>(`/notifications/outbox/${id}/resend`),
    onSuccess: (data) => {
      showSuccess(data.status === "sent" ? "Email sent" : "Email queued for another try");
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.outbox.all });
    },
    onError: (err) => showError(err instanceof ApiError ? err.message : "Could not resend the email."),
  });

  const pendingSince = query.data?.oldest_pending_at ? new Date(query.data.oldest_pending_at.replace(" ", "T")) : null;
  const backlogMinutes = pendingSince ? Math.round((Date.now() - pendingSince.getTime()) / 60000) : 0;

  const columns: ColumnDef<OutboxEmail, any>[] = [
    {
      accessorKey: "subject",
      header: "Email",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{row.original.subject}</p>
          <p className="truncate text-caption text-ink-muted">To {row.original.recipient}</p>
        </div>
      ),
    },
    { accessorKey: "status", header: "Status", enableSorting: false, cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { accessorKey: "attempts", header: "Tries", enableSorting: false },
    {
      accessorKey: "created_at",
      header: "Queued",
      enableSorting: false,
      cell: ({ row }) => formatDateTime(row.original.created_at),
    },
    {
      id: "error",
      header: "Problem",
      enableSorting: false,
      cell: ({ row }) => <span className="line-clamp-2 text-caption text-ink-muted">{row.original.last_error ?? "—"}</span>,
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) =>
        canResend && (row.original.status === "failed" || row.original.status === "skipped") ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              resend.mutate(row.original.id);
            }}
            loading={resend.isPending && resend.variables === row.original.id}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Resend
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Email Log"
        description={
          summary
            ? `${summary.sent} sent · ${summary.pending + summary.sending} waiting · ${summary.failed} failed · ${summary.skipped} not sent`
            : "Every email the store sends, and whether it was delivered."
        }
      />

      {backlogMinutes > 15 && (
        <p className="mb-4 rounded-sm bg-warning/10 px-4 py-3 text-body text-warning">
          Some emails have been waiting for {backlogMinutes} minutes. Check that the email cron job
          (<code>php console.php notifications:dispatch</code>) runs every minute and that SMTP settings are correct.
        </p>
      )}

      <DataTable
        columns={columns}
        data={query.data?.items ?? []}
        isLoading={query.isLoading}
        getRowId={(r) => String(r.id)}
        page={page}
        pageSize={pageSize}
        total={query.data?.meta.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        toolbar={
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-56"
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        }
        emptyState={{ icon: Mail, title: "No emails yet", message: "Emails appear here as soon as the store queues them." }}
      />
    </div>
  );
}
