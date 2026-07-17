"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, Plus, Search, Trash2 } from "lucide-react";
import { SupportNavTabs } from "@/components/support/support-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useSupportKnowledge } from "@/hooks/use-support";
import { usePermissions } from "@/contexts/permissions-context";
import {
  createKnowledge,
  deleteKnowledge,
  formatDateTime,
  listKnowledgeCategories,
  updateKnowledge,
} from "@/lib/api/support";
import type { KnowledgeArticle, KnowledgeCategory } from "@/types/support";
import { useEffect } from "react";

const schema = z.object({
  title: z.string().min(1).max(255),
  body: z.string().min(1),
  summary: z.string().max(500).optional(),
  category: z.string().min(1),
  status: z.enum(["draft", "published", "archived"]),
});

type FormData = z.infer<typeof schema>;

interface KnowledgePageProps {
  tenantSlug: string;
}

export function KnowledgePage({ tenantSlug }: KnowledgePageProps) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeArticle | null>(null);
  const { canWrite, canDelete, loading: permLoading } = usePermissions();

  const { data, loading, error, refresh } = useSupportKnowledge(tenantSlug, {
    q: q || undefined,
    status: statusFilter || undefined,
    page_size: 30,
  });

  useEffect(() => {
    void listKnowledgeCategories(tenantSlug).then(setCategories).catch(() => setCategories([]));
  }, [tenantSlug]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: editing
      ? {
          title: editing.title,
          body: editing.body,
          summary: editing.summary ?? "",
          category: editing.category,
          status: editing.status as FormData["status"],
        }
      : {
          title: "",
          body: "",
          summary: "",
          category: "general",
          status: "draft",
        },
  });

  if (loading && !data) return <WidgetSkeleton variant="chart" />;
  if (error) return <WidgetError title="Knowledge Base" message={error} onRetry={() => void refresh()} />;

  const articles = data?.items ?? [];

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-violet-500" />
            <h1 className="text-2xl font-bold">Knowledge Base</h1>
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Articles and help documentation</p>
        </div>
        {!permLoading && canWrite("support") && (
          <Button
            className="bg-violet-600 hover:bg-violet-700"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New Article
          </Button>
        )}
      </div>

      <SupportNavTabs tenantSlug={tenantSlug} />

      <div className="grid gap-4 lg:grid-cols-4">
        {categories.length > 0 && (
          <Card className="border-[var(--border)]/80 bg-[var(--surface)]/80 backdrop-blur-sm lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {categories.map((cat) => (
                <p key={cat.id} className="rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--surface-muted)]">
                  {cat.name}
                </p>
              ))}
            </CardContent>
          </Card>
        )}

        <div className={categories.length > 0 ? "lg:col-span-3" : "lg:col-span-4"}>
          <Card className="mb-4 border-[var(--border)]/80 bg-[var(--surface)]/80 backdrop-blur-sm">
            <CardContent className="flex flex-wrap gap-3 pt-6">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <Input
                  className="pl-9"
                  placeholder="Search articles…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <select
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </CardContent>
          </Card>

          <Card className="border-[var(--border)]/80 bg-[var(--surface)]/80 backdrop-blur-sm">
            <CardContent className="p-0">
              {articles.length === 0 ? (
                <p className="p-8 text-center text-[var(--muted-foreground)]">No articles found</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left">
                      <th className="px-4 py-3 font-medium">Title</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Views</th>
                      <th className="px-4 py-3 font-medium">Updated</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articles.map((article) => (
                      <tr key={article.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--surface-muted)]/50">
                        <td className="px-4 py-3">
                          <p className="font-medium">{article.title}</p>
                          {article.summary && (
                            <p className="line-clamp-1 text-xs text-[var(--muted-foreground)]">{article.summary}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={article.is_published ? "default" : "outline"} className="capitalize">
                            {article.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">{article.view_count}</td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)]">{formatDateTime(article.updated_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            {!permLoading && canWrite("support") && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditing(article);
                                    setFormOpen(true);
                                  }}
                                >
                                  Edit
                                </Button>
                                {article.status === "draft" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      void updateKnowledge(tenantSlug, article.id, { status: "published" }).then(() =>
                                        refresh(),
                                      )
                                    }
                                  >
                                    Publish
                                  </Button>
                                )}
                              </>
                            )}
                            {!permLoading && canDelete("support") && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  void deleteKnowledge(tenantSlug, article.id).then(() => refresh())
                                }
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
            <h2 className="text-lg font-semibold">{editing ? "Edit Article" : "New Article"}</h2>
            <form
              className="mt-4 space-y-4"
              onSubmit={handleSubmit(async (formData) => {
                const payload = {
                  title: formData.title.trim(),
                  body: formData.body.trim(),
                  summary: formData.summary?.trim() || null,
                  category: formData.category,
                  status: formData.status,
                };
                if (editing) {
                  await updateKnowledge(tenantSlug, editing.id, payload);
                } else {
                  await createKnowledge(tenantSlug, payload);
                }
                setFormOpen(false);
                setEditing(null);
                reset();
                await refresh();
              })}
            >
              <div>
                <Label>Title</Label>
                <Input {...register("title")} className="mt-1" />
                {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
              </div>
              <div>
                <Label>Summary</Label>
                <Input {...register("summary")} className="mt-1" />
              </div>
              <div>
                <Label>Body</Label>
                <textarea
                  rows={8}
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                  {...register("body")}
                />
                {errors.body && <p className="text-xs text-red-600">{errors.body.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Input {...register("category")} className="mt-1" />
                </div>
                <div>
                  <Label>Status</Label>
                  <select
                    className="mt-1 h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                    {...register("status")}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-violet-600 hover:bg-violet-700">
                  {isSubmitting ? "Saving…" : "Save"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
