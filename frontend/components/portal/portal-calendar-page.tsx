"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PortalEmptyState, PortalPageError, PortalPageLoading } from "@/components/portal/portal-page-state";
import { cn } from "@/lib/utils";
import { getPortalMeetings, requestPortalMeeting } from "@/lib/api/portal";
import type { PortalMeeting } from "@/types/portal";

function defaultStart() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  d.setHours(10, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

function defaultEnd(start: string) {
  const d = new Date(start);
  d.setHours(d.getHours() + 1);
  return d.toISOString().slice(0, 16);
}

export function PortalCalendarPage({ tenantSlug }: { tenantSlug: string }) {
  const [meetings, setMeetings] = useState<PortalMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [preferredStart, setPreferredStart] = useState(defaultStart);
  const [preferredEnd, setPreferredEnd] = useState(defaultEnd(defaultStart()));
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    void getPortalMeetings(tenantSlug)
      .then(setMeetings)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load meetings"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [tenantSlug]);

  const upcoming = meetings.filter((m) => new Date(m.end_datetime) >= new Date());
  const past = meetings.filter((m) => new Date(m.end_datetime) < new Date());

  async function submitRequest() {
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await requestPortalMeeting(tenantSlug, {
        title: title.trim(),
        description: description.trim() || undefined,
        preferred_start: new Date(preferredStart).toISOString(),
        preferred_end: new Date(preferredEnd).toISOString(),
        meeting_type: "client_meeting",
      });
      setTitle("");
      setDescription("");
      setShowForm(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to request meeting");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Meetings with your account team</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-sky-600 hover:bg-sky-700"
        >
          <CalendarPlus className="mr-2 h-4 w-4" />
          Request meeting
        </Button>
      </div>

      {error && <PortalPageError message={error} />}

      {showForm && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quarterly review" />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <textarea
                className="mt-1 min-h-20 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Topics you'd like to cover…"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Preferred start</Label>
                <Input
                  type="datetime-local"
                  value={preferredStart}
                  onChange={(e) => {
                    setPreferredStart(e.target.value);
                    setPreferredEnd(defaultEnd(e.target.value));
                  }}
                />
              </div>
              <div>
                <Label>Preferred end</Label>
                <Input
                  type="datetime-local"
                  value={preferredEnd}
                  onChange={(e) => setPreferredEnd(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={() => void submitRequest()}
              disabled={!title.trim() || submitting}
              className="bg-sky-600 hover:bg-sky-700"
            >
              {submitting ? "Submitting…" : "Submit request"}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <PortalPageLoading label="Loading meetings…" />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Upcoming
            </h2>
            {upcoming.length === 0 ? (
              <PortalEmptyState
                title="No upcoming meetings"
                description="Request a meeting with your account team using the button above."
              />
            ) : (
              upcoming.map((m) => <MeetingCard key={m.id} meeting={m} />)
            )}
          </section>

          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                Past
              </h2>
              {past.map((m) => <MeetingCard key={m.id} meeting={m} dimmed />)}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function MeetingCard({ meeting: m, dimmed }: { meeting: PortalMeeting; dimmed?: boolean }) {
  return (
    <Card className={dimmed ? "opacity-75" : ""}>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="font-medium">{m.title}</p>
          <p className="text-sm text-[var(--muted-foreground)]">
            {new Date(m.start_datetime).toLocaleString()} –{" "}
            {new Date(m.end_datetime).toLocaleTimeString()}
          </p>
          {m.location && <p className="text-xs">{m.location}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{m.status}</Badge>
          {m.meeting_url && (
            <a
              href={m.meeting_url}
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ size: "sm" }),
                "inline-flex bg-sky-600 text-white hover:bg-sky-700",
              )}
            >
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              Join
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
