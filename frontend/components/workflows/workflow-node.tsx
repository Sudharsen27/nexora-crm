"use client";

import type { ReactNode } from "react";
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Bell,
  Clock,
  Diamond,
  Flag,
  GitBranch,
  Play,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NODE_STYLES: Record<string, { border: string; bg: string; icon: ReactNode }> = {
  trigger: {
    border: "border-violet-400 dark:border-violet-500",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    icon: <Zap className="h-4 w-4 text-violet-600" />,
  },
  condition: {
    border: "border-amber-400 dark:border-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    icon: <Diamond className="h-4 w-4 text-amber-600" />,
  },
  action: {
    border: "border-blue-400 dark:border-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    icon: <Play className="h-4 w-4 text-blue-600" />,
  },
  delay: {
    border: "border-cyan-400 dark:border-cyan-500",
    bg: "bg-cyan-50 dark:bg-cyan-950/40",
    icon: <Clock className="h-4 w-4 text-cyan-600" />,
  },
  branch: {
    border: "border-orange-400 dark:border-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    icon: <GitBranch className="h-4 w-4 text-orange-600" />,
  },
  end: {
    border: "border-zinc-400 dark:border-zinc-500",
    bg: "bg-zinc-50 dark:bg-zinc-900/60",
    icon: <Flag className="h-4 w-4 text-zinc-600" />,
  },
};

function WorkflowNodeComponent({ data, selected, type }: NodeProps) {
  const nodeType = (type as string) || "action";
  const style = NODE_STYLES[nodeType] ?? NODE_STYLES.action;
  const label = (data?.label as string) || nodeType;
  const sublabel =
    (data?.trigger_type as string) ||
    (data?.action_type as string) ||
    (data?.description as string) ||
    "";

  return (
    <div
      className={cn(
        "min-w-[180px] rounded-xl border-2 px-4 py-3 shadow-sm transition-shadow",
        style.border,
        style.bg,
        selected && "ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--background)]",
      )}
    >
      {nodeType !== "trigger" && (
        <Handle type="target" position={Position.Left} className="!h-3 !w-3 !bg-zinc-400" />
      )}
      <div className="flex items-start gap-2">
        <div className="mt-0.5 shrink-0">{style.icon}</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">{label}</p>
          {sublabel && (
            <p className="truncate text-xs text-[var(--muted-foreground)]">{sublabel.replace(/_/g, " ")}</p>
          )}
        </div>
      </div>
      {nodeType === "condition" && (
        <>
          <Handle
            id="true"
            type="source"
            position={Position.Right}
            style={{ top: "35%" }}
            className="!h-3 !w-3 !bg-emerald-500"
          />
          <Handle
            id="false"
            type="source"
            position={Position.Right}
            style={{ top: "65%" }}
            className="!h-3 !w-3 !bg-red-500"
          />
        </>
      )}
      {nodeType === "action" && (data?.action_type as string) === "send_notification" && (
        <Bell className="absolute right-2 top-2 h-3 w-3 text-[var(--muted-foreground)]" />
      )}
      {nodeType !== "end" && nodeType !== "condition" && (
        <Handle type="source" position={Position.Right} className="!h-3 !w-3 !bg-zinc-400" />
      )}
    </div>
  );
}

export const workflowNodeTypes = {
  trigger: memo(WorkflowNodeComponent),
  condition: memo(WorkflowNodeComponent),
  action: memo(WorkflowNodeComponent),
  delay: memo(WorkflowNodeComponent),
  branch: memo(WorkflowNodeComponent),
  end: memo(WorkflowNodeComponent),
};

export const PALETTE_ITEMS = [
  { type: "trigger", label: "Trigger", description: "Start the workflow" },
  { type: "condition", label: "Condition", description: "IF / AND / OR rules" },
  { type: "action", label: "Action", description: "CRM automation step" },
  { type: "delay", label: "Delay", description: "Wait before next step" },
  { type: "branch", label: "Branch", description: "Split flow path" },
  { type: "end", label: "End", description: "Finish workflow" },
] as const;

export function createPaletteNode(type: string, index: number) {
  const id = `${type}-${Date.now()}-${index}`;
  const base = {
    id,
    type,
    position: { x: 120 + index * 40, y: 120 + index * 30 },
    data: { label: type.charAt(0).toUpperCase() + type.slice(1) },
  };
  if (type === "trigger") {
    return { ...base, data: { label: "Trigger", trigger_type: "manual" } };
  }
  if (type === "action") {
    return { ...base, data: { label: "Action", action_type: "create_task", config: {} } };
  }
  if (type === "condition") {
    return { ...base, data: { label: "Condition", logic: "and", rules: [] } };
  }
  if (type === "delay") {
    return {
      ...base,
      type: "action",
      data: { label: "Delay", action_type: "delay", config: { seconds: 60 } },
    };
  }
  return base;
}
