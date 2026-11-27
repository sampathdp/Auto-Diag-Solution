/**
 * Client-side permission check, mirroring PermissionService::hasPermission on the
 * backend. It only decides what to SHOW; every action is still authorized server-side.
 */
export function hasPermission(userPermissions: string[] | undefined, required: string): boolean {
  if (!userPermissions) return false;
  return userPermissions.some((p) => {
    if (p === "*" || p === required) return true;
    if (!p.includes("*")) return false;
    const pattern = new RegExp(`^${p.split("*").map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`);
    return pattern.test(required);
  });
}

export const PERMISSIONS = {
  STAFF_MANAGE: "staff.manage",
  SETTINGS_B2B: "b2b.settings.manage",
  B2B_PRICING_MANAGE: "b2b.pricing.manage",
  PAYMENTS_CONFIRM: "payments.confirm",
  B2B_QUOTATIONS_MANAGE: "b2b.quotations.manage",
  B2B_QUOTATIONS_APPROVE: "b2b.quotations.approve",
} as const;
