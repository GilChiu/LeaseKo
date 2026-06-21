"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { getSummary, getRevenue } from "@/lib/dashboard-api";
import { getInvoices } from "@/lib/invoices-api";
import { getPayments } from "@/lib/payments-api";
import { getMaintenanceRequests } from "@/lib/maintenance-api";
import { formatCurrency, formatDate } from "@/lib/format";
import type {
  DashboardSummary,
  Invoice,
  MaintenanceRequest,
  Payment,
} from "@/lib/types";

interface RevenuePoint {
  label: string;
  monthlyRevenue: number;
  collectedRent: number;
}

interface RecentActivity {
  invoices: Invoice[];
  payments: Payment[];
  maintenance: MaintenanceRequest[];
}

interface DashboardData {
  summary: DashboardSummary;
  revenueSeries: RevenuePoint[];
  recent: RecentActivity;
}

type PageState =
  | { status: "loading" }
  | { status: "success"; data: DashboardData }
  | { status: "error-forbidden" }
  | { status: "error-server" };

const OCCUPANCY_COLORS = {
  occupied: "#16a34a",
  vacant: "#f59e0b",
  other: "#94a3b8",
};

function lastSixMonths(): Array<{ year: number; month: number; label: string }> {
  const months: Array<{ year: number; month: number; label: string }> = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push({
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      label: d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
    });
  }
  return months;
}

export function DashboardView() {
  const { isLoaded, getToken } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<PageState>({ status: "loading" });

  const loadDashboard = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const token = await getToken();
      if (!token) {
        router.push("/sign-in");
        return;
      }

      const summary = await getSummary(token);

      const months = lastSixMonths();
      const revenueResults = await Promise.all(
        months.map((m) => getRevenue(token, { year: m.year, month: m.month })),
      );
      const revenueSeries: RevenuePoint[] = revenueResults.map((r, i) => ({
        label: months[i].label,
        monthlyRevenue: r.monthlyRevenue,
        collectedRent: r.collectedRent,
      }));

      const [invoicesRes, paymentsRes, maintenanceRes] =
        await Promise.allSettled([
          getInvoices(token, { page: 1, limit: 5 }),
          getPayments(token, { page: 1, limit: 5 }),
          getMaintenanceRequests(token, { page: 1, limit: 5 }),
        ]);

      const recent: RecentActivity = {
        invoices:
          invoicesRes.status === "fulfilled" ? invoicesRes.value.items : [],
        payments:
          paymentsRes.status === "fulfilled" ? paymentsRes.value.items : [],
        maintenance:
          maintenanceRes.status === "fulfilled"
            ? maintenanceRes.value.items
            : [],
      };

      setState({
        status: "success",
        data: { summary, revenueSeries, recent },
      });
    } catch (e) {
      const status = (e as { status?: number })?.status;
      if (status === 401) {
        router.push("/sign-in");
        return;
      }
      if (status === 403) {
        setState({ status: "error-forbidden" });
        return;
      }
      setState({ status: "error-server" });
    }
  }, [getToken, router]);

  useEffect(() => {
    if (!isLoaded) return;
    void loadDashboard();
  }, [isLoaded, loadDashboard]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Your property management overview.
        </p>
      </div>

      {state.status === "loading" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 rounded-lg bg-slate-200 animate-pulse"
              />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="h-72 rounded-lg bg-slate-200 animate-pulse" />
            <div className="h-72 rounded-lg bg-slate-200 animate-pulse" />
          </div>
        </div>
      )}

      {state.status === "error-forbidden" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            No active organisation context available. Please select or create an
            organisation to continue.
          </p>
        </div>
      )}

      {state.status === "error-server" && (
        <div className="text-center py-16">
          <p className="text-base text-slate-500 mb-6">
            Failed to load the dashboard. Please try again.
          </p>
          <button
            onClick={() => void loadDashboard()}
            className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {state.status === "success" && (
        <DashboardContent data={state.data} />
      )}
    </div>
  );
}

