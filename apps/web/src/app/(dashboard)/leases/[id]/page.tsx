import { LeaseDetailView } from "./_components/lease-detail-view";

export default function LeaseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <LeaseDetailView leaseId={params.id} />;
}
