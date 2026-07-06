"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAiMeta, streamAiChat } from "@/lib/api/ai";
import { streamMockResponse, buildAssistantMessage } from "@/lib/ai/mock-engine";
import type { AiConversation, AiMessage } from "@/types/ai";

const STORAGE_KEY = "nexora_ai_conversations";

function loadConversations(tenantSlug: string): AiConversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${tenantSlug}`);
    return raw ? (JSON.parse(raw) as AiConversation[]) : [];
  } catch {
    return [];
  }
}

function saveConversations(tenantSlug: string, conversations: AiConversation[]) {
  localStorage.setItem(`${STORAGE_KEY}_${tenantSlug}`, JSON.stringify(conversations));
}

function newConversation(title = "New chat"): AiConversation {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title,
    messages: [],
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function useAiChat(tenantSlug: string, initialChatId?: string | null) {
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(initialChatId ?? null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [search, setSearch] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [llmEnabled, setLlmEnabled] = useState(false);
  const [aiModel, setAiModel] = useState<string | null>(null);

  useEffect(() => {
    void getAiMeta(tenantSlug).then((meta) => {
      setLlmEnabled(meta.enabled);
      setAiModel(meta.enabled ? meta.model : null);
    });
  }, [tenantSlug]);

  useEffect(() => {
    const stored = loadConversations(tenantSlug);
    if (stored.length === 0) {
      const chat = newConversation();
      setConversations([chat]);
      setActiveId(chat.id);
    } else {
      setConversations(stored);
      setActiveId(initialChatId ?? stored[0]?.id ?? null);
    }
    setHydrated(true);
  }, [tenantSlug, initialChatId]);

  useEffect(() => {
    if (!hydrated) return;
    saveConversations(tenantSlug, conversations);
  }, [conversations, tenantSlug, hydrated]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q)),
    );
  }, [conversations, search]);

  const updateConversation = useCallback((id: string, updater: (c: AiConversation) => AiConversation) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
  }, []);

  const createChat = useCallback(() => {
    const chat = newConversation();
    setConversations((prev) => [chat, ...prev]);
    setActiveId(chat.id);
    return chat.id;
  }, []);

  const deleteChat = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (next.length === 0) {
          const chat = newConversation();
          setActiveId(chat.id);
          return [chat];
        }
        if (activeId === id) setActiveId(next[0].id);
        return next;
      });
    },
    [activeId],
  );

  const togglePinConversation = useCallback((id: string) => {
    updateConversation(id, (c) => ({ ...c, pinned: !c.pinned }));
  }, [updateConversation]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;
      let chatId = activeId;
      if (!chatId) {
        chatId = createChat();
      }

      const userMessage: AiMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
        createdAt: new Date().toISOString(),
      };

      const assistantId = crypto.randomUUID();
      const streamingMessage: AiMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        streaming: true,
      };

      updateConversation(chatId, (c) => ({
        ...c,
        title: c.messages.length === 0 ? text.trim().slice(0, 48) : c.title,
        updatedAt: new Date().toISOString(),
        messages: [...c.messages, userMessage, streamingMessage],
      }));

      setIsStreaming(true);
      try {
        let accumulated = "";
        let usedLlm = false;

        const conv = conversations.find((c) => c.id === chatId);
        const priorMessages = [...(conv?.messages ?? []), userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        if (llmEnabled) {
          try {
            for await (const chunk of streamAiChat(tenantSlug, priorMessages)) {
              accumulated += chunk;
              updateConversation(chatId!, (c) => ({
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantId ? { ...m, content: accumulated, streaming: true } : m,
                ),
              }));
            }
            usedLlm = true;
          } catch {
            const stream = streamMockResponse(text);
            for await (const chunk of stream) {
              accumulated = chunk;
              updateConversation(chatId!, (c) => ({
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantId ? { ...m, content: chunk, streaming: true } : m,
                ),
              }));
            }
          }
        } else {
          const stream = streamMockResponse(text);
          for await (const chunk of stream) {
            accumulated = chunk;
            updateConversation(chatId!, (c) => ({
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantId ? { ...m, content: chunk, streaming: true } : m,
              ),
            }));
          }
        }

        const finalMessage: AiMessage = usedLlm
          ? {
              id: assistantId,
              role: "assistant",
              content: accumulated,
              createdAt: new Date().toISOString(),
              liked: null,
              pinned: false,
              streaming: false,
            }
          : buildAssistantMessage(text, accumulated, assistantId);

        updateConversation(chatId!, (c) => ({
          ...c,
          updatedAt: new Date().toISOString(),
          messages: c.messages.map((m) => (m.id === assistantId ? finalMessage : m)),
        }));
      } finally {
        setIsStreaming(false);
      }
    },
    [activeId, conversations, createChat, isStreaming, llmEnabled, tenantSlug, updateConversation],
  );

  const regenerateLast = useCallback(async () => {
    if (!activeConversation || isStreaming) return;
    const msgs = activeConversation.messages;
    const lastUser = [...msgs].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    const withoutLastAssistant = msgs.filter(
      (m, i) => !(i === msgs.length - 1 && m.role === "assistant"),
    );
    updateConversation(activeConversation.id, (c) => ({
      ...c,
      messages: withoutLastAssistant,
    }));
    await sendMessage(lastUser.content);
  }, [activeConversation, isStreaming, sendMessage, updateConversation]);

  const setMessageFeedback = useCallback(
    (messageId: string, liked: boolean | null) => {
      if (!activeId) return;
      updateConversation(activeId, (c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === messageId ? { ...m, liked } : m)),
      }));
    },
    [activeId, updateConversation],
  );

  const togglePinMessage = useCallback(
    (messageId: string) => {
      if (!activeId) return;
      updateConversation(activeId, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === messageId ? { ...m, pinned: !m.pinned } : m,
        ),
      }));
    },
    [activeId, updateConversation],
  );

  return {
    conversations: filteredConversations,
    allConversations: conversations,
    activeConversation,
    activeId,
    setActiveId,
    isStreaming,
    search,
    setSearch,
    createChat,
    deleteChat,
    togglePinConversation,
    sendMessage,
    regenerateLast,
    setMessageFeedback,
    togglePinMessage,
    hydrated,
    llmEnabled,
    aiModel,
  };
}
