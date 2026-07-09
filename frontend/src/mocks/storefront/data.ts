import { Product, Category, Brand, VehicleFitment } from "./types";

export const mockCategories: Category[] = [
  { id: "brakes", slug: "brakes", name_en: "Brakes & Rotors", name_ar: "الفرامل والدوارات" },
  { id: "filters", slug: "filters", name_en: "Filters", name_ar: "الفلاتر" },
  { id: "ignition", slug: "ignition", name_en: "Ignition", name_ar: "الإشعال" },
  { id: "suspension", slug: "suspension", name_en: "Suspension", name_ar: "نظام التعليق" },
  { id: "lighting", slug: "lighting", name_en: "Lighting", name_ar: "الإضاءة" },
  { id: "belts", slug: "belts", name_en: "Belts & Hoses", name_ar: "الأحزمة والخراطيم" },
  { id: "engine", slug: "engine", name_en: "Engine Parts", name_ar: "أجزاء المحرك" },
  { id: "exhaust", slug: "exhaust", name_en: "Exhaust", name_ar: "العادم" },
];

export const mockBrands: Brand[] = [
  { id: "bosch", slug: "bosch", name_en: "Bosch", name_ar: "بوش" },
  { id: "brembo", slug: "brembo", name_en: "Brembo", name_ar: "بريمبو" },
  { id: "denso", slug: "denso", name_en: "Denso", name_ar: "دينسو" },
  { id: "ngk", slug: "ngk", name_en: "NGK", name_ar: "إن جي كي" },
  { id: "kyb", slug: "kyb", name_en: "KYB", name_ar: "كاي واي بي" },
  { id: "castrol", slug: "castrol", name_en: "Castrol", name_ar: "كاسترول" },
  { id: "valeo", slug: "valeo", name_en: "Valeo", name_ar: "فاليو" },
  { id: "hella", slug: "hella", name_en: "Hella", name_ar: "هيلا" },
  { id: "mahle", slug: "mahle", name_en: "Mahle", name_ar: "ماهلي" },
  { id: "mann", slug: "mann", name_en: "Mann-Filter", name_ar: "مان-فلتر" },
  { id: "delphi", slug: "delphi", name_en: "Delphi", name_ar: "دلفي" },
  { id: "monroe", slug: "monroe", name_en: "Monroe", name_ar: "مونرو" },
  { id: "gates", slug: "gates", name_en: "Gates", name_ar: "جيتس" },
  { id: "aisin", slug: "aisin", name_en: "Aisin", name_ar: "آيسين" },
  { id: "exedy", slug: "exedy", name_en: "Exedy", name_ar: "إكسيدي" },
];

const vehicleCombinations = [
  { year: 2024, make: "Toyota", model: "Land Cruiser" },
  { year: 2024, make: "Toyota", model: "Camry" },
  { year: 2023, make: "Toyota", model: "Hilux" },
  { year: 2023, make: "Nissan", model: "Patrol" },
  { year: 2022, make: "Nissan", model: "Altima" },
  { year: 2024, make: "Ford", model: "F-150" },
  { year: 2021, make: "Ford", model: "Explorer" },
  { year: 2024, make: "Honda", model: "Accord" },
  { year: 2020, make: "Honda", model: "CR-V" },
  { year: 2024, make: "Lexus", model: "LX 600" },
];

