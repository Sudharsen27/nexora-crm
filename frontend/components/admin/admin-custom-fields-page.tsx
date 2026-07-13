"use client";

import { useState } from "react";
import { AdminNavTabs } from "@/components/admin/admin-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCustomFields } from "@/hooks/use-admin";
import { createCustomField, deleteCustomField } from "@/lib/api/admin";

const ENTITIES = ["company", "contact", "lead", "deal", "meeting", "document", "portal"];

interface AdminCustomFieldsPageProps {
  tenantSlug: string;
}

export function AdminCustomFieldsPage({ tenantSlug }: AdminCustomFieldsPageProps) {
  const { data, loading, error, refresh } = useCustomFields(tenantSlug);
  const [entity, setEntity] = useState("lead");
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");

  async function handleCreate() {
    if (!key.trim() || !label.trim()) return;
    await createCustomField(tenantSlug, { entity_type: entity, key: key.trim(), label: label.trim() });
    setKey("");
    setLabel("");
    await refresh();
  }

  if (loading) return <WidgetSkeleton variant="chart" />;
  if (error) return <WidgetError title="Custom Fields" message={error} onRetry={() => void refresh()} />;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Custom Fields</h1></div>
      <AdminNavTabs tenantSlug={tenantSlug} />
      <Card>
        <CardHeader><CardTitle>Add field</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <Select value={entity} onChange={(e) => setEntity(e.target.value)}>
            {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
          </Select>
          <Input placeholder="key" value={key} onChange={(e) => setKey(e.target.value)} />
          <Input placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Button onClick={() => void handleCreate()}>Add</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Defined fields</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(data ?? []).map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2">
              <div>
                <p className="font-medium">{f.label}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{f.entity_type}.{f.key}</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">{f.field_type}</Badge>
                <Button size="sm" variant="outline" onClick={() => void deleteCustomField(tenantSlug, f.id).then(() => refresh())}>Delete</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
