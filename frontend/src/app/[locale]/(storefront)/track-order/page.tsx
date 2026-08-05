"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Order } from "@/types/order";
import apiClient from "@/lib/api/client";
import { OrderTimeline, OrderTimelineStep } from "@/components/account/OrderTimeline";
import { ChevronLeft, Loader2, PackageX } from "lucide-react";
import { cn } from "@/lib/utils";
import { getOrderStatusClassName } from "@/lib/orderStatus";

function buildTimelineSteps(order: Order, format: ReturnType<typeof useFormatter>): OrderTimelineStep[] {
  const steps: OrderTimelineStep[] = [];
  steps.push({
    id: "placed",
    label: "Order Placed",
    timestamp: format.dateTime(new Date(order.created_at), { dateStyle: "medium", timeStyle: "short" }),
    isCompleted: true,
    isCurrent: order.status === "pending",
  });

  if (order.status === "cancelled") {
    steps.push({ id: "cancelled", label: "Order Cancelled", isCompleted: true, isCurrent: true, isTerminal: true, terminalType: "cancelled" });
    return steps;
  }

  const pastVinVerification =
    order.status === "processing" || order.status === "shipped" || order.status === "delivered" || order.status === "refunded";
  steps.push({
    id: "vin_verification",
    label: "Vehicle VIN Verification",
    note: order.status === "pending_vin_verification" ? "Send us your VIN or Mulkiya photo on WhatsApp so we can confirm the part fits." : undefined,
    isCompleted: pastVinVerification,
    isCurrent: order.status === "pending_vin_verification",
  });

  const isProcessing = order.status === "processing" || order.status === "shipped" || order.status === "delivered" || order.status === "refunded";
  steps.push({ id: "processing", label: "Processing", isCompleted: isProcessing, isCurrent: order.status === "processing" });

  if (order.status === "shipped" || order.status === "delivered" || order.status === "refunded") {
    const shippedNote = order.carrier && order.tracking_number
      ? `Handed to ${order.carrier}. Tracking: ${order.tracking_number}`
      : undefined;
    steps.push({ id: "shipped", label: "Shipped", note: shippedNote, isCompleted: true, isCurrent: order.status === "shipped" });
  }

  if (order.status === "delivered" || order.status === "refunded") {
    steps.push({ id: "delivered", label: "Delivered", isCompleted: true, isCurrent: order.status === "delivered" });
  }

  if (order.status === "refunded") {
    steps.push({ id: "refunded", label: "Refund Requested", isCompleted: true, isCurrent: true, isTerminal: true, terminalType: "refunded" });
  }

  return steps;
}

function TrackOrderView() {
  const searchParams = useSearchParams();
  const format = useFormatter();
  const orderNumber = searchParams.get("order");
  const token = searchParams.get("token");

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!orderNumber || !token) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    apiClient
      .get(`/orders/track/${encodeURIComponent(orderNumber)}`, { params: { token } })
      .then((res) => {
        if (res.data.data) setOrder(res.data.data);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [orderNumber, token]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <PackageX className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-bold">Order link not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This tracking link is invalid or has expired. Check the link in your order confirmation email, or contact support with your order number.
        </p>
        <Link href="/" className="mt-2 text-sm font-semibold text-primary hover:underline">
          Back to Home
        </Link>
      </div>
    );
  }

  const steps = buildTimelineSteps(order, format);
  const subtotal = order.total_amount - order.shipping_amount - order.vat_amount + order.discount_amount;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 py-8">
      <div>
        <Link href="/" className="mb-2 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="mr-1 h-4 w-4" /> Back to Home
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-black">Order #{order.order_number}</h1>
          <div className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", getOrderStatusClassName(order.status))}>
            {order.status.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">Order Status</h2>
        <OrderTimeline steps={steps} />
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">Items in Order</h2>
        <div className="flex flex-col gap-4">
          {order.items.map((item) => (
            <div key={item.sku} className="flex flex-col gap-4 border-b pb-4 last:border-0 last:pb-0 sm:flex-row">
              <div className="h-20 w-20 shrink-0 rounded-md border bg-white p-2">
                <img src={item.image ?? undefined} alt={item.name_en} className="h-full w-full object-contain" />
              </div>
              <div className="flex flex-1 flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <h4 className="line-clamp-2 text-sm font-semibold">{item.name_en}</h4>
                  <p className="mt-1 text-xs text-muted-foreground">Part #: {item.sku}</p>
                </div>
                <div className="text-right sm:min-w-[100px]">
                  <div className="text-sm font-bold">AED {item.total_price.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Qty: {item.quantity}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">Order Summary</h2>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>AED {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>AED {order.shipping_amount.toFixed(2)}</span>
          </div>
          {order.vat_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT</span>
              <span>AED {order.vat_amount.toFixed(2)}</span>
            </div>
          )}
          {order.discount_amount > 0 && (
            <div className="flex justify-between font-medium text-success">
              <span>Discount</span>
              <span>-AED {order.discount_amount.toFixed(2)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t pt-2 text-lg font-bold">
            <span>Total</span>
            <span>AED {order.total_amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {order.shipping_address && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-bold">Delivery Address</h2>
          <div className="space-y-1 text-sm">
            <p className="font-semibold">
              {order.shipping_address.name} ({order.shipping_address.label})
            </p>
            <p>
              {order.shipping_address.building}, {order.shipping_address.street}
            </p>
            {order.shipping_address.apartment && <p>{order.shipping_address.apartment}</p>}
            <p>
              {order.shipping_address.area}, {order.shipping_address.city}, {order.shipping_address.emirate}
            </p>
            <p className="mt-2 text-muted-foreground">Phone: {order.shipping_address.phone}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={null}>
      <TrackOrderView />
    </Suspense>
  );
}
