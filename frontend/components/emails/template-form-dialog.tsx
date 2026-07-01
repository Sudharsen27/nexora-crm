"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/emails/rich-text-editor";
import { createEmailTemplate, TEMPLATE_CATEGORY_LABELS, updateEmailTemplate } from "@/lib/api/emails";
import { TEMPLATE_CATEGORIES, type EmailTemplate } from "@/types/email";

interface TemplateFormDialogProps {
  open: boolean;
  tenantSlug: string;
  initial?: EmailTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}

export function TemplateFormDialog({ open, tenantSlug, initial, onClose, onSaved }: TemplateFormDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("sales");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setCategory(initial?.category ?? "sales");
    setSubject(initial?.subject ?? "");
    setBodyHtml(initial?.body_html ?? "");
    setError(null);
  }, [open, initial]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name,
        category,
        subject,
        body_html: bodyHtml,
        body_text: bodyHtml.replace(/<[^>]+>/g, ""),
        variables: ["first_name", "company", "deal", "owner", "meeting"],
      };
      if (initial) {
        await updateEmailTemplate(tenantSlug, initial.id, payload);
      } else {
        await createEmailTemplate(tenantSlug, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
        <h2 className="text-lg font-semibold">{initial ? "Edit template" : "New template"}</h2>
        <div className="mt-4 space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Category</Label>
            <select
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {TEMPLATE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{TEMPLATE_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <RichTextEditor value={bodyHtml} onChange={setBodyHtml} />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={submit} disabled={saving}>Save</Button>
        </div>
      </div>
    </div>
  );
}
