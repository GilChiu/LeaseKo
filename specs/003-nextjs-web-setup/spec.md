# Feature Specification: Next.js Web App Setup

**Feature Branch**: `003-nextjs-web-setup`
**Created**: 2026-05-02
**Status**: Draft

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Developer Can Run and Build the Web App (Priority: P1)

A developer clones the repository, runs `pnpm dev` from the monorepo root, and the Next.js frontend starts at `http://localhost:3000`. They see a landing page. They also run `pnpm build` and it compiles successfully. Tailwind CSS utility classes render correctly in the browser.

**Why this priority**: If the app does not start and build, nothing else in the frontend can be developed or verified. A clean, buildable foundation is the entry requirement for all subsequent frontend work.

**Independent Test**: Run `pnpm --filter @leaseKo/web dev` from the repo root. Navigate to `http://localhost:3000`. Confirm the landing page renders. Run `pnpm --filter @leaseKo/web build` and confirm exit code 0 with no TypeScript or Tailwind errors.

**Acceptance Scenarios**:

1. **Given** the monorepo is set up and `pnpm install` has run, **When** a developer runs `pnpm --filter @leaseKo/web dev`, **Then** the Next.js dev server starts at `http://localhost:3000` with no errors.
2. **Given** the app is running, **When** a developer views the landing page, **Then** a styled page renders using Tailwind CSS utility classes — not unstyled HTML.
3. **Given** the full monorepo, **When** `pnpm build` is run from the root, **Then** the `@leaseKo/web` app compiles successfully as part of the Turborepo pipeline with zero TypeScript errors.
4. **Given** the app source code, **When** `pnpm --filter @leaseKo/web lint` is run, **Then** it completes with no ESLint errors.

---

### User Story 2 - Developer Can Call the NestJS Backend via a Centralized API Client (Priority: P1)

A developer building a new frontend feature imports the API client and makes a request to the NestJS backend. Error handling is consistent — they don't write custom `fetch` wrappers per feature. When Clerk is integrated later, they add the auth token in one place only.

**Why this priority**: Without a centralized API client, every feature file rolls its own `fetch` call with inconsistent error handling. This causes technical debt that is expensive to clean up once features exist. The client must exist from day one.

**Independent Test**: Import `apiFetch` from `src/lib/api.ts` in a test component, call `GET /health` against the running NestJS backend (at `http://localhost:3001/api/v1/health`), and confirm the response JSON is returned. Confirm that if the backend is unavailable, a structured error object is returned rather than an unhandled exception.

**Acceptance Scenarios**:

1. **Given** the API client is imported, **When** a developer calls `apiFetch('/health')`, **Then** the request is sent to the configured backend URL with no hardcoded URL in the component.
2. **Given** the backend returns a non-2xx status, **When** the API client receives the response, **Then** it throws or returns a structured error object with `status` and `message` — not a raw `Response` object.
3. **Given** `NEXT_PUBLIC_API_URL` is set in `.env.local`, **When** the API client is used, **Then** all requests use that URL as the base — changing the env var changes all requests.
4. **Given** Clerk is integrated in a future feature, **When** a developer needs to attach a JWT, **Then** they add it in a single location in `api.ts` — not in each feature's fetch call.

---

### User Story 3 - Frontend Feature Scaffold Is Ready for New Features (Priority: P2)

A developer starting work on a new frontend feature (e.g., Properties) navigates to the `src/features/properties/` directory and finds a pre-created folder with the expected structure. They also know exactly where to put shared components, types, and styles. No time is spent deciding folder conventions.

**Why this priority**: Consistent structure prevents the "where does this go?" problem as the team grows. It must be established before the first feature is built, not retrofitted afterward.

**Independent Test**: Check that the following directories exist in `apps/web/src/`: `features/` (with subdirs for auth, dashboard, properties, units, tenants, leases, payments), `components/ui/`, `components/layout/`, `components/forms/`, `types/`, `styles/`. Each directory should contain at minimum a `.gitkeep` or a placeholder file.

