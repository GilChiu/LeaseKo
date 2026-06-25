# 🧾 PRODUCT BACKLOG — PROPERTY MANAGEMENT SAAS

---

# 🏁 SPRINT 4 — PAYMENTS, MAINTENANCE & ANALYTICS

## 🎯 Sprint Goal

Allow landlords to bill tenants, collect rent payments, track maintenance requests, and view business analytics while maintaining strict tenant isolation.

---

# 🔵 EPIC 17: Billing & Invoicing

## User Story 17.1 ✅

As a landlord, I want to generate invoices so that tenants can be billed for rent.

**Completed**: 2026-06-18 | lint ✅ typecheck ✅ build ✅ tests ✅ (250/250)

### Tasks

- [x] Create Invoice Prisma model
- [x] Add tenantId relation
- [x] Add leaseId relation
- [x] Add tenantContactId relation
- [x] Create InvoiceStatus enum
- [x] Add indexes
- [x] Create Prisma migration
- [x] Define Invoice domain entity
- [x] Define Invoice repository interface
- [x] Implement PrismaInvoiceRepository
- [x] Create CreateInvoice use case
- [x] Create CreateInvoice DTO
- [x] Create POST /api/v1/invoices endpoint
- [x] Add Swagger documentation
- [x] Add validation rules
- [x] Add unit tests

### Invoice Fields

- id
- tenantId
- leaseId
- tenantContactId
- invoiceNumber
- dueDate
- amount
- notes
- status
- createdAt
- updatedAt

### InvoiceStatus

- DRAFT
- PENDING
- PAID
- OVERDUE
- VOID

### Acceptance Criteria

- Invoice belongs to tenant workspace
- Invoice linked to lease
- Invoice linked to tenant contact
- Invoice amount must be positive

---

## User Story 17.2 ✅

As a landlord, I want recurring rent invoices generated automatically.

**Completed**: 2026-06-18 | Use case implemented with tests; BullMQ wiring deferred

### Tasks

- [x] Create GenerateRecurringInvoices use case
- [ ] Create invoice scheduler (deferred — BullMQ wiring)
- [ ] Add BullMQ job (deferred — BullMQ wiring)
- [x] Add monthly invoice generation logic
- [x] Add tests

### Acceptance Criteria

- Monthly rent invoices generated automatically
- Duplicate invoices prevented

---

## User Story 17.3 ✅

As a landlord, I want to view invoices.

**Completed**: 2026-06-18 | lint ✅ typecheck ✅ build ✅ tests ✅ (250/250)

### Tasks

- [x] Create ListInvoices use case
- [x] Create GET /api/v1/invoices endpoint
- [x] Add filtering
- [x] Add pagination
- [x] Add Swagger documentation
- [x] Add tests

### Acceptance Criteria

- Tenant-scoped invoice listing
- Filtering by status supported

---

## User Story 17.4 ✅

As a landlord, I want to view invoice details.

**Completed**: 2026-06-18 | lint ✅ typecheck ✅ build ✅ tests ✅ (250/250)

### Tasks

- [x] Create GetInvoiceById use case
- [x] Create GET /api/v1/invoices/:id endpoint
- [x] Add Swagger documentation
- [x] Add tests

### Acceptance Criteria

- Invoice lookup is tenant-scoped

---

# 🔵 EPIC 18: Payment Tracking

## User Story 18.1 ✅

As a landlord, I want to record payments so that rent collection is tracked.

**Completed**: 2026-06-21 | lint ✅ typecheck ✅ build ✅ tests ✅

### Tasks

- [x] Create Payment Prisma model
- [x] Add tenantId relation
- [x] Add invoiceId relation
- [x] Create PaymentMethod enum
- [x] Create PaymentStatus enum
- [x] Create Prisma migration
- [x] Define Payment domain entity
- [x] Define Payment repository interface
- [x] Implement PrismaPaymentRepository
- [x] Create RecordPayment use case
- [x] Create RecordPayment DTO
- [x] Create POST /api/v1/payments endpoint
- [x] Add Swagger documentation
- [x] Add validation rules
- [x] Add tests

