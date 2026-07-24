"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Printer, User as UserIcon, MapPin, CreditCard, ExternalLink, PackageX, Truck } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { FullScreenLoader } from "@/components/admin/ui/FullScreenLoader";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { Card, CardHeader, CardBody } from "@/components/admin/ui/Card";
import { Button } from "@/components/admin/ui/Button";
import { Select } from "@/components/admin/ui/Select";
import { Switch } from "@/components/admin/ui/Switch";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { ConfirmModal } from "@/components/admin/ui/Modal";
import { DataTable } from "@/components/admin/DataTable";
import { MediaThumbnail } from "@/components/admin/media/MediaThumbnail";
import { StatusTimeline } from "@/components/admin/StatusTimeline";
import { NotesPanel } from "@/components/admin/NotesPanel";
import { CancelOrderModal } from "@/components/admin/orders/CancelOrderModal";
import { ShipOrderModal } from "@/components/admin/orders/ShipOrderModal";
import { showSuccess } from "@/components/admin/ui/toast";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { adminApi } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { formatAED, formatDateTime } from "@/lib/admin/utils";
import { cn } from "@/lib/utils";
import type { PaginatedResponse } from "@/types/api";
import { toMediaItem, type RawMediaRow } from "@/lib/admin/mediaAdapter";
import type { Order, OrderItem, OrderStatus, Product } from "@/mocks/admin/db";

