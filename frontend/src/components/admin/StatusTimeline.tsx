import { Card, CardHeader, CardBody } from "@/components/admin/ui/Card";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { formatDateTime } from "@/lib/admin/utils";

export interface TimelineEntry {
  status: string;
  note?: string | null;
  created_at: string;
  changed_by_name?: string | null;
}

export function StatusTimeline({ history }: { history: TimelineEntry[] }) {
  const sorted = [...history].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <Card>
      <CardHeader>
        <h2 className="text-h4 font-bold text-ink">Status Timeline</h2>
      </CardHeader>
      <CardBody>
        <ol className="space-y-5">
          {sorted.map((entry, i) => (
            <li key={i} className="relative flex gap-3 pl-1">
              <div className="flex flex-col items-center">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                {i < sorted.length - 1 && <span className="w-px flex-1 bg-border" />}
              </div>
              <div className="pb-1">
                <StatusBadge status={entry.status} />
                <p className="mt-1 text-caption text-ink-muted">{formatDateTime(entry.created_at)}</p>
                <p className="text-caption text-ink-muted">{entry.changed_by_name ?? "System"}</p>
                {entry.note && <p className="mt-1 text-caption text-ink">{entry.note}</p>}
              </div>
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}
