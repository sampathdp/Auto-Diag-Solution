import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-bold uppercase tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:text-[13px]",
  {
    variants: {
      variant: {
        primary:
          "bg-primary-accessible text-primary-foreground shadow-cta hover:-translate-y-0.5 hover:bg-primary-accessible/90 hover:shadow-lifted",
        secondary:
          "border border-border bg-card text-foreground shadow-soft hover:bg-secondary",
        outlineLight: "border border-white/55 text-white hover:border-white hover:bg-white/10",
        outlineDark:
          "border border-foreground text-foreground hover:bg-foreground hover:text-background",
        danger: "bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90",
        ghost: "normal-case tracking-normal hover:bg-secondary hover:text-foreground",
        link: "normal-case tracking-normal text-primary-accessible underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 rounded-sm px-3.5",
        lg: "h-14 rounded-md px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {children}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
