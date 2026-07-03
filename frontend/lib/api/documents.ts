import { apiFetch, API_BASE } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/tokens";
import type {
  AuditLogEntry,
  Document,
  DocumentComment,
  DocumentFilters,
  DocumentFolder,
  DocumentListResponse,
  DocumentVersion,
  SignatureRequest,
  SignerInput,
} from "@/types/document";

function buildQuery(filters: DocumentFilters = {}): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  pending_signature: "Pending signature",
  signed: "Signed",
  rejected: "Rejected",
  expired: "Expired",
  archived: "Archived",
};

export const DOCUMENT_STATUS_OPTIONS = Object.entries(DOCUMENT_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const DOCUMENT_STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300",
  pending_review: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  pending_signature: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  signed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  rejected: "bg-red-500/15 text-red-700 dark:text-red-300",
  expired: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  archived: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
};

export const FOLDER_NAV: { slug: string; label: string }[] = [
  { slug: "my_documents", label: "My Documents" },
  { slug: "shared", label: "Shared" },
  { slug: "company_files", label: "Company Files" },
  { slug: "deal_files", label: "Deal Files" },
  { slug: "contract_library", label: "Contract Library" },
  { slug: "proposal_library", label: "Proposal Library" },
  { slug: "marketing", label: "Marketing" },
  { slug: "templates", label: "Templates" },
  { slug: "archive", label: "Archive" },
  { slug: "recycle_bin", label: "Recycle Bin" },
];

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function documentIconKind(doc: Document): "pdf" | "image" | "video" | "audio" | "office" | "archive" | "file" {
  if (doc.mime_type === "application/pdf") return "pdf";
  if (doc.mime_type.startsWith("image/")) return "image";
  if (doc.mime_type.startsWith("video/")) return "video";
  if (doc.mime_type.startsWith("audio/")) return "audio";
  if (doc.mime_type.includes("openxmlformats") || doc.mime_type.includes("msword")) return "office";
  if (doc.mime_type === "application/zip") return "archive";
  return "file";
}

export async function listDocumentFolders(tenantSlug: string): Promise<DocumentFolder[]> {
  return apiFetch(`/tenants/${tenantSlug}/documents/folders`);
}

export async function listDocuments(
  tenantSlug: string,
  filters: DocumentFilters = {},
): Promise<DocumentListResponse> {
  return apiFetch(`/tenants/${tenantSlug}/documents${buildQuery(filters)}`);
}

export async function getDocument(tenantSlug: string, documentId: string): Promise<Document> {
  return apiFetch(`/tenants/${tenantSlug}/documents/${documentId}`);
}

export async function uploadDocument(
  tenantSlug: string,
  file: File,
  options: {
    folder_id?: string;
    company_id?: string;
    deal_id?: string;
  } = {},
): Promise<Document> {
  const form = new FormData();
  form.append("file", file);
  if (options.folder_id) form.append("folder_id", options.folder_id);
  if (options.company_id) form.append("company_id", options.company_id);
  if (options.deal_id) form.append("deal_id", options.deal_id);

  const token = getAccessToken();
  const res = await fetch(`${API_BASE}/tenants/${tenantSlug}/documents`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
    body: form,
  });
  if (!res.ok) {
    let message = "Upload failed";
    try {
      const err = (await res.json()) as { detail?: string };
      if (err.detail) message = err.detail;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json() as Promise<Document>;
}

export async function updateDocument(
  tenantSlug: string,
  documentId: string,
  data: Partial<Pick<Document, "name" | "description" | "status" | "tags">>,
): Promise<Document> {
  return apiFetch(`/tenants/${tenantSlug}/documents/${documentId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteDocument(tenantSlug: string, documentId: string): Promise<Document> {
  return apiFetch(`/tenants/${tenantSlug}/documents/${documentId}`, { method: "DELETE" });
}

export async function restoreDocument(tenantSlug: string, documentId: string): Promise<Document> {
  return apiFetch(`/tenants/${tenantSlug}/documents/${documentId}/restore`, { method: "POST" });
}

export async function starDocument(tenantSlug: string, documentId: string): Promise<Document> {
  return apiFetch(`/tenants/${tenantSlug}/documents/${documentId}/star`, { method: "POST" });
}

export async function moveDocument(
  tenantSlug: string,
  documentId: string,
  folderId: string | null,
): Promise<Document> {
  return apiFetch(`/tenants/${tenantSlug}/documents/${documentId}/move`, {
    method: "POST",
    body: JSON.stringify({ folder_id: folderId }),
  });
}

export async function bulkDeleteDocuments(tenantSlug: string, documentIds: string[]): Promise<{ deleted: number }> {
  return apiFetch(`/tenants/${tenantSlug}/documents/bulk-delete`, {
    method: "POST",
    body: JSON.stringify({ document_ids: documentIds }),
  });
}

export function documentDownloadUrl(tenantSlug: string, documentId: string): string {
  return `${API_BASE}/tenants/${tenantSlug}/documents/${documentId}/download`;
}

export async function listDocumentComments(
  tenantSlug: string,
  documentId: string,
): Promise<DocumentComment[]> {
  return apiFetch(`/tenants/${tenantSlug}/documents/${documentId}/comments`);
}

export async function addDocumentComment(
  tenantSlug: string,
  documentId: string,
  body: string,
): Promise<DocumentComment> {
  return apiFetch(`/tenants/${tenantSlug}/documents/${documentId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function listDocumentVersions(
  tenantSlug: string,
  documentId: string,
): Promise<DocumentVersion[]> {
  return apiFetch(`/tenants/${tenantSlug}/documents/${documentId}/versions`);
}

export async function listDocumentAudit(
  tenantSlug: string,
  documentId: string,
): Promise<AuditLogEntry[]> {
  return apiFetch(`/tenants/${tenantSlug}/documents/${documentId}/audit`);
}

export async function listSignatureRequests(tenantSlug: string): Promise<SignatureRequest[]> {
  return apiFetch(`/tenants/${tenantSlug}/documents/signatures`);
}

export async function requestSignature(
  tenantSlug: string,
  documentId: string,
  data: {
    title: string;
    message?: string;
    expires_at?: string;
    signing_order?: boolean;
    signers: SignerInput[];
  },
): Promise<SignatureRequest> {
  return apiFetch(`/tenants/${tenantSlug}/documents/${documentId}/signature-requests`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function signDocument(
  tenantSlug: string,
  requestId: string,
  signatureType: "draw" | "type" | "upload",
  signatureData: Record<string, unknown>,
): Promise<{ signer_id: string; status: string }> {
  return apiFetch(`/tenants/${tenantSlug}/documents/signatures/${requestId}/sign`, {
    method: "POST",
    body: JSON.stringify({ signature_type: signatureType, signature_data: signatureData }),
  });
}

export async function rejectSignature(
  tenantSlug: string,
  requestId: string,
  reason?: string,
): Promise<{ signer_id: string; status: string }> {
  return apiFetch(`/tenants/${tenantSlug}/documents/signatures/${requestId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
