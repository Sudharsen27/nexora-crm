"use client";

import Link from "next/link";
import { ArrowLeft, BadgeCheck, PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WidgetError } from "@/components/dashboard/widget-states";
import { usePermissions } from "@/contexts/permissions-context";
import { useSignatureRequests } from "@/hooks/use-documents";
import { signDocument } from "@/lib/api/documents";

interface SignatureDashboardProps {
  tenantSlug: string;
}

export function SignatureDashboard({ tenantSlug }: SignatureDashboardProps) {
  const { canWrite } = usePermissions();
  const { items, loading, error, refresh } = useSignatureRequests(tenantSlug);

  const handleSign = async (requestId: string) => {
    await signDocument(tenantSlug, requestId, "type", {
      text: "Signed via Nexora CRM",
      font: "cursive",
    });
    await refresh();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/${tenantSlug}/documents`}
            className="mb-2 inline-flex items-center text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to documents
          </Link>
          <div className="flex items-center gap-2">
            <PenLine className="h-7 w-7 text-[var(--primary)]" />
            <h1 className="text-2xl font-bold tracking-tight">E-Signatures</h1>
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Track signature requests, signing order, and completion status.
          </p>
        </div>
      </div>

      {error && <WidgetError title="Signatures" message={error} onRetry={() => void refresh()} />}
      {loading && <p className="text-sm text-[var(--muted-foreground)]">Loading signature requests...</p>}

      {!loading && !error && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((req) => (
            <Card key={req.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{req.title}</CardTitle>
                  <Badge variant={req.status === "completed" ? "default" : "secondary"}>{req.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {req.message && <p className="text-[var(--muted-foreground)]">{req.message}</p>}
                <ul className="space-y-2">
                  {req.signers.map((signer) => (
                    <li key={signer.id} className="flex items-center justify-between rounded-lg bg-[var(--muted)]/40 px-3 py-2">
                      <span>
                        {signer.full_name}
                        <span className="block text-xs text-[var(--muted-foreground)]">{signer.email}</span>
                      </span>
                      {signer.status === "signed" ? (
                        <BadgeCheck className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <Badge variant="outline">{signer.status}</Badge>
                      )}
                    </li>
                  ))}
                </ul>
                {canWrite("document") && req.status === "pending" && (
                  <Button size="sm" className="w-full" onClick={() => void handleSign(req.id)}>
                    Sign now
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && (
            <p className="col-span-full text-sm text-[var(--muted-foreground)]">
              No signature requests yet. Open a document and request signatures from the preview panel.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
