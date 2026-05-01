import { Card } from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Welcome to LeaseKo. Your property management overview will appear here.
        </p>
      </div>

      {/* Epic 3+: Replace these placeholder cards with real tenant-scoped data widgets.
          All data must come from the NestJS API — never fetched directly from the DB. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Properties">
          <p className="text-3xl font-bold text-slate-900">—</p>
          <p className="text-sm text-slate-500 mt-1">Total properties</p>
        </Card>
        <Card title="Units">
          <p className="text-3xl font-bold text-slate-900">—</p>
          <p className="text-sm text-slate-500 mt-1">Total units</p>
        </Card>
        <Card title="Active Leases">
          <p className="text-3xl font-bold text-slate-900">—</p>
          <p className="text-sm text-slate-500 mt-1">Active leases</p>
        </Card>
      </div>
    </div>
  );
}
