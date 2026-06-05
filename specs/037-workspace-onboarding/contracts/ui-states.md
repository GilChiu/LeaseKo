# UI Contract: Workspace Onboarding

**Feature**: `specs/037-workspace-onboarding/spec.md`
**Date**: 2026-06-05

---

## Header Layout Contract

The dashboard header MUST contain both controls, in this order (left to right):

```
[header — right-aligned]
  OrganizationSwitcher | UserButton
```

- Both controls are always visible when the user is signed in
- A visual gap separates the two controls (minimum 1rem)
- Neither control overflows or overlaps at standard desktop widths (≥ 1024px)

---

## OrganizationSwitcher Configuration Contract

| Prop | Value | Purpose |
|---|---|---|
| `hidePersonal` | `true` | Prevents display of "Personal Account" (no orgId → 403) |
| `afterCreateOrganizationUrl` | `"/properties"` | Auto-redirects after workspace creation (FR-003) |
| `afterSelectOrganizationUrl` | `"/properties"` | Auto-redirects after workspace switch (FR-006) |

---

## State Outcomes Contract

| Trigger | Expected Outcome |
|---|---|
| New user opens header | OrganizationSwitcher visible with create-org prompt |
| User creates a workspace | Redirect to `/properties`; no 403 banner |
| User switches workspace | Redirect to `/properties`; data reflects new workspace |
| User signs out + back in | Active workspace restored; no re-selection step |
| User with 1 org views header | Org name visible; no switch list |
| User with 2+ orgs views header | Org name visible; dropdown lists all member orgs |
