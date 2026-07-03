"use client";

import { cn } from "@/lib/utils";

interface AiMarkdownProps {
  content: string;
  className?: string;
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={key++} className="font-semibold text-[var(--foreground)]">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`")) {
      parts.push(
        <code
          key={key++}
          className="rounded-md bg-[var(--surface-muted)] px-1.5 py-0.5 font-mono text-[0.85em] text-violet-600 dark:text-violet-300"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function AiMarkdown({ content, className }: AiMarkdownProps) {
  const blocks = content.split(/\n\n+/);

  return (
    <div className={cn("space-y-3 text-sm leading-relaxed text-[var(--foreground)]/90", className)}>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith("---")) {
          return <hr key={i} className="border-[var(--border)]" />;
        }

        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={i} className="text-sm font-semibold text-[var(--foreground)]">
              {renderInline(trimmed.slice(4))}
            </h4>
          );
        }

        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={i} className="text-base font-semibold text-[var(--foreground)]">
              {renderInline(trimmed.slice(3))}
            </h3>
          );
        }

        if (trimmed.startsWith("- ")) {
          const items = trimmed.split("\n").filter((l) => l.startsWith("- "));
          return (
            <ul key={i} className="list-inside list-disc space-y-1 text-[var(--muted-foreground)]">
              {items.map((item, j) => (
                <li key={j}>{renderInline(item.slice(2))}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={i} className="whitespace-pre-wrap">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}
