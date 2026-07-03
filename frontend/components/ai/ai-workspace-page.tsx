"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Search, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AiChatComposer } from "@/components/ai/ai-chat-composer";
import { AiKnowledgeSearch } from "@/components/ai/ai-knowledge-search";
import { AiLeftSidebar, type AiSidebarSection } from "@/components/ai/ai-left-sidebar";
import { AiMessageBubble } from "@/components/ai/ai-message-bubble";
import { AiPromptSuggestions } from "@/components/ai/ai-prompt-suggestions";
import { AiRightPanel } from "@/components/ai/ai-right-panel";
import { AiSettingsPanel } from "@/components/ai/ai-settings-panel";
import { AiUsagePanel } from "@/components/ai/ai-usage-panel";
import { useAiChat } from "@/hooks/use-ai-chat";

interface AiWorkspacePageProps {
  tenantSlug: string;
}

const SECTION_PROMPTS: Partial<Record<AiSidebarSection, string>> = {
  insights: "Give me business insights for my CRM today",
  recommendations: "What are your top recommendations for me today?",
  forecast: "Forecast next month's revenue",
  reports: "Generate a sales performance report for this month",
};

export function AiWorkspacePage({ tenantSlug }: AiWorkspacePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatId = searchParams.get("chat");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<AiSidebarSection>("chat");
  const [conversationSearch, setConversationSearch] = useState("");

  const {
    conversations,
    activeConversation,
    activeId,
    setActiveId,
    isStreaming,
    search,
    setSearch,
    createChat,
    togglePinConversation,
    sendMessage,
    regenerateLast,
    setMessageFeedback,
    togglePinMessage,
    hydrated,
  } = useAiChat(tenantSlug, chatId);

  const selectChat = useCallback(
    (id: string) => {
      setActiveId(id);
      router.push(`/${tenantSlug}/ai?chat=${id}`);
    },
    [router, setActiveId, tenantSlug],
  );

  const handleNewChat = () => {
    const id = createChat();
    setActiveSection("chat");
    setConversationSearch("");
    router.push(`/${tenantSlug}/ai?chat=${id}`);
  };

  const handleSectionChange = useCallback(
    (section: AiSidebarSection) => {
      setActiveSection(section);
      const prompt = SECTION_PROMPTS[section];
      if (prompt) {
        setActiveSection("chat");
        void sendMessage(prompt);
      }
    },
    [sendMessage],
  );

  const handleKnowledgeSearch = (query: string) => {
    setActiveSection("chat");
    void sendMessage(query);
  };

  const handlePromptSelect = (prompt: string) => {
    setActiveSection("chat");
    void sendMessage(prompt);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [activeConversation?.messages]);

  const messages = activeConversation?.messages ?? [];
  const conversationQuery = conversationSearch.trim().toLowerCase();
  const filteredMessages =
    conversationQuery && activeSection === "chat"
      ? messages.filter((m) => m.content.toLowerCase().includes(conversationQuery))
      : messages;
  const showSuggestions = activeSection === "chat" && messages.length === 0;
  const showComposer = activeSection === "chat";
  const canSearchConversation = activeSection === "chat" && messages.length > 0;
  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  const exportChat = () => {
    if (!activeConversation) return;
    const text = activeConversation.messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${activeConversation.title || "chat"}.txt`;
    a.click();
  };

  if (!hydrated) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <Sparkles className="h-4 w-4 animate-pulse text-violet-500" />
          Loading AI workspace…
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden rounded-2xl border border-[var(--border)]/80 bg-[var(--background)] shadow-xl">
      {/* AI top bar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--border)]/80 bg-[var(--surface)]/80 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-600" />
          <h1 className="text-lg font-bold tracking-tight">Nexora AI</h1>
          <Badge variant="secondary" className="text-[10px]">
            Enterprise
          </Badge>
        </div>
        <div className="mx-auto hidden max-w-md flex-1 md:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input
              className="h-9 pl-9 text-sm"
              placeholder={
                canSearchConversation
                  ? "Search this conversation…"
                  : "Start a chat to search messages"
              }
              value={conversationSearch}
              disabled={!canSearchConversation}
              onChange={(e) => setConversationSearch(e.target.value)}
            />
            {conversationQuery && canSearchConversation && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted-foreground)]">
                {filteredMessages.length} match{filteredMessages.length === 1 ? "" : "es"}
              </span>
            )}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge
            className="hidden cursor-pointer bg-gradient-to-r from-violet-600/15 to-indigo-600/15 text-violet-700 dark:text-violet-300 sm:inline-flex"
            onClick={() => setActiveSection("usage")}
          >
            <Zap className="mr-1 h-3 w-3" />
            7,600 credits
          </Badge>
          <Button variant="outline" size="sm" onClick={exportChat} disabled={!messages.length}>
            <Download className="mr-1 h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="hidden lg:block">
          <AiLeftSidebar
            conversations={conversations}
            activeId={activeId}
            activeSection={activeSection}
            search={search}
            onSearchChange={setSearch}
            onSelect={(id) => {
              setActiveSection("chat");
              setConversationSearch("");
              selectChat(id);
            }}
            onNewChat={handleNewChat}
            onPin={togglePinConversation}
            onSectionChange={handleSectionChange}
          />
        </div>

        <main className="flex min-w-0 flex-1 flex-col bg-gradient-to-b from-[var(--background)] to-[var(--surface-muted)]/20">
          <div ref={scrollRef} className="flex-1 overflow-y-auto sidebar-scroll">
            {activeSection === "usage" && <AiUsagePanel />}
            {activeSection === "settings" && <AiSettingsPanel />}
            {activeSection === "knowledge" && (
              <AiKnowledgeSearch onSearch={handleKnowledgeSearch} />
            )}
            {activeSection === "saved" && (
              <div className="flex min-h-full items-center py-12">
                <AiPromptSuggestions onSelect={handlePromptSelect} />
              </div>
            )}
            {activeSection === "chat" && showSuggestions && (
              <div className="flex min-h-full items-center py-12">
                <AiPromptSuggestions onSelect={handlePromptSelect} />
              </div>
            )}
            {activeSection === "chat" && !showSuggestions && (
              <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
                {conversationQuery && filteredMessages.length === 0 && (
                  <p className="text-center text-sm text-[var(--muted-foreground)]">
                    No messages match &ldquo;{conversationSearch}&rdquo;
                  </p>
                )}
                {filteredMessages.map((message) => (
                  <AiMessageBubble
                    key={message.id}
                    message={message}
                    isLastAssistant={message.id === lastAssistantId}
                    onRegenerate={regenerateLast}
                    onFeedback={(liked) => setMessageFeedback(message.id, liked)}
                    onPin={() => togglePinMessage(message.id)}
                  />
                ))}
                {isStreaming && (
                  <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500 [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500 [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500 [animation-delay:300ms]" />
                    </span>
                    Nexora AI is thinking…
                  </div>
                )}
              </div>
            )}
          </div>
          {showComposer && (
            <AiChatComposer onSend={(t) => void sendMessage(t)} disabled={isStreaming} />
          )}
        </main>

        <AiRightPanel tenantSlug={tenantSlug} />
      </div>
    </div>
  );
}
