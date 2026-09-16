import type { CommissionBase, DiscountOrCommissionType } from "./promoCode";

export type CommissionStatus = "pending" | "approved" | "paid" | "cancelled";

/** Real backend shape, joined with order/customer/rep/promo-code names (backend/app/Repositories/CommissionRepository.php). */
export interface Commission {
  id: number;
  order_id: number;
  order_number: string | null;
  customer_id: number | null;
  customer_name: string | null;
  sales_rep_id: number;
  sales_rep_name: string | null;
  promo_code_id: number | null;
  promo_code: string | null;
  commission_type: DiscountOrCommissionType;
  commission_value: number;
  commission_base: CommissionBase;
  base_amount: number;
  commission_amount: number;
  status: CommissionStatus;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommissionDashboardTotals {
  total_commission: number;
  pending_commission: number;
  approved_commission: number;
  paid_commission: number;
}