function DashboardContent({ data }: { data: DashboardData }) {
  const { summary, revenueSeries, recent } = data;
  const { occupancy, revenue } = summary;

  const other = Math.max(
    occupancy.totalUnits - occupancy.occupiedUnits - occupancy.vacantUnits,
    0,
  );
  const occupancyData = [
    { name: "Occupied", value: occupancy.occupiedUnits, key: "occupied" },
    { name: "Vacant", value: occupancy.vacantUnits, key: "vacant" },
    { name: "Other", value: other, key: "other" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Occupancy">
          <p className="text-3xl font-bold text-slate-900">
            {occupancy.occupancyPercentage}%
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {occupancy.occupiedUnits} of {occupancy.totalUnits} units occupied
          </p>
        </Card>
        <Card title="Properties">
          <p className="text-3xl font-bold text-slate-900">
            {occupancy.totalProperties}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {occupancy.vacantUnits} vacant units
          </p>
        </Card>
        <Card title="Collected (this month)">
          <p className="text-3xl font-bold text-slate-900">
            {formatCurrency(revenue.collectedRent)}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            of {formatCurrency(revenue.monthlyRevenue)} billed
          </p>
        </Card>
        <Card title="Outstanding">
          <p className="text-3xl font-bold text-slate-900">
            {formatCurrency(revenue.outstandingAmount)}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {revenue.overdueCount} overdue ·{" "}
            {formatCurrency(revenue.overdueAmount)}
          </p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Revenue (last 6 months)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} width={80} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Bar
                  dataKey="monthlyRevenue"
                  name="Billed"
                  fill="#94a3b8"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="collectedRent"
                  name="Collected"
                  fill="#16a34a"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Occupancy">
          <div className="h-64">
            {occupancyData.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-slate-400">No units yet.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={occupancyData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {occupancyData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={
                          OCCUPANCY_COLORS[
                            entry.key as keyof typeof OCCUPANCY_COLORS
                          ]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RecentInvoices invoices={recent.invoices} />
        <RecentPayments payments={recent.payments} />
        <RecentMaintenance requests={recent.maintenance} />
      </div>
    </div>
  );
}

function RecentInvoices({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter();
  return (
    <Card title="Recent invoices">
      {invoices.length === 0 ? (
        <p className="text-sm text-slate-400">No invoices yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {invoices.map((inv) => (
            <li
              key={inv.id}
              onClick={() => router.push(`/invoices/${inv.id}`)}
              className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-slate-50"
            >
              <span className="min-w-0 truncate text-slate-700">
                {inv.invoiceNumber}
              </span>
              <span className="shrink-0 text-slate-500">
                {formatCurrency(inv.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function RecentPayments({ payments }: { payments: Payment[] }) {
  const router = useRouter();
  return (
    <Card title="Recent payments">
      {payments.length === 0 ? (
        <p className="text-sm text-slate-400">No payments yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {payments.map((p) => (
            <li
              key={p.id}
              onClick={() => router.push(`/invoices/${p.invoiceId}`)}
              className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-slate-50"
            >
              <span className="min-w-0 truncate text-slate-700">
                {p.method}
              </span>
              <span className="shrink-0 text-slate-500">
                {formatCurrency(p.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function RecentMaintenance({
  requests,
}: {
  requests: MaintenanceRequest[];
}) {
  const router = useRouter();
  return (
    <Card title="Recent maintenance">
      {requests.length === 0 ? (
        <p className="text-sm text-slate-400">No requests yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {requests.map((r) => (
            <li
              key={r.id}
              onClick={() => router.push(`/maintenance/${r.id}`)}
              className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-slate-50"
            >
              <span className="min-w-0 truncate text-slate-700">
                {r.title}
              </span>
              <span className="shrink-0 text-slate-400">
                {formatDate(r.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
