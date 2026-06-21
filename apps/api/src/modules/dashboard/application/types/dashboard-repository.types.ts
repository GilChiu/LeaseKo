export interface OccupancyCounts {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
}

export interface RevenueWindow {
  start: Date;
  end: Date;
}

export interface RevenueAmounts {
  monthlyRevenue: number;
  collectedRent: number;
  outstandingAmount: number;
  outstandingCount: number;
  overdueAmount: number;
  overdueCount: number;
}
