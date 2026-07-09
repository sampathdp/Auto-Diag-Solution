import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PreloaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
}

export function Preloader({ size = 24, className, ...props }: PreloaderProps) {
  return (
    <div className={cn("flex items-center justify-center", className)} {...props}>
      <Loader2 className="animate-spin text-primary" size={size} />
    </div>
  );
}
