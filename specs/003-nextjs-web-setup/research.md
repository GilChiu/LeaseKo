# Research: Next.js Web App Setup

**Feature**: `003-nextjs-web-setup`
**Date**: 2026-05-02
**Status**: Complete — all decisions resolved

---

## 1. Tailwind CSS v3 Installation in Next.js 14 App Router

**Decision**: Install `tailwindcss`, `postcss`, and `autoprefixer` as `devDependencies` in `apps/web/package.json`. Use `tailwind.config.ts` (TypeScript) and `postcss.config.mjs` (ESM). Content paths: `./src/**/*.{ts,tsx}`. Import `globals.css` from `src/styles/globals.css` at the top of `src/app/layout.tsx`.

**Rationale**: Next.js 14 has a built-in PostCSS pipeline — no webpack config or Babel plugin needed. `tailwind.config.ts` is consistent with the project's TypeScript-first setup. `postcss.config.mjs` is the default for Next.js 14 projects and avoids CommonJS/ESM interop friction. Content paths scoped to `./src/**/*.{ts,tsx}` cover all App Router files without over-scanning. Importing globals in the root layout ensures Tailwind's base/components/utilities layers load exactly once — not once per page.

**Tailwind v3 (not v4)**: v4 has a completely different configuration API (CSS-based config instead of `tailwind.config.ts`). It is not yet stable for production use and would require different setup steps. v3 is the established, well-documented default.

**Alternatives considered**:

- `tailwind.config.js` — works but inconsistent with TypeScript-first project.
- `postcss.config.js` (CJS) — also works but `.mjs` is cleaner with Next.js 14's ESM-leaning defaults.
- CSS Modules only — rejected; utility-first CSS is the project's standard (aligns with future component library work).

---

## 2. Environment Variable Validation

**Decision**: Manual validation module at `src/lib/env.ts`. Reads `process.env.NEXT_PUBLIC_*`, throws a descriptive `Error` if required values are missing, and exports the validated values as typed constants. Required: `NEXT_PUBLIC_API_URL`. Optional with default: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (empty string sentinel until Epic 2).

**Rationale**: For 1–2 `NEXT_PUBLIC_*` string vars, a 10-line validation module is functionally equivalent to a schema library with zero bundle cost. It runs at module load time (first import of `env.ts`) so the error surfaces immediately on startup — not silently as `undefined` deep inside a fetch call. The error message is explicit: `"NEXT_PUBLIC_API_URL is required. Add it to .env.local"`.

**Future consideration**: If env surface grows beyond 5 vars or includes non-string types (numbers, booleans, URLs requiring format validation), migrate to `zod` schema or `t3-env`. The migration is trivial — just replace the manual checks with a `z.object({...}).parse(process.env)`.

**Alternatives considered**:

- **Zod schema** — correct choice for many vars or complex types. Adds ~12KB. Overkill for 1–2 string vars at this stage.
- **t3-env** — best DX (type-safe, split server/client schemas, build-time checking). Appropriate when the env surface is large. Not warranted here.
- **No validation** — rejected; silent `undefined` base URL in production is a hard-to-debug failure mode.

---

## 3. Centralized API Client Pattern

**Decision**: Plain exported async function `apiFetch<T>(path, options?)` in `src/lib/api.ts`. Not a class, not a factory. Reads base URL from `env.ts`. Throws a typed `ApiError` class instance on non-2xx responses, with `status: number` and `message: string` matching the NestJS `ErrorResponseDto` shape. Accepts an optional `headers` override for future auth injection.

**JWT extension point design**: The API client does NOT read the Clerk JWT internally. The caller passes it in `options.headers['Authorization']`. This keeps `apiFetch` pure and works in both Server Components (where you call `auth().getToken()`) and Client Components (where you call `useAuth().getToken()`). In Epic 2, a thin wrapper `apiFetchAuthed` will call `apiFetch` with the token injected — one place to change.

**Error handling**: On non-2xx, attempt to parse the body as JSON (matching `{ statusCode, message, error }` from `ErrorResponseDto`). Fall back to status text. Throw `new ApiError(status, message)`. Callers catch this and display user-friendly messages.

**Alternatives considered**:

- **Class with constructor** — awkward in Server Components where module-level instantiation timing is unclear. No benefit over a plain function with one base URL.
- **Factory pattern** — adds indirection with no benefit. Warranted when you need multiple configured API instances; LeaseKo has one backend.
- **`axios`** — unnecessary dependency; `fetch` is native in Node 18+ and Next.js 14.
- **`swr`/`react-query` as the client** — these are data-fetching libraries that would _wrap_ `apiFetch`, not replace it. They belong in feature hooks, not in the base client.

---

## 4. Feature-Based Folder Structure

**Decision**: Domain features live under `src/features/<domain>/`. Each feature folder contains `components/`, `hooks/`, `api.ts`, and `types.ts` as it grows. Route files in `src/app/` import from `src/features/`. The `src/components/` directory holds only cross-feature shared UI primitives (Button, Card, Input, layout shells). Feature directories are pre-created with `.gitkeep` files so the structure is visible before implementation begins.

**Rationale**: App Router's `src/app/` directory has a fixed semantic — file names map to routes. Mixing domain components, hooks, and fetch logic into `app/` couples unrelated concerns to routing. Feature folders co-locate everything a domain needs. Deleting a feature is one folder delete. Adding a feature is one new folder with a known shape. The `src/components/` tree stays flat and domain-agnostic.

**Planned domains** (from spec and BACKLOG): `auth`, `dashboard`, `properties`, `units`, `tenants`, `leases`, `payments`. All 7 pre-created as empty directories.

**Alternatives considered**:

- **Atomic design** (atoms/molecules/organisms) — organizes by UI abstraction, not domain. "Where does PropertyCard go?" becomes ambiguous at scale.
- **Everything in `src/app/`** — Next.js allows co-locating non-route files in `app/`. Rejected; conflates routing structure with domain structure.
- **Flat `src/components/`** — no natural grouping for domain logic (hooks, API calls). Degrades as feature count grows.

---

## 5. Route Group Structure for Auth Boundary

**Decision**: Maintain the existing `(auth)` and `(dashboard)` route groups from Feature 001. Update their `layout.tsx` files to: (a) add Tailwind styling, (b) add comments marking where `ClerkProvider` and `auth()` checks will be inserted in Epic 2. The dashboard layout adds a minimal UI shell (sidebar placeholder, header placeholder) as the structural container for all dashboard pages.

**Rationale**: Route groups in Next.js App Router segment layouts without adding path segments. `(auth)` owns login/signup pages and will wrap them with Clerk's `<SignIn>` and `<SignUp>` components. `(dashboard)` owns all protected pages and will add the `auth()` server-side check in Epic 2. Pre-structuring these now means Epic 2 only adds logic to existing layout files — no restructuring required.

**Dashboard page**: A `dashboard/page.tsx` inside `(dashboard)/` renders at `/dashboard`. This is the canonical protected entry point. A `page.tsx` in `(dashboard)/` directly would also work but placing it in a named subdirectory (`dashboard/`) keeps the route explicit and aligns with future routes like `/dashboard/properties`, `/dashboard/units`, etc.

**Alternatives considered**:

- A single layout with conditional auth check — rejected; mixing public and protected layout in one file is fragile and hard to replace with Clerk's server-side patterns.
- `middleware.ts` for auth routing — this is Epic 2's approach (Clerk's `clerkMiddleware`). Not added in this feature to avoid prematurely committing to a specific Clerk configuration.
