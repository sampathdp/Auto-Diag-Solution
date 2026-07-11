import { cn } from "@/lib/utils";

interface FormFieldProps {
  label?: React.ReactNode;
  htmlFor?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  error,
  helperText,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-label font-semibold text-ink">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-caption font-medium text-danger">{error}</p>
      ) : helperText ? (
        <p className="text-caption text-ink-muted">{helperText}</p>
      ) : null}
    </div>
  );
}
