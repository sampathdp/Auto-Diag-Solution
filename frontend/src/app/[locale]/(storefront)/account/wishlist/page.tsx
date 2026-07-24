"use client";

import { useEffect, useState } from "react";
import { useWishlistStore } from "@/store/useWishlistStore";
import { useCartStore } from "@/store/useCartStore";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductCardSkeleton } from "@/components/shop/ProductCardSkeleton";
import { Heart, Loader2, ShoppingCart, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/account/ConfirmDialog";
import { Product } from "@/types/storefront";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import toast from "react-hot-toast";

export default function WishlistPage() {
  const { items, clearWishlist } = useWishlistStore();
  const addToCart = useCartStore(state => state.addItem);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearOpen, setClearOpen] = useState(false);
  const [movingToCart, setMovingToCart] = useState(false);

  useEffect(() => {
    // Fetch detailed product data for the wishlist items
    setLoading(true);
    apiClient.get('/account/wishlist')
      .then(res => {
        const data = res.data.data;
        setProducts(data);
        // Reconcile the store's id list (used by the header badge) with this
        // authoritative fetch — a wishlisted product going inactive/deleted
        // server-side otherwise leaves the badge stuck at the old count forever.
        // Guarded by an equality check: this effect re-runs whenever `items`
        // changes, so an unconditional setState here (a fresh array every
        // fetch, same content or not) would retrigger itself forever.
        const fetchedIds = data.map((p: Product) => p.id);
        const current = useWishlistStore.getState().items;
        const changed = fetchedIds.length !== current.length || fetchedIds.some((id: string, i: number) => id !== current[i]);
        if (changed) {
          useWishlistStore.setState({ items: fetchedIds, isInitialized: true });
        } else if (!useWishlistStore.getState().isInitialized) {
          useWishlistStore.setState({ isInitialized: true });
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [items]); // Re-fetch if items change (like when one is removed)

  const handleMoveAllToCart = async () => {
    setMovingToCart(true);
    try {
      products.forEach((product) => addToCart(product.id));
      await clearWishlist();
      toast.success("Items moved to cart");
    } catch (err) {
      toast.error("Failed to move items to cart");
    } finally {
      setMovingToCart(false);
    }
  };

  return (
    <div className="space-y-6">
      <AccountPageHeader
        title={`My Wishlist (${products.length} items)`}
        subtitle="View and manage items you've saved for later."
        actions={
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="ghost"
              className="w-full sm:w-auto text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setClearOpen(true)}
              disabled={products.length === 0 || loading || movingToCart}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Wishlist
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={handleMoveAllToCart}
              disabled={products.length === 0 || loading || movingToCart}
            >
              {movingToCart ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
              Move All to Cart
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} context="wishlist" />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center bg-card">
          <div className="rounded-full bg-primary/10 p-4 mb-4">
            <Heart className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">Save items you love</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Keep track of parts you need for your vehicles. When you're ready, move them to your cart.
          </p>
          <Button asChild>
            <Link href="/shop">Browse Shop</Link>
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Clear Wishlist"
        description="Are you sure you want to clear your entire wishlist? This action cannot be undone."
        confirmLabel="Yes, Clear Wishlist"
        onConfirm={clearWishlist}
        isDestructive
      />
    </div>
  );
}
