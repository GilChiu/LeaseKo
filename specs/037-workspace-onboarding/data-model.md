# Data Model: Workspace Onboarding

**Feature**: `specs/037-workspace-onboarding/spec.md`
**Date**: 2026-06-05

---

## No Schema Changes

This feature is purely a frontend UI addition. No Prisma schema changes, no new database tables, no new API endpoints, no new TypeScript types.

---

## Component Change

**File modified**: `apps/web/src/app/(dashboard)/layout.tsx`

**Change**: Add `<OrganizationSwitcher />` to the existing header flex row, left of `<UserButton />`.

### Header Before

```
[header]
  └── [ml-auto flex row]
        └── <UserButton />
```

### Header After

```
[header]
  └── [ml-auto flex row gap-4]
        ├── <OrganizationSwitcher />   ← NEW
        └── <UserButton />
```

---

## Workspace Control States

The `OrganizationSwitcher` renders differently based on the user's org membership:

| User State | What the Control Shows |
|---|---|
| No active org | "Create organisation" prompt (primary CTA) |
| Active org, member of 1 | Org name + settings access |
| Active org, member of 2+ | Org name + dropdown list of all orgs |

All state rendering is handled internally by the Clerk component — no custom state logic required.

---

## Files Changed

| File | Change |
|---|---|
| `apps/web/src/app/(dashboard)/layout.tsx` | MODIFY — import `OrganizationSwitcher`, add to header with `hidePersonal`, `afterCreateOrganizationUrl`, `afterSelectOrganizationUrl` props |
