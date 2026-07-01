"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmailDetailView } from "@/components/emails/email-detail-view";
import type { Email } from "@/types/email";

interface EmailDetailDrawerProps {
  tenantSlug: string;
  email: Email;
  onClose: () => void;
  onChanged: () => void;
}

export function EmailDetailDrawer({ tenantSlug, email, onClose, onChanged }: EmailDetailDrawerProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm xl:hidden"
        onClick={onClose}
        aria-hidden
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl xl:hidden">
        <div className="flex items-center justify-end border-b border-[var(--border)] px-3 py-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close email">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <EmailDetailView tenantSlug={tenantSlug} email={email} onChanged={onChanged} />
        </div>
      </aside>
    </>
  );
}
