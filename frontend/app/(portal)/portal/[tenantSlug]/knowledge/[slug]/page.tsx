import { PortalKnowledgeArticlePage } from "@/components/portal/portal-knowledge-article-page";

export default async function Page({
  params,
}: {
  params: Promise<{ tenantSlug: string; slug: string }>;
}) {
  const { tenantSlug, slug } = await params;
  return <PortalKnowledgeArticlePage tenantSlug={tenantSlug} articleSlug={slug} />;
}
