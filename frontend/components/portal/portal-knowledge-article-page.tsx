"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { getPortalKnowledgeArticle } from "@/lib/api/portal";

export function PortalKnowledgeArticlePage({
  tenantSlug,
  articleSlug,
}: {
  tenantSlug: string;
  articleSlug: string;
}) {
  const [body, setBody] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    void getPortalKnowledgeArticle(tenantSlug, articleSlug).then((a) =>
      setBody({ title: a.title, body: a.body }),
    );
  }, [tenantSlug, articleSlug]);

  if (!body) return <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>;

  return (
    <article className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">{body.title}</h1>
      <Card>
        <CardContent className="prose prose-sm max-w-none p-6 dark:prose-invert">
          <div className="whitespace-pre-wrap text-sm">{body.body}</div>
        </CardContent>
      </Card>
    </article>
  );
}
