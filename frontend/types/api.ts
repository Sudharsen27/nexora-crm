export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_verified: boolean;
  is_super_admin: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  role?: string | null;
}

export interface Member {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role_id: string;
  role_slug: string;
  role_name: string;
  status: string;
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  is_system: boolean;
}

export interface ApiError {
  detail: string | { msg: string }[];
}

export interface LeadAssignee {
  id: string;
  full_name: string;
  email: string;
}

export interface Lead {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  status: string;
  source: string | null;
  estimated_value: string | null;
  notes: string | null;
  assigned_to_id: string | null;
  assigned_to: LeadAssignee | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadListResponse {
  items: Lead[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface LeadMeta {
  statuses: string[];
  sources: string[];
}

export interface LeadFilters {
  q?: string;
  status?: string;
  source?: string;
  assigned_to_id?: string;
  page?: number;
  page_size?: number;
}

export interface DealAssignee {
  id: string;
  full_name: string;
  email: string;
}

export interface Deal {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  stage: string;
  position: number;
  value: string | null;
  currency: string;
  expected_close_date: string | null;
  lead_id: string | null;
  assigned_to_id: string | null;
  assigned_to: DealAssignee | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealStageColumn {
  slug: string;
  label: string;
  deals: Deal[];
}

export interface DealBoard {
  stages: DealStageColumn[];
  total: number;
}

export interface DealStageMeta {
  slug: string;
  label: string;
}

export interface ContactAssignee {
  id: string;
  full_name: string;
  email: string;
}

export interface ContactLeadRef {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
}

export interface Contact {
  id: string;
  tenant_id: string;
  lead_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  assigned_to_id: string | null;
  assigned_to: ContactAssignee | null;
  lead: ContactLeadRef | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactListResponse {
  items: Contact[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ContactFilters {
  q?: string;
  company?: string;
  assigned_to_id?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface ActivityCreator {
  id: string;
  full_name: string;
  email: string;
}

export interface Activity {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  activity_type: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_by_id: string | null;
  created_by: ActivityCreator | null;
  created_at: string;
}

export interface ActivityListResponse {
  items: Activity[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ActivityFilters {
  q?: string;
  entity_type?: string;
  entity_id?: string;
  activity_type?: string;
  page?: number;
  page_size?: number;
}
