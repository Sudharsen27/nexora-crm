import { DocumentsExplorer } from "@/components/documents/documents-explorer";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ view?: string; folder?: string }>;
}

export default async function Page({ params, searchParams }: PageProps) {
  const { tenantSlug } = await params;
  const { view, folder } = await searchParams;
  return (
    <DocumentsExplorer
      tenantSlug={tenantSlug}
      initialView={view}
      initialFolderSlug={folder ?? "my_documents"}
    />
  );
}
