"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PortalEmptyState, PortalPageError, PortalPageLoading } from "@/components/portal/portal-page-state";
import { createPortalTicket, getPortalTickets } from "@/lib/api/portal";
import type { PortalTicket } from "@/types/portal";

const PRIORITIES = ["low", "medium", "high"] as const;
const CATEGORIES = ["general", "billing", "technical", "documents"] as const;

export function PortalSupportPage({ tenantSlug }: { tenantSlug: string }) {
  const [tickets, setTickets] = useState<PortalTicket[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [category, setCategory] = useState<string>("general");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    void getPortalTickets(tenantSlug)
      .then(setTickets)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load tickets"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [tenantSlug]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await createPortalTicket(tenantSlug, { subject, description, priority, category });
      setSubject("");
      setDescription("");
      setShowForm(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Support center</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Get help from your account team</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-sky-600 hover:bg-sky-700">
          New ticket
        </Button>
      </div>

      {error && <PortalPageError message={error} />}

      {showForm && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <div>
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                className="mt-1 min-h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Priority</Label>
                <select
                  className="mt-1 h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Category</Label>
                <select
                  className="mt-1 h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              onClick={() => void submit()}
              disabled={!subject || !description || submitting}
              className="bg-sky-600 hover:bg-sky-700"
            >
              {submitting ? "Submitting…" : "Submit ticket"}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <PortalPageLoading label="Loading tickets…" />
      ) : tickets.length === 0 ? (
        <PortalEmptyState
          title="No support tickets"
          description="Create a ticket when you need help with billing, documents, or technical issues."
          action={
            <Button onClick={() => setShowForm(true)} className="bg-sky-600 hover:bg-sky-700">
              Create your first ticket
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Link key={t.id} href={`/portal/${tenantSlug}/support/${t.id}`}>
              <Card className="transition hover:border-sky-500/30">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{t.subject}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {t.category} · {t.priority} · {new Date(t.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge>{t.status}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
