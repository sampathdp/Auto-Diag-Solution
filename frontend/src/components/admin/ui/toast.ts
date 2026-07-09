/**
 * Thin wrappers around react-hot-toast (already wired into AdminProviders and
 * used by the storefront's AppProviders — kept as the one toast library for
 * the whole app rather than adding sonner as a second dependency).
 */
import toast from "react-hot-toast";

export const showSuccess = (message: string) => toast.success(message);
export const showError = (message: string) => toast.error(message);
export const showInfo = (message: string) => toast(message, { icon: "ℹ️" });
