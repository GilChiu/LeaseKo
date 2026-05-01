# Frontend Interface Contracts: Next.js Web App Setup

**Feature**: `003-nextjs-web-setup`
**Date**: 2026-05-02

This feature is a frontend scaffold — it does not introduce new API endpoints. The contracts defined here are the **frontend-facing interfaces** that the web app exposes to developers building new features: the API client contract, the environment contract, and the UI component contracts.

---

## Contract 1: API Client — `apiFetch`

**Location**: `apps/web/src/lib/api.ts`
**Consumer**: All feature modules in `src/features/`, route files in `src/app/`

### Signature

```typescript
apiFetch<T = unknown>(path: string, options?: RequestInit & { token?: string }): Promise<T>
```

### Behaviour

| Scenario | Outcome |
|----------|---------|
| 2xx response | Parses body as JSON, returns typed `T` |
| Non-2xx response | Throws `ApiError` with `status` and `message` from the parsed response body |
| Network failure | Propagates the native `TypeError` from `fetch` |
| `token` provided | Injects `Authorization: Bearer <token>` header |
| `token` absent | Sends request without Authorization header |

### `ApiError` Class

```typescript
class ApiError extends Error {
  status: number;
  constructor(status: number, message: string);
}
```

### Usage Example

```typescript
// Public call
const health = await apiFetch<{ status: string }>('/health');

// Authenticated call (Epic 2)
const me = await apiFetch<MeResponse>('/me', { token: clerkToken });
```

### Contract Rules

- `path` is relative — never includes the base URL. Callers write `/health`, not `http://localhost:3001/api/v1/health`.
- The base URL prefix `${API_URL}/api/v1` is always prepended inside `apiFetch`.
- Callers MUST catch `ApiError` and display user-friendly error messages.
- Callers MUST NOT construct `Authorization` headers manually — pass `token` to `apiFetch`.

---

## Contract 2: Environment Configuration — `env.ts`

**Location**: `apps/web/src/lib/env.ts`
**Consumer**: `api.ts`, future Clerk setup code

### Exports

```typescript
export const API_URL: string;            // NEXT_PUBLIC_API_URL (required)
export const CLERK_PUBLISHABLE_KEY: string; // NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (optional)
```

### Behaviour

- If `NEXT_PUBLIC_API_URL` is not set, throws `Error` at module load time with message:
  `"NEXT_PUBLIC_API_URL is required. Add it to apps/web/.env.local"`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` defaults to empty string `""` if not set — Epic 2 will validate it as required.

### Contract Rules

- No component, feature, or route file accesses `process.env` directly.
- All env var access goes through named exports from `env.ts`.
- Adding a new env var means: add to `.env.example`, add validation in `env.ts`, export the constant.

---

## Contract 3: Button Component

**Location**: `apps/web/src/components/ui/button.tsx`

```typescript
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}
```

**Variant styles**:
- `primary`: solid background (brand color via Tailwind), white text
- `secondary`: outline border, brand color text
- `ghost`: no background or border, brand color text

---

## Contract 4: Card Component

**Location**: `apps/web/src/components/ui/card.tsx`

```typescript
interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}
```

Renders a bordered, rounded container with optional title text. All padding and typography via Tailwind.

---

## Contract 5: Input Component

**Location**: `apps/web/src/components/ui/input.tsx`

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
}
```

Renders a standard `<input>` with optional label above and error message below. Extends all native `<input>` attributes. Error state applies an error border color via Tailwind.

---

## Notes

- These contracts define the **stable interfaces** for the scaffold. Feature implementations in later epics import from these contracts — they should not need to change the interface shapes.
- `apiFetch` is the only approved path for backend communication from the frontend. No direct `fetch()` calls in feature code.
- UI components are intentionally minimal — they are starting points, not a complete design system. Epic 5+ (UI Polish) will expand them.
