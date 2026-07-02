"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createWorkflowFromTemplate, listWorkflowTemplates, type WorkflowTemplate } from "@/lib/api/workflows";

interface WorkflowTemplatesPageProps {
  tenantSlug: string;
}

export function WorkflowTemplatesPage({ tenantSlug }: WorkflowTemplatesPageProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void listWorkflowTemplates(tenantSlug)
      .then(setTemplates)
      .finally(() => setLoading(false));
  }, [tenantSlug]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link
          href={`/${tenantSlug}/workflows`}
          className="mb-2 inline-flex h-8 items-center rounded-lg px-3 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Workflows
        </Link>
        <h1 className="text-2xl font-bold">Workflow templates</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Start from proven automation recipes for sales and onboarding.
        </p>
      </div>

      {loading && <p className="text-sm text-[var(--muted-foreground)]">Loading templates...</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.template_slug} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[var(--primary)]" />
                <CardTitle className="text-lg">{template.name}</CardTitle>
              </div>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <p className="mb-3 text-xs text-[var(--muted-foreground)]">
                Trigger: {template.trigger_type.replace(/_/g, " ")}
              </p>
              <Button
                className="w-full"
                onClick={async () => {
                  const workflow = await createWorkflowFromTemplate(tenantSlug, template.template_slug);
                  router.push(`/${tenantSlug}/workflows/${workflow.id}`);
                }}
              >
                Use template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
