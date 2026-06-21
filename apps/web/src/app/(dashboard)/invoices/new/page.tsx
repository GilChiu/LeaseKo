import { CreateInvoiceForm } from "../_components/create-invoice-form";

export default function NewInvoicePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Create Invoice</h1>
      </div>
      <CreateInvoiceForm />
    </div>
  );
}
