# Tasks: Next.js Web App Setup

**Input**: Design documents from `/specs/003-nextjs-web-setup/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: No automated tests in this feature — manual browser verification per quickstart.md.

**Organization**: Tasks grouped by user story. US1 (Tailwind + build) and US2 (API client) are P1 and can largely be worked in parallel after setup. US3 (folder scaffold) and US4 (route placeholders) are P2.

## Format: `[ID] [P?] [Story?] Description — file path`

- **[P]**: Can run in parallel (touches different files, no blocking dependencies)
- **[US#]**: Which user story this task belongs to
- Exact file paths are included in every task description

---

## Phase 1: Setup

**Purpose**: Add Tailwind CSS v3 devDependencies to `apps/web` and run install. Prerequisite for all Tailwind-dependent tasks.

- [X] T001 Add `tailwindcss@^3`, `postcss`, and `autoprefixer` to `devDependencies` in `apps/api/../web/package.json`, then run `pnpm install` from the repo root — `apps/web/package.json`

**Checkpoint**: `node_modules/tailwindcss` exists in `apps/web`. TypeScript can import from `tailwindcss/types`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Tailwind configuration files and the env validation module. Everything in US1 and US2 depends on these. Env validation must exist before `api.ts` can reference it, and Tailwind config must exist before any component uses utility classes.

- [X] T002 [P] Create `tailwind.config.ts` with `content: ['./src/**/*.{ts,tsx}']` and empty `theme.extend` — `apps/web/tailwind.config.ts`
- [X] T003 [P] Create `postcss.config.mjs` exporting `{ plugins: { tailwindcss: {}, autoprefixer: {} } }` — `apps/web/postcss.config.mjs`
- [X] T004 [P] Create `src/styles/globals.css` with the three Tailwind directives: `@tailwind base; @tailwind components; @tailwind utilities;` — `apps/web/src/styles/globals.css`
- [X] T005 [P] Create `src/lib/env.ts`: read `NEXT_PUBLIC_API_URL` (throw clear `Error` if missing) and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (default `""` if absent); export both as typed constants `API_URL` and `CLERK_PUBLISHABLE_KEY` — `apps/web/src/lib/env.ts`
- [X] T006 [P] Create `.env.example` with `NEXT_PUBLIC_API_URL=http://localhost:3001` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=` — `apps/web/.env.example`

**Checkpoint**: `tailwind.config.ts` and `postcss.config.mjs` exist. `env.ts` exports `API_URL`. `.env.example` documents both vars.

---

## Phase 3: User Story 1 — Developer Can Run and Build the Web App (Priority: P1) 🎯 MVP

**Goal**: App starts, landing page renders with Tailwind styling, `pnpm build` exits with code 0, `pnpm lint` passes.

**Independent Test**: `pnpm --filter @leaseKo/web dev` → open `http://localhost:3000` → styled landing page visible (not raw HTML). `pnpm --filter @leaseKo/web build` → exit code 0, zero TS errors. `pnpm --filter @leaseKo/web lint` → zero errors.

### Implementation for User Story 1

- [X] T007 [US1] Update root `layout.tsx` to: (1) add `import '../styles/globals.css'` at the top, (2) add basic Tailwind classes to `<html>` and `<body>` (e.g., `antialiased`, `min-h-screen`, `bg-white`), (3) keep existing metadata — `apps/web/src/app/layout.tsx`
- [X] T008 [US1] Update root `page.tsx` to: replace unstyled `<h1>LeaseKo</h1>` with a Tailwind-styled landing page that includes: a centered hero section, the LeaseKo name and tagline, a "Go to Dashboard" link, and a call-to-action button placeholder — `apps/web/src/app/page.tsx`

**Checkpoint**: `http://localhost:3000` shows a styled page. Tailwind classes are visually applied. `pnpm --filter @leaseKo/web build` passes. US1 acceptance scenarios 1–4 are all verifiable.

---

## Phase 4: User Story 2 — Centralized API Client (Priority: P1)

**Goal**: `apiFetch` is importable from `@/lib/api`, sends requests to the configured backend URL, throws `ApiError` on non-2xx, and has a `token` option for future Clerk JWT injection.