**Acceptance Scenarios**:

1. **Given** the repository is cloned, **When** a developer navigates to `apps/web/src/features/`, **Then** they find subdirectories for all planned domain features: auth, dashboard, properties, units, tenants, leases, payments.
2. **Given** a developer needs to add a shared UI component, **When** they look for the right directory, **Then** `src/components/ui/` exists with at least one example component (`Button`) as a template.
3. **Given** a developer needs to share types across features, **When** they look for the right directory, **Then** `src/types/` exists and can be used for shared TypeScript interfaces and types.
4. **Given** the `src/styles/globals.css` file, **When** a developer opens it, **Then** it contains Tailwind CSS directives (`@tailwind base; @tailwind components; @tailwind utilities;`) and is imported by the root layout.

---

### User Story 4 - Dashboard Route Placeholder Exists for Protected Content (Priority: P2)

A developer visits `http://localhost:3000/dashboard` and sees a placeholder page — not a 404. The page is served under a `(dashboard)` route group with its own layout, ready to have Clerk's `<ClerkProvider>` and auth checks added in Epic 2. The auth route group is similarly scaffolded.

**Why this priority**: Route groups and layout files define the auth/unauth boundary. If they are added post-Clerk, the restructuring is complex. Pre-scaffolding them now costs very little and saves significant restructuring effort in Epic 2.

**Independent Test**: Navigate to `http://localhost:3000/dashboard` with the dev server running. Confirm a page renders (not 404). Inspect the file tree and confirm the `(dashboard)/layout.tsx` and `(auth)/layout.tsx` files exist and are distinct from the root layout.

**Acceptance Scenarios**:

1. **Given** the Next.js app is running, **When** a developer navigates to `/dashboard`, **Then** a placeholder dashboard page renders with no 404 error.
2. **Given** the file structure, **When** a developer inspects `src/app/(dashboard)/`, **Then** a `layout.tsx` file exists that will become the protected layout wrapper in Epic 2.
3. **Given** the file structure, **When** a developer inspects `src/app/(auth)/`, **Then** a `layout.tsx` file exists as the placeholder for the Clerk-provided auth layout.
4. **Given** the dashboard page renders, **When** it is viewed in the browser, **Then** it is styled with Tailwind CSS and includes a comment noting where Clerk auth protection will be added.

---

### Edge Cases

