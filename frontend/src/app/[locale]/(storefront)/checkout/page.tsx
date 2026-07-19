"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { CheckCircle2, Loader2, MapPin, ShieldCheck, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useProductsByIds } from "@/hooks/useProductsByIds";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { AuthGuard } from "@/components/account/AuthGuard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/account/EmptyState";
import { SideDrawer } from "@/components/account/SideDrawer";
import { AddressForm } from "@/components/account/AddressForm";
import { useAuthStore } from "@/store/useAuthStore";
import apiClient from "@/lib/api/client";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const FREE_SHIPPING_THRESHOLD = 500;
const SHIPPING_FEE = 20;

interface Address {
  id: number;
  label: string;
  name: string;
  phone: string;
  emirate: string;
  area: string;
  street: string;
  building: string;
  apartment: string | null;
  is_default: boolean;
}

function CheckoutPageContent() {
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuthStore();
  const { items, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => setMounted(true), []);

  const productIds = items.map((item) => item.productId);
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
    fetchAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const lines = items
    .map((item) => ({ ...item, product: products?.find((p) => p.id === item.productId) }))
    .filter((line) => line.product);

  const subtotal = lines.reduce((sum, l) => sum + l.product!.price_aed * l.quantity, 0);
  const shipping = subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD ? SHIPPING_FEE : 0;
  const vat = Math.round((subtotal + shipping) * 0.05);
  const total = subtotal + shipping + vat;

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error("Please select a delivery address");
      return;
    }
    setPlacingOrder(true);
    try {
      const res = await apiClient.post("/account/checkout", {
        shipping_address_id: selectedAddressId,
        items: lines.map((l) => ({ product_id: Number(l.productId), quantity: l.quantity })),
      });
      const order = res.data.data;
      clearCart();
      toast.success("Order placed successfully!");
      router.push(`/account/orders/${order.id}` as any);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to place order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (!mounted) return null;

  const isLoading = loadingProducts || loadingAddresses;

  if (!isLoading && lines.length === 0) {
    return (
      <div className="mx-auto max-w-wrap px-6 py-8 md:px-14 md:py-12">
        <AccountPageHeader title="Checkout" subtitle="Review your order and confirm delivery details." />
        <EmptyState
          icon={<ShoppingBag className="h-8 w-8" />}
          title="Your cart is empty"
          message="Add some parts to your cart before checking out."
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
            {/* Delivery Address */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Delivery Address
                </h3>
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  + Add New
                </button>
              </div>

              {addresses.length === 0 ? (
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
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold text-foreground">AED {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-semibold text-foreground">
                    {shipping === 0 ? "Free" : `AED ${shipping}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT (5%)</span>
                  <span className="font-semibold text-foreground">AED {vat.toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between border-t pt-4">
                <span className="text-sm font-bold text-foreground">Total</span>
                <span className="text-2xl font-extrabold text-foreground">AED {total.toLocaleString()}</span>
              </div>
              <Button
                onClick={handlePlaceOrder}
                disabled={placingOrder || !selectedAddressId}
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
              <Link href="/cart" className="mt-4 block text-center text-sm font-bold text-primary hover:underline">
                Back to Cart
              </Link>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <AuthGuard>
      <CheckoutPageContent />
    </AuthGuard>
  );
}
