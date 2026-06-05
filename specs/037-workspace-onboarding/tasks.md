# Tasks: Workspace Onboarding

**Input**: Design documents from `specs/037-workspace-onboarding/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ui-states.md ✅

**Tests**: No automated tests — manual verification via quickstart.md scenarios.

**Organization**: All 4 user stories are delivered by a single 3-line change to `apps/web/src/app/(dashboard)/layout.tsx`. The implementation task covers US1–US4; subsequent phases verify each story independently.

## Format: `[ID] [P?] [Story] Description`

- **[Story]**: US1=create workspace | US2=switch workspace | US3=persistent re-login | US4=visible in header
- File paths relative to `apps/web/src/`

---

## Phase 1: Setup

> No new project structure, no new dependencies. `@clerk/nextjs` is already installed. Proceeding directly to implementation.

---

## Phase 2: Foundational

> No foundational prerequisites. The single layout change is both the foundation and the implementation. Proceeding directly to Phase 3.

---

## Phase 3: User Story 1 — Create First Workspace (Priority: P1) 🎯 MVP

**Goal**: A new user with no workspace sees a workspace control in the dashboard header and can create their workspace without leaving the app. After creation they are taken to `/properties` and the 403 banner is gone.

**Independent Test**: Sign in as a brand new user. Verify the workspace control is visible in the header. Create a workspace. Verify redirect to `/properties` and no 403 banner.

### Implementation for User Story 1

- [X] T001 [US1] Update `app/(dashboard)/layout.tsx` — change the import on line 1 from `import { UserButton } from "@clerk/nextjs"` to `import { UserButton, OrganizationSwitcher } from "@clerk/nextjs"`; inside the header's `<div className="ml-auto flex items-center gap-4 text-sm text-slate-500">`, add `<OrganizationSwitcher hidePersonal afterCreateOrganizationUrl="/properties" afterSelectOrganizationUrl="/properties" />` immediately before the existing `<UserButton afterSignOutUrl="/sign-in" />`; no other changes to the file

**Checkpoint**: Run `pnpm build`. Verify `/properties` route still builds. Verify no TypeScript errors.

---

## Phase 4: User Story 2 — Switch Between Workspaces (Priority: P2)

**Goal**: A user belonging to multiple workspaces can switch between them from the header. Switching redirects to `/properties` with the new workspace's data.

**Independent Test**: Sign in as a user with two workspaces. Open the workspace control, switch to the second workspace. Verify redirect to `/properties` and data reflects the second workspace.

### Implementation for User Story 2

> US2 is fully delivered by T001 (`afterSelectOrganizationUrl="/properties"` handles the redirect). This phase verifies it.

- [X] T002 [US2] Verify workspace switching in `app/(dashboard)/layout.tsx` — confirm `afterSelectOrganizationUrl="/properties"` is set on `<OrganizationSwitcher />`; test by signing in as a user with two orgs, switching orgs, and verifying the redirect to `/properties`; if the prop is missing, add it

**Checkpoint**: Switching workspace redirects to `/properties`. Header shows the newly selected workspace name.

---

## Phase 5: User Story 3 — Persistent Workspace on Re-login (Priority: P3)

**Goal**: A returning user's workspace is automatically active on re-login — no re-selection required.

**Independent Test**: Sign in, activate workspace, sign out, sign back in. Verify workspace is immediately active and `/properties` shows no 403 banner.

### Implementation for User Story 3

> US3 is handled entirely by Clerk's session management — no code required. This phase verifies the behaviour.

- [X] T003 [US3] Verify persistent workspace session — sign in with an existing workspace, sign out via `<UserButton />`, sign back in; confirm workspace is automatically restored and `/properties` shows no 403 banner; no code change is needed if it works correctly — Clerk restores org session from the JWT automatically

**Checkpoint**: Re-login restores workspace without re-selection.

---

## Phase 6: User Story 4 — Workspace Visible in Header at All Times (Priority: P4)

**Goal**: The active workspace name is always visible in the header. Both workspace control and user button appear without overlap at standard desktop widths.

**Independent Test**: Sign in with an active workspace. Navigate to Dashboard, then Properties. Verify workspace name visible in header on both pages with no overlap.

### Implementation for User Story 4

> US4 is delivered by T001. This phase verifies the layout contract.

- [X] T004 [US4] Verify header layout in `app/(dashboard)/layout.tsx` — confirm `<OrganizationSwitcher />` renders to the left of `<UserButton />`; confirm both are inside the `flex items-center gap-4` container; verify at standard desktop width (≥ 1024px) neither control overlaps or overflows; if the gap is insufficient, adjust the `gap-*` Tailwind class on the parent div

**Checkpoint**: Both controls visible, no overlap, workspace name shown on all dashboard pages.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T005 [P] Run `pnpm lint` in `apps/web` and fix any linting errors in modified files
- [X] T006 [P] Run `pnpm typecheck` and confirm no new TypeScript errors
- [X] T007 Run `pnpm build` and confirm the full monorepo build succeeds

---

## Dependencies & Execution Order

### Phase Dependencies

- **T001 (Phase 3)**: No prerequisites — start immediately
- **T002–T004 (Phases 4–6)**: Depend on T001 — verify after implementation
- **T005–T007 (Polish)**: Run after T001 is complete

### Parallel Opportunities

```text
T001 (sole implementation task)
  ↓
T002, T003, T004 — all verify different aspects of T001; can verify in any order
  ↓
T005, T006 — run in parallel (lint + typecheck)
  ↓
T007 (build — after lint and typecheck pass)
```

---

## Implementation Strategy

### MVP (T001 only)

1. Make the 3-line change in `layout.tsx`
2. Start `pnpm dev`
3. Sign in as new user — verify workspace control visible
4. Create workspace — verify redirect to `/properties`, no 403

**T001 delivers all 4 user stories in one change.** T002–T004 are verification steps.

### Notes

- `hidePersonal` is critical — without it, users can select "Personal Account" (no orgId) which produces a 403 error on all data pages
- `afterCreateOrganizationUrl` and `afterSelectOrganizationUrl` both point to `"/properties"` — this is the primary data surface and the most logical landing page after any org context change
- The layout remains a Server Component after this change — `OrganizationSwitcher` is a Clerk Client Component imported into a Server Component, which is valid in Next.js App Router
- No changes to middleware, types, API, or any backend file
