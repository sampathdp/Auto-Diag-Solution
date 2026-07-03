import { usePermissions } from "./usePermissions";

/**
 * Shorthand hook for permission checks
 */
export const useCan = (permission?: string): boolean => {
  const { can } = usePermissions();
  if (!permission) return true;
  return can(permission);
};