const STATUS_OPTIONS: OrderStatus[] = [
  "pending",
  "pending_vin_verification",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

const STATUS_LABELS: Partial<Record<OrderStatus, string>> = {
  pending_vin_verification: "Pending VIN Verification",
};

function statusLabel(status: OrderStatus): string {
  return STATUS_LABELS[status] ?? status[0].toUpperCase() + status.slice(1);
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = Number(params.id);

  const [sendUpdate, setSendUpdate] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);

  const orderQuery = useAdminQuery<Order>(adminQueryKeys.orders.detail(id), `/orders/${id}`);
  const order = orderQuery.data;

  const productsQuery = useAdminQuery<PaginatedResponse<Product>>(
    adminQueryKeys.products.list({ per_page: 200 }),
    "/products",
    { per_page: 200 }
  );
  // toMediaItem: the API returns raw media rows (path, not url; string ids on the
  // live host) — the adapter normalizes both so image lookups by numeric id work.
  const mediaQuery = useAdminQuery<PaginatedResponse<RawMediaRow>>(
    adminQueryKeys.media.list({ per_page: 200 }),
    "/media",
    { per_page: 200 }
  );
  const productById = useMemo(
    () => new Map((productsQuery.data?.items ?? []).map((p) => [p.id, p])),
    [productsQuery.data]
  );
  const mediaById = useMemo(
    () => new Map((mediaQuery.data?.items ?? []).map(toMediaItem).map((m) => [m.id, m])),
    [mediaQuery.data]
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.orders.detail(id) });
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.orders.list() });
  };

  const updateStatus = useMutation({
    mutationFn: (payload: { status: OrderStatus; reason?: string; carrier?: string; tracking_number?: string }) =>
      adminApi.patch(`/orders/${id}/status`, payload),
    onSuccess: () => {
      showSuccess("Order status updated");
      if (sendUpdate) showSuccess("Customer notified by email");
      invalidate();
      setCancelOpen(false);
      setShipOpen(false);
    },
  });

  const addNote = useMutation({
    mutationFn: (text: string) => adminApi.post(`/orders/${id}/notes`, { text }),
    onSuccess: () => {
      showSuccess("Note added");
      invalidate();
    },
  });

  const requestRefund = useMutation({
    mutationFn: () => adminApi.post(`/orders/${id}/refund-request`),
    onSuccess: () => {
      showSuccess("Refund requested — process the actual refund in Stripe.");
      invalidate();
      setRefundOpen(false);
    },
  });

  const approveFulfillment = useMutation({
    mutationFn: () => adminApi.post(`/orders/${id}/approve-fulfillment`),
    onSuccess: () => {
      showSuccess("Order approved and sent to the 3PL");
      invalidate();
      setApproveOpen(false);
    },
  });

  const itemColumns: ColumnDef<OrderItem, any>[] = [
    {
      id: "image",
      header: "",
      cell: ({ row }) => {
        const product = productById.get(row.original.product_id);
        return <MediaThumbnail item={mediaById.get(product?.images[0] ?? -1)} size="sm" />;
      },
    },
    {
      accessorKey: "name_en",
      header: "Product",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-ink">{row.original.name_en}</p>
          <p className="font-mono text-caption text-ink-muted">{row.original.sku}</p>
        </div>
      ),
    },
    { accessorKey: "quantity", header: "Qty" },
    { accessorKey: "unit_price", header: "Unit Price", cell: ({ row }) => formatAED(row.original.unit_price) },
    {
      id: "line_total",
      header: "Subtotal",
      cell: ({ row }) => formatAED(row.original.unit_price * row.original.quantity),
    },
  ];

  if (orderQuery.isLoading) return <FullScreenLoader label="Loading order…" />;
  if (!order) return <EmptyState icon={PackageX} title="Order not found" message="It may have been deleted." />;

  return (
    <div>
      <PageHeader
        title={order.order_number}
        breadcrumbs={[{ label: "Orders", href: "/admin/orders" }, { label: order.order_number }]}
        description={`Placed ${formatDateTime(order.created_at)}`}
        actions={
          <>
            <StatusBadge status={order.status} />
            <StatusBadge status={order.refund_requested_at ? "refund_requested" : order.payment_status} />
            <Button variant="secondary" onClick={() => window.print()} className="print:hidden">
              <Printer className="h-4 w-4" />
              Print Invoice
            </Button>
          </>
        }
      />

      {/* Action bar */}
      <Card className="mb-6 print:hidden">
        <CardBody className="flex flex-wrap items-center gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-caption font-semibold uppercase tracking-wide text-ink-muted">Status</label>
            <Select
              value={order.status}
              disabled={order.status === "pending_vin_verification"}
              onChange={(e) => {
                const next = e.target.value as OrderStatus;
                if (next === "cancelled") setCancelOpen(true);
                else if (next === "shipped") setShipOpen(true);
                else updateStatus.mutate({ status: next });
              }}
              className="w-44"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </Select>
            {order.status === "pending_vin_verification" && (
              <span className="text-caption text-ink-muted">Verify the VIN, then approve below.</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-caption font-semibold uppercase tracking-wide text-ink-muted">Notify</span>
            <Switch label="Send update to customer" checked={sendUpdate} onChange={(e) => setSendUpdate(e.target.checked)} />
          </div>

          <div className="ml-auto flex items-center gap-2 self-stretch border-l border-border pl-6">
            {order.status === "pending_vin_verification" && (
              <Button variant="primary" onClick={() => setApproveOpen(true)}>
                Approve &amp; Send to 3PL
              </Button>
            )}
            <Button variant="secondary" onClick={() => setCancelOpen(true)} disabled={order.status === "cancelled"}>
              Cancel Order
            </Button>
            <Button
              variant="danger"
              onClick={() => setRefundOpen(true)}
              disabled={!!order.refund_requested_at || order.payment_status === "refunded"}
            >
              Refund
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Overview strip — Customer / Delivery / Payment side by side instead of stacked,
          so this info sits above the fold instead of driving a long narrow sidebar. */}
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="py-3">
            <h2 className="text-caption font-semibold uppercase tracking-wide text-ink-muted">Customer</h2>
          </CardHeader>
          <CardBody className="space-y-1.5">
            <p className="flex items-center gap-2 font-medium text-ink">
              <UserIcon className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
              {order.customer_name}
            </p>
            <p className="truncate text-body text-ink-muted">{order.customer_email}</p>
            <Link
              href={`/admin/customers/${order.customer_id}`}
              className="inline-flex items-center gap-1 text-caption font-semibold text-primary hover:underline"
            >
              View customer
              <ExternalLink className="h-3 w-3" />
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <h2 className="text-caption font-semibold uppercase tracking-wide text-ink-muted">Delivery</h2>
          </CardHeader>
          <CardBody className={cn("space-y-1.5", order.carrier && "flex flex-col gap-3 space-y-0")}>
            <div className="flex items-start gap-2 text-body text-ink">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted" />
              {order.shipping_snapshot ? (
                <span>
                  {order.shipping_snapshot.name}
                  <br />
                  {order.shipping_snapshot.building}
                  {order.shipping_snapshot.apartment ? `, ${order.shipping_snapshot.apartment}` : ""}
                  {order.shipping_snapshot.street ? `, ${order.shipping_snapshot.street}` : ""}
                  <br />
                  {order.shipping_snapshot.area}, {order.shipping_snapshot.city}, {order.shipping_snapshot.emirate}
                </span>
              ) : (
                <span className="text-ink-muted">No address on file.</span>
              )}
            </div>

            {order.carrier && (
              <div className="flex items-start gap-2 border-t border-border pt-3 text-body text-ink">
                <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted" />
                <div className="space-y-1">
                  <p className="font-medium">
                    {order.carrier} <span className="font-mono font-normal text-ink-muted">· {order.tracking_number}</span>
                  </p>
                  {order.carrier === "Aramex" && order.tracking_number && (
                    <a
                      href={`https://www.aramex.com/track/results?ShipmentNumber=${encodeURIComponent(order.tracking_number)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-caption font-semibold text-primary hover:underline"
                    >
                      Track on Aramex
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <h2 className="text-caption font-semibold uppercase tracking-wide text-ink-muted">Payment</h2>
          </CardHeader>
          <CardBody className="space-y-1.5">
            <p className="flex items-center gap-2 text-body text-ink">
              <CreditCard className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
              <span className="truncate font-mono text-caption">{order.payment_reference}</span>
            </p>
            <p className="text-body text-ink-muted">Amount: {formatAED(order.total)}</p>
            <StatusBadge status={order.refund_requested_at ? "refund_requested" : order.payment_status} />
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-h4 font-bold text-ink">Order Items</h2>
            </CardHeader>
            <CardBody className="p-0">
              <div className="p-5 pt-0">
                <DataTable columns={itemColumns} data={order.items} />
              </div>
            </CardBody>
          </Card>

          <NotesPanel notes={order.internal_notes} onAdd={(text) => addNote.mutate(text)} adding={addNote.isPending} />
        </div>

        {/* Side column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-h4 font-bold text-ink">Order Totals</h2>
            </CardHeader>
            <CardBody>
              <dl className="space-y-2 text-body">
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Subtotal</dt>
                  <dd className="text-ink">{formatAED(order.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-muted">VAT ({Math.round(Number(order.vat_rate))}%)</dt>
                  <dd className="text-ink">{formatAED(order.vat_amount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Shipping</dt>
                  <dd className="text-ink">{order.shipping_amount === 0 ? "Free" : formatAED(order.shipping_amount)}</dd>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-ink-muted">Discount</dt>
                    <dd className="text-danger">-{formatAED(order.discount_amount)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 text-h4 font-bold">
                  <dt className="text-ink">Total</dt>
                  <dd className="text-ink">{formatAED(order.total)}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <StatusTimeline history={order.status_history} />
        </div>
      </div>

      <CancelOrderModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={(reason) => updateStatus.mutate({ status: "cancelled", reason })}
        loading={updateStatus.isPending}
      />

      <ShipOrderModal
        open={shipOpen}
        onClose={() => setShipOpen(false)}
        onConfirm={({ carrier, trackingNumber }) =>
          updateStatus.mutate({ status: "shipped", carrier, tracking_number: trackingNumber })
        }
        loading={updateStatus.isPending}
      />

      <ConfirmDialog
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        onConfirm={() => requestRefund.mutate()}
        itemName={order.order_number}
        itemLabel="order for refund"
        extraWarning="This only flags the order — process the actual refund in the Stripe dashboard."
        loading={requestRefund.isPending}
      />

      <ConfirmModal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        onConfirm={() => approveFulfillment.mutate()}
        title="Approve & send to 3PL?"
        description="Confirm the vehicle model and VIN have been verified against this order. Once approved, order details are sent to the 3PL for fulfillment and this can't be undone."
        confirmLabel="Approve & Send to 3PL"
        loading={approveFulfillment.isPending}
      />
    </div>
  );
}
