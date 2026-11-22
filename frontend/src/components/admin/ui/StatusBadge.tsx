import { Badge, type BadgeVariant } from "./Badge";

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  active: "success",
  published: "success",
  delivered: "success",
  paid: "success",
  pending: "warning",
  pending_vin_verification: "warning",
  approved: "info",
  processing: "info",
  shipped: "info",
  draft: "neutral",
  archived: "neutral",
  inactive: "neutral",
  blocked: "danger",
  cancelled: "danger",
  refunded: "danger",
  failed: "danger",
  refund_requested: "warning",
  out_of_stock: "danger",
  sent: "success",
  pending_review: "warning",
  under_review: "info",
  rejected: "danger",
  suspended: "danger",
  sending: "info",
  skipped: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  out_of_stock: "Out of Stock",
  refund_requested: "Refund Requested",
  pending_vin_verification: "Pending VIN Verification",
  pending_review: "Pending Review",
  under_review: "Under Review",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "neutral"} className="capitalize">
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}
