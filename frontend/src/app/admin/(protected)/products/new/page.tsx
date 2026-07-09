"use client";

import { PageHeader } from "@/components/admin/ui/PageHeader";
import { ProductForm } from "@/components/admin/products/ProductForm";

export default function AdminNewProductPage() {
  return (
    <div>
      <PageHeader
        title="Add Product"
        description="Create a new product listing."
        breadcrumbs={[{ label: "Products", href: "/admin/products" }, { label: "Add Product" }]}
      />
      <ProductForm mode="create" />
    </div>
  );
}
