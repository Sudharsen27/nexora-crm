"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortalPageError, PortalPageLoading } from "@/components/portal/portal-page-state";
import { downloadPortalDocument, getPortalDocument } from "@/lib/api/portal";
import type { PortalDocumentDetail } from "@/types/portal";

export function PortalDocumentDetailPage({
  tenantSlug,
  documentId,
}: {
  tenantSlug: string;
  documentId: string;
}) {
  const [doc, setDoc] = useState<PortalDocumentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getPortalDocument(tenantSlug, documentId)
      .then(setDoc)
      .catch((e) => setError(e instanceof Error ? e.message : "Document not found"))
      .finally(() => setLoading(false));
  }, [tenantSlug, documentId]);

  if (loading) return <PortalPageLoading label="Loading document…" />;
  if (error || !doc) return <PortalPageError message={error ?? "Document not found"} />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/portal/${tenantSlug}/documents`}
        className="inline-flex items-center gap-1 text-sm text-sky-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to documents
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge variant="outline">{doc.status}</Badge>
          <h1 className="mt-2 text-2xl font-bold">{doc.name}</h1>
          {doc.description && (
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">{doc.description}</p>
          )}
        </div>
        <Button
          className="bg-sky-600 hover:bg-sky-700"
          onClick={() => void downloadPortalDocument(tenantSlug, doc.id, doc.name)}
        >
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Version history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {doc.versions.map((v) => (
            <div
              key={v.version_number}
              className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            >
              <span>
                v{v.version_number} · {v.filename}
              </span>
              <span className="text-[var(--muted-foreground)]">
                {(v.size_bytes / 1024).toFixed(0)} KB · {new Date(v.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
