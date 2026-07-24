export type OrderStatus =
  | "pending"
  | "pending_vin_verification"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

const ORDER_STATUS_CLASSNAMES: Record<OrderStatus, string> = {
  pending: "bg-warning/10 text-warning-foreground border-warning/20",
  pending_vin_verification: "bg-warning/10 text-warning-foreground border-warning/20",
  paid: "bg-warning/10 text-warning-foreground border-warning/20",
  processing: "bg-warning/10 text-warning-foreground border-warning/20",
  shipped: "bg-info/10 text-info border-info/20",
  delivered: "bg-success/10 text-success border-success/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  refunded: "bg-muted text-muted-foreground border-border",
};

const ORDER_STATUS_LABELS: Partial<Record<OrderStatus, string>> = {
  pending_vin_verification: "Verifying Vehicle Details",
};

export function getOrderStatusClassName(status: OrderStatus): string {
  return ORDER_STATUS_CLASSNAMES[status] ?? "bg-muted text-muted-foreground border-border";
}

export function getOrderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status as OrderStatus] ?? status.charAt(0).toUpperCase() + status.slice(1);
}
