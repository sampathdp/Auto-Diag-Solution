export interface OrderItem {
  id: number;
  product_id: number | null;
  sku: string;
  name_en: string;
  name_ar: string;
  quantity: number;
  unit_price: number;
  /** How unit_price was set; retail_unit_price is the retail price at the time. */
  pricing_type?: "retail" | "wholesale" | "quoted";
  retail_unit_price?: number;
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

export type OrderStatus =
  | "pending"
  | "pending_vin_verification"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

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
  carrier: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  items: OrderItem[];
  shipping_address: OrderShippingAddress | null;
  channel?: "retail" | "b2b";
  payment_method?: string | null;
  payment_method_label?: string;
  payment_status?: PaymentStatus | null;
  /** Only while a bank transfer is still awaited. */
  payment_instructions?: BankTransferDetails | null;
  can_upload_payment_proof?: boolean;
  payment_proofs?: { id: number; original_name: string; created_at: string }[];
}

export type PaymentStatus = "pending" | "pending_verification" | "partially_paid" | "paid" | "failed" | "refunded";

export interface BankAccount {
  bank_name: string;
  account_holder: string;
  account_number: string;
  iban: string;
  swift: string;
  branch: string;
}

export interface BankTransferDetails {
  accounts: BankAccount[];
  instructions: string;
  /** What the buyer quotes on the transfer: the order number. */
  reference?: string;
}

export type PaymentMethodCode = "cod" | "bank_transfer" | "cheque" | "credit" | "online_card";

/** One checkout tile (GET /account/checkout/payment-methods or /checkout/payment-methods). */
export interface PaymentMethodOption {
  code: PaymentMethodCode;
  label: string;
  description: string;
  available: boolean;
  reason: string | null;
}

export interface CheckoutPaymentMethods {
  channel: "retail" | "b2b";
  /** The dealer's checkout sends a quotation request instead of placing an order. */
  quotation_required: boolean;
  methods: PaymentMethodOption[];
  bank_transfer: BankTransferDetails | null;
}
