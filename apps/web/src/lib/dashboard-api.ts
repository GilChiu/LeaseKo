import { apiFetch } from "./api";
import type { DashboardSummary, OccupancyMetrics, RevenueMetrics } from "./types";

export async function getSummary(token: string): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>("/dashboard/summary", { token });
}

export async function getOccupancy(token: string): Promise<OccupancyMetrics> {
  return apiFetch<OccupancyMetrics>("/dashboard/occupancy", { token });
}

export async function getRevenue(
  token: string,
  options: { year?: number; month?: number } = {},
): Promise<RevenueMetrics> {
  const params = new URLSearchParams();
  if (options.year !== undefined) params.set("year", String(options.year));
  if (options.month !== undefined) params.set("month", String(options.month));
  const query = params.toString();
  return apiFetch<RevenueMetrics>(
    `/dashboard/revenue${query ? `?${query}` : ""}`,
    { token },
  );
}