// Helper to generate a random price
const rndPrice = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);
const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const pickMultipleRandom = <T>(arr: T[], count: number): T[] => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const mockProducts: Product[] = Array.from({ length: 65 }).map((_, i) => {
  const category = pickRandom(mockCategories);
  const brand = pickRandom(mockBrands);
  const price = rndPrice(100, 3000);
  const hasDiscount = Math.random() > 0.7;
  const compareAtPrice = hasDiscount ? price + rndPrice(50, 500) : null;
  const inStock = Math.random() > 0.15; // 85% chance to be in stock

  return {
    id: `prod_${1000 + i}`,
    sku: `${brand.id.substring(0, 3).toUpperCase()}-${category.id.substring(0, 3).toUpperCase()}-${1000 + i}`,
    name_en: `Premium ${category.name_en} - ${brand.name_en}`,
    name_ar: `${category.name_ar} ممتازة - ${brand.name_ar}`,
    brand: brand.id,
    category_id: category.id,
    price_aed: price,
    compare_at_price: compareAtPrice,
    images: [
      `https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=80`, // Generic placeholder parts
      `https://images.unsplash.com/photo-1590518776085-f55ebce3dcad?w=800&q=80`,
    ],
    stock: inStock ? rndPrice(5, 50) : 0,
    compatible_vehicles: pickMultipleRandom(vehicleCombinations, rndPrice(1, 4)),
    specifications: [
      { key: "Warranty", value: "1 Year" },
      { key: "Material", value: "High Quality OEM Standard" },
      { key: "Weight", value: `${(Math.random() * 5).toFixed(1)} kg` }
    ],
    rating: Number((Math.random() * (5 - 3.5) + 3.5).toFixed(1)),
    reviews: rndPrice(0, 300),
  };
});

export type ProductFilters = {
  q?: string;
  category?: string;
  brand?: string[];
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  fits_year?: string;
  fits_make?: string;
  fits_model?: string;
  rating?: number;
  sort?: "price_asc" | "price_desc" | "newest" | "name_asc";
  page?: number;
  per_page?: number;
};

export async function mockFetchProducts(filters: ProductFilters) {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  let filtered = [...mockProducts];

  // 1. Text Search
  if (filters.q) {
    const term = filters.q.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name_en.toLowerCase().includes(term) ||
        p.name_ar.includes(term) ||
        p.sku.toLowerCase().includes(term)
    );
  }

  // 2. Category
  if (filters.category) {
    filtered = filtered.filter((p) => p.category_id === filters.category);
  }

  // 3. Brands
  if (filters.brand && filters.brand.length > 0) {
    filtered = filtered.filter((p) => filters.brand!.includes(p.brand));
  }

  // 4. Price
  if (filters.min_price !== undefined) {
    filtered = filtered.filter((p) => p.price_aed >= filters.min_price!);
  }
  if (filters.max_price !== undefined) {
    filtered = filtered.filter((p) => p.price_aed <= filters.max_price!);
  }

  // 5. Stock
  if (filters.in_stock) {
    filtered = filtered.filter((p) => p.stock > 0);
  }

  // 6. Fitment
  if (filters.fits_year || filters.fits_make || filters.fits_model) {
    filtered = filtered.filter((p) => {
      return p.compatible_vehicles.some((v) => {
        let match = true;
        if (filters.fits_year && v.year.toString() !== filters.fits_year) match = false;
        if (filters.fits_make && v.make.toLowerCase() !== filters.fits_make.toLowerCase()) match = false;
        if (filters.fits_model && v.model.toLowerCase() !== filters.fits_model.toLowerCase()) match = false;
        return match;
      });
    });
  }

  // 7. Rating
  if (filters.rating !== undefined) {
    filtered = filtered.filter((p) => p.rating >= filters.rating!);
  }

  // 8. Sort
  if (filters.sort) {
    switch (filters.sort) {
      case "price_asc":
        filtered.sort((a, b) => a.price_aed - b.price_aed);
        break;
      case "price_desc":
        filtered.sort((a, b) => b.price_aed - a.price_aed);
        break;
      case "name_asc":
        filtered.sort((a, b) => a.name_en.localeCompare(b.name_en));
        break;
      case "newest":
        // mock random sorting for newest
        filtered.sort((a, b) => b.id.localeCompare(a.id));
        break;
    }
  }

  // 8. Pagination
  const page = filters.page || 1;
  const perPage = filters.per_page || 12;
  const total = filtered.length;
  const totalPages = Math.ceil(total / perPage);
  const data = filtered.slice((page - 1) * perPage, page * perPage);

  return {
    data,
    total,
    page,
    totalPages,
    perPage,
  };
}
