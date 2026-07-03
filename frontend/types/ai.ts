export type AiMessageRole = "user" | "assistant" | "system";

export type AiWidgetType =
  | "kpi"
  | "table"
  | "chart"
  | "timeline"
  | "insight"
  | "risk"
  | "forecast";

export interface AiKpiWidget {
  type: "kpi";
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
}

export interface AiTableWidget {
  type: "table";
  title: string;
  columns: string[];
  rows: string[][];
}

export interface AiChartWidget {
  type: "chart";
  title: string;
  chartType: "line" | "bar" | "area";
  data: { label: string; value: number }[];
}

export interface AiTimelineWidget {
  type: "timeline";
  title: string;
  items: { time: string; title: string; detail?: string }[];
}

export interface AiInsightWidget {
  type: "insight";
  title: string;
  body: string;
  severity?: "info" | "warning" | "success";
}

export interface AiRiskWidget {
  type: "risk";
  title: string;
  level: "low" | "medium" | "high";
  deals: { name: string; value: string; probability: number }[];
}

export interface AiForecastWidget {
  type: "forecast";
  title: string;
  period: string;
  predicted: string;
  confidence: number;
  data: { month: string; value: number }[];
}

export type AiWidget =
  | AiKpiWidget
  | AiTableWidget
  | AiChartWidget
  | AiTimelineWidget
  | AiInsightWidget
  | AiRiskWidget
  | AiForecastWidget;

export interface AiMessage {
  id: string;
  role: AiMessageRole;
  content: string;
  widgets?: AiWidget[];
  createdAt: string;
  liked?: boolean | null;
  pinned?: boolean;
  streaming?: boolean;
}

export interface AiConversation {
  id: string;
  title: string;
  messages: AiMessage[];
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiPromptSuggestion {
  id: string;
  label: string;
  prompt: string;
  icon: string;
  gradient: string;
}

export interface AiSidebarSection {
  id: string;
  label: string;
  href?: string;
  icon: string;
}
