import { CreateLeaseForm } from "../_components/create-lease-form";

export default function NewLeasePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Create Lease</h1>
      </div>
      <CreateLeaseForm />
    </div>
  );
}
