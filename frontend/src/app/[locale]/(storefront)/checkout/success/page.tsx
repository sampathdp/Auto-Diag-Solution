"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { CheckCircle2, Loader2, ShoppingBag } from "lucide-react";
import apiClient from "@/lib/api/client";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { useAuthStore } from "@/store/useAuthStore";
import { useContactInfo } from "@/hooks/useContactInfo";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import type { Order } from "@/types/order";
import { cn } from "@/lib/utils";
import { OrderPaymentPanel } from "@/components/checkout/OrderPaymentPanel";
import toast from "react-hot-toast";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const { isAuthenticated } = useAuthStore();
  const { data: siteInfo } = useContactInfo();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    // Guest orders: no JWT to fetch /account/orders/{id} with, so the checkout page
    // stashes the order the server just returned in sessionStorage before navigating
    // here — check that first.
    try {
      const stashed = sessionStorage.getItem(`guest-order-${orderId}`);
      if (stashed) {
        setOrder(JSON.parse(stashed));
        setLoading(false);
        return;
      }
    } catch {
      // Fall through to the authenticated fetch below.
    }

    apiClient
      .get(`/account/orders/${orderId}`)
      .then((res) => {
        if (res.data.data) setOrder(res.data.data);
      })
      .catch(() => toast.error("Couldn't load your order details"))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // order_number, not the raw internal id — it's the reference already shown
  // everywhere else in the app ("Order #ORD-...") and the one our team looks up.
  const whatsappHref = order
    ? buildWhatsAppUrl(
        siteInfo?.whatsapp_number,
        `Hi, I just placed Order #${order.order_number}. Here is my VIN/Mulkiya photo for verification.`
      )
    : null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center md:px-14">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
        <CheckCircle2 className="h-9 w-9 text-success" />
      </div>

      <h1 className="text-2xl font-black md:text-3xl">Order placed successfully!</h1>
      {order ? (
        <p className="mt-2 text-muted-foreground">
          Your order <span className="font-bold text-foreground">#{order.order_number}</span> has been received.
        </p>
      ) : (
        <p className="mt-2 text-muted-foreground">Your order has been received.</p>
      )}

      {order && order.payment_method && (
        <div className="mt-8 text-start">
          <OrderPaymentPanel
            order={order}
            uploadPath={isAuthenticated ? `/account/orders/${order.id}/payment-proof` : null}
            onUpdated={setOrder}
          />
          {!isAuthenticated && order.can_upload_payment_proof && (
            <p className="mt-2 text-xs text-muted-foreground">
              To upload your transfer receipt, open the tracking link in your order confirmation email.
            </p>
          )}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-6 text-start">
        <h2 className="font-bold text-foreground">Speed up your delivery</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          To make sure the part fits and avoid a return, send us a photo of your VIN or Mulkiya on WhatsApp — our
          team will verify it before the order ships.
        </p>
        <a
          href={whatsappHref ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!whatsappHref}
          className={cn(
            "mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[#25D366] px-6 py-3.5 text-sm font-extrabold text-white shadow-lifted transition-transform hover:-translate-y-0.5",
            !whatsappHref && "pointer-events-none opacity-50"
          )}
        >
          <WhatsAppIcon className="h-5 w-5" />
          Verify Vehicle VIN via WhatsApp
        </a>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {/* Guest orders have no session to view them under /account/orders — that
            page is auth-gated and would just bounce them to login. */}
        {order && isAuthenticated && (
          <Button asChild variant="secondary">
            <Link href={`/account/orders/${order.id}` as any}>View Order Details</Link>
          </Button>
        )}
        <Button asChild variant="secondary">
          <Link href="/shop">
            <ShoppingBag className="h-4 w-4" />
            Continue Shopping
          </Link>
        </Button>
      </div>
    </div>
  );
}

function CheckoutSuccessPageContent() {
  return (
    <div className="mx-auto max-w-wrap px-6 pt-8 md:px-14">
      <AccountPageHeader title="Checkout" />
      <Suspense fallback={<div className="flex min-h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
        <CheckoutSuccessContent />
      </Suspense>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return <CheckoutSuccessPageContent />;
}
