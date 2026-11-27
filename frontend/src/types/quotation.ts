import type { BankTransferDetails, PaymentMethodOption } from "@/types/order";

export type QuotationStatus =
  | "submitted"
  | "under_review"
  | "discussion_required"
  | "revised"
  | "approved"
  | "rejected"
  | "expired"
  | "converted"
  | "cancelled";

export const OPEN_QUOTATION_STATUSES: QuotationStatus[] = ["submitted", "under_review", "discussion_required", "revised", "approved"];

export interface QuotationItem {
  id: number;
  product_id: number;
  sku: string;
  name_en: string;
  name_ar: string | null;
  quantity: number;
  unit_price: number;
  retail_unit_price: number;
  line_total: number;
  vat_inclusive: boolean;
}

export interface QuotationSnapshot {
  items: {
    product_id: number;
    sku: string;
    name_en: string;
    name_ar: string | null;
    quantity: number;
    unit_price: string | number;
    retail_unit_price: string | number;
    line_total: string | number;
  }[];
  subtotal: string | number;
  discount_amount: string | number;
  shipping_amount: string | number;
  vat_amount: string | number;
  total: string | number;
  expires_at: string | null;
}

export interface QuotationVersion {
  version_no: number;
  snapshot: QuotationSnapshot;
  reason: string | null;
  created_at: string;
  created_by_name: string | null;
}

export interface QuotationMessage {
  id: number;
  author_role: "admin" | "dealer" | "system";
  visibility: "dealer" | "internal";
  body: string;
  created_at: string;
  author_name: string | null;
}

export interface QuotationShippingAddress {
  name?: string;
  phone?: string;
  emirate?: string;
  area?: string;
  street?: string;
  building?: string;
  apartment?: string | null;
}

interface QuotationBase {
  id: number;
  quotation_number: string;
  status: QuotationStatus;
  current_version: number;
  subtotal: number;
  discount_amount: number;
  shipping_amount: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  currency: string;
  payment_method_pref: string | null;
  payment_method_label: string | null;
  shipping_address: QuotationShippingAddress | null;
  is_first_order: boolean;
  expires_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  rejected_by_role: "admin" | "dealer" | null;
  dealer_accepted_at: string | null;
  converted_order: { id: number; order_number: string; status: string; payment_status: string } | null;
  created_at: string;
  updated_at: string;
  versions: QuotationVersion[];
  messages: QuotationMessage[];
}

/** GET /account/dealer/quotations/{id} */
export interface DealerQuotation extends QuotationBase {
  items: QuotationItem[];
  can_accept: boolean;
  can_decline: boolean;
  can_message: boolean;
  payment_methods: PaymentMethodOption[];
  bank_transfer: BankTransferDetails | null;
  dealer: {
    business_name: string | null;
    dealer_code: string | null;
    trn: string | null;
    address_line: string | null;
    city: string | null;
    emirate: string | null;
  };
  company: { name: string; address: string; phone: string; email: string; trn: string };
}

export interface DealerQuotationListItem {
  id: number;
  quotation_number: string;
  status: QuotationStatus;
  current_version: number;
  total: string;
  currency: string;
  expires_at: string | null;
  submitted_at: string | null;
  updated_at: string;
  converted_order_id: number | null;
  converted_order_number: string | null;
  item_count: number;
}

export interface Paginated<T> {
  items: T[];
  meta: { total: number; current_page: number; per_page: number; total_pages: number };
  counts: Partial<Record<QuotationStatus, number>>;
}

/** GET /admin/b2b/quotations/{id} */
export interface AdminQuotation extends QuotationBase {
  items: (QuotationItem & {
    current_retail_price: number | null;
    current_wholesale_price: number | null;
    stock: { status: string; stock_status: string; track_inventory: boolean; stock_quantity: number } | null;
  })[];
  approved_by_name: string | null;
  dealer: {
    id: number;
    business_name: string | null;
    dealer_code: string | null;
    status: string | null;
    is_active: boolean;
    email: string | null;
    contact_name: string | null;
    phone: string | null;
  };
  allowed: { start_review: boolean; revise: boolean; approve: boolean; reject: boolean; message: boolean };
  default_expiry_days: number;
}

export interface AdminQuotationListItem {
  id: number;
  quotation_number: string;
  status: QuotationStatus;
  current_version: number;
  total: string;
  currency: string;
  expires_at: string | null;
  is_first_order: number;
  payment_method_pref: string | null;
  submitted_at: string | null;
  updated_at: string;
  converted_order_id: number | null;
  dealer_profile_id: number;
  business_name: string | null;
  dealer_code: string | null;
  user_email: string;
  item_count: number;
}

export const QUOTATION_STATUS_LABEL: Record<QuotationStatus, string> = {
  submitted: "New request",
  under_review: "Under review",
  discussion_required: "Waiting for dealer",
  revised: "Revised",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
  converted: "Converted to order",
  cancelled: "Withdrawn",
};
