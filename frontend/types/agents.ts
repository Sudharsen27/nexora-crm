export interface AiAgent {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  status: string;
  is_enabled: boolean;
  capabilities: string[];
  total_executions: number;
  success_count: number;
  failure_count: number;
  total_tokens: number;
  avg_duration_ms: number;
  last_run_at: string | null;
  config?: Record<string, unknown>;
}

export interface AiAgentExecution {
  id: string;
  agent_id: string;
  agent_slug: string | null;
  agent_name: string | null;
  action: string;
  status: string;
  input_payload: Record<string, unknown>;
  output_payload: Record<string, unknown>;
  error_message: string | null;
  tokens_used: number;
  duration_ms: number;
  orchestration_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface AiRecommendation {
  id: string;
  agent_id: string | null;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  entity_type: string | null;
  entity_id: string | null;
  confidence: number;
  created_at: string;
}

export interface AiInsight {
  id: string;
  agent_id: string | null;
  title: string;
  summary: string;
  severity: string;
  category: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface AiAgentMemory {
  id: string;
  agent_id: string | null;
  memory_key: string;
  memory_type: string;
  content: Record<string, unknown>;
  importance: number;
  created_at: string;
}

export interface AiAgentTask {
  id: string;
  agent_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  created_at: string;
  completed_at: string | null;
}

export interface AiUsage {
  usage_date: string;
  executions: number;
  tokens_used: number;
  success_count: number;
  failure_count: number;
  total_duration_ms: number;
}

export interface AgentsDashboard {
  total_agents: number;
  enabled_agents: number;
  running_agents: number;
  executions_24h: number;
  success_rate: number;
  tokens_24h: number;
  pending_recommendations: number;
  open_insights: number;
  queued_tasks: number;
  agents: AiAgent[];
  recent_executions: AiAgentExecution[];
  recommendations: AiRecommendation[];
  insights: AiInsight[];
}

export interface KnowledgeSearchResult {
  query: string;
  results: Array<{ type: string; id: string; title: string; subtitle?: string }>;
  answer: string;
}
