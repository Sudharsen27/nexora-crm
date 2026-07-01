"use client";

import { Bold, Italic, Link2, List, ListOrdered, Underline } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your message...",
  className,
  minHeight = "200px",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const exec = useCallback((command: string, val?: string) => {
    document.execCommand(command, false, val);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const handleInput = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const insertLink = () => {
    const url = window.prompt("Enter URL");
    if (url) exec("createLink", url);
  };

  const insertVariable = (variable: string) => {
    exec("insertText", `{{${variable}}}`);
  };

  return (
    <div className={cn("overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]", className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--border)] bg-[var(--surface-muted)]/40 px-2 py-1.5">
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => exec("bold")} title="Bold">
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => exec("italic")} title="Italic">
          <Italic className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => exec("underline")} title="Underline">
          <Underline className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => exec("insertUnorderedList")} title="Bullet list">
          <List className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => exec("insertOrderedList")} title="Numbered list">
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={insertLink} title="Insert link">
          <Link2 className="h-4 w-4" />
        </Button>
        <div className="ml-2 flex flex-wrap gap-1 border-l border-[var(--border)] pl-2">
          {["first_name", "company", "deal", "owner", "meeting"].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => insertVariable(v)}
              className="rounded-md bg-[var(--primary)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--primary)] hover:bg-[var(--primary)]/20"
            >
              {`{{${v}}}`}
            </button>
          ))}
        </div>
      </div>
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline
        data-placeholder={placeholder}
        onInput={handleInput}
        className="prose prose-sm max-w-none px-4 py-3 text-sm text-[var(--foreground)] outline-none empty:before:text-[var(--muted-foreground)] empty:before:content-[attr(data-placeholder)]"
        style={{ minHeight }}
        suppressContentEditableWarning
      />
    </div>
  );
}