- What if `NEXT_PUBLIC_API_URL` is not set? The `env.ts` validation must throw a clear error at startup — not silently call `undefined` as the base URL.
- What if a developer imports Prisma directly into a frontend file? There is no package-level guard (Prisma is not installed in `apps/web`), but the architecture rules in this spec document it as a violation.
- What if Tailwind CSS is added but the `globals.css` is not imported in the root layout? Tailwind classes would silently have no effect — the root layout must import it.
- What if the Next.js app is started before `pnpm install` is run? The standard pnpm workspace error message will explain the missing dependency — no special handling needed.
- What if the app is deployed to production with `NODE_ENV=production` and the API URL points to localhost? This is an environment configuration mistake — `env.ts` should validate the URL is present but cannot validate its target.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The Next.js app MUST start successfully in development mode within the Turborepo monorepo using `pnpm dev`.
- **FR-002**: The Next.js app MUST build successfully using `pnpm build` with zero TypeScript errors.
- **FR-003**: Tailwind CSS MUST be installed and configured — Tailwind utility classes MUST render correctly on all pages.
- **FR-004**: The app MUST use the App Router with a `src/app/` directory structure.
- **FR-005**: The root layout MUST import global CSS containing Tailwind directives.
- **FR-006**: A landing page MUST exist at the root route (`/`) and render with basic Tailwind styling.
- **FR-007**: A dashboard placeholder page MUST exist and be reachable at `/dashboard`.
- **FR-008**: Route groups `(auth)` and `(dashboard)` MUST exist with their own `layout.tsx` files, distinct from the root layout.
- **FR-009**: A centralized API client MUST exist at `src/lib/api.ts` that: uses `NEXT_PUBLIC_API_URL` as the base URL, handles non-2xx responses as structured errors, and supports a single extension point for adding the Clerk JWT in the future.
- **FR-010**: An environment configuration module MUST exist at `src/lib/env.ts` that: reads `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, throws a clear error at startup if required values are missing.
- **FR-011**: A `.env.example` file MUST exist at `apps/web/` documenting all required environment variables with placeholder values.
- **FR-012**: The following folder structure MUST be pre-created: `src/features/{auth,dashboard,properties,units,tenants,leases,payments}/`, `src/components/{ui,layout,forms}/`, `src/types/`, `src/styles/`.
- **FR-013**: Minimal placeholder UI components MUST exist: `Button`, `Card`, and `Input` in `src/components/ui/` — each styled with Tailwind CSS.
- **FR-014**: The app MUST contain NO business logic, NO Prisma imports, NO direct database access, and NO tenant authorization logic.
- **FR-015**: The app MUST pass `pnpm lint` with no errors.

### Key Entities

- **API Client**: The singleton fetch wrapper in `src/lib/api.ts`. Owns the base URL, default headers, and error serialization. All feature modules call this — never raw `fetch`.
- **Environment Config**: The validated environment object exported from `src/lib/env.ts`. All env vars are read once here; no `process.env` access outside this module.
- **Route Group Layout**: Next.js App Router layout files for `(auth)` and `(dashboard)` groups. Define the auth boundary and shared UI shell. No auth logic in this phase — that is Epic 2.
- **Feature Directory**: A named subdirectory under `src/features/` corresponding to a bounded domain (properties, units, tenants, etc.). Each is self-contained: components, hooks, and types local to that feature live here.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `pnpm --filter @leaseKo/web dev` starts the dev server at `http://localhost:3000` with zero console errors within 15 seconds.
- **SC-002**: `pnpm --filter @leaseKo/web build` exits with code 0 and zero TypeScript errors in a clean build.
- **SC-003**: All Tailwind CSS utility classes applied to the landing page and dashboard placeholder render visually as expected — no unstyled elements attributable to a missing Tailwind configuration.
- **SC-004**: A new developer can locate the correct directory for a new frontend feature (e.g., `src/features/properties/`) without reading any documentation beyond the folder tree.
- **SC-005**: Changing `NEXT_PUBLIC_API_URL` in `.env.local` causes all API requests to use the new base URL — zero individual fetch calls need to be updated.
- **SC-006**: `pnpm --filter @leaseKo/web lint` completes with zero errors and zero warnings on the initial scaffold.

---

## Assumptions

- The monorepo foundation (Feature 001) is complete: `apps/web/` already exists with a basic Next.js setup including `package.json`, `tsconfig.json`, root `layout.tsx`, and `page.tsx`. This feature **extends** that scaffold rather than replacing it.
- Tailwind CSS v3.x is used (compatible with Next.js 14 App Router). Tailwind v4 is not used — it requires a different configuration approach and is not yet stable enough for this project.
- The `@leaseKo/config` package provides shared ESLint and TypeScript configs — Tailwind CSS configuration lives in `apps/web/` itself (not in the shared config package) since Tailwind is frontend-only.
- Clerk is NOT fully integrated in this feature. Route groups and layouts are pre-scaffolded as structural placeholders. Full Clerk integration (`ClerkProvider`, `auth()`, JWKS verification) is Epic 2.
- The API client does not implement authentication in this phase — the extension point for the Clerk JWT is commented/typed but not wired.
- No page in this feature has content representing real business data — all pages are placeholders or minimal demos of the scaffold.
- `pnpm` is the only package manager used. `npm` and `yarn` commands are not applicable.
- The Turborepo `dev` task for `apps/web` is already defined in `turbo.json` from Feature 001 — no changes to `turbo.json` are required.
