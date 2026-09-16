import type { SalesRep } from "./salesRep";

export type DiscountOrCommissionType = "percentage" | "fixed_amount";
export type CommissionBase = "original_subtotal" | "discounted_subtotal" | "final_total";

export interface PromoCodeStats {
  total_usage: number;
  completed_orders: number;
  cancelled_orders: number;
  total_sales: number;
  total_discount: number;
  total_commission: number;
  pending_commission: number;
  paid_commission: number;
}

export interface PromoCodeOrderRow {
  id: number;
  order_number: string;
  created_at: string;
  total: number;
  discount_amount: number;
  commission_amount: number;
  status: string;
  customer_name: string | null;
}

/** Real backend shape (backend/app/Services/PromoCodeService.php). */
export interface PromoCode {
  id: number;
  code: string;
  description: string | null;
  sales_rep_id: number;
  sales_rep_name?: string; // joined in on the list endpoint
  sales_rep?: SalesRep; // embedded on find()
  discount_type: DiscountOrCommissionType;
  discount_value: number;
  commission_type: DiscountOrCommissionType;
  commission_value: number;
  commission_base: CommissionBase;
  minimum_order_amount: number;
  maximum_discount_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  start_date: string | null;
  expiry_date: string | null;
  status: "active" | "inactive";
  stats?: PromoCodeStats;
  orders?: PromoCodeOrderRow[];
  created_at: string;
  updated_at: string;
}
