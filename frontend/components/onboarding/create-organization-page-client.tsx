"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { listTenants } from "@/lib/api/tenants";
import { CreateOrganizationForm } from "@/components/onboarding/create-organization-form";

export function CreateOrganizationPageClient() {
  const router = useRouter();

  useEffect(() => {
    void listTenants().then((tenants) => {
      if (tenants.length > 0) {
        router.replace(`/${tenants[0].slug}`);
      }
    });
  }, [router]);

  return <CreateOrganizationForm />;
}
