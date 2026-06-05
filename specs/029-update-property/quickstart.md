# Quickstart: Update Property

**Feature**: 029-update-property

---

## Testing the Endpoint (Swagger UI)

1. Start: `pnpm dev` (or `pnpm db:up` first)
2. Open `http://localhost:3000/api/docs`
3. Authorize with a Clerk JWT
4. Create a property with `POST /properties`, note the `id`
5. Find `PATCH /properties/{id}` under the **Properties** tag
6. Try it out — send `{ "name": "Updated Name" }`
7. Expect `200` with the full updated property object and a new `updatedAt` timestamp

---

## Testing Edge Cases

**Empty payload rejection:**
```json
{}
```
→ Expect `400` with "At least one field must be provided"

**Cross-tenant isolation:**
1. Create a property as Landlord A, note its `id`
2. Authenticate as Landlord B
3. Send `PATCH /properties/{id}` with `{ "name": "Hijack" }`
4. Expect `404` — identical to a non-existent property

**tenantId in body (must be silently rejected):**
```json
{ "name": "Valid Name", "tenantId": "org_other_tenant" }
```
→ Expect `400` (ValidationPipe rejects unknown fields) — `tenantId` is not a recognized body field

---

## Running Unit Tests

```powershell
pnpm --filter @leaseKo/api test
```

Look for:
- `UpdatePropertyUseCase > returns the updated property on success`
- `UpdatePropertyUseCase > throws NotFoundException when update returns null (not-found)`
- `UpdatePropertyUseCase > throws NotFoundException when update returns null (cross-tenant)`
- `UpdatePropertyUseCase > calls update with exact id, tenantId, and input`

---

## Validation Commands

```powershell
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @leaseKo/api test
```
