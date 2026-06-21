import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { NavLink } from "@/components/nav-link";
import { TenantSync } from "./_components/tenant-sync";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col p-4 shrink-0">
        <div className="mb-8">
          <span className="text-xl font-bold">LeaseKo</span>
        </div>
        <nav className="flex flex-col gap-1 text-sm text-slate-400">
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/properties">Properties</NavLink>
          <NavLink href="/tenants">Tenants</NavLink>
          <NavLink href="/leases">Leases</NavLink>
          <NavLink href="/invoices">Invoices</NavLink>
          <NavLink href="/payments">Payments</NavLink>
          <NavLink href="/maintenance">Maintenance</NavLink>
        </nav>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 shrink-0">
          <div className="ml-auto flex items-center gap-4 text-sm text-slate-500">
            <OrganizationSwitcher
              hidePersonal
              afterCreateOrganizationUrl="/properties"
              afterSelectOrganizationUrl="/properties"
            />
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </header>

        <TenantSync />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
