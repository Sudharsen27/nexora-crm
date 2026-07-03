"use client";

import { Plus, Trash2 } from "lucide-react";
import type { Node } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Member } from "@/types/api";

const CONDITION_FIELDS = [
  "status",
  "priority",
  "stage",
  "assigned_to_id",
  "email",
  "title",
  "value",
  "tags",
  "pipeline",
];

const CONDITION_OPERATORS = [
  "equals",
  "contains",
  "greater_than",
  "less_than",
  "is_empty",
  "is_not_empty",
];

interface WorkflowNodePropertiesProps {
  selectedNode: Node;
  readOnly?: boolean;
  members: Member[];
  conditionOperators?: string[];
  onUpdate: (patch: Record<string, unknown>) => void;
}

function getConfig(node: Node): Record<string, unknown> {
  return (node.data?.config as Record<string, unknown>) ?? {};
}

export function WorkflowNodeProperties({
  selectedNode,
  readOnly,
  members,
  conditionOperators = CONDITION_OPERATORS,
  onUpdate,
}: WorkflowNodePropertiesProps) {
  const actionType = String(selectedNode.data?.action_type ?? "");
  const config = getConfig(selectedNode);

  const updateConfig = (patch: Record<string, unknown>) => {
    onUpdate({ config: { ...config, ...patch } });
  };

  if (selectedNode.type === "condition") {
    const rules = (selectedNode.data?.rules as Array<Record<string, unknown>>) ?? [];
    const logic = String(selectedNode.data?.logic ?? "and");

    const updateRule = (index: number, patch: Record<string, unknown>) => {
      const next = rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule));
      onUpdate({ rules: next });
    };

    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Match logic</Label>
          <Select
            value={logic}
            onChange={(e) => onUpdate({ logic: e.target.value })}
            disabled={readOnly}
          >
            <option value="and">AND (all rules)</option>
            <option value="or">OR (any rule)</option>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Rules</Label>
            {!readOnly && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  onUpdate({
                    rules: [...rules, { field: "status", operator: "equals", value: "" }],
                  })
                }
              >
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
            )}
          </div>
          {rules.length === 0 && (
            <p className="text-xs text-[var(--muted-foreground)]">
              No rules — condition always passes. Connect green (true) or red (false) handles.
            </p>
          )}
          {rules.map((rule, index) => (
            <div key={index} className="space-y-2 rounded-lg border border-[var(--border)] p-2">
              <Select
                value={String(rule.field ?? "status")}
                onChange={(e) => updateRule(index, { field: e.target.value })}
                disabled={readOnly}
              >
                {CONDITION_FIELDS.map((field) => (
                  <option key={field} value={field}>
                    {field.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
              <Select
                value={String(rule.operator ?? "equals")}
                onChange={(e) => updateRule(index, { operator: e.target.value })}
                disabled={readOnly}
              >
                {conditionOperators.map((op) => (
                  <option key={op} value={op}>
                    {op.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
              {!["is_empty", "is_not_empty"].includes(String(rule.operator)) && (
                <Input
                  placeholder="Value"
                  value={String(rule.value ?? "")}
                  onChange={(e) => updateRule(index, { value: e.target.value })}
                  disabled={readOnly}
                />
              )}
              {!readOnly && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-red-600"
                  onClick={() => onUpdate({ rules: rules.filter((_, i) => i !== index) })}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (selectedNode.type === "action" || selectedNode.type === "delay") {
    return (
      <div className="space-y-3">
        {actionType === "create_task" && (
          <>
            <div className="space-y-2">
              <Label>Task title</Label>
              <Input
                value={String(config.title ?? "")}
                onChange={(e) => updateConfig({ title: e.target.value })}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={String(config.priority ?? "medium")}
                onChange={(e) => updateConfig({ priority: e.target.value })}
                disabled={readOnly}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due in (days)</Label>
              <Input
                type="number"
                min={0}
                value={String(config.due_in_days ?? 0)}
                onChange={(e) => updateConfig({ due_in_days: Number(e.target.value) })}
                disabled={readOnly}
              />
            </div>
          </>
        )}

        {actionType === "assign_user" && (
          <div className="space-y-2">
            <Label>Assign to</Label>
            <Select
              value={String(config.user_id ?? "")}
              onChange={(e) => updateConfig({ user_id: e.target.value })}
              disabled={readOnly}
            >
              <option value="">Select member</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.full_name || m.email}
                </option>
              ))}
            </Select>
          </div>
        )}

        {(actionType === "update_lead_status" || actionType === "update_deal_stage" || actionType === "move_deal") && (
          <div className="space-y-2">
            <Label>{actionType === "update_lead_status" ? "Lead status" : "Deal stage"}</Label>
            <Input
              value={String(config.status ?? config.stage ?? "")}
              onChange={(e) =>
                updateConfig(actionType === "update_lead_status" ? { status: e.target.value } : { stage: e.target.value })
              }
              placeholder={actionType === "update_lead_status" ? "e.g. qualified" : "e.g. won"}
              disabled={readOnly}
            />
          </div>
        )}

        {actionType === "send_notification" && (
          <>
            <div className="space-y-2">
              <Label>Recipient</Label>
              <Select
                value={String(config.user_id ?? "")}
                onChange={(e) => updateConfig({ user_id: e.target.value })}
                disabled={readOnly}
              >
                <option value="">Trigger actor</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.full_name || m.email}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={String(config.title ?? "")}
                onChange={(e) => updateConfig({ title: e.target.value })}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Input
                value={String(config.message ?? "")}
                onChange={(e) => updateConfig({ message: e.target.value })}
                disabled={readOnly}
              />
            </div>
          </>
        )}

        {actionType === "send_email" && (
          <>
            <div className="space-y-2">
              <Label>To email</Label>
              <Input
                value={String(config.to ?? "")}
                onChange={(e) => updateConfig({ to: e.target.value })}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={String(config.subject ?? "")}
                onChange={(e) => updateConfig({ subject: e.target.value })}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Input
                value={String(config.body ?? "")}
                onChange={(e) => updateConfig({ body: e.target.value })}
                disabled={readOnly}
              />
            </div>
          </>
        )}

        {actionType === "create_activity" && (
          <>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={String(config.title ?? "")}
                onChange={(e) => updateConfig({ title: e.target.value })}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={String(config.description ?? "")}
                onChange={(e) => updateConfig({ description: e.target.value })}
                disabled={readOnly}
              />
            </div>
          </>
        )}

        {actionType === "call_webhook" && (
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <Input
              value={String(config.url ?? "")}
              onChange={(e) => updateConfig({ url: e.target.value })}
              placeholder="https://..."
              disabled={readOnly}
            />
          </div>
        )}

        {(actionType === "delay" || selectedNode.type === "delay") && (
          <div className="space-y-2">
            <Label>Delay (seconds)</Label>
            <Input
              type="number"
              min={0}
              max={300}
              value={String(config.seconds ?? 60)}
              onChange={(e) => updateConfig({ seconds: Number(e.target.value) })}
              disabled={readOnly}
            />
          </div>
        )}

        {actionType === "create_note" && (
          <div className="space-y-2">
            <Label>Note text</Label>
            <Input
              value={String(config.description ?? config.body ?? "")}
              onChange={(e) => updateConfig({ description: e.target.value })}
              disabled={readOnly}
            />
          </div>
        )}
      </div>
    );
  }

  return null;
}
