import { API_BASE } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/tokens";
import type { AiMessage } from "@/types/ai";

export interface AiMeta {
  enabled: boolean;
  provider: string;
  model: string;
  mock_fallback: boolean;
}

export async function getAiMeta(tenantSlug: string): Promise<AiMeta> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}/tenants/${tenantSlug}/ai/meta`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!res.ok) {
    return { enabled: false, provider: "mock", model: "mock", mock_fallback: true };
  }
  return res.json() as Promise<AiMeta>;
}

export async function* streamAiChat(
  tenantSlug: string,
  messages: Pick<AiMessage, "role" | "content">[],
): AsyncGenerator<string, void, void> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}/tenants/${tenantSlug}/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    let message = "AI request failed";
    try {
      const err = (await res.json()) as { detail?: string };
      if (err.detail) message = err.detail;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response stream");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data) as { content?: string; error?: string };
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.content) yield parsed.content;
      } catch (e) {
        if (e instanceof Error && e.message !== "Unexpected end of JSON input") throw e;
      }
    }
  }
}
