import { cn } from "@/lib/utils";

export function SkeletonRow({ columns = 5 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 w-full max-w-[140px] animate-pulse rounded-sm bg-app" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-lg border border-border bg-surface p-5", className)}>
      <div className="h-3 w-20 rounded-sm bg-app" />
      <div className="mt-3 h-6 w-28 rounded-sm bg-app" />
    </div>
  );
}
