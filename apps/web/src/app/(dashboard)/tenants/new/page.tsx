import { TenantForm } from "../_components/tenant-form";

export default function NewTenantPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Add Tenant</h1>
      </div>
      <TenantForm />
    </div>
  );
}
