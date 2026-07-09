import { mockProducts } from "./data";

export interface CustomerProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  email_verified: boolean;
  avatar_url: string;
  role: "customer";
}

export interface CustomerAddress {
  id: number;
  user_id: number;
  type: "home" | "work" | "other";
  name: string;
  phone: string;
  emirate: string;
  city: string;
  area: string;
  street: string;
  building: string;
  apartment: string;
  landmark: string;
  is_default: boolean;
}

export interface CustomerVehicle {
  id: number;
  user_id: number;
  year: number;
  make: string;
  model: string;
  trim?: string;
  body_type?: string;
  engine?: string;
  fuel_type?: string;
  transmission?: string;
  drive_type?: string;
  color?: string;
  vin?: string;
  license_plate?: string;
  mileage?: number;
  nickname?: string;
  purchase_date?: string;
  is_default: boolean;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: string;
  sku: string;
  name_en: string;
  name_ar: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  image: string;
}

export interface Order {
  id: number;
  order_number: string;
  user_id: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
  total_amount: number;
  vat_amount: number;
  shipping_amount: number;
  discount_amount: number;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  shipping_address?: CustomerAddress;
}

// Seeded Data
export let customerProfile: CustomerProfile = {
  id: 1,
  name: "Ahmed Al Mansoori",
  email: "ahmed@example.com",
  phone: "+971501234567",
  email_verified: true,
  avatar_url: "https://i.pravatar.cc/150?u=ahmed",
  role: "customer",
};

export function updateCustomerProfile(data: Partial<CustomerProfile>) {
  customerProfile = { ...customerProfile, ...data };
}

export let customerAddresses: CustomerAddress[] = [
  {
    id: 101,
    user_id: 1,
    type: "home",
    name: "Ahmed Al Mansoori",
    phone: "+971501234567",
    emirate: "Dubai",
    city: "Dubai",
    area: "Dubai Marina",
    street: "Al Marsa St",
    building: "Marina Crown",
    apartment: "1204",
    landmark: "Near Spinneys",
    is_default: true,
  },
  {
    id: 102,
    user_id: 1,
    type: "work",
    name: "Ahmed Al Mansoori",
    phone: "+971501234567",
    emirate: "Dubai",
    city: "Dubai",
    area: "Business Bay",
    street: "Marasi Dr",
    building: "Bay Square",
    apartment: "Office 302",
    landmark: "Next to DoubleTree by Hilton",
    is_default: false,
  },
];

export let customerVehicles: CustomerVehicle[] = [
  {
    id: 201,
    user_id: 1,
    year: 2019,
    make: "Toyota",
    model: "Land Cruiser",
    trim: "VXR 5.7L",
    is_default: true,
  },
  {
    id: 202,
    user_id: 1,
    year: 2015,
    make: "Nissan",
    model: "Patrol",
    trim: "LE Platinum 5.6L",
    is_default: false,
  },
  {
    id: 203,
    user_id: 1,
    year: 2021,
    make: "Ford",
    model: "Explorer",
    trim: "ST 3.0L",
    is_default: false,
  },
];

// Generate 12 orders spanning 6 months
const statuses: Order["status"][] = ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"];
const generateOrders = (): Order[] => {
  return Array.from({ length: 12 }).map((_, i) => {
    const status = statuses[i % statuses.length];
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - i * 15); // Spread over ~180 days

    // Randomize 1-3 items from mockProducts
    const numItems = Math.floor(Math.random() * 3) + 1;
    const items: OrderItem[] = Array.from({ length: numItems }).map((_, j) => {
      const p = mockProducts[(i + j) % mockProducts.length];
      const qty = Math.floor(Math.random() * 2) + 1;
      return {
        id: 3000 + i * 10 + j,
        order_id: 1000 + i,
        product_id: p.id,
        sku: p.sku,
        name_en: p.name_en,
        name_ar: p.name_ar,
        quantity: qty,
        unit_price: p.price_aed,
        total_price: p.price_aed * qty,
        image: p.images[0],
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
    const shipping = 20;
    const vat = parseFloat(((subtotal + shipping) * 0.05).toFixed(2));
    const total = subtotal + shipping + vat;

    return {
      id: 1000 + i,
      order_number: `ORD-${2024000 + i}`,
      user_id: 1,
      status: status,
      total_amount: total,
      vat_amount: vat,
      shipping_amount: shipping,
      discount_amount: 0,
      created_at: createdDate.toISOString(),
      updated_at: createdDate.toISOString(),
      items: items,
      shipping_address: customerAddresses[0],
    };
  });
};

export let customerOrders: Order[] = generateOrders();

export let customerWishlist: string[] = mockProducts.slice(0, 5).map(p => p.id);

export let customerNotificationPreferences = {
  email_orders: true,
  email_promotions: false,
  sms_orders: true,
  sms_promotions: false,
};
