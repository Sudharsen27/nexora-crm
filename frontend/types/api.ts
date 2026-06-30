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

export interface DealCompanyRef {
  id: string;
  company_name: string;
}

export interface DealContactRef {
  id: string;
  first_name: string;
  last_name: string;
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
  probability: number;
  expected_close_date: string | null;
  lead_id: string | null;
  company_id: string | null;
  contact_id: string | null;
  assigned_to_id: string | null;
  assigned_to: DealAssignee | null;
  company: DealCompanyRef | null;
  contact: DealContactRef | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
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

export interface DealPipelineFilters {
  q?: string;
  owner_id?: string;
  company_id?: string;
  stage?: string;
  close_date_from?: string;
  close_date_to?: string;
  value_min?: number;
  value_max?: number;
}

export interface DealStageBreakdown {
  stage: string;
  label: string;
  count: number;
  value: number;
}

export interface DealStatistics {
  pipeline_value: string;
  won_revenue: string;
  lost_revenue: string;
  forecast_revenue: string;
  deals_this_month: number;
  conversion_rate: number;
  average_deal_size: string;
  open_deal_count: number;
  won_deal_count: number;
  lost_deal_count: number;
  stage_breakdown: DealStageBreakdown[];
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

export interface ContactCompanyRef {
  id: string;
  company_name: string;
  company_code: string | null;
}

export interface Contact {
  id: string;
  tenant_id: string;
  lead_id: string | null;
  company_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  notes: string | null;
  assigned_to_id: string | null;
  assigned_to: ContactAssignee | null;
  lead: ContactLeadRef | null;
  linked_company: ContactCompanyRef | null;
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
  company_id?: string;
  assigned_to_id?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface CompanyOwner {
  id: string;
  full_name: string;
  email: string;
}

export interface Company {
  id: string;
  tenant_id: string;
  company_name: string;
  company_code: string | null;
  industry: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  annual_revenue: string | null;
  employee_count: number | null;
  owner_id: string | null;
  owner: CompanyOwner | null;
  description: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyListResponse {
  items: Company[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface CompanyMeta {
  industries: string[];
  sort_fields: string[];
}

export interface CompanyFilters {
  q?: string;
  industry?: string;
  owner_id?: string;
  city?: string;
  country?: string;
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

export interface ActivityEntityRef {
  entity_type: string;
  entity_id: string;
  display_name: string;
  href_path: string | null;
}

export interface Activity {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  activity_type: string;
  action: string;
  title: string;
  description: string;
  icon: string | null;
  color: string | null;
  metadata: Record<string, unknown> | null;
  actor_id: string | null;
  actor: ActivityCreator | null;
  created_by_id: string | null;
  created_by: ActivityCreator | null;
  entity: ActivityEntityRef | null;
  created_at: string;
  scheduled_at?: string | null;
  archived_at?: string | null;
}

export interface ActivityListResponse {
  items: Activity[];
  total: number;
  page: number | null;
  page_size: number | null;
  pages: number | null;
  next_cursor: string | null;
  has_more: boolean;
}

export interface ActivityFilters {
  q?: string;
  entity_type?: string;
  entity_id?: string;
  activity_type?: string;
  action?: string;
  actor_id?: string;
  date_from?: string;
  date_to?: string;
  category?: string;
  page?: number;
  page_size?: number;
  cursor?: string;
  sort?: "asc" | "desc";
}

export interface TaskAssignee {
  id: string;
  full_name: string;
  email: string;
}

export interface TaskCreator {
  id: string;
  full_name: string;
  email: string;
}

export interface Task {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to_id: string | null;
  assigned_to: TaskAssignee | null;
  created_by_id: string | null;
  created_by: TaskCreator | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskListResponse {
  items: Task[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface TaskStatusColumn {
  slug: string;
  label: string;
  tasks: Task[];
}

export interface TaskBoard {
  columns: TaskStatusColumn[];
  total: number;
}

export interface TaskAssigneeSummary {
  user_id: string;
  full_name: string;
  open_count: number;
  overdue_count: number;
}

export interface TaskDashboardSummary {
  my_open: number;
  my_overdue: number;
  my_due_today: number;
  team_open: number;
  team_overdue: number;
  by_assignee: TaskAssigneeSummary[];
}

export interface TaskFilters {
  q?: string;
  status?: string;
  priority?: string;
  assigned_to_id?: string;
  entity_type?: string;
  entity_id?: string;
  due_today?: boolean;
  overdue?: boolean;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}
