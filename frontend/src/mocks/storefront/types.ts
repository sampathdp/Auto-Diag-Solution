export type VehicleFitment = {
  year: number;
  make: string;
  model: string;
};

export type Category = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
};

export type Brand = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
};

export type Specification = {
  key: string;
  value: string;
};

export type Product = {
  id: string;
  sku: string;
  name_en: string;
  name_ar: string;
  brand: string;
  category_id: string;
  price_aed: number;
  compare_at_price: number | null;
  images: string[];
  stock: number;
  compatible_vehicles: VehicleFitment[];
  specifications: Specification[];
  rating: number;
  reviews: number;
};
