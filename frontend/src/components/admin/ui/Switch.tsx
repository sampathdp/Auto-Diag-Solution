"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, id, ...props }, ref) => {
    const control = (
      <label
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-border/25 transition-colors has-[:checked]:bg-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/30",
          className
        )}
      >
        <input ref={ref} id={id} type="checkbox" className="peer sr-only" {...props} />
        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-surface shadow-sm transition-transform peer-checked:translate-x-5" />
      </label>
    );

    if (!label) return control;

    return (
      <div className="flex items-center justify-between gap-3">
        <span className="text-body text-ink">{label}</span>
        {control}
      </div>
    );
  }
);
Switch.displayName = "Switch";
