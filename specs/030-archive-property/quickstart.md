# Quickstart: Archive Property

**Feature**: 030-archive-property

---

## Testing the Endpoint (Swagger UI)

1. Start: `pnpm dev` (or `pnpm db:up` first)
2. Open `http://localhost:3000/api/docs`
3. Authorize with a Clerk JWT
4. Create a property with `POST /properties`, note the `id`
5. Find `DELETE /properties/{id}` under the **Properties** tag
6. Try it out → **Execute**
7. Expect `204 No Content` (empty body)
8. Call `GET /properties` → archived property must not appear
9. Call `GET /properties/{id}` → expect `404`

---

## Testing Idempotency

1. Archive a property (step above) → `204`
2. Archive the same property again → `204` (no error)
3. Archive a third time → `204` (still no error)

---

## Testing Tenant Isolation

1. Create a property as Landlord A, note its `id`
2. Authenticate as Landlord B
3. Call `DELETE /properties/{id}` with Landlord B's JWT
4. Expect `404` — identical to a non-existent ID
5. Authenticate as Landlord A → call `GET /properties/{id}` → property still exists (`200`)

---

## Testing Post-Archive Visibility

After archiving a property:
- `GET /properties` — property must not appear, total count must decrease by 1
- `GET /properties/{id}` — must return `404`
- `PATCH /properties/{id}` — must return `404`

---

## Running Unit Tests

```powershell
pnpm --filter @leaseKo/api test
```

Look for:
- `ArchivePropertyUseCase > calls softDelete with exact id and tenantId`
- `ArchivePropertyUseCase > returns void when softDelete returns true (active property)`
- `ArchivePropertyUseCase > returns void when softDelete returns true (idempotent re-archive)`
- `ArchivePropertyUseCase > throws NotFoundException when softDelete returns false (not-found)`
- `ArchivePropertyUseCase > throws NotFoundException when softDelete returns false (cross-tenant)`

---

## Validation Commands

```powershell
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @leaseKo/api test
```
