import { ConfirmModal } from "./Modal";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** The specific thing being deleted, e.g. a product name — quoted in the message. */
  itemName: string;
  /** e.g. "product", "category" — defaults to "item". */
  itemLabel?: string;
  /** Extra sentence appended below the standard message, e.g. warning about related records. */
  extraWarning?: string;
  loading?: boolean;
}

/** Delete-confirmation preset over ConfirmModal — "Are you sure you want to delete X?" */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  itemName,
  itemLabel = "item",
  extraWarning,
  loading,
}: ConfirmDialogProps) {
  const description = extraWarning
    ? `Are you sure you want to delete "${itemName}"? This action cannot be undone. ${extraWarning}`
    : `Are you sure you want to delete "${itemName}"? This action cannot be undone.`;

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Delete ${itemLabel}?`}
      description={description}
      confirmLabel="Delete"
      cancelLabel="Cancel"
      variant="danger"
      loading={loading}
    />
  );
}