**Independent Test**: Import `apiFetch` in a page component, call `/health`, verify the health response JSON is returned. Remove `NEXT_PUBLIC_API_URL` from `.env.local` and verify the app throws a descriptive error on startup (from `env.ts`).

### Implementation for User Story 2

- [X] T009 [US2] Create `src/lib/api.ts` with: `ApiError` class (`status: number`, `message: string`), and exported `apiFetch<T>(path, options?)` function that prepends `${API_URL}/api/v1` to `path`, accepts optional `token` in options and injects `Authorization: Bearer <token>` header, parses 2xx responses as JSON returning `T`, parses non-2xx responses and throws `ApiError` — `apps/web/src/lib/api.ts`
- [X] T010 [P] [US2] Create `src/lib/utils.ts` with a `cn(...classes)` utility function that concatenates Tailwind class strings (simple string join — no `clsx` dependency yet) — `apps/web/src/lib/utils.ts`

**Checkpoint**: `apiFetch` can be imported and called. Passing a bad path throws `ApiError`. Omitting `NEXT_PUBLIC_API_URL` from env causes a startup error with a clear message. US2 acceptance scenarios 1–4 verifiable.

---

## Phase 5: User Story 3 — Frontend Feature Scaffold (Priority: P2)

**Goal**: All feature and component directories exist. `Button`, `Card`, and `Input` components are importable with Tailwind styling. `src/types/` and `src/styles/` are present.

**Independent Test**: Navigate the file tree and confirm all 7 feature dirs, 3 component dirs, `types/`, and `styles/` exist. Import `Button` in a page and confirm it renders with Tailwind classes applied.

### Implementation for User Story 3

- [X] T011 [P] [US3] Create placeholder directories with `.gitkeep` files for all feature folders: `src/features/auth/`, `src/features/dashboard/`, `src/features/properties/`, `src/features/units/`, `src/features/tenants/`, `src/features/leases/`, `src/features/payments/` — `apps/web/src/features/`
- [X] T012 [P] [US3] Create placeholder directories with `.gitkeep` files for: `src/components/layout/`, `src/components/forms/`, `src/types/` — `apps/web/src/`
- [X] T013 [P] [US3] Create `Button` component with `variant` (`primary`/`secondary`/`ghost`), `size` (`sm`/`md`/`lg`), `disabled`, `onClick`, `type`, and `className` props — all styled with Tailwind utility classes — `apps/web/src/components/ui/button.tsx`
- [X] T014 [P] [US3] Create `Card` component with optional `title` and `className` props — white background, rounded corners, shadow, padding — Tailwind only — `apps/web/src/components/ui/card.tsx`
- [X] T015 [P] [US3] Create `Input` component extending `React.InputHTMLAttributes<HTMLInputElement>` with optional `label` and `error` props — renders label above, input with border, error text below in red — Tailwind only — `apps/web/src/components/ui/input.tsx`

**Checkpoint**: All feature dirs exist. `Button`, `Card`, `Input` import cleanly. US3 acceptance scenarios 1–4 verifiable.

---

## Phase 6: User Story 4 — Dashboard and Auth Route Placeholders (Priority: P2)

**Goal**: `/dashboard` renders a placeholder page (not 404). `(auth)` and `(dashboard)` each have distinct `layout.tsx` files with Epic 2 comment placeholders. Dashboard layout includes a minimal UI shell.

**Independent Test**: Navigate to `http://localhost:3000/dashboard` — placeholder page renders. Inspect `src/app/(auth)/layout.tsx` — file exists with a comment about `ClerkProvider`. Inspect `src/app/(dashboard)/layout.tsx` — sidebar/nav shell is present with a comment about auth protection.

### Implementation for User Story 4

