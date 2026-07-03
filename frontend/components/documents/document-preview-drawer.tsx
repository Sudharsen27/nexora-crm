"use client";

import { useEffect, useState } from "react";
import { Download, MessageSquare, History, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/contexts/permissions-context";
import {
  DOCUMENT_STATUS_COLORS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_OPTIONS,
  addDocumentComment,
  documentDownloadUrl,
  formatFileSize,
  listDocumentAudit,
  listDocumentComments,
  listDocumentVersions,
  updateDocument,
} from "@/lib/api/documents";
import { getAccessToken } from "@/lib/auth/tokens";
import type { AuditLogEntry, Document, DocumentComment, DocumentVersion } from "@/types/document";
import { cn } from "@/lib/utils";

interface DocumentPreviewDrawerProps {
  tenantSlug: string;
  document: Document | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function DocumentPreviewDrawer({
  tenantSlug,
  document,
  open,
  onClose,
  onUpdated,
}: DocumentPreviewDrawerProps) {
  const { canWrite } = usePermissions();
  const [tab, setTab] = useState<"preview" | "comments" | "versions" | "activity">("preview");
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [audit, setAudit] = useState<AuditLogEntry[]>([]);
  const [comment, setComment] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    if (!document || !open) return;
    setName(document.name);
    setStatus(document.status);
    setTab("preview");

    if (document.preview_url) {
      setPreviewUrl(document.preview_url);
      return;
    }

    if (document.mime_type.startsWith("image/") || document.mime_type === "application/pdf") {
      const token = getAccessToken();
      const url = documentDownloadUrl(tenantSlug, document.id);
      void fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      })
        .then((r) => r.blob())
        .then((blob) => setPreviewUrl(URL.createObjectURL(blob)))
        .catch(() => setPreviewUrl(null));
    } else {
      setPreviewUrl(null);
    }

    void Promise.all([
      listDocumentComments(tenantSlug, document.id),
      listDocumentVersions(tenantSlug, document.id),
      listDocumentAudit(tenantSlug, document.id),
    ]).then(([c, v, a]) => {
      setComments(c);
      setVersions(v);
      setAudit(a);
    });
  }, [document, open, tenantSlug]);

  if (!open || !document) return null;

  const download = () => {
    const token = getAccessToken();
    const url = documentDownloadUrl(tenantSlug, document.id);
    void fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    })
      .then((r) => r.blob())
      .then((blob) => {
        const a = window.document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = document.name;
        a.click();
      });
  };

  const submitComment = async () => {
    if (!comment.trim()) return;
    await addDocumentComment(tenantSlug, document.id, comment.trim());
    setComment("");
    setComments(await listDocumentComments(tenantSlug, document.id));
  };

  const saveRename = async () => {
    if (!name.trim() || name === document.name) {
      setRenaming(false);
      return;
    }
    await updateDocument(tenantSlug, document.id, { name: name.trim() });
    setRenaming(false);
    onUpdated();
  };

  const saveStatus = async (nextStatus: string) => {
    if (!document || nextStatus === document.status) return;
    setSavingStatus(true);
    try {
      await updateDocument(tenantSlug, document.id, { status: nextStatus as Document["status"] });
      setStatus(nextStatus);
      onUpdated();
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-2xl flex-col bg-[var(--background)] shadow-2xl animate-in slide-in-from-right">
        <div className="flex items-start justify-between border-b border-[var(--border)] p-4">
          <div className="min-w-0 flex-1 pr-4">
            {renaming ? (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveRename();
                }}
              >
                <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                <Button type="submit" size="sm">
                  Save
                </Button>
              </form>
            ) : (
              <button
                type="button"
                className="truncate text-left text-lg font-semibold hover:underline"
                onClick={() => canWrite("document") && setRenaming(true)}
              >
                {document.name}
              </button>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <Badge className={DOCUMENT_STATUS_COLORS[status || document.status]}>
                {DOCUMENT_STATUS_LABELS[status || document.status]}
              </Badge>
              <span>{formatFileSize(document.size_bytes)}</span>
              <span>v{document.current_version}</span>
            </div>
            {canWrite("document") && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="text-xs font-medium text-[var(--muted-foreground)]" htmlFor="doc-status">
                  Review status
                </label>
                <select
                  id="doc-status"
                  value={status}
                  disabled={savingStatus}
                  onChange={(e) => void saveStatus(e.target.value)}
                  className="h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs"
                >
                  {DOCUMENT_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {status === "draft" && (
                  <Button size="sm" variant="outline" onClick={() => void saveStatus("pending_review")}>
                    Submit for review
                  </Button>
                )}
                {status === "pending_review" && (
                  <Button size="sm" variant="outline" onClick={() => void saveStatus("archived")}>
                    Approve & archive
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-9 w-9 px-0" onClick={download}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-9 w-9 px-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-1 border-b border-[var(--border)] px-4">
          {(
            [
              ["preview", "Preview"],
              ["comments", "Comments"],
              ["versions", "Versions"],
              ["activity", "Activity"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "border-b-2 px-3 py-2 text-sm font-medium transition",
                tab === key
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === "preview" && (
            <div className="space-y-4">
              {previewUrl && document.mime_type.startsWith("image/") && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt={document.name} className="max-h-[60vh] w-full rounded-lg object-contain" />
              )}
              {previewUrl && document.mime_type === "application/pdf" && (
                <iframe src={previewUrl} title={document.name} className="h-[60vh] w-full rounded-lg border" />
              )}
              {!previewUrl && (
                <p className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted-foreground)]">
                  Preview not available for this file type. Download to view locally.
                </p>
              )}
              {document.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {document.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "comments" && (
            <div className="space-y-4">
              {canWrite("document") && (
                <div className="space-y-2">
                  <textarea
                    className="flex min-h-[80px] w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                    placeholder="Add a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                  />
                  <Button size="sm" onClick={() => void submitComment()}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Post comment
                  </Button>
                </div>
              )}
              {comments.map((c) => (
                <div key={c.id} className="rounded-lg border border-[var(--border)] p-3">
                  <p className="text-sm">{c.body}</p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {new Date(c.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-sm text-[var(--muted-foreground)]">No comments yet.</p>
              )}
            </div>
          )}

          {tab === "versions" && (
            <ul className="space-y-2">
              {versions.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                >
                  <span>
                    v{v.version_number} · {v.filename}
                  </span>
                  <span className="text-[var(--muted-foreground)]">{formatFileSize(v.size_bytes)}</span>
                </li>
              ))}
            </ul>
          )}

          {tab === "activity" && (
            <ul className="space-y-3">
              {audit.map((entry) => (
                <li key={entry.id} className="flex gap-3 text-sm">
                  <History className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                  <div>
                    <p className="font-medium capitalize">{entry.action.replace(/_/g, " ")}</p>
                    {entry.detail && (
                      <p className="text-[var(--muted-foreground)]">{entry.detail}</p>
                    )}
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {new Date(entry.created_at).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
