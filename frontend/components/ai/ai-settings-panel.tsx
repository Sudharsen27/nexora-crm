"use client";

import { Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AiSettingsPanelProps {
  llmEnabled?: boolean;
  aiModel?: string | null;
}

export function AiSettingsPanel({ llmEnabled = false, aiModel }: AiSettingsPanelProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-muted)]">
          <Settings className="h-7 w-7 text-violet-600" />
        </div>
        <h2 className="text-2xl font-bold">AI Settings</h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Nexora AI is configured on the backend for security
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Connection status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>Mode</span>
            <Badge variant={llmEnabled ? "default" : "secondary"}>
              {llmEnabled ? "Live LLM" : "Mock preview"}
            </Badge>
          </div>
          {llmEnabled && aiModel && (
            <div className="flex items-center justify-between text-sm">
              <span>Model</span>
              <span className="font-mono text-xs text-[var(--muted-foreground)]">{aiModel}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Enable live AI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-[var(--muted-foreground)]">
          <p>Add these to your backend <code className="rounded bg-[var(--surface-muted)] px-1">.env</code> (local) or Render environment (production):</p>
          <pre className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-xs">
{`OPENAI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini
AI_BASE_URL=https://api.openai.com/v1`}
          </pre>
          <p>
            Restart the backend after saving. The assistant will stream answers using your real CRM
            data (deals, leads, tasks, meetings) as context.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
