"use client";

import { Suspense, useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter, Link } from "@/i18n/navigation";
import { CheckCircle2, Loader2, MapPin, ShieldCheck, ShoppingBag, Tag, X } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useProductsByIds } from "@/hooks/useProductsByIds";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/account/EmptyState";
import { SideDrawer } from "@/components/account/SideDrawer";
import { AddressForm } from "@/components/account/AddressForm";
import { GuestDetailsForm, type GuestDetailsValue } from "@/components/checkout/GuestDetailsForm";
import apiClient from "@/lib/api/client";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { computeCartTotals } from "@/lib/cartTotals";
import { useShippingDistricts } from "@/hooks/useShippingDistricts";

const EMPTY_GUEST: GuestDetailsValue = {
  name: "",
  email: "",
  phone: "",
  emirate: "Dubai",
  district_id: null,
  area: "",
  building: "",
  apartment: "",
  street: "",
  instructions: "",
};

interface Address {
  id: number;
  label: string;
  name: string;
  phone: string;
  emirate: string;
  district_id: number | null;
  area: string;
  street: string;
  building: string;
  apartment: string | null;
  is_default: boolean;
}

interface AppliedPromo {
  code: string;
  salesRepName: string;
  discountAmount: number;
}

function CheckoutPageContent() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuthStore();
  const { items: cartItems, clearCart, removeItem: removeCartItem } = useCartStore();
  const [mounted, setMounted] = useState(false);

  // "Buy Now" — an express single-item checkout that never touches the persistent
  // cart. When present, this product+quantity entirely replaces the cart as the
  // checkout's source items (see ProductCard's Buy Now button).
  const buyNowProductId = searchParams.get("buyNow");
  const buyNowQty = Math.max(1, Number(searchParams.get("qty")) || 1);
  const isBuyNow = !!buyNowProductId;
  const sourceItems = isBuyNow ? [{ productId: buyNowProductId!, quantity: buyNowQty }] : cartItems;

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [guest, setGuest] = useState<GuestDetailsValue>(EMPTY_GUEST);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [applyingPromo, setApplyingPromo] = useState(false);

  useEffect(() => setMounted(true), []);

  const productIds = sourceItems.map((item) => item.productId);
  const { data: products, isLoading: loadingProducts } = useProductsByIds(productIds);

  const fetchAddresses = async () => {
    try {
      const res = await apiClient.get("/account/addresses");
      const list: Address[] = res.data.data || [];
      setAddresses(list);
      const current = list.find((a) => a.id === selectedAddressId);
      if (!current) {
        setSelectedAddressId((list.find((a) => a.is_default) || list[0])?.id ?? null);
      }
    } catch (error) {
      toast.error("Failed to load addresses");
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    // Guests have no saved address book — /account/addresses would just 401.
    if (isAuthenticated) {
      fetchAddresses();
    } else {
      setLoadingAddresses(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleAddressAdded = async (data: any) => {
    try {
      const res = await apiClient.post("/account/addresses", data);
      setDrawerOpen(false);
      await fetchAddresses();
      setSelectedAddressId(res.data.data.id);
      toast.success("Address added successfully");
    } catch (error) {
      toast.error("Failed to add address");
    }
  };

  const lines = sourceItems
    .map((item) => ({ ...item, product: products?.find((p) => p.id === item.productId) }))
    .filter((line) => line.product);

  // Same reconciliation as the cart page — a persisted cart item whose product was
  // deleted/deactivated since it was added would otherwise silently vanish from this
  // page's totals while still inflating the header's cart-count badge forever.
  useEffect(() => {
    if (isBuyNow || loadingProducts || !products) return;
    const validIds = new Set(products.map((p) => p.id));
    const staleItems = cartItems.filter((item) => !validIds.has(item.productId));
    if (staleItems.length === 0) return;
    staleItems.forEach((item) => removeCartItem(item.productId));
    toast.error(
      staleItems.length === 1
        ? "1 item in your cart is no longer available and was removed."
        : `${staleItems.length} items in your cart are no longer available and were removed.`
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBuyNow, loadingProducts, products]);

  const { data: districts = [] } = useShippingDistricts();
  const selectedDistrictId = isAuthenticated
    ? addresses.find((a) => a.id === selectedAddressId)?.district_id ?? null
    : guest.district_id;
  const selectedDistrict = districts.find((d) => d.id === selectedDistrictId);

  const { subtotal, shipping, vat, total } = computeCartTotals(
    lines.map((l) => ({ product: l.product!, quantity: l.quantity })),
    selectedDistrict
  );

  const validateGuest = () => {
    if (!guest.name.trim() || !guest.email.trim() || !guest.phone.trim()) {
      toast.error("Please fill in your name, email, and phone number");
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(guest.email.trim())) {
      toast.error("Please enter a valid email address");
      return false;
    }
    if (!guest.area.trim() || !guest.building.trim()) {
      toast.error("Please fill in your delivery area and building");
      return false;
    }
    return true;
  };

  // Preview only — the backend independently re-validates the code and recalculates
  // the discount/commission from scratch at order placement (CheckoutService), so a
  // stale or manipulated preview here can never change what's actually charged.
  const handleApplyPromo = async () => {
    const code = promoCodeInput.trim();
    if (!code) return;

    setApplyingPromo(true);
    try {
      const res = await apiClient.post("/promo-codes/validate", { code, cart_total: subtotal });
      const data = res.data.data;
      setAppliedPromo({
        code: data.promo_code,
        salesRepName: data.sales_rep?.name ?? "",
        discountAmount: data.discount.amount,
      });
      toast.success(`Promo code ${data.promo_code} applied`);
    } catch (error: any) {
      setAppliedPromo(null);
      toast.error(error?.response?.data?.message || "Invalid promo code");
    } finally {
      setApplyingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCodeInput("");
  };

  const handlePlaceOrder = async () => {
    if (isAuthenticated) {
      if (!selectedAddressId) {
        toast.error("Please select a delivery address");
        return;
      }
    } else if (!validateGuest()) {
      return;
    }

    setPlacingOrder(true);
    try {
      const payloadItems = lines.map((l) => ({ product_id: Number(l.productId), quantity: l.quantity }));

      const res = isAuthenticated
        ? await apiClient.post("/account/checkout", {
            shipping_address_id: selectedAddressId,
            items: payloadItems,
            promo_code: appliedPromo?.code,
          })
        : await apiClient.post("/checkout/guest", {
            customer: {
              name: guest.name.trim(),
              email: guest.email.trim(),
              phone: guest.phone.trim(),
            },
            shipping: {
              emirate: guest.emirate,
              district_id: guest.district_id ?? undefined,
              area: guest.area.trim(),
              building: guest.building.trim(),
              apartment: guest.apartment.trim() || undefined,
              street: guest.street.trim() || undefined,
              instructions: guest.instructions.trim() || undefined,
            },
            items: payloadItems,
            promo_code: appliedPromo?.code,
          });

      const order = res.data.data;

      if (!isAuthenticated) {
        // Guests have no JWT to fetch /account/orders/{id} with — hand the order the
        // server just returned straight to the success page via sessionStorage instead.
        try {
          sessionStorage.setItem(`guest-order-${order.id}`, JSON.stringify(order));
        } catch {
          // Storage can fail (private browsing, quota) — success page just falls back
          // to showing a generic confirmation without order details.
        }
      }

      if (!isBuyNow) clearCart();
      toast.success("Order placed successfully!");
      router.push(`/checkout/success?orderId=${order.id}` as any);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to place order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (!mounted) return null;

  const isLoading = loadingProducts || (isAuthenticated && loadingAddresses);

  if (!isLoading && lines.length === 0) {
    return (
      <div className="mx-auto max-w-wrap px-6 py-8 md:px-14 md:py-12">
        <AccountPageHeader title="Checkout" subtitle="Review your order and confirm delivery details." />
        <EmptyState
          icon={<ShoppingBag className="h-8 w-8" />}
          title={isBuyNow ? "Product not available" : "Your cart is empty"}
          message={
            isBuyNow
              ? "This product may no longer be available."
              : "Add some parts to your cart before checking out."
          }
          actionLabel="Browse Shop"
          onAction={() => router.push("/shop")}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-wrap px-6 py-8 md:px-14 md:py-12">
      <AccountPageHeader title="Checkout" subtitle="Review your order and confirm delivery details." />

      {isLoading ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl bg-card p-8 text-center shadow-soft">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            {/* Delivery Address / Guest Details */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  {isAuthenticated ? "Delivery Address" : "Your Details"}
                </h3>
                {isAuthenticated && (
                  <button
                    onClick={() => setDrawerOpen(true)}
                    className="text-sm font-bold text-primary hover:underline"
                  >
                    + Add New
                  </button>
                )}
              </div>

              {isAuthenticated ? (
                addresses.length === 0 ? (
                  <EmptyState
                    icon={<MapPin className="h-8 w-8" />}
                    title="No addresses yet"
                    message="Add a delivery address to continue."
                    actionLabel="Add Address"
                    onAction={() => setDrawerOpen(true)}
                  />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {addresses.map((address) => (
                      <label
                        key={address.id}
                        className={cn(
                          "flex cursor-pointer flex-col gap-1 rounded-lg border p-4 text-sm transition-colors",
                          selectedAddressId === address.id
                            ? "border-primary/50 ring-1 ring-primary/20 bg-primary/5"
                            : "hover:bg-secondary/50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold">
                            {address.name} <span className="font-normal text-muted-foreground">({address.label})</span>
                          </span>
                          <input
                            type="radio"
                            name="address"
                            checked={selectedAddressId === address.id}
                            onChange={() => setSelectedAddressId(address.id)}
                            className="h-4 w-4 text-primary focus:ring-primary"
                          />
                        </div>
                        <span className="text-muted-foreground">
                          {address.building}
                          {address.apartment ? `, Apt ${address.apartment}` : ""}, {address.street}
                        </span>
                        <span className="text-muted-foreground">{address.area}, {address.emirate}</span>
                        <span className="text-muted-foreground">{address.phone}</span>
                      </label>
                    ))}
                  </div>
                )
              ) : (
                <GuestDetailsForm value={guest} onChange={setGuest} />
              )}
            </div>

            {/* Payment */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Payment Method
              </h3>
              <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Confirm on Delivery (temporary)</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Online card payment is coming soon. For now your order is confirmed instantly — no payment
                    is collected here.
                  </p>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Items ({lines.length})
              </h3>
              <div className="flex flex-col gap-4">
                {lines.map(({ product, quantity }) => {
                  const p = product!;
                  const name = locale === "ar" ? p.name_ar : p.name_en;
                  return (
                    <div key={p.id} className="flex gap-4">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#F5F6F8]">
                        <img src={p.images[0]} alt={name} className="h-full w-full object-contain p-1.5" />
                      </div>
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-sm font-bold text-foreground">{name}</p>
                          <p className="text-xs text-muted-foreground">Qty: {quantity}</p>
                        </div>
                        <div className="shrink-0 text-sm font-bold text-foreground">
                          AED {(p.price_aed * quantity).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Order summary */}
          <div className="w-full shrink-0 lg:w-[360px]">
            <div className="sticky top-[100px] rounded-xl bg-card p-6 shadow-soft">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Order Summary
              </h3>

              <div className="mb-4">
                {appliedPromo ? (
                  <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                    <span className="flex items-center gap-1.5 font-semibold text-primary">
                      <Tag className="h-3.5 w-3.5" />
                      {appliedPromo.code}
                    </span>
                    <button
                      onClick={handleRemovePromo}
                      aria-label="Remove promo code"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                      placeholder="Promo code"
                      className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm uppercase focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleApplyPromo}
                      disabled={applyingPromo || !promoCodeInput.trim()}
                    >
                      {applyingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold text-foreground">AED {subtotal.toLocaleString()}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-semibold text-primary">-AED {appliedPromo.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-semibold text-foreground">
                    {shipping === 0 ? "Free" : `AED ${shipping}`}
                  </span>
                </div>
                {vat > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT (5%)</span>
                    <span className="font-semibold text-foreground">AED {vat.toLocaleString()}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-baseline justify-between border-t pt-4">
                <span className="text-sm font-bold text-foreground">Total</span>
                <span className="text-2xl font-extrabold text-foreground">
                  AED {(total - (appliedPromo?.discountAmount ?? 0)).toLocaleString()}
                </span>
              </div>
              <Button
                onClick={handlePlaceOrder}
                disabled={placingOrder || (isAuthenticated && !selectedAddressId)}
                className="mt-6 w-full"
              >
                {placingOrder ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Place Order
                  </>
                )}
              </Button>
              <Link
                href={isBuyNow ? "/shop" : "/cart"}
                className="mt-4 block text-center text-sm font-bold text-primary hover:underline"
              >
                {isBuyNow ? "Back to Shop" : "Back to Cart"}
              </Link>
            </div>
          </div>
        </div>
      )}

      {isAuthenticated && (
        <SideDrawer open={drawerOpen} onOpenChange={setDrawerOpen} title="Add Address">
          {drawerOpen && (
            <AddressForm
              defaultName={user?.name || ""}
              defaultPhone=""
              onSubmit={handleAddressAdded}
              onCancel={() => setDrawerOpen(false)}
            />
          )}
        </SideDrawer>
      )}
    </div>
  );
}

export default function CheckoutPageClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CheckoutPageContent />
    </Suspense>
  );
}
