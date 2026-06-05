import { UnitStatus } from './entities/unit.entity';

/**
 * ALLOWED_TRANSITIONS — permitted status changes for the Unit lifecycle.
 *
 * Domain rules (NON-NEGOTIABLE):
 * - INACTIVE is a terminal state: no transitions out are permitted.
 * - A same-status update is a no-op (handled by the use case before this table is consulted).
 * - Any transition not listed here is rejected with HTTP 422.
 */
export const ALLOWED_TRANSITIONS: Record<UnitStatus, UnitStatus[]> = {
  AVAILABLE: ['OCCUPIED', 'MAINTENANCE', 'INACTIVE'],
  OCCUPIED: ['AVAILABLE', 'MAINTENANCE'],
  MAINTENANCE: ['AVAILABLE', 'INACTIVE'],
  INACTIVE: [],
};
