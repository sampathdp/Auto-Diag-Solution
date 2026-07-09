"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function RadioGroup({
  children,
  className,
  orientation = "vertical",
}: {
  children: React.ReactNode;
  className?: string;
  orientation?: "vertical" | "horizontal";
}) {
  return (
    <div
      role="radiogroup"
      className={cn(orientation === "vertical" ? "space-y-2" : "flex flex-wrap gap-4", className)}
    >
      {children}
    </div>
  );
}

export interface RadioOptionProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export const RadioOption = React.forwardRef<HTMLInputElement, RadioOptionProps>(
  ({ label, className, id, ...props }, ref) => (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-body text-ink">
      <input
        ref={ref}
        id={id}
        type="radio"
        className={cn(
          "h-4 w-4 shrink-0 border border-border text-primary accent-primary focus:outline-none focus:ring-2 focus:ring-ring/30",
          className
        )}
        {...props}
      />
      {label}
    </label>
  )
);
RadioOption.displayName = "RadioOption";
