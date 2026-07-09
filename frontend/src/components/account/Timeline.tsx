import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Clock } from "lucide-react";

export interface TimelineEvent {
  title: string;
  description?: string;
  date: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export function Timeline({ events, className }: TimelineProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {events.map((event, index) => {
        const isLast = index === events.length - 1;

        return (
          <div key={index} className="relative flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  event.isCompleted
                    ? "bg-primary text-primary-foreground"
                    : event.isCurrent
                    ? "border-2 border-primary bg-background text-primary"
                    : "border-2 border-muted bg-background text-muted-foreground"
                )}
              >
                {event.isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : event.isCurrent ? (
                  <Clock className="h-4 w-4 animate-pulse" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "my-2 w-[2px] flex-1",
                    event.isCompleted ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>

            <div className={cn("pb-8 pt-1", isLast && "pb-0")}>
              <h4
                className={cn(
                  "text-sm font-semibold",
                  event.isCompleted || event.isCurrent
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {event.title}
              </h4>
              <span className="text-xs text-muted-foreground">{event.date}</span>
              {event.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {event.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
