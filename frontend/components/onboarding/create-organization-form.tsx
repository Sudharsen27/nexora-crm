"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NexoraLogo } from "@/components/brand/nexora-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTenant } from "@/lib/api/tenants";

const schema = z.object({
  name: z.string().min(1, "Organization name is required"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
});

type FormData = z.infer<typeof schema>;

export function CreateOrganizationForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const name = watch("name");

  function slugify(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  return (
    <div className="w-full max-w-lg space-y-6">
      <div className="flex justify-center">
        <NexoraLogo href="/" markClassName="h-11 w-11" />
      </div>
      <Card className="w-full">
      <CardHeader>
        <CardTitle>Create your organization</CardTitle>
        <CardDescription>Set up your workspace to get started with Nexora CRM.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(async (data) => {
            setError(null);
            try {
              const tenant = await createTenant(data);
              router.push(`/${tenant.slug}`);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to create organization");
            }
          })}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Organization name</Label>
            <Input
              id="name"
              placeholder="Acme Inc."
              {...register("name", {
                onChange: (e) => {
                  if (!watch("slug")) {
                    setValue("slug", slugify(e.target.value));
                  }
                },
              })}
            />
            {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">URL slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500">nexora.app/</span>
              <Input id="slug" placeholder="acme-inc" {...register("slug")} />
            </div>
            {name && (
              <button
                type="button"
                className="text-xs text-zinc-500 underline"
                onClick={() => setValue("slug", slugify(name))}
              >
                Regenerate from name
              </button>
            )}
            {errors.slug && <p className="text-sm text-red-600">{errors.slug.message}</p>}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create organization"}
          </Button>
        </form>
      </CardContent>
    </Card>
    </div>
  );
}
