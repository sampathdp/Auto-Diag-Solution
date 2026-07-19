"use client";

import { useCompareStore } from "@/store/useCompareStore";
import { useCartStore } from "@/store/useCartStore";
import { useProductsByIds } from "@/hooks/useProductsByIds";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { CheckCircle2, AlertTriangle, X, ShoppingCart, Loader2 } from "lucide-react";
import { useShopFilters } from "@/hooks/useShopFilters";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function ComparePage() {
  const { items, removeItem, clearCompare } = useCompareStore();
  const addToCart = useCartStore(state => state.addItem);
  const locale = useLocale();
  const [mounted, setMounted] = useState(false);
  const { fitsYear, fitsMake, fitsModel } = useShopFilters();
  const { data: comparedProducts = [], isLoading } = useProductsByIds(items);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (comparedProducts.length === 0) {
    return (
      <div className="mx-auto flex max-w-wrap flex-col items-center justify-center px-6 py-20 text-center md:px-14">
        <div className="mb-6 rounded-full bg-secondary p-8">
          <X className="h-16 w-16 text-muted-foreground" />
        </div>
        <h1 className="mb-4 text-3xl font-extrabold text-foreground">Nothing to compare</h1>
        <p className="mb-8 text-muted-foreground">You haven't selected any products to compare.</p>
        <Link href="/shop" className="rounded-md bg-primary px-8 py-3 font-bold text-primary-foreground hover:bg-primary/90">
          Back to Shop
        </Link>
      </div>
    );
  }

  // Get all unique spec keys (by the English key, used as the stable identifier) across all compared products
  const allSpecKeys = Array.from(new Set(
    comparedProducts.flatMap(p => p.specifications ? p.specifications.map(s => s.key_en) : [])
  ));

  const hasVehicleContext = fitsYear || fitsMake || fitsModel;

  const handleAddToCart = (productId: string) => {
    addToCart(productId);
    toast.success("Item added to cart");
  };

  return (
    <div className="mx-auto max-w-wrap px-6 py-12 md:px-14">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          Compare Products
        </h1>
        <button
          onClick={clearCompare}
          className="text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          Clear All
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full min-w-[800px] text-left text-sm">
          <tbody>
            {/* Header / Images */}
            <tr>
              <th className="w-48 p-4 align-top font-bold text-muted-foreground">Product</th>
              {comparedProducts.map(product => (
                <td key={product.id} className="relative w-72 p-6 align-top">
                  <button
                    onClick={() => removeItem(product.id)}
                    className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="mb-4 flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-[#F5F6F8] p-4">
                    <img src={product.images[0]} alt="" className="h-full w-full object-contain" />
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {product.brand ? (locale === "ar" ? product.brand.name_ar : product.brand.name_en) : ""}
                  </div>
                  <Link href={`/shop/product/${product.id}` as any} className="mt-1 block text-base font-bold leading-tight hover:text-primary">
                    {locale === 'ar' ? product.name_ar : product.name_en}
                  </Link>
                  <div className="mt-3 text-lg font-extrabold">
                    AED {product.price_aed.toLocaleString()}
                  </div>
                  <button
                    onClick={() => handleAddToCart(product.id)}
                    disabled={product.stock_status === "out_of_stock"}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {product.stock_status === "out_of_stock" ? "Out of Stock" : "Add to Cart"}
                  </button>
                </td>
              ))}
            </tr>

            {/* Fitment */}
            {hasVehicleContext && (
              <tr className="border-t">
                <th className="p-4 font-bold text-muted-foreground bg-secondary/20">Fitment</th>
                {comparedProducts.map(product => {
                  const fits = product.fits_all_vehicles || product.compatible_vehicles.some(v =>
                    (!fitsYear || (Number(fitsYear) >= v.year_from && Number(fitsYear) <= v.year_to)) &&
                    (!fitsMake || v.make.toLowerCase() === fitsMake.toLowerCase()) &&
                    (!fitsModel || v.model.toLowerCase() === fitsModel.toLowerCase())
                  );
                  return (
                    <td key={product.id} className="p-4 border-l bg-secondary/10">
                      {fits ? (
                        <div className="flex items-center gap-2 text-success">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="font-bold">Exact Fit</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-warning">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-bold">Not Confirmed</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            )}

            {/* Specs */}
            {allSpecKeys.map((keyEn) => (
              <tr key={keyEn} className="border-t">
                <th className="p-4 font-bold text-muted-foreground bg-secondary/10">{keyEn}</th>
                {comparedProducts.map(product => {
                  const spec = product.specifications?.find(s => s.key_en === keyEn);
                  return (
                  <td key={product.id} className="p-4 border-l">
                    {spec ? (
                      <span className="font-medium text-foreground">{locale === "ar" ? spec.value_ar : spec.value_en}</span>
                    ) : (
                      <span className="text-muted-foreground/50">-</span>
                    )}
                  </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
