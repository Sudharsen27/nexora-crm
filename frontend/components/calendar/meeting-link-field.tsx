"use client";

import { useState } from "react";
import { Copy, ExternalLink, Link2, Sparkles, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  copyMeetingLink,
  detectMeetingLinkProvider,
  generateJitsiMeetingLink,
  meetingLinkProviderLabel,
} from "@/lib/meeting-link-utils";
import { cn } from "@/lib/utils";

interface MeetingLinkFieldProps {
  tenantSlug: string;
  title: string;
  value: string;
  onChange: (url: string) => void;
  onMeetingTypeHint?: (type: "online_meeting") => void;
}

export function MeetingLinkField({
  tenantSlug,
  title,
  value,
  onChange,
  onMeetingTypeHint,
}: MeetingLinkFieldProps) {
  const [copied, setCopied] = useState(false);
  const provider = value ? detectMeetingLinkProvider(value) : null;

  async function handleGenerate() {
    const link = generateJitsiMeetingLink(title || "meeting", tenantSlug);
    onChange(link);
    onMeetingTypeHint?.("online_meeting");
  }

  async function handleCopy() {
    if (!value) return;
    const ok = await copyMeetingLink(value);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] bg-[var(--surface-muted)]/40 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
          <Link2 className="h-4 w-4 text-[var(--primary)]" />
          Video conferencing
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
          For client-facing meetings, paste a Google Meet or Zoom link. For internal calls, generate a room instantly.
        </p>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-[var(--border)]/60 bg-[var(--surface-muted)]/30 p-3">
            <p className="text-xs font-medium text-[var(--foreground)]">Client meetings</p>
            <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
              Recommended: Google Meet, Zoom, or Microsoft Teams
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)]/60 bg-[var(--surface-muted)]/30 p-3">
            <p className="text-xs font-medium text-[var(--foreground)]">Internal meetings</p>
            <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
              One-click Nexora video room for your team
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void handleGenerate()}>
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Generate video room
          </Button>
          {value ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => void handleCopy()}>
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                {copied ? "Copied" : "Copy link"}
              </Button>
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "inline-flex h-8 items-center rounded-lg border border-[var(--border)] px-3 text-xs font-medium",
                  "hover:bg-[var(--surface-muted)]",
                )}
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Join
              </a>
            </>
          ) : null}
        </div>

        <div className="relative">
          {provider && (
            <span className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--primary)]">
              {meetingLinkProviderLabel(provider)}
            </span>
          )}
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://meet.google.com/your-meeting-code"
            className={cn("pr-28", provider && "border-[var(--primary)]/30")}
          />
        </div>

        {!value && (
          <p className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)]">
            <Video className="h-3.5 w-3.5" />
            A join link will appear on the meeting details and calendar invite.
          </p>
        )}
      </div>
    </section>
  );
}
