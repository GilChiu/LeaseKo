import { TenantDetailView } from "./_components/tenant-detail-view";

export default function TenantDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <TenantDetailView contactId={params.id} />;
}
