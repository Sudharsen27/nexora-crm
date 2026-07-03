"use client";

import {
  BarChart3,
  Bookmark,
  Clock,
  History,
  Lightbulb,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AiConversation } from "@/types/ai";
import { cn } from "@/lib/utils";

const NAV_SECTIONS = [
  { id: "chat", label: "AI Chat", icon: MessageSquare },
  { id: "insights", label: "Business Insights", icon: Lightbulb },
  { id: "recommendations", label: "Recommendations", icon: Zap },
  { id: "forecast", label: "Forecast", icon: TrendingUp },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "knowledge", label: "Knowledge Search", icon: Search },
  { id: "saved", label: "Saved Prompts", icon: Bookmark },
] as const;

export type AiSidebarSection = (typeof NAV_SECTIONS)[number]["id"] | "usage" | "settings";

interface AiLeftSidebarProps {
  conversations: AiConversation[];
  activeId: string | null;
  activeSection: AiSidebarSection;
  search: string;
  onSearchChange: (q: string) => void;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onPin: (id: string) => void;
  onSectionChange: (section: AiSidebarSection) => void;
}

export function AiLeftSidebar({
  conversations,
  activeId,
  activeSection,
  search,
  onSearchChange,
  onSelect,
  onNewChat,
  onPin,
  onSectionChange,
}: AiLeftSidebarProps) {
  const pinned = conversations.filter((c) => c.pinned);
  const recent = conversations.filter((c) => !c.pinned).slice(0, 12);

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-[var(--border)]/80 bg-[var(--surface)]/60 backdrop-blur-xl">
      <div className="border-b border-[var(--border)]/80 p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold">AI Assistant</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">Nexora Intelligence</p>
          </div>
        </div>
        <Button
          onClick={onNewChat}
          className="mt-4 w-full bg-gradient-to-r from-violet-600 to-indigo-600 shadow-md hover:opacity-95"
        >
          <Plus className="mr-2 h-4 w-4" />
          New chat
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 sidebar-scroll">
        <p className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Workspace
        </p>
        {NAV_SECTIONS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition",
                isActive
                  ? "bg-violet-500/15 font-medium text-violet-700 dark:text-violet-300"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          );
        })}

        <div className="my-4 border-t border-[var(--border)]/80" />

        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          <History className="mr-1 inline h-3 w-3" />
          Conversations
        </p>
        <div className="px-2 pb-2">
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search chats…"
            className="h-8 text-xs"
          />
        </div>

        {pinned.length > 0 && (
          <>
            <p className="px-2 py-1 text-[10px] font-medium text-[var(--muted-foreground)]">Pinned</p>
            {pinned.map((c) => (
              <ConversationItem
                key={c.id}
                conversation={c}
                active={c.id === activeId}
                onSelect={() => onSelect(c.id)}
                onPin={() => onPin(c.id)}
              />
            ))}
          </>
        )}

        {recent.map((c) => (
          <ConversationItem
            key={c.id}
            conversation={c}
            active={c.id === activeId}
            onSelect={() => onSelect(c.id)}
            onPin={() => onPin(c.id)}
          />
        ))}
      </nav>

      <div className="border-t border-[var(--border)]/80 p-3">
        <button
          type="button"
          onClick={() => onSectionChange("usage")}
          className={cn(
            "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
            activeSection === "usage"
              ? "bg-violet-500/15 font-medium text-violet-700 dark:text-violet-300"
              : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]",
          )}
        >
          <Clock className="h-4 w-4" />
          Usage · 2,400 credits
        </button>
        <button
          type="button"
          onClick={() => onSectionChange("settings")}
          className={cn(
            "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
            activeSection === "settings"
              ? "bg-violet-500/15 font-medium text-violet-700 dark:text-violet-300"
              : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]",
          )}
        >
          <Settings className="h-4 w-4" />
          AI Settings
        </button>
      </div>
    </aside>
  );
}

function ConversationItem({
  conversation,
  active,
  onSelect,
  onPin,
}: {
  conversation: AiConversation;
  active: boolean;
  onSelect: () => void;
  onPin: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition",
        active
          ? "bg-violet-500/15 text-violet-800 dark:text-violet-200"
          : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]",
      )}
    >
      <MessageSquare className="h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onPin();
        }}
        onKeyDown={(e) => e.key === "Enter" && onPin()}
        className="opacity-0 transition group-hover:opacity-100"
      >
        {conversation.pinned ? "📌" : "·"}
      </span>
    </button>
  );
}
