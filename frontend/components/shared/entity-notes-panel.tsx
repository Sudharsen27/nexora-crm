"use client";

import { useEffect, useState } from "react";
import { Check, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const NOTES_MAX_LENGTH = 5000;

interface EntityNotesPanelProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  placeholder?: string;
  description?: string;
  readOnly?: boolean;
}

export function EntityNotesPanel({
  value,
  onChange,
  onSave,
  saving,
  placeholder = "Write notes here...",
  description = "Private notes visible to your team on this record.",
  readOnly = false,
}: EntityNotesPanelProps) {
  const [showSaved, setShowSaved] = useState(false);
  const charCount = value.length;
  const nearLimit = charCount > NOTES_MAX_LENGTH * 0.9;

  useEffect(() => {
    if (!showSaved) return;
    const timer = window.setTimeout(() => setShowSaved(false), 2500);
    return () => window.clearTimeout(timer);
  }, [showSaved]);

  async function handleSave() {
    await onSave();
    setShowSaved(true);
  }

  return (
    <Card>
      <CardHeader className="border-b border-[var(--border)] pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <StickyNote className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">Notes</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <textarea
          rows={10}
          maxLength={NOTES_MAX_LENGTH}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          disabled={readOnly}
          className={cn(
            "min-h-[220px] w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-relaxed text-[var(--foreground)]",
            "placeholder:text-zinc-400 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20",
            readOnly && "cursor-default opacity-90",
          )}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span className={cn(nearLimit && "font-medium text-amber-600")}>
              {charCount.toLocaleString()} / {NOTES_MAX_LENGTH.toLocaleString()}
            </span>
            {showSaved && (
              <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                <Check className="h-3.5 w-3.5" />
                Saved
              </span>
            )}
          </div>
          {!readOnly && (
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving..." : "Save notes"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface EntityNotesPreviewProps {
  notes: string;
  onEdit?: () => void;
}

export function EntityNotesPreview({ notes, onEdit }: EntityNotesPreviewProps) {
  const preview = notes.length > 280 ? `${notes.slice(0, 280).trimEnd()}…` : notes;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-[var(--border)] bg-amber-500/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <StickyNote className="h-4 w-4" />
          </div>
          <CardTitle className="text-base">Notes</CardTitle>
        </div>
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{preview}</p>
      </CardContent>
    </Card>
  );
}

interface EntityNotesEmptyProps {
  onAdd?: () => void;
}

export function EntityNotesEmpty({ onAdd }: EntityNotesEmptyProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-14 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <StickyNote className="h-7 w-7" />
        </div>
        <h3 className="text-base font-medium text-[var(--foreground)]">No notes yet</h3>
        <p className="mt-1 max-w-sm text-sm text-zinc-500">
          Capture context, follow-ups, or meeting summaries for this contact.
        </p>
        {onAdd && (
          <Button className="mt-5" variant="outline" onClick={onAdd}>
            Add notes
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
