"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function AiSettingsPanel() {
  const [model, setModel] = useState("nexora-enterprise");
  const [memory, setMemory] = useState(true);
  const [streaming, setStreaming] = useState(true);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-muted)]">
          <Settings className="h-7 w-7 text-violet-600" />
        </div>
        <h2 className="text-2xl font-bold">AI Settings</h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Configure how Nexora AI behaves in your workspace
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Model</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="ai-model" className="sr-only">
            AI model
          </Label>
          <select
            id="ai-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
          >
            <option value="nexora-enterprise">Nexora Enterprise (recommended)</option>
            <option value="nexora-fast">Nexora Fast</option>
            <option value="nexora-analytics">Nexora Analytics</option>
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex cursor-pointer items-center justify-between gap-4 text-sm">
            <span>Conversation memory</span>
            <input
              type="checkbox"
              checked={memory}
              onChange={(e) => setMemory(e.target.checked)}
              className="h-4 w-4 rounded accent-violet-600"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-4 text-sm">
            <span>Streaming responses</span>
            <input
              type="checkbox"
              checked={streaming}
              onChange={(e) => setStreaming(e.target.checked)}
              className="h-4 w-4 rounded accent-violet-600"
            />
          </label>
        </CardContent>
      </Card>

      <Button className="w-full bg-gradient-to-r from-violet-600 to-indigo-600">
        Save settings
      </Button>
      <p className="text-center text-xs text-[var(--muted-foreground)]">
        Settings are stored locally in this preview build.
      </p>
    </div>
  );
}
