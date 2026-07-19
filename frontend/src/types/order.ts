export interface OrderItem {
  id: number;
  product_id: number | null;
  sku: string;
  name_en: string;
  name_ar: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  image: string | null;
}

export interface OrderShippingAddress {
  label?: string;
  name?: string;
  phone?: string;
  emirate?: string;
  city?: string;
  area?: string;
  street?: string;
  building?: string;
  apartment?: string;
  instructions?: string;
}

export type OrderStatus = "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

export interface Order {
  id: number;
  order_number: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  total_amount: number;
  vat_amount: number;
  shipping_amount: number;
  discount_amount: number;
  cancellation_reason: string | null;
  items: OrderItem[];
  shipping_address: OrderShippingAddress | null;
}
