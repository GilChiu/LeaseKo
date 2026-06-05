import { CreatePropertyForm } from "../_components/create-property-form";

export default function NewPropertyPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Add Property</h1>
      </div>
      <CreatePropertyForm />
    </div>
  );
}
