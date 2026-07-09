import { ShopView } from "@/components/shop/ShopView";

export default async function CategoryShopPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  return (
    <div className="min-h-screen bg-background">
      <ShopView initialCategory={category} hideCategoryFilter={true} />
    </div>
  );
}
