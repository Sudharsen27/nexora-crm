export type DocumentStatus =
  | "draft"
  | "pending_review"
  | "pending_signature"
  | "signed"
  | "rejected"
  | "expired"
  | "archived";

export interface DocumentFolder {
  id: string;
  tenant_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  folder_type: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  tenant_id: string;
  folder_id: string | null;
  name: string;
  description: string | null;
  status: DocumentStatus;
  mime_type: string;
  extension: string;
  size_bytes: number;
  current_version: number;
  is_starred: boolean;
  deleted_at: string | null;
  tags: string[];
  company_id: string | null;
  contact_id: string | null;
  lead_id: string | null;
  deal_id: string | null;
  meeting_id: string | null;
  task_id: string | null;
  workflow_id: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
  preview_url: string | null;
}

export interface DocumentListResponse {
  items: Document[];
  total: number;
  page: number;
  page_size: number;
}

export interface DocumentVersion {
  id: string;
  version_number: number;
  filename: string;
  mime_type: string;
  size_bytes: number;
  created_by_id: string | null;
  created_at: string;
}

export interface DocumentComment {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  detail: string | null;
  actor_id: string | null;
  created_at: string;
}

export interface SignatureSigner {
  id: string;
  email: string;
  full_name: string;
  order_index: number;
  status: string;
  signature_type: string | null;
  signed_at: string | null;
}

export interface SignatureRequest {
  id: string;
  document_id: string;
  title: string;
  message: string | null;
  status: string;
  expires_at: string | null;
  signing_order: boolean;
  signers: SignatureSigner[];
  created_at: string;
}

export interface DocumentFilters {
  folder_id?: string;
  folder_slug?: string;
  q?: string;
  file_type?: string;
  status?: string;
  starred?: boolean;
  view?: string;
  page?: number;
  page_size?: number;
}

export interface SignerInput {
  email: string;
  full_name: string;
  user_id?: string;
  order_index?: number;
}
