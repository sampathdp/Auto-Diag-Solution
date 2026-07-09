"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { FullScreenLoader } from "@/components/admin/ui/FullScreenLoader";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { ProductForm } from "@/components/admin/products/ProductForm";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { PackageX } from "lucide-react";
import type { Product } from "@/types/product";

export default function AdminEditProductPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const productQuery = useAdminQuery<Product>(adminQueryKeys.products.detail(id), `/products/${id}`);

  if (productQuery.isLoading) return <FullScreenLoader label="Loading product…" />;

  if (!productQuery.data) {
    return (
      <EmptyState icon={PackageX} title="Product not found" message="It may have been deleted." />
    );
  }

  return (
    <div>
      <PageHeader
        title={`Edit ${productQuery.data.name_en}`}
        description={`SKU ${productQuery.data.sku}`}
        breadcrumbs={[{ label: "Products", href: "/admin/products" }, { label: "Edit" }]}
      />
      <ProductForm mode="edit" product={productQuery.data} />
    </div>
  );
}
