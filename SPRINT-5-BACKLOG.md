Based on your completed Sprint 4, the next logical milestone is to transform LeaseKo from a landlord management system into a collaborative platform by adding **Tenant Portal, Notifications, Documents, and Owner Portal**. This follows naturally from the foundation you've already built (Properties → Units → Contacts → Leases → Invoices → Payments → Maintenance). Your uploaded Sprint 4 backlog confirms this progression. 

```
# 🧾 PRODUCT BACKLOG — PROPERTY MANAGEMENT SAAS

---

# 🏁 SPRINT 5 — TENANT PORTAL, DOCUMENTS & NOTIFICATIONS

## 🎯 Sprint Goal

Enable tenants to access their own portal, view leases and invoices, submit maintenance requests, receive notifications, and securely access documents while property owners gain richer reporting capabilities.

---

# 🔵 EPIC 23: Tenant Portal Authentication

## User Story 23.1 ✅

As a tenant, I want my own account so I can securely access my rental information.

**Completed**: 2026-06-29 | lint ✅ typecheck ✅ build ✅ tests ✅ (renters = standalone Clerk identities bound to a TenantContact via our own invitation token; no Clerk Backend API). Email delivery deferred to Epic 26.

### Tasks

- [x] Extend authentication for tenant users
- [x] Add TenantUser Prisma model
- [x] Link TenantUser to TenantContact
- [x] Create invitation flow
- [x] Create account activation flow
- [x] Prevent duplicate accounts (unique tenantContactId + unique clerkUserId)
- [x] Add Swagger documentation
- [x] Add unit tests

### Acceptance Criteria

- Tenant can create account from invitation
- One account per tenant contact
- Tenant cannot access landlord resources

---

## User Story 23.2 ✅

As a tenant, I want secure login.

**Completed**: 2026-06-29 | lint ✅ typecheck ✅ build ✅ tests ✅

### Tasks

- [x] Configure Clerk tenant role (backend-resolved role `tenant_user`; renters are not Clerk org members)
- [x] Restrict tenant routes (`@TenantPortal()` decorator → `/tenant/*`)
- [x] Add authorization middleware (ClerkJwtGuard resolves role + isolates landlord vs tenant)
- [x] Add tests (guard spec covers role resolution + isolation)

### Acceptance Criteria

- Tenant only accesses own data
- Landlord and tenant permissions isolated

---

# 🔵 EPIC 24: Tenant Portal

## User Story 24.1 ✅

As a tenant, I want to view my lease.

**Completed**: 2026-07-12 | lint ✅ typecheck ✅ build ✅ unit tests ✅ (renter's ACTIVE lease resolved from verified `tenantContactId`; `GET /tenant/lease`, `@TenantPortal()`-gated).

### Tasks

- [x] Create GetTenantLease use case
- [x] Create GET /tenant/lease endpoint
- [x] Add Swagger docs
- [x] Add tests

---

## User Story 24.2 ✅

As a tenant, I want to view invoices.

**Completed**: 2026-07-12 | lint ✅ typecheck ✅ build ✅ unit tests ✅ (scoped by `tenantContactId`; `GET /tenant/invoices` with page/limit + status filter).

### Tasks

- [x] Create ListTenantInvoices use case
- [x] Create GET /tenant/invoices endpoint
- [x] Add filters
- [x] Add tests

---

## User Story 24.3 ✅

As a tenant, I want to view payment history.

**Completed**: 2026-07-12 | lint ✅ typecheck ✅ build ✅ unit tests ✅ (payments resolved via the renter's invoices so only own payments are visible; `GET /tenant/payments`).

### Tasks

- [x] Create ListTenantPayments use case
- [x] Create GET /tenant/payments endpoint
- [x] Add tests

---

## User Story 24.4 ✅

As a tenant, I want to submit maintenance requests.

**Completed**: 2026-07-12 | lint ✅ typecheck ✅ build ✅ unit tests ✅ (unit/property derived from the renter's ACTIVE lease server-side — never from the body). Photo upload deferred to Epic 25, which owns storage integration (mirrors Epic 23 deferring email to Epic 26).

### Tasks

- [x] Create POST /tenant/maintenance endpoint
- [x] Restrict maintenance to assigned unit
- [ ] Upload maintenance photos → **deferred to Epic 25 (storage integration)**
- [x] Add tests

---

## User Story 24.5 ✅

As a tenant, I want a dashboard.

**Completed**: 2026-07-12 | lint ✅ typecheck ✅ build ✅ unit tests ✅ (`GET /tenant/dashboard` composes lease + outstanding balance + recent payments + unit-scoped maintenance). Delivered as the backend summary API; the renter UI cards/widgets live in Epic 28 (Frontend Tenant Portal).

### Tasks

- [x] Dashboard summary
- [x] Current lease card (API)
- [x] Outstanding balance card (API)
- [x] Recent payments (API)
- [x] Maintenance status widget (API)

---

# 🔵 EPIC 25: Document Management

## User Story 25.1

As a landlord, I want to upload lease documents.

### Tasks

- [ ] Create Document Prisma model
- [ ] Add tenantId relation
- [ ] Add leaseId relation
- [ ] Add storage integration
- [ ] Upload endpoint
- [ ] Download endpoint
- [ ] Delete endpoint
- [ ] Swagger documentation
- [ ] Unit tests

---

## User Story 25.2

As a tenant, I want to download my lease documents.

### Tasks

- [ ] Tenant document endpoint
- [ ] Authorization checks
- [ ] Download permissions
- [ ] Tests

---

# 🔵 EPIC 26: Notifications

## User Story 26.1

As a landlord, I want automatic invoice reminders.

### Tasks

- [ ] Notification Prisma model
- [ ] Notification repository
- [ ] Email service abstraction
- [ ] Invoice reminder scheduler
- [ ] BullMQ integration
- [ ] Tests

---

## User Story 26.2

As a tenant, I want maintenance updates.

### Tasks

- [ ] Maintenance status notifications
- [ ] Email templates
- [ ] Notification history
- [ ] Tests

---

## User Story 26.3

As a landlord, I want lease notifications.

### Tasks

- [ ] Lease expiration reminders
- [ ] Upcoming renewal reminders
- [ ] Notification scheduler
- [ ] Tests

---

# 🔵 EPIC 27: Owner Portal & Reporting

## User Story 27.1

As a property owner, I want executive dashboards.

### Tasks

- [ ] Revenue summary
- [ ] Occupancy trends
- [ ] Maintenance metrics
- [ ] Payment metrics
- [ ] Dashboard APIs
- [ ] Frontend widgets

---

## User Story 27.2

As a landlord, I want downloadable reports.

### Tasks

- [ ] Monthly revenue report
- [ ] Occupancy report
- [ ] Maintenance report
- [ ] Invoice report
- [ ] CSV export
- [ ] PDF export

---

# 🔵 EPIC 28: Frontend Tenant Portal

## User Story 28.1

As a tenant, I want my portal UI.

### Tasks

- [ ] Tenant login page
- [ ] Tenant dashboard
- [ ] Lease page
- [ ] Invoice page
- [ ] Payment history page
- [ ] Maintenance page

---

## User Story 28.2

As a tenant, I want document access.

### Tasks

- [ ] Document list
- [ ] Document preview
- [ ] Download button
- [ ] Empty states
- [ ] Loading states

---

# 🔵 EPIC 29: Documentation & Testing

## User Story 29.1

As a developer, I want Tenant Portal APIs documented.

### Tasks

- [ ] Swagger tags
- [ ] DTO documentation
- [ ] Response documentation
- [ ] Error documentation

---

## User Story 29.2

As a developer, I want Notification APIs documented.

### Tasks

- [ ] Swagger documentation
- [ ] Notification schemas
- [ ] Examples

---

## User Story 29.3

As a developer, I want comprehensive testing.

### Tasks

- [ ] Tenant portal tests
- [ ] Document tests
- [ ] Notification tests
- [ ] Authorization tests
- [ ] Integration tests
- [ ] E2E tests

---

# ✅ SPRINT 5 DEFINITION OF DONE

- [x] Tenant authentication implemented
- [x] Tenant portal fully functional (backend API; UI in Epic 28)
- [x] Tenant can view lease
- [x] Tenant can view invoices
- [x] Tenant can view payments
- [x] Tenant can submit maintenance requests
- [ ] Lease documents uploaded and downloadable
- [ ] Notification system implemented
- [ ] Automatic invoice reminders working
- [ ] Lease reminders working
- [ ] Owner reporting dashboards implemented
- [ ] CSV exports implemented
- [ ] PDF exports implemented
- [ ] Swagger documentation updated
- [ ] Tests cover tenant portal, notifications, and documents
- [ ] Lint, typecheck, build, and tests pass

---

# 🧭 NEXT SPRINT PREVIEW (SPRINT 6)

## Epics

- Public Marketing Website
- Subscription & Billing (Stripe)
- Organization Administration
- Audit Logs
- System Settings

## Features

- Landing page
- Pricing page
- Stripe subscriptions
- Organization management
- User invitations
- Roles & permissions
- Audit logs
- Activity timeline
- Global settings
```

This sequence is a natural evolution toward a production-ready SaaS: Sprint 5 introduces collaboration (tenants and owners), while Sprint 6 can focus on commercializing the product with subscriptions, administration, and operational features.
