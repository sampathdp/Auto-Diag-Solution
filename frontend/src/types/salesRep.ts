/** Real backend shape (backend/app/Services/SalesRepService.php). */
export interface SalesRepStats {
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_sales: number;
  total_discount_given: number;
  pending_commission: number;
  approved_commission: number;
  paid_commission: number;
  outstanding_commission: number;
}

export interface SalesRep {
  id: number;
  name: string;
  phone: string | null;
  email: string;
  address: string | null;
  status: "active" | "inactive";
  commission_type: "percentage" | "fixed_amount";
  commission_value: number;
  stats?: SalesRepStats;
  created_at: string;
  updated_at: string;
}
