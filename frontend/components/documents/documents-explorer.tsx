"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import {
  Archive,
  Clock,
  File,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  FolderOpen,
  Grid3x3,
  List,
  PenLine,
  Search,
  Share2,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WidgetError } from "@/components/dashboard/widget-states";
import { DocumentPreviewDrawer } from "@/components/documents/document-preview-drawer";
import { usePermissions } from "@/contexts/permissions-context";
import { useDocuments } from "@/hooks/use-documents";
import {
  DOCUMENT_STATUS_COLORS,
  DOCUMENT_STATUS_LABELS,
  FOLDER_NAV,
  documentIconKind,
  deleteDocument,
  formatFileSize,
  restoreDocument,
  starDocument,
  uploadDocument,
} from "@/lib/api/documents";
import type { Document } from "@/types/document";
import { cn } from "@/lib/utils";

interface DocumentsExplorerProps {
  tenantSlug: string;
  initialView?: string;
  initialFolderSlug?: string;
}

function FileIcon({ doc, className }: { doc: Document; className?: string }) {
  const kind = documentIconKind(doc);
  const props = { className: cn("h-8 w-8", className) };
  switch (kind) {
    case "pdf":
      return <FileText {...props} className={cn(props.className, "text-red-500")} />;
    case "image":
      return <FileImage {...props} className={cn(props.className, "text-sky-500")} />;
    case "video":
      return <FileVideo {...props} className={cn(props.className, "text-violet-500")} />;
    case "audio":
      return <FileAudio {...props} className={cn(props.className, "text-amber-500")} />;
    case "office":
      return <FileSpreadsheet {...props} className={cn(props.className, "text-emerald-500")} />;
    case "archive":
      return <Archive {...props} className={cn(props.className, "text-orange-500")} />;
    default:
      return <File {...props} className={cn(props.className, "text-[var(--muted-foreground)]")} />;
  }
}

