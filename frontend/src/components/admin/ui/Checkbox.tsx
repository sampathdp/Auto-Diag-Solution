"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const input = (
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className={cn(
          "h-4 w-4 shrink-0 rounded-sm border border-border text-primary accent-primary focus:outline-none focus:ring-2 focus:ring-ring/30",
          className
        )}
        {...props}
      />
    );

    if (!label) return input;

    return (
      <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-body text-ink">
        {input}
        {label}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";
