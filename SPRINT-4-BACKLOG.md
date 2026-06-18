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

## User Story 18.1

As a landlord, I want to record payments so that rent collection is tracked.

### Tasks

- [ ] Create Payment Prisma model
- [ ] Add tenantId relation
- [ ] Add invoiceId relation
- [ ] Create PaymentMethod enum
- [ ] Create PaymentStatus enum
- [ ] Create Prisma migration
- [ ] Define Payment domain entity
- [ ] Define Payment repository interface
- [ ] Implement PrismaPaymentRepository
- [ ] Create RecordPayment use case
- [ ] Create RecordPayment DTO
- [ ] Create POST /api/v1/payments endpoint
- [ ] Add Swagger documentation
- [ ] Add validation rules
- [ ] Add tests

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

## User Story 18.2

As a landlord, I want invoices marked paid automatically.

### Tasks

- [ ] Create payment allocation logic
- [ ] Update invoice status automatically
- [ ] Add tests

### Acceptance Criteria

- Fully paid invoices become PAID
- Partially paid invoices remain PENDING

---

## User Story 18.3

As a landlord, I want payment history.

### Tasks

- [ ] Create ListPayments use case
- [ ] Create GET /api/v1/payments endpoint
- [ ] Add filters
- [ ] Add pagination
- [ ] Add Swagger documentation
- [ ] Add tests

### Acceptance Criteria

- Tenant-scoped payment history
- Searchable by invoice and tenant

---

# 🔵 EPIC 19: Maintenance Requests

## User Story 19.1

As a tenant manager, I want maintenance tickets so issues can be tracked.

### Tasks

- [ ] Create MaintenanceRequest Prisma model
- [ ] Add tenantId relation
- [ ] Add propertyId relation
- [ ] Add unitId relation
- [ ] Create MaintenanceStatus enum
- [ ] Create MaintenancePriority enum
- [ ] Create Prisma migration
- [ ] Define MaintenanceRequest domain entity
- [ ] Define repository interface
- [ ] Implement PrismaMaintenanceRepository
- [ ] Create CreateMaintenanceRequest use case
- [ ] Create DTO
- [ ] Create POST /api/v1/maintenance endpoint
- [ ] Add Swagger documentation
- [ ] Add tests

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

## User Story 19.2

As a landlord, I want maintenance ticket management.

### Tasks

- [ ] Create UpdateMaintenanceStatus use case
- [ ] Create PATCH /api/v1/maintenance/:id/status endpoint
- [ ] Create ListMaintenanceRequests use case
- [ ] Create GET /api/v1/maintenance endpoint
- [ ] Add filters
- [ ] Add tests

### Acceptance Criteria

- Maintenance workflow fully tracked
- Tenant-scoped access enforced

---

# 🔵 EPIC 20: Dashboard Analytics

## User Story 20.1

As a landlord, I want occupancy analytics.

### Tasks

- [ ] Create OccupancyMetrics use case
- [ ] Create GET /api/v1/dashboard/occupancy endpoint
- [ ] Calculate occupancy rate
- [ ] Add tests

### Metrics

- Total properties
- Total units
- Occupied units
- Vacant units
- Occupancy percentage

---

## User Story 20.2

As a landlord, I want revenue analytics.

### Tasks

- [ ] Create RevenueMetrics use case
- [ ] Create GET /api/v1/dashboard/revenue endpoint
- [ ] Calculate monthly revenue
- [ ] Calculate outstanding balances
- [ ] Add tests

### Metrics

- Monthly revenue
- Collected rent
- Outstanding invoices
- Overdue invoices

---

## User Story 20.3

As a landlord, I want dashboard summary cards.

### Tasks

- [ ] Create DashboardSummary use case
- [ ] Create GET /api/v1/dashboard/summary endpoint
- [ ] Aggregate occupancy + revenue metrics
- [ ] Add tests

---

# 🔵 EPIC 21: Frontend Billing & Maintenance

## User Story 21.1

As a landlord, I want invoice management screens.

### Tasks

- [ ] Invoice list page
- [ ] Invoice details page
- [ ] Create invoice page
- [ ] Status badges
- [ ] Filters
- [ ] API integration

---

## User Story 21.2

As a landlord, I want payment management screens.

### Tasks

- [ ] Payment list page
- [ ] Record payment form
- [ ] Payment history view
- [ ] API integration

---

## User Story 21.3

As a landlord, I want maintenance screens.

### Tasks

- [ ] Maintenance list page
- [ ] Maintenance details page
- [ ] Create maintenance ticket page
- [ ] Status workflow UI
- [ ] API integration

---

## User Story 21.4

As a landlord, I want analytics dashboards.

### Tasks

- [ ] Dashboard KPI cards
- [ ] Revenue charts
- [ ] Occupancy charts
- [ ] Recent activity widgets

---

# 🔵 EPIC 22: Sprint 4 Documentation & Testing

## User Story 22.1

As a developer, I want billing APIs documented.

### Tasks

- [ ] Swagger tags for Invoices
- [ ] Swagger tags for Payments
- [ ] Document DTOs
- [ ] Document responses
- [ ] Document errors

---

## User Story 22.2

As a developer, I want maintenance APIs documented.

### Tasks

- [ ] Swagger tags for Maintenance
- [ ] Document DTOs
- [ ] Document responses
- [ ] Document errors

---

## User Story 22.3

As a developer, I want billing and maintenance logic tested.

### Tasks

- [ ] Invoice use case tests
- [ ] Payment use case tests
- [ ] Invoice generation tests
- [ ] Maintenance workflow tests
- [ ] Revenue calculation tests
- [ ] Cross-tenant access tests

---

# ✅ SPRINT 4 DEFINITION OF DONE

- [x] Invoice CRUD implemented
- [ ] Recurring invoice generation implemented
- [ ] Payment tracking implemented
- [ ] Automatic invoice status updates implemented
- [ ] Maintenance request workflow implemented
- [ ] Occupancy analytics implemented
- [ ] Revenue analytics implemented
- [ ] Dashboard summary implemented
- [ ] Frontend invoice screens working
- [ ] Frontend payment screens working
- [ ] Frontend maintenance screens working
- [ ] Dashboard analytics screens working
- [ ] Swagger documentation updated
- [ ] Tests cover billing, maintenance, and analytics
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