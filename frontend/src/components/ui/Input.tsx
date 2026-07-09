import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-xl border bg-card px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:ring-4 focus:ring-ring/20",
          error ? "border-destructive focus:border-destructive" : "border-border focus:border-primary",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
