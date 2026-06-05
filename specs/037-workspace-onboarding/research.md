# Research: Workspace Onboarding

**Feature**: `specs/037-workspace-onboarding/spec.md`
**Date**: 2026-06-05

---

## Decision Log

### 1. Implementation Approach — OrganizationSwitcher Component

**Decision**: Add Clerk's `<OrganizationSwitcher />` component to the dashboard header. Configure `afterCreateOrganizationUrl="/properties"` and `afterSelectOrganizationUrl="/properties"`.

**Rationale**:
- `@clerk/nextjs` is already installed in `apps/web`. No new dependency needed.
- `OrganizationSwitcher` handles all four requirements in one component: display current org, create new org, list all member orgs, switch between orgs.
- The post-action redirect props (`afterCreateOrganizationUrl`, `afterSelectOrganizationUrl`) satisfy FR-003 and FR-006 without custom navigation code.
- Persistent org restoration on re-login (FR-009) is handled automatically by Clerk — the org session is stored in the JWT and restored on next sign-in. No code required.

**Alternatives Considered**:
- Custom org creation form: rejected — far more code for identical functionality; Clerk's built-in UI is polished and matches the spec exactly.
- `CreateOrganization` component only: rejected — covers creation but not switching; spec requires both.

---

### 2. Placement in Layout

**Decision**: Insert `<OrganizationSwitcher />` inside the existing header, to the left of `<UserButton />`, with a flex gap between them.

**Rationale**:
- The dashboard layout (`(dashboard)/layout.tsx`) already has a header flex row with `<UserButton />` on the right.
- Placing the switcher left of UserButton follows standard SaaS patterns (workspace/org selector left, user account right).
- The layout is a Server Component — importing a Client Component from Clerk is valid in Next.js App Router.
- No new layout files, no new components needed.

---

### 3. `hidePersonal` Flag

**Decision**: Set `hidePersonal={true}` on `<OrganizationSwitcher />`.

**Rationale**:
- Clerk's `OrganizationSwitcher` by default shows a "Personal Account" option alongside org options.
- LeaseKo's architecture requires an org (tenantId) for all data access — a personal account has no `orgId` and would produce the 403 error.
- Hiding the personal account option prevents users from accidentally switching to a context that cannot work in LeaseKo.

---

### 4. No Changes to Backend, Schema, or Auth

**Decision**: This feature touches only `apps/web/src/app/(dashboard)/layout.tsx`. No backend, no schema, no guards, no middleware.

**Rationale**:
- The backend already enforces org-scoped data via the JWT `orgId`. Nothing changes there.
- Clerk middleware already protects all dashboard routes. No changes needed.
- The spec's FR-011 (member users can activate a workspace) is already handled by Clerk's session management.

---

## Summary Table

| Decision | Choice | Key Reason |
|---|---|---|
| Component | `OrganizationSwitcher` from `@clerk/nextjs` | Already installed; handles create + switch + display |
| Post-action redirect | `afterCreateOrganizationUrl="/properties"` + `afterSelectOrganizationUrl="/properties"` | Satisfies FR-003 and FR-006 with zero custom code |
| Placement | Header, left of UserButton | Standard SaaS convention |
| `hidePersonal` | `true` | Prevents 403 by hiding the non-org context option |
| Scope | 1 file modified, 0 files created | Minimal blast radius |
