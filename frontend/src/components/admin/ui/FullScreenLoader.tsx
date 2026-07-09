import { LoadingSpinner } from "./LoadingSpinner";

export function FullScreenLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-app text-ink-muted">
      <LoadingSpinner size="lg" />
      <p className="text-body">{label}</p>
    </div>
  );
}
