# Data Model: Next.js Web App Setup

**Feature**: `003-nextjs-web-setup`
**Date**: 2026-05-02

---

## Scope

This feature introduces **no database tables, no Prisma schema changes, and no backend entities**. All data structures are frontend-only TypeScript types used for:

1. API response typing (mirroring backend DTOs)
2. Prop typing for UI components
3. Environment configuration shape

---

## Frontend Type Definitions

These are not persisted — they exist only as TypeScript interfaces for type safety in the frontend.

### ApiError

**Location**: `apps/web/src/lib/api.ts` (class)
**Purpose**: Thrown by `apiFetch` on non-2xx responses. Mirrors the NestJS `ErrorResponseDto` shape so frontend code can display consistent errors.

| Field     | Type     | Description                               |
| --------- | -------- | ----------------------------------------- |
| `status`  | `number` | HTTP status code from the API response    |
| `message` | `string` | Human-readable error message from the API |

---

### Environment Config

**Location**: `apps/web/src/lib/env.ts` (exported constants)
**Purpose**: Validated environment variables, read once at module load.

| Export                  | Type     | Required          | Description                                                                      |
| ----------------------- | -------- | ----------------- | -------------------------------------------------------------------------------- |
| `API_URL`               | `string` | Yes               | Base URL for the NestJS API (`NEXT_PUBLIC_API_URL`)                              |
| `CLERK_PUBLISHABLE_KEY` | `string` | No (empty in dev) | Clerk publishable key (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`) — required in Epic 2 |

---

### UI Component Props (shared primitives)

These are the prop shapes for the three placeholder components in `src/components/ui/`.

#### ButtonProps

| Prop        | Type                                  | Required                  | Description                 |
| ----------- | ------------------------------------- | ------------------------- | --------------------------- |
| `children`  | `React.ReactNode`                     | Yes                       | Button label or content     |
| `variant`   | `'primary' \| 'secondary' \| 'ghost'` | No (default: `'primary'`) | Visual style variant        |
| `size`      | `'sm' \| 'md' \| 'lg'`                | No (default: `'md'`)      | Button size                 |
| `disabled`  | `boolean`                             | No                        | Disabled state              |
| `onClick`   | `() => void`                          | No                        | Click handler               |
| `type`      | `'button' \| 'submit' \| 'reset'`     | No (default: `'button'`)  | HTML button type            |
| `className` | `string`                              | No                        | Additional Tailwind classes |

#### CardProps

| Prop        | Type              | Required | Description                 |
| ----------- | ----------------- | -------- | --------------------------- |
| `children`  | `React.ReactNode` | Yes      | Card content                |
| `className` | `string`          | No       | Additional Tailwind classes |
| `title`     | `string`          | No       | Optional card header title  |

#### InputProps

Extends `React.InputHTMLAttributes<HTMLInputElement>` plus:

| Prop        | Type     | Required | Description                            |
| ----------- | -------- | -------- | -------------------------------------- |
| `label`     | `string` | No       | Input label text                       |
| `error`     | `string` | No       | Error message text (shown below input) |
| `className` | `string` | No       | Additional Tailwind classes            |

---

## Notes

- No persisted data structures in this feature.
- The `ApiError` class mirrors `ErrorResponseDto` from Feature 002 (`{ statusCode, message, error? }`). The `status` field in `ApiError` maps to `statusCode` in the backend DTO — named `status` in the frontend for brevity.
- `CLERK_PUBLISHABLE_KEY` is treated as optional in this feature (empty string allowed) because Clerk is not wired up yet. Epic 2 will make it required.
- All UI component props follow React/TypeScript conventions — they extend HTML element attributes where appropriate so standard HTML attributes (e.g., `disabled`, `type`, `placeholder`) work without re-declaration.