### PaymentMethod

- CASH
- BANK_TRANSFER
- GCASH
- MAYA
- CHECK
- OTHER

### PaymentStatus

- PENDING
- COMPLETED
- FAILED
- REFUNDED

### Acceptance Criteria

- Payments linked to invoices
- Partial payments supported
- Overpayments prevented

---

## User Story 18.2 ✅

As a landlord, I want invoices marked paid automatically.

**Completed**: 2026-06-21 | Integrated into RecordPaymentUseCase; InvoiceRepository.updateStatus added

### Tasks

- [x] Create payment allocation logic
- [x] Update invoice status automatically
- [x] Add tests

### Acceptance Criteria

- Fully paid invoices become PAID
- Partially paid invoices remain PENDING

---

## User Story 18.3 ✅

As a landlord, I want payment history.

**Completed**: 2026-06-21 | lint ✅ typecheck ✅ build ✅ tests ✅

### Tasks

- [x] Create ListPayments use case
- [x] Create GET /api/v1/payments endpoint
- [x] Add filters
- [x] Add pagination
- [x] Add Swagger documentation
- [x] Add tests

### Acceptance Criteria

- Tenant-scoped payment history
- Searchable by invoice and tenant

---

# 🔵 EPIC 19: Maintenance Requests

## User Story 19.1 ✅

As a tenant manager, I want maintenance tickets so issues can be tracked.

**Completed**: 2026-06-22 | lint ✅ typecheck ✅ build ✅ tests ✅

### Tasks

- [x] Create MaintenanceRequest Prisma model
- [x] Add tenantId relation
- [x] Add propertyId relation
- [x] Add unitId relation
- [x] Create MaintenanceStatus enum
- [x] Create MaintenancePriority enum
- [x] Create Prisma migration
- [x] Define MaintenanceRequest domain entity
- [x] Define repository interface
- [x] Implement PrismaMaintenanceRepository
- [x] Create CreateMaintenanceRequest use case
- [x] Create DTO
- [x] Create POST /api/v1/maintenance endpoint
- [x] Add Swagger documentation
- [x] Add tests

### MaintenanceStatus

- OPEN
- IN_PROGRESS
- RESOLVED
- CLOSED

### MaintenancePriority

- LOW
- MEDIUM
- HIGH
- URGENT

---

## User Story 19.2 ✅

As a landlord, I want maintenance ticket management.

**Completed**: 2026-06-22 | lint ✅ typecheck ✅ build ✅ tests ✅

### Tasks

- [x] Create UpdateMaintenanceStatus use case
- [x] Create PATCH /api/v1/maintenance/:id/status endpoint
- [x] Create ListMaintenanceRequests use case
- [x] Create GET /api/v1/maintenance endpoint
- [x] Add filters
- [x] Add tests

### Acceptance Criteria

- Maintenance workflow fully tracked
- Tenant-scoped access enforced

---

# 🔵 EPIC 20: Dashboard Analytics

## User Story 20.1 ✅

As a landlord, I want occupancy analytics.

**Completed**: 2026-06-22 | lint ✅ typecheck ✅ build ✅ tests ✅

### Tasks

- [x] Create OccupancyMetrics use case
- [x] Create GET /api/v1/dashboard/occupancy endpoint
- [x] Calculate occupancy rate
- [x] Add tests

### Metrics

- Total properties
- Total units
- Occupied units
- Vacant units
- Occupancy percentage

---

## User Story 20.2 ✅

As a landlord, I want revenue analytics.

**Completed**: 2026-06-22 | lint ✅ typecheck ✅ build ✅ tests ✅

### Tasks

- [x] Create RevenueMetrics use case
- [x] Create GET /api/v1/dashboard/revenue endpoint
- [x] Calculate monthly revenue
- [x] Calculate outstanding balances
- [x] Add tests

### Metrics

