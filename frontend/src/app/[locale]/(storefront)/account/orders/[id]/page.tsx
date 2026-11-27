"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Order } from "@/types/order";
import apiClient from "@/lib/api/client";
import { OrderTimeline, OrderTimelineStep } from "@/components/account/OrderTimeline";
import { RefundDrawer } from "@/components/account/RefundDrawer";
import { ReorderModal } from "@/components/account/ReorderModal";
import { ConfirmDialog } from "@/components/account/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, RotateCcw, XCircle, Undo2, Download, HelpCircle, Copy, Car, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { getOrderStatusClassName, getOrderStatusLabel } from "@/lib/orderStatus";
import { useVehicleStore } from "@/store/useVehicleStore";
import { getTrackingLink } from "@/lib/tracking";
import { OrderPaymentPanel } from "@/components/checkout/OrderPaymentPanel";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const format = useFormatter();
  const id = Number(params.id);
  const globalVehicle = useVehicleStore(state => state.vehicle);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [reorderOpen, setReorderOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = () => {
    setLoading(true);
    apiClient.get(`/account/orders/${id}`)
      .then(res => {
        if (res.data.data) setOrder(res.data.data);
      })
      .catch(() => {
        toast.error("Order not found");
        router.push("/account/orders");
      })
      .finally(() => setLoading(false));
  };

  if (loading) {
    return <div className="p-8 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!order) return null;

  const handleCancel = async () => {
    try {
      await apiClient.post(`/account/orders/${order.id}/cancel`, { reason: cancelReason });
      toast.success("Order cancelled successfully");
      fetchOrder();
    } catch (err) {
      toast.error("Failed to cancel order");
    } finally {
      setCancelOpen(false);
    }
  };

  const handleDownloadInvoice = () => {
    toast.success("Downloading Invoice PDF...");
  };

  // Generate timeline steps
  const steps: OrderTimelineStep[] = [];
  steps.push({
    id: "placed", label: "Order Placed", timestamp: format.dateTime(new Date(order.created_at), { dateStyle: "medium", timeStyle: "short" }),
    isCompleted: true, isCurrent: order.status === "pending"
  });

  if (order.status === "cancelled") {
    steps.push({ id: "cancelled", label: "Order Cancelled", isCompleted: true, isCurrent: true, isTerminal: true, terminalType: "cancelled" });
  } else {
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
  }

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 sticky top-0 bg-background/80 backdrop-blur-md z-30 pt-4 -mt-4">
        <div>
          <Link href="/account/orders" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-2">
            <ChevronLeft className="mr-1 h-4 w-4" /> Back to Orders
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black">Order #{order.order_number}</h1>
            <div className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", getOrderStatusClassName(order.status))}>
              {order.status.toUpperCase()}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={() => setReorderOpen(true)} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Reorder
          </Button>
          
          {(order.status === "pending" || order.status === "pending_vin_verification" || order.status === "processing") && (
            <Button variant="secondary" onClick={() => setCancelOpen(true)} className="gap-2 text-destructive hover:bg-destructive/10 border-destructive/20 hover:text-destructive">
              <XCircle className="h-4 w-4" /> Cancel Order
            </Button>
          )}

          {order.status === "delivered" && (
            <Button variant="secondary" onClick={() => setRefundOpen(true)} className="gap-2">
              <Undo2 className="h-4 w-4" /> Request Refund
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Status Timeline */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4">Order Status</h2>
            <OrderTimeline steps={steps} />
          </div>

          {/* Items */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4">Items in Order</h2>
            <div className="flex flex-col gap-4">
              {order.items.map((item) => (
                <div key={item.sku} className="flex flex-col sm:flex-row gap-4 border-b pb-4 last:border-0 last:pb-0">
                  <div className="h-20 w-20 shrink-0 rounded-md border bg-white p-2">
                    <img src={item.image ?? undefined} alt={item.name_en} className="h-full w-full object-contain" />
                  </div>
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-sm line-clamp-2">{item.name_en}</h4>
                      <p className="text-xs text-muted-foreground mt-1">Part #: {item.sku}</p>
                      
                      {/* Fitment Note Example */}
                      {globalVehicle && (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                          <Car className="h-3 w-3" />
                          Purchased for your {globalVehicle.year} {globalVehicle.make} {globalVehicle.model}
                        </div>
                      )}
                    </div>
                    <div className="text-right sm:min-w-[100px]">
                      <div className="font-bold text-sm">AED {item.total_price.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">Qty: {item.quantity}</div>
                      {item.pricing_type === "wholesale" && (
                        <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-success">Dealer price</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column (Sticky) */}
        <div className="flex flex-col gap-6 sticky top-[120px]">
          
          {/* Totals */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4">Order Summary</h2>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>AED {(order.total_amount - order.shipping_amount - order.vat_amount + order.discount_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>AED {order.shipping_amount.toFixed(2)}</span>
              </div>
              {order.vat_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT (5%)</span>
                  <span>AED {order.vat_amount.toFixed(2)}</span>
                </div>
              )}
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-success font-medium">
                  <span>Discount</span>
                  <span>-AED {order.discount_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="mt-2 border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>AED {order.total_amount.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="mt-6 flex flex-col gap-2">
              <Button variant="secondary" className="w-full gap-2" onClick={handleDownloadInvoice}>
                <Download className="h-4 w-4" /> Download Invoice PDF
              </Button>
            </div>
          </div>

          {/* Tracking */}
          {order.tracking_number && (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-3">Track Shipment</h2>
              <div className="text-sm space-y-1">
                <p className="font-semibold">{order.carrier}</p>
                <p className="font-mono text-muted-foreground">{order.tracking_number}</p>
                {order.shipped_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Shipped {format.dateTime(new Date(order.shipped_at), { dateStyle: "medium" })}
                  </p>
                )}
              </div>
              {(() => {
                const link = getTrackingLink(order.carrier, order.tracking_number);
                return link ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex w-full items-center justify-center rounded-md border px-4 py-2 text-sm font-bold text-primary hover:bg-secondary/50"
                  >
                    Track on {link.name}
                  </a>
                ) : null;
              })()}
            </div>
          )}

          {/* Delivery */}
          {order.shipping_address && (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-3">Delivery Address</h2>
              <div className="text-sm space-y-1">
                <p className="font-semibold">{order.shipping_address.name} ({order.shipping_address.label})</p>
                <p>{order.shipping_address.building}, {order.shipping_address.street}</p>
                {order.shipping_address.apartment && <p>{order.shipping_address.apartment}</p>}
                <p>{order.shipping_address.area}, {order.shipping_address.city}, {order.shipping_address.emirate}</p>
                <p className="text-muted-foreground mt-2">Phone: {order.shipping_address.phone}</p>
              </div>
            </div>
          )}

          {/* Payment */}
          <OrderPaymentPanel order={order} uploadPath={`/account/orders/${order.id}/payment-proof`} onUpdated={setOrder} />

          {/* Help */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
            <HelpCircle className="mx-auto h-8 w-8 text-primary mb-2" />
            <h3 className="font-bold">Need Help?</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Have an issue with this order?</p>
            <Button variant="secondary" className="w-full">Report a Problem</Button>
          </div>

        </div>
      </div>

      <ReorderModal 
        isOpen={reorderOpen} 
        onClose={() => setReorderOpen(false)} 
        orderId={order.id} 
      />
      
      <RefundDrawer 
        isOpen={refundOpen} 
        onClose={() => setRefundOpen(false)} 
        order={order}
        onSuccess={() => {
          setRefundOpen(false);
          fetchOrder();
        }}
      />
      
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={(v) => { if (!v) setCancelOpen(false); }}
        onConfirm={handleCancel}
        title="Cancel Order"
        description={
          <div className="flex flex-col gap-4">
            <p>Are you sure you want to cancel this order? This action cannot be undone.</p>
            <div>
              <label className="text-sm font-semibold mb-2 block">Reason for cancellation (optional)</label>
              <select 
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="">Select a reason...</option>
                <option value="Ordered by mistake">Ordered by mistake</option>
                <option value="Found a better price">Found a better price</option>
                <option value="Shipping time too long">Shipping time too long</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        }
        confirmLabel="Yes, Cancel Order"
        isDestructive
      />

    </div>
  );
}
