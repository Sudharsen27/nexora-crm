"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PortalEmptyState, PortalPageError, PortalPageLoading } from "@/components/portal/portal-page-state";
import {
  downloadPortalDocument,
  getPortalDocuments,
  uploadPortalDocument,
} from "@/lib/api/portal";
import type { PortalDocument } from "@/types/portal";

export function PortalDocumentsPage({ tenantSlug }: { tenantSlug: string }) {
  const [docs, setDocs] = useState<PortalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    void getPortalDocuments(tenantSlug)
      .then(setDocs)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load documents"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [tenantSlug]);

  async function onUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      await uploadPortalDocument(tenantSlug, file);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Upload and download shared files</p>
        </div>
        <Button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="bg-sky-600 hover:bg-sky-700"
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? "Uploading…" : "Upload"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onUpload(file);
            e.target.value = "";
          }}
        />
      </div>

      {error && <PortalPageError message={error} />}
      {loading ? (
        <PortalPageLoading label="Loading documents…" />
      ) : docs.length === 0 ? (
        <PortalEmptyState
          title="No documents yet"
          description="Upload a file or ask your account team to share documents with you."
          action={
            <Button onClick={() => inputRef.current?.click()} className="bg-sky-600 hover:bg-sky-700">
              Upload your first file
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <Link href={`/portal/${tenantSlug}/documents/${doc.id}`} className="min-w-0 flex-1">
                  <p className="font-medium hover:text-sky-600">{doc.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    v{doc.current_version} · {(doc.size_bytes / 1024).toFixed(0)} KB ·{" "}
                    {new Date(doc.updated_at).toLocaleDateString()}
                  </p>
                </Link>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{doc.status}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void downloadPortalDocument(tenantSlug, doc.id, doc.name)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
