import { PropertyDetailView } from "./_components/property-detail-view";

export default function PropertyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <PropertyDetailView propertyId={params.id} />;
}
