import { CreateMaintenanceForm } from "../_components/create-maintenance-form";

export default function NewMaintenancePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          New Maintenance Request
        </h1>
      </div>
      <CreateMaintenanceForm />
    </div>
  );
}
