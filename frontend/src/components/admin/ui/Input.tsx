"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-sm border bg-surface px-3.5 text-body text-ink placeholder:text-ink-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30",
        error ? "border-danger focus:border-danger" : "border-border focus:border-primary",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
