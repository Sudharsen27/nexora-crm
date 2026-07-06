"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PortalEmptyState, PortalPageLoading } from "@/components/portal/portal-page-state";
import { getPortalKnowledge } from "@/lib/api/portal";
import type { PortalKnowledgeSummary } from "@/types/portal";

export function PortalKnowledgePage({ tenantSlug }: { tenantSlug: string }) {
  const [q, setQ] = useState("");
  const [articles, setArticles] = useState<PortalKnowledgeSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      void getPortalKnowledge(tenantSlug, q || undefined)
        .then(setArticles)
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [tenantSlug, q]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Knowledge base</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Self-service guides and FAQs</p>
      </div>
      <Input placeholder="Search articles…" value={q} onChange={(e) => setQ(e.target.value)} />
      {loading ? (
        <PortalPageLoading label="Searching articles…" />
      ) : articles.length === 0 ? (
        <PortalEmptyState
          icon={BookOpen}
          title={q ? "No articles match your search" : "No articles published yet"}
          description="Check back later or contact support for help."
        />
      ) : (
        <div className="space-y-3">
          {articles.map((a) => (
            <Link key={a.id} href={`/portal/${tenantSlug}/knowledge/${a.slug}`}>
              <Card className="transition hover:border-sky-500/30">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{a.title}</p>
                    <Badge variant="outline">{a.category}</Badge>
                  </div>
                  {a.summary && (
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{a.summary}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
