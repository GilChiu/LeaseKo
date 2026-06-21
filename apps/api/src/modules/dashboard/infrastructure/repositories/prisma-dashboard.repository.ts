import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { tenantFilter } from '../../../../common/utils/tenant-filter.util';
import { DashboardRepository } from '../../application/repositories/dashboard.repository';
import {
  OccupancyCounts,
  RevenueAmounts,
  RevenueWindow,
} from '../../application/types/dashboard-repository.types';

@Injectable()
export class PrismaDashboardRepository implements DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOccupancyCounts(tenantId: string): Promise<OccupancyCounts> {
    const [totalProperties, totalUnits, occupiedUnits, vacantUnits] =
      await this.prisma.$transaction([
        this.prisma.property.count({
          where: { ...tenantFilter(tenantId), deletedAt: null },
        }),
        this.prisma.unit.count({
          where: { ...tenantFilter(tenantId) },
        }),
        this.prisma.unit.count({
          where: { ...tenantFilter(tenantId), status: 'OCCUPIED' },
        }),
        this.prisma.unit.count({
          where: { ...tenantFilter(tenantId), status: 'AVAILABLE' },
        }),
      ]);

    return { totalProperties, totalUnits, occupiedUnits, vacantUnits };
  }

  async getRevenueAmounts(
    tenantId: string,
    window: RevenueWindow,
  ): Promise<RevenueAmounts> {
    const tenant = tenantFilter(tenantId);

    const [
      monthlyRevenueAgg,
      collectedRentAgg,
      outstandingAgg,
      outstandingCount,
      overdueAgg,
      overdueCount,
    ] = await this.prisma.$transaction([
      this.prisma.invoice.aggregate({
        where: {
          ...tenant,
          deletedAt: null,
          status: { in: ['PENDING', 'PAID', 'OVERDUE'] },
          dueDate: { gte: window.start, lt: window.end },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          ...tenant,
          deletedAt: null,
          status: 'COMPLETED',
          recordedAt: { gte: window.start, lt: window.end },
        },
        _sum: { amount: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          ...tenant,
          deletedAt: null,
          status: { in: ['PENDING', 'OVERDUE'] },
        },
        _sum: { amount: true },
      }),
      this.prisma.invoice.count({
        where: {
          ...tenant,
          deletedAt: null,
          status: { in: ['PENDING', 'OVERDUE'] },
        },
      }),
      this.prisma.invoice.aggregate({
        where: { ...tenant, deletedAt: null, status: 'OVERDUE' },
        _sum: { amount: true },
      }),
      this.prisma.invoice.count({
        where: { ...tenant, deletedAt: null, status: 'OVERDUE' },
      }),
    ]);

    return {
      monthlyRevenue: monthlyRevenueAgg._sum.amount?.toNumber() ?? 0,
      collectedRent: collectedRentAgg._sum.amount?.toNumber() ?? 0,
      outstandingAmount: outstandingAgg._sum.amount?.toNumber() ?? 0,
      outstandingCount,
      overdueAmount: overdueAgg._sum.amount?.toNumber() ?? 0,
      overdueCount,
    };
  }
}
