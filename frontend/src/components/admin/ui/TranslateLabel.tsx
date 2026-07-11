"use client";

import { Languages } from "lucide-react";

/** FormField label for an Arabic field, with a "Translate" button that pulls from the English twin. */
export function TranslateLabel({
  label,
  required,
  translating,
  disabled,
  onTranslate,
}: {
  label: string;
  required?: boolean;
  translating: boolean;
  disabled?: boolean;
  onTranslate: () => void;
}) {
  return (
    <span className="flex items-center justify-between">
      <span>
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </span>
      <button
        type="button"
        onClick={onTranslate}
        disabled={translating || disabled}
        className="flex items-center gap-1 text-caption font-medium text-primary hover:underline disabled:opacity-40 disabled:no-underline"
      >
        <Languages className="h-3.5 w-3.5" />
        {translating ? "Translating…" : "Translate"}
      </button>
    </span>
  );
}
