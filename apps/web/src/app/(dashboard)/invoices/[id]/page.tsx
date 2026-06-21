import { InvoiceDetailView } from "./_components/invoice-detail-view";

export default function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <InvoiceDetailView invoiceId={params.id} />;
}