export function DocumentsExplorer({
  tenantSlug,
  initialView,
  initialFolderSlug = "my_documents",
}: DocumentsExplorerProps) {
  const { canWrite, canDelete } = usePermissions();
  const [folderSlug, setFolderSlug] = useState(initialFolderSlug);
  const [view, setView] = useState(initialView ?? "");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [fileType, setFileType] = useState("");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<Document | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filters = {
    folder_slug: view ? undefined : folderSlug,
    view: view || undefined,
    q: search || undefined,
    file_type: fileType || undefined,
    page_size: 48,
  };

  const { items, total, loading, error, refresh } = useDocuments(tenantSlug, filters);

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      if (!canWrite("document")) return;
      const list = Array.from(files);
      if (!list.length) return;
      setUploading(true);
      try {
        for (const file of list) {
          await uploadDocument(tenantSlug, file);
        }
        await refresh();
      } finally {
        setUploading(false);
      }
    },
    [canWrite, tenantSlug, refresh],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) void handleUpload(e.dataTransfer.files);
  };

  const toggleStar = async (doc: Document) => {
    await starDocument(tenantSlug, doc.id);
    await refresh();
  };

  const removeDoc = async (doc: Document) => {
    if (folderSlug === "recycle_bin" || view === "recycle_bin") {
      await deleteDocument(tenantSlug, doc.id);
    } else {
      await deleteDocument(tenantSlug, doc.id);
    }
    if (selected?.id === doc.id) setSelected(null);
    await refresh();
  };

  const restoreDoc = async (doc: Document) => {
    await restoreDocument(tenantSlug, doc.id);
    await refresh();
  };

  const isRecycle = folderSlug === "recycle_bin" || view === "recycle_bin";

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <aside className="w-full shrink-0 border-b border-[var(--border)] bg-[var(--card)] p-4 lg:w-60 lg:border-b-0 lg:border-r">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          Library
        </p>
        <nav className="space-y-1">
          <button
            type="button"
            onClick={() => {
              setView("recent");
              setFolderSlug("");
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
              view === "recent" ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "hover:bg-[var(--muted)]",
            )}
          >
            <Clock className="h-4 w-4" />
            Recent
          </button>
          <button
            type="button"
            onClick={() => {
              setView("shared");
              setFolderSlug("");
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
              view === "shared" ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "hover:bg-[var(--muted)]",
            )}
          >
            <Share2 className="h-4 w-4" />
            Shared with me
          </button>
          {FOLDER_NAV.map((folder) => (
            <button
              key={folder.slug}
              type="button"
              onClick={() => {
                setView("");
                setFolderSlug(folder.slug);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                !view && folderSlug === folder.slug
                  ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "hover:bg-[var(--muted)]",
              )}
            >
              <FolderOpen className="h-4 w-4" />
              {folder.label}
            </button>
          ))}
        </nav>
        <div className="mt-6 border-t border-[var(--border)] pt-4">
          <Link
            href={`/${tenantSlug}/documents/signatures`}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[var(--muted)]"
          >
            <PenLine className="h-4 w-4" />
            Signatures
          </Link>
        </div>
      </aside>

      <div
        className={cn("flex flex-1 flex-col p-6", dragOver && "ring-2 ring-inset ring-[var(--primary)]")}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {total} file{total === 1 ? "" : "s"} · Enterprise document management
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="h-9 w-9 px-0" onClick={() => setLayout("grid")}>
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-9 w-9 px-0" onClick={() => setLayout("list")}>
              <List className="h-4 w-4" />
            </Button>
            {canWrite("document") && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && void handleUpload(e.target.files)}
                />
                <Button disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <form
            className="flex flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(q);
            }}
          >
            <Input
              placeholder="Search files, tags..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Button type="submit" variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </form>
          <select
            className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
          >
            <option value="">All types</option>
            <option value="pdf">PDF</option>
            <option value="images">Images</option>
            <option value="contracts">Contracts</option>
            <option value="signed">Signed</option>
            <option value="pending">Pending signature</option>
          </select>
        </div>

        {error && <WidgetError title="Documents" message={error} onRetry={() => void refresh()} />}
        {loading && <p className="text-sm text-[var(--muted-foreground)]">Loading documents...</p>}

        {!loading && !error && items.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] py-16 text-center">
            <Upload className="mb-4 h-12 w-12 text-[var(--muted-foreground)]" />
            <p className="text-lg font-medium">No documents yet</p>
            <p className="mt-1 max-w-sm text-sm text-[var(--muted-foreground)]">
              Drag and drop files here or use Upload to add PDFs, Office files, images, and more.
            </p>
          </div>
        )}

        {!loading && !error && items.length > 0 && layout === "grid" && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {items.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelected(doc)}
                className="group cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-left transition hover:border-[var(--primary)] hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <FileIcon doc={doc} />
                  <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void toggleStar(doc);
                      }}
                      className="rounded p-1 hover:bg-[var(--muted)]"
                    >
                      <Star className={cn("h-4 w-4", doc.is_starred && "fill-amber-400 text-amber-400")} />
                    </button>
                    {canDelete("document") && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void removeDoc(doc);
                        }}
                        className="rounded p-1 hover:bg-[var(--muted)]"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="truncate font-medium">{doc.name}</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">{formatFileSize(doc.size_bytes)}</p>
                <Badge className={cn("mt-2", DOCUMENT_STATUS_COLORS[doc.status])}>
                  {DOCUMENT_STATUS_LABELS[doc.status] ?? doc.status}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && items.length > 0 && layout === "list" && (
          <div className="overflow-hidden rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--muted)]/50 text-left text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Size</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((doc) => (
                  <tr
                    key={doc.id}
                    className="cursor-pointer border-t border-[var(--border)] hover:bg-[var(--muted)]/30"
                    onClick={() => setSelected(doc)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <FileIcon doc={doc} className="h-5 w-5" />
                        <span className="truncate font-medium">{doc.name}</span>
                        {doc.is_starred && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={DOCUMENT_STATUS_COLORS[doc.status]}>
                        {DOCUMENT_STATUS_LABELS[doc.status] ?? doc.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">{formatFileSize(doc.size_bytes)}</td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {new Date(doc.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isRecycle && canWrite("document") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            void restoreDoc(doc);
                          }}
                        >
                          Restore
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DocumentPreviewDrawer
        tenantSlug={tenantSlug}
        document={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        onUpdated={() => void refresh()}
      />
    </div>
  );
}
