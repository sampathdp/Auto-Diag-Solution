import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: { label: string; value: string | number }[];
  loading?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, label, error, loading, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {label && <label className="text-sm font-bold text-slate-700 mb-1.5 block">{label}</label>}
        <div className="relative">
          <select
            className={cn(
              "flex h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all pr-10",
              error ? "border-red-500 focus-visible:ring-red-500" : "border-slate-200",
              className
            )}
            ref={ref}
            disabled={loading || props.disabled}
            {...props}
          >
            {loading ? (
              <option>Loading...</option>
            ) : (
              <>
                {options ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                )) : children}
              </>
            )}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <ChevronDown size={16} />
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