- [X] T016 [US4] Update `src/app/(auth)/layout.tsx` to: keep passing `{children}` through, add a comment block noting where `<ClerkProvider>` will be added in Epic 2, optionally add a centered auth-page wrapper div with Tailwind classes — `apps/web/src/app/(auth)/layout.tsx`
- [X] T017 [US4] Update `src/app/(dashboard)/layout.tsx` to: add a minimal sidebar/main-content shell using Tailwind (flex layout, sidebar placeholder div, main area), add a comment block noting where `auth()` redirect check will be added in Epic 2 — `apps/web/src/app/(dashboard)/layout.tsx`
- [X] T018 [US4] Create `src/app/(dashboard)/dashboard/page.tsx`: a Tailwind-styled dashboard placeholder showing the page title "Dashboard", a welcome message, and a comment indicating this is where tenant-scoped data widgets will appear in future epics — `apps/web/src/app/(dashboard)/dashboard/page.tsx`

**Checkpoint**: `/dashboard` returns 200, not 404. Both layout files have Epic 2 comment placeholders. US4 acceptance scenarios 1–4 verifiable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verify full build, lint, and TypeScript clean. Confirm no business logic crept in.

- [X] T019 Run `pnpm --filter @leaseKo/web build` and confirm zero TypeScript errors — `apps/web/`
- [X] T020 [P] Run `pnpm --filter @leaseKo/web lint` and confirm zero errors and zero warnings — `apps/web/`

**Final Checkpoint**: All 6 success criteria (SC-001 through SC-006) are met. Feature is ready to merge.

---

## Dependencies

```
T001 (pnpm install)
  ├─ T002 [P] tailwind.config.ts
  ├─ T003 [P] postcss.config.mjs
  ├─ T004 [P] globals.css
  ├─ T005 [P] env.ts ──────────────────────────────── T009 (api.ts imports env.ts)
  └─ T006 [P] .env.example

  T002 + T003 + T004 ──────────────────────────────── T007 (layout.tsx uses globals.css)
                                                         └─ T008 (page.tsx uses Tailwind)
  T005 ───────────────────────────────────────────── T009 (apiFetch uses API_URL)
  T009 ──────────────────────────────────────────── T010 [P] (utils.ts independent)

  T011 [P] feature dirs
  T012 [P] component/types dirs
  T013 [P] Button
  T014 [P] Card
  T015 [P] Input

  T016 [P] (auth) layout
  T017 [P] (dashboard) layout
  T018 (dashboard page — depends on T017 being wired)

  T019 build check (depends on all)
  T020 [P] lint check (depends on all)
```

**Story completion order**: Phase 3 (US1) and Phase 4 (US2) can run in parallel after Phase 2. Phase 5 (US3) and Phase 6 (US4) are independent of each other and of Phases 3–4.

---

## Parallel Execution Examples

### Within Phase 2
T002, T003, T004, T005, T006 are all independent — different files, touch different config systems.

### Phase 3 and Phase 4 in parallel
After T005 exists, `api.ts` (T009) can be written independently of layout/page updates (T007, T008).

### Phase 5 entirely parallel
T011–T015 all touch different files with no dependencies on each other.

### Phase 6 nearly parallel
T016 and T017 are independent. T018 should follow T017 (imports from the parent layout context) but can be drafted simultaneously.

---

## Implementation Strategy

**MVP scope**: Phases 1–4 (T001–T010)
- Delivers: Tailwind working, styled landing page, `pnpm build` green, `apiFetch` ready
- Validates: The full stack of US1 (build/run/lint) and US2 (API client) — the two P1 stories
- Unblocks: Any frontend feature that needs to make a backend API call

**Increment 2**: Phase 5 (T011–T015)
- Delivers: All feature directories + Button/Card/Input components
- Validates: US3 (scaffold readiness)

**Increment 3**: Phase 6 (T016–T018) + Phase 7 (T019–T020)
- Delivers: `/dashboard` route, auth/dashboard layout placeholders, full build/lint clean
- Closes: All 6 success criteria

**Total tasks**: 20
**By user story**:
- US1: 2 tasks (T007–T008)
- US2: 2 tasks (T009–T010)
- US3: 5 tasks (T011–T015)
- US4: 3 tasks (T016–T018)
- Setup/Foundation/Polish: 8 tasks (T001–T006, T019–T020)

**Parallel opportunities**: 10 identified (T002–T006 all parallel; T013–T015 all parallel; T016–T017 parallel; T019–T020 parallel)
