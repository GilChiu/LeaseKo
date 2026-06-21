import { MaintenanceDetailView } from "./_components/maintenance-detail-view";

export default function MaintenanceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <MaintenanceDetailView requestId={params.id} />;
}
