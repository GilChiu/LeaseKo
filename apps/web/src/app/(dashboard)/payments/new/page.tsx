import { Suspense } from "react";
import { RecordPaymentForm } from "../_components/record-payment-form";

export default function NewPaymentPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Record Payment</h1>
      </div>
      <Suspense
        fallback={
          <div className="max-w-2xl space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 rounded-lg bg-slate-200 animate-pulse"
              />
            ))}
          </div>
        }
      >
        <RecordPaymentForm />
      </Suspense>
    </div>
  );
}
