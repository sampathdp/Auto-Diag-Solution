"use client";

import { useState } from "react";
import { StickyNote } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/admin/ui/Card";
import { Textarea } from "@/components/admin/ui/Textarea";
import { Button } from "@/components/admin/ui/Button";
import { formatDateTime } from "@/lib/admin/utils";

export interface Note {
  id: number;
  text: string;
  author: string;
  created_at: string;
}

/** Internal notes list + add form — shared by the Order and Customer detail pages. */
export function NotesPanel({
  notes,
  onAdd,
  adding = false,
  title = "Internal Notes",
}: {
  notes: Note[];
  onAdd: (text: string) => void;
  adding?: boolean;
  title?: string;
}) {
  const [draft, setDraft] = useState("");

  const submit = () => {
    if (!draft.trim()) return;
    onAdd(draft.trim());
    setDraft("");
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-h4 font-bold text-ink">{title}</h2>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder="Add an internal note — not visible to the customer…"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={submit} loading={adding} disabled={!draft.trim()}>
              Add Note
            </Button>
          </div>
        </div>

        {notes.length === 0 ? (
          <div className="flex items-center gap-2 text-body text-ink-muted">
            <StickyNote className="h-4 w-4" />
            No notes yet.
          </div>
        ) : (
          <ul className="space-y-3 border-t border-border pt-3">
            {notes.map((note) => (
              <li key={note.id} className="text-body">
                <p className="text-ink">{note.text}</p>
                <p className="mt-0.5 text-caption text-ink-muted">
                  {note.author} · {formatDateTime(note.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
