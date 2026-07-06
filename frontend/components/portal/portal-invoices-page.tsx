"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PortalEmptyState, PortalPageError, PortalPageLoading } from "@/components/portal/portal-page-state";
import { downloadPortalDocument, getPortalInvoices } from "@/lib/api/portal";
import type { PortalInvoice } from "@/types/portal";

export function PortalInvoicesPage({ tenantSlug }: { tenantSlug: string }) {
  const [invoices, setInvoices] = useState<PortalInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getPortalInvoices(tenantSlug)
      .then(setInvoices)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load invoices"))
      .finally(() => setLoading(false));
  }, [tenantSlug]);

  const outstanding = invoices.filter((i) => i.status !== "paid");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invoices & payments</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          View billing history and download invoice documents
        </p>
      </div>

      {error && <PortalPageError message={error} />}
      {loading ? (
        <PortalPageLoading label="Loading invoices…" />
      ) : invoices.length === 0 ? (
        <PortalEmptyState
          title="No invoices yet"
          description="Invoices shared with your account will appear here."
        />
      ) : (
        <>
          {outstanding.length > 0 && (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {outstanding.length} outstanding invoice{outstanding.length > 1 ? "s" : ""} — contact
              your account manager for payment options.
            </p>
          )}
          <div className="space-y-3">
            {invoices.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">{inv.invoice_number}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Due {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold">
                        {inv.currency} {Number(inv.amount).toLocaleString()}
                      </p>
                      <Badge variant={inv.status === "paid" ? "default" : "secondary"}>
                        {inv.status}
                      </Badge>
                    </div>
                    {inv.document_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          void downloadPortalDocument(
                            tenantSlug,
                            inv.document_id!,
                            `${inv.invoice_number}.pdf`,
                          )
                        }
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
