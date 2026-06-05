# Implementation Plan: Workspace Onboarding

**Branch**: `feature/workspace-onboarding` | **Date**: 2026-06-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/037-workspace-onboarding/spec.md`

## Summary

Add `<OrganizationSwitcher />` from `@clerk/nextjs` to the dashboard header, left of the existing `<UserButton />`. Configure it with `hidePersonal={true}`, `afterCreateOrganizationUrl="/properties"`, and `afterSelectOrganizationUrl="/properties"`. This single change satisfies all four user stories: workspace creation, workspace switching, persistent session, and persistent header visibility. One file modified, zero files created, no new dependencies.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 LTS
**Primary Dependencies**: Next.js 14 (App Router), `@clerk/nextjs` v5, Tailwind CSS
**Storage**: N/A — no data changes
**Testing**: Manual verification via quickstart.md scenarios
**Target Platform**: Web browser; desktop-first layout
**Project Type**: Next.js App Router frontend in pnpm monorepo
**Constraints**: No business logic in frontend; no new dependencies; layout must remain a Server Component
**Scale/Scope**: 1 file modified, ~3 LOC change

## Constitution Check

**Architecture**

- [x] No business logic added to Next.js frontend — `OrganizationSwitcher` is a Clerk-managed UI component
- [x] Backend tenant scoping unchanged — orgId still comes from the verified JWT only
- [x] No cross-module dependencies introduced

**Multi-Tenancy (CRITICAL)**

- [x] `hidePersonal={true}` prevents the personal account (no orgId) from being selectable — eliminates the 403 source
- [x] `tenantId` derivation unchanged — always from JWT `orgId`, never from client input

**Authentication & Authorization**

- [x] Clerk JWT verification unchanged — `OrganizationSwitcher` uses Clerk's session management internally
- [x] No new routes, no new guards

**Data Layer**

- [x] No database access — purely frontend component addition
- [x] No new API endpoints

**API & Async**

- [x] No new endpoints
- [x] No async operations added

**Security**

- [x] No secrets in frontend code
- [x] `hidePersonal` prevents users from accidentally entering a 403 state by choosing a context with no orgId

## Project Structure

### Documentation (this feature)

```text
specs/037-workspace-onboarding/
├── plan.md               ← this file
├── research.md           ← Phase 0: key decisions
├── data-model.md         ← Phase 1: component change diagram
├── quickstart.md         ← Phase 1: verification scenarios
├── contracts/
│   └── ui-states.md      ← Phase 1: header layout + prop contract
└── tasks.md              ← Phase 2 (/speckit-tasks — not yet created)
```

### Source Code Changes

```text
apps/web/src/
  app/(dashboard)/
    layout.tsx            ← MODIFY: import OrganizationSwitcher, add to header
```

**No other files change.**

## Complexity Tracking

> No violations. Minimal change, full constitution compliance.

---

## Phase 0: Research

See [research.md](./research.md). Key decisions:

| Decision | Choice | Key Reason |
|---|---|---|
| Component | `OrganizationSwitcher` from `@clerk/nextjs` | Already installed; handles all 4 user stories in one component |
| Redirect props | `afterCreateOrganizationUrl` + `afterSelectOrganizationUrl` = `"/properties"` | Zero custom navigation code |
| `hidePersonal` | `true` | Prevents 403 by blocking the personal-account (no-orgId) context |
| Scope | 1 file, ~3 LOC | Smallest possible change |

---

## Phase 1: Design Artifacts

See:
- [data-model.md](./data-model.md)
- [contracts/ui-states.md](./contracts/ui-states.md)
- [quickstart.md](./quickstart.md)

### Exact Change to `layout.tsx`

**Add import**:
```tsx
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
```

**Replace header content**:
```tsx
// Before
<div className="ml-auto flex items-center gap-4 text-sm text-slate-500">
  <UserButton afterSignOutUrl="/sign-in" />
</div>

// After
<div className="ml-auto flex items-center gap-4 text-sm text-slate-500">
  <OrganizationSwitcher
    hidePersonal
    afterCreateOrganizationUrl="/properties"
    afterSelectOrganizationUrl="/properties"
  />
  <UserButton afterSignOutUrl="/sign-in" />
</div>
```
