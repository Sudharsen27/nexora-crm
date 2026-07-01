"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WidgetEmpty } from "@/components/dashboard/widget-states";
import { EmailSidebar } from "@/components/emails/email-sidebar";
import { TemplateFormDialog } from "@/components/emails/template-form-dialog";
import { usePermissions } from "@/contexts/permissions-context";
import {
  deleteEmailTemplate,
  duplicateEmailTemplate,
  listEmailTemplates,
  TEMPLATE_CATEGORY_LABELS,
} from "@/lib/api/emails";
import type { EmailTemplate } from "@/types/email";

interface EmailTemplatesPageProps {
  tenantSlug: string;
}

export function EmailTemplatesPage({ tenantSlug }: EmailTemplatesPageProps) {
  const { canWrite, canDelete } = usePermissions();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listEmailTemplates(tenantSlug);
      setTemplates(data.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [tenantSlug]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Email Templates</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {templates.length} template{templates.length === 1 ? "" : "s"} · reusable messages with CRM variables
          </p>
        </div>
        {canWrite("email") && (
          <Button type="button" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" />
            New template
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-3 backdrop-blur">
          <EmailSidebar tenantSlug={tenantSlug} />
          <Link href={`/${tenantSlug}/emails`} className="mt-3 block px-3 text-xs font-medium text-[var(--primary)] hover:underline">
            ← Back to Email Center
          </Link>
        </aside>

        <div>
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <WidgetEmpty
              title="No templates yet"
              description="Create reusable email templates with CRM variables like {{first_name}} and {{company}}."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {templates.map((t) => (
                <Card key={t.id} className="transition hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="mb-2 inline-flex rounded-lg bg-[var(--primary)]/10 p-2 text-[var(--primary)]">
                          <FileText className="h-4 w-4" />
                        </div>
                        <CardTitle className="text-base">{t.name}</CardTitle>
                        <p className="text-xs text-zinc-500">
                          {TEMPLATE_CATEGORY_LABELS[t.category] ?? t.category}
                        </p>
                      </div>
                      {canWrite("email") && (
                        <div className="flex gap-1">
                          <Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(t); setFormOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={async () => { await duplicateEmailTemplate(tenantSlug, t.id); void load(); }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          {canDelete("email") && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={async () => {
                                if (!confirm("Delete this template?")) return;
                                await deleteEmailTemplate(tenantSlug, t.id);
                                void load();
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium">{t.subject}</p>
                    <p className="mt-1 line-clamp-3 text-xs text-zinc-500">
                      {t.body_text || t.body_html.replace(/<[^>]+>/g, "").slice(0, 160)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <TemplateFormDialog
        open={formOpen}
        tenantSlug={tenantSlug}
        initial={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={() => void load()}
      />
    </div>
  );
}
