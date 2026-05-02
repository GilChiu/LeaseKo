/**
 * Dashboard Route Group Layout
 *
 * Epic 2 (Clerk Authentication): Add server-side auth check here. Example:
 *
 *   import { auth } from '@clerk/nextjs/server';
 *   import { redirect } from 'next/navigation';
 *   ...
 *   const { userId } = await auth();
 *   if (!userId) redirect('/sign-in');
 *
 * This layout wraps all routes under (dashboard)/ including /dashboard,
 * /dashboard/properties, /dashboard/units, etc.
 */

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar — Epic 3+: replace with real nav when routes exist */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col p-4 shrink-0">
        <div className="mb-8">
          <span className="text-xl font-bold">LeaseKo</span>
        </div>
        <nav className="flex flex-col gap-1 text-sm text-slate-400">
          <span className="px-3 py-2 rounded hover:bg-slate-700 hover:text-white cursor-pointer">
            Dashboard
          </span>
          <span className="px-3 py-2 rounded hover:bg-slate-700 hover:text-white cursor-pointer">
            Properties
          </span>
          <span className="px-3 py-2 rounded hover:bg-slate-700 hover:text-white cursor-pointer">
            Units
          </span>
          <span className="px-3 py-2 rounded hover:bg-slate-700 hover:text-white cursor-pointer">
            Tenants
          </span>
          <span className="px-3 py-2 rounded hover:bg-slate-700 hover:text-white cursor-pointer">
            Leases
          </span>
          <span className="px-3 py-2 rounded hover:bg-slate-700 hover:text-white cursor-pointer">
            Payments
          </span>
        </nav>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar — Epic 2+: add user avatar / org switcher here */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 shrink-0">
          <div className="ml-auto flex items-center gap-4 text-sm text-slate-500">
            {/* Epic 2: <UserButton /> from @clerk/nextjs goes here */}
            <span>Account</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
