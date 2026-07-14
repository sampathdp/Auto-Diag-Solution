import type { FieldErrors, FieldValues } from "react-hook-form";
import { showError } from "@/components/admin/ui/toast";

/**
 * react-hook-form's FieldErrors is a tree — array/object fields (specifications,
 * vehicle_ids, line items, ...) nest their errors instead of putting a `.message`
 * at the top level, so a naive Object.values(errors)[0]?.message misses most real
 * failures. Walk the whole tree and return the first message found anywhere in it.
 */
export function findFirstErrorMessage<T extends FieldValues>(errors: FieldErrors<T>): string | null {
  for (const value of Object.values(errors)) {
    if (!value || typeof value !== "object") continue;
    if (typeof (value as { message?: unknown }).message === "string") {
      return (value as { message: string }).message;
    }
    const nested = findFirstErrorMessage(value as FieldErrors<T>);
    if (nested) return nested;
  }
  return null;
}

/**
 * Standard onInvalid handler for every admin form's handleSubmit(onValid, onFormInvalid)
 * — without this, react-hook-form validation failures are silent: no toast, no console
 * output, no network request, nothing visibly happens when the user clicks Save.
 * Usage: form.handleSubmit(onValid, onFormInvalid)
 */
export function onFormInvalid<T extends FieldValues>(errors: FieldErrors<T>): void {
  // eslint-disable-next-line no-console
  console.error("Form validation failed:", errors);
  showError(findFirstErrorMessage(errors) ?? "Please fix the highlighted fields before continuing.");
}