- Monthly revenue
- Collected rent
- Outstanding invoices
- Overdue invoices

---

## User Story 20.3 ✅

As a landlord, I want dashboard summary cards.

**Completed**: 2026-06-22 | lint ✅ typecheck ✅ build ✅ tests ✅

### Tasks

- [x] Create DashboardSummary use case
- [x] Create GET /api/v1/dashboard/summary endpoint
- [x] Aggregate occupancy + revenue metrics
- [x] Add tests

---

# 🔵 EPIC 21: Frontend Billing & Maintenance

## User Story 21.1 ✅

As a landlord, I want invoice management screens.

**Completed**: 2026-06-22 | lint ✅ typecheck ✅ build ✅

### Tasks

- [x] Invoice list page
- [x] Invoice details page
- [x] Create invoice page
- [x] Status badges
- [x] Filters
- [x] API integration

---

## User Story 21.2 ✅

As a landlord, I want payment management screens.

**Completed**: 2026-06-22 | lint ✅ typecheck ✅ build ✅

### Tasks

- [x] Payment list page
- [x] Record payment form
- [x] Payment history view
- [x] API integration

---

## User Story 21.3 ✅

As a landlord, I want maintenance screens.

**Completed**: 2026-06-22 | lint ✅ typecheck ✅ build ✅

### Tasks

- [x] Maintenance list page
- [x] Maintenance details page
- [x] Create maintenance ticket page
- [x] Status workflow UI
- [x] API integration

---

## User Story 21.4 ✅

As a landlord, I want analytics dashboards.

**Completed**: 2026-06-22 | lint ✅ typecheck ✅ build ✅ (charts via Recharts)

### Tasks

- [x] Dashboard KPI cards
- [x] Revenue charts
- [x] Occupancy charts
- [x] Recent activity widgets

---

# 🔵 EPIC 22: Sprint 4 Documentation & Testing

## User Story 22.1 ✅

As a developer, I want billing APIs documented.

**Completed**: 2026-06-22 | Swagger tag descriptions added; DTO/response/error docs verified complete

### Tasks

- [x] Swagger tags for Invoices
- [x] Swagger tags for Payments
- [x] Document DTOs
- [x] Document responses
- [x] Document errors

---

## User Story 22.2 ✅

As a developer, I want maintenance APIs documented.

**Completed**: 2026-06-22 | Swagger tag descriptions added; DTO/response/error docs verified complete

### Tasks

- [x] Swagger tags for Maintenance
- [x] Document DTOs
- [x] Document responses
- [x] Document errors

---

## User Story 22.3 ✅

As a developer, I want billing and maintenance logic tested.

**Completed**: 2026-06-22 | 96 API tests pass (incl. cross-tenant isolation) | lint ✅ typecheck ✅ build ✅

### Tasks

- [x] Invoice use case tests
- [x] Payment use case tests
- [x] Invoice generation tests
- [x] Maintenance workflow tests
- [x] Revenue calculation tests
- [x] Cross-tenant access tests

---

# ✅ SPRINT 4 DEFINITION OF DONE

- [x] Invoice CRUD implemented
- [ ] Recurring invoice generation implemented
- [x] Payment tracking implemented
- [x] Automatic invoice status updates implemented
- [x] Maintenance request workflow implemented
- [x] Occupancy analytics implemented
- [x] Revenue analytics implemented
- [x] Dashboard summary implemented
- [x] Frontend invoice screens working
- [x] Frontend payment screens working
- [x] Frontend maintenance screens working
- [x] Dashboard analytics screens working
- [x] Swagger documentation updated
- [x] Tests cover billing, maintenance, and analytics
- [ ] Lint, typecheck, build, and tests pass

---

# 🧭 NEXT SPRINT PREVIEW (SPRINT 5)

## Epics

- Notifications
- Document Management
- Tenant Portal
- Owner Portal

## Features

- Email notifications
- SMS notifications
- Lease document uploads
- Tenant self-service portal
- Owner reporting portal