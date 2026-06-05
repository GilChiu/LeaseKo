# Feature Specification: Archive Property

**Feature Branch**: `030-archive-property`
**Created**: 2026-06-04
**Status**: Draft
**Input**: User description: "As a landlord I want to archive (soft-delete) a property so I can safely remove inactive records without permanently destroying data. The system should expose a DELETE /properties/:id endpoint that marks the property as archived by recording the deletion timestamp — the record is retained in the database but excluded from all future list and detail queries. The archive operation must be tenant-scoped: archiving a property that belongs to a different tenant must return 404, identical to a non-existent property. Archiving an already-archived property must be idempotent — it should succeed silently without error. Archiving a property that does not exist must return 404. A successful archive returns 204 No Content with no response body. The tenant context must come from the verified JWT only. The feature requires an ArchiveProperty use case, a DELETE /properties/:id endpoint, Swagger documentation, and unit tests covering: the successful archive case, the not-found case, the cross-tenant 404 case, and the already-archived idempotent case. Units that belong to the archived property are not affected in this story — that cascade behavior is deferred to the Unit Management epic. The spec must document this deferral explicitly so it is not forgotten."

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Landlord Archives an Inactive Property (Priority: P1)

An authenticated landlord has a property that is no longer in active use — a building they have sold, surrendered, or temporarily withdrawn from the rental market. They archive the property to remove it from their active workspace view. The property record is retained for historical purposes and can be reviewed by support staff if needed, but it no longer appears in their day-to-day operations.

**Why this priority**: The ability to remove inactive records is fundamental to keeping the workspace manageable. Without archiving, landlords with long histories accumulate stale data that clutters every list view. This is a table-stakes property management feature.

**Independent Test**: Can be fully tested by creating a property, archiving it, and then verifying that the property no longer appears in the property list and returns a not-found response when retrieved directly.

**Acceptance Scenarios**:

1. **Given** an authenticated landlord and an active property in their workspace, **When** they archive the property, **Then** the system marks it as archived and returns a success response with no body.
2. **Given** an authenticated landlord who has just archived a property, **When** they request their property list, **Then** the archived property no longer appears in the results.
3. **Given** an authenticated landlord who has just archived a property, **When** they request the property's details directly by ID, **Then** they receive a not-found response.
4. **Given** an unauthenticated request, **When** the archive endpoint is called, **Then** the request is rejected before any data is accessed.

---

### User Story 2 — Tenant Isolation: Cross-Tenant Archive Attempt (Priority: P1)

A landlord attempts to archive a property that belongs to a different tenant. The system must deny this silently — returning the same not-found response as for a non-existent property, revealing nothing about the other tenant's workspace.

**Why this priority**: Preventing cross-tenant data mutation is a security-critical requirement equal in importance to the happy path. A successful cross-tenant archive is a data integrity breach; a distinguishable error response is an information leak.

**Independent Test**: Can be fully tested by attempting to archive a property ID belonging to a different tenant and confirming the response is identical to attempting to archive a genuinely non-existent ID.

**Acceptance Scenarios**:

1. **Given** an authenticated landlord and a property ID belonging to a different tenant, **When** they attempt to archive it, **Then** they receive a not-found response — identical in status code, shape, and content to the response for a non-existent property.
2. **Given** a cross-tenant archive attempt, **When** the request is processed, **Then** no data belonging to any tenant is modified — the operation has zero side effects.
3. **Given** a comparison of the not-found response for a cross-tenant ID and the not-found response for a genuinely absent ID, **Then** they are byte-for-byte identical — no field, header, or timing characteristic reveals the difference.

---

### User Story 3 — Idempotent Archive: Re-Archiving an Already-Archived Property (Priority: P2)

A landlord sends the archive request for a property they already archived — whether by accident, by retrying a failed request, or through a client-side race condition. The system must accept the second (and subsequent) archive requests as if they were the first: return a success response without error.

**Why this priority**: Idempotency is essential for safe retries. If the first archive request succeeds but the client does not receive the confirmation (network timeout, etc.), the client must be able to safely retry without hitting an error. Without idempotency, retry logic would break.

**Independent Test**: Can be fully tested by archiving a property, then archiving the same property a second time and confirming both requests return identical success responses.

**Acceptance Scenarios**:

1. **Given** a landlord who has previously archived a property, **When** they send the archive request again for the same property, **Then** they receive the same success response as the first archive — no error is returned.
2. **Given** the same archived property archived a third time, **When** the request is processed, **Then** the success response is consistent — the operation is safe to repeat any number of times.
3. **Given** the state of the system after multiple archive requests for the same property, **Then** the property remains archived exactly once — no duplicate records or unexpected state changes occur.

---

### User Story 4 — Archived Properties Invisible Across All Queries (Priority: P1)

An archived property must become completely invisible to all subsequent queries — it must not appear in the property list, must not be retrievable by ID, and must not be updatable. This ensures that archiving has consistent, predictable effects across the entire property management surface.

**Why this priority**: If archiving is inconsistently enforced — appearing in some queries but not others — the feature loses its value and creates confusion. The archived state must be honoured universally.

**Independent Test**: After archiving a property, attempt to access it through every available property query — list, detail, and update — and confirm all return not-found or exclude the property.

**Acceptance Scenarios**:

1. **Given** a property that has been archived, **When** any user in that tenant workspace requests the property list, **Then** the archived property does not appear in the results or in the total count.
2. **Given** an archived property, **When** any user requests the property's details by ID, **Then** they receive a not-found response.
3. **Given** an archived property, **When** any user attempts to update it, **Then** they receive a not-found response — an archived property cannot be modified.

---

### Edge Cases

- What if the property ID format is invalid or malformed? → Return not-found; the system treats any unresolvable ID as absent within the tenant's scope.
- What if a property is archived while a concurrent request is reading or updating it? → The concurrent request may succeed or return not-found depending on timing; no data corruption occurs. No special handling is required in this story.
- Can an archived property be restored (un-archived)? → Out of scope for this story. Restoration is not implemented. Once archived, the property remains archived unless explicitly restored through a future feature.
- What happens to units that belong to an archived property? → **DEFERRED SCOPE (see below)**: Units are not affected by this story. They remain in the database and are not cascade-archived. The Unit Management epic (Epic 9) must address the relationship between archived properties and their units before unit listing is released. This creates a known pending concern: a unit listing for an archived property's ID may return results if the query does not check the parent property's archived state.
- What if the tenant has no properties at all? → Archive for a non-existent ID returns not-found, regardless of the tenant's property count.
- What if archiving is called without a request body? → No request body is expected or accepted. The operation is driven entirely by the path ID and the authenticated tenant context.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow an authenticated tenant user to archive a property they own by its unique identifier.
- **FR-002**: Archiving MUST mark the property record as archived with a timestamp — the record MUST be retained in the data store and MUST NOT be permanently deleted.
- **FR-003**: An archived property MUST be excluded from all property list results and MUST NOT be retrievable by its ID through normal read operations.
- **FR-004**: An archived property MUST NOT be updatable — update operations on an archived property MUST return a not-found response.
- **FR-005**: System MUST return a success response with no body when archiving succeeds.
- **FR-006**: System MUST return a not-found response when the requested property does not exist within the requesting user's tenant workspace.
- **FR-007**: System MUST return a not-found response when the requested property exists in the system but belongs to a different tenant — this response MUST be identical in all observable characteristics to the response for a genuinely absent property (FR-006 and FR-007 responses must be indistinguishable).
- **FR-008**: Archiving an already-archived property MUST succeed silently — the system MUST return the same success response as the initial archive, with no error or indication that the property was already archived.
- **FR-009**: The tenant context MUST be derived exclusively from the authenticated session. Tenant identity supplied via request path, body, or query string has no effect on the operation's scope.
- **FR-010**: The endpoint MUST be documented in the API reference with success response, not-found response, authentication requirements, and the idempotency guarantee.
- **FR-011**: System MUST include automated test coverage for: the successful archive case, the not-found case, the cross-tenant case (verified as indistinguishable from not-found), and the already-archived idempotent case.

### Deferred Scope — Unit Cascade Behaviour (EXPLICIT DEFERRAL)

> ⚠️ **Known Pending Concern**: Archiving a property does not cascade to its associated units in this story. Units belonging to an archived property remain in the data store and are not archived. The Unit Management epic (Epic 9) MUST address whether: (a) units under an archived property should themselves be archived or hidden, (b) creating new units under an archived property should be rejected, and (c) listing units for an archived property's ID should return not-found or an empty list. Until Epic 9 resolves this, property archiving is an incomplete lifecycle feature — it must not be presented to users as a final "deletion" action without the unit cascade caveat.

### Key Entities

- **Property**: The record being archived. Once archived, it acquires an archive timestamp and is excluded from all normal read and write operations within the tenant workspace. The record itself is retained for historical reference.
- **Tenant Workspace**: The data boundary scoped to the requesting tenant. Archiving operates within and is enforced by this boundary — properties outside it are treated as non-existent.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An authenticated landlord can archive any active property in their workspace in a single request, receiving a success response with no body.
- **SC-002**: Zero cross-tenant archives succeed — a property belonging to a different tenant returns the same not-found response as a non-existent property, 100% of the time.
- **SC-003**: Re-archiving an already-archived property returns a success response 100% of the time — no errors, no state changes beyond the initial archive timestamp.
- **SC-004**: An archived property does not appear in any subsequent property list query for any user in that tenant workspace — verified by querying before and after archiving.
- **SC-005**: An archived property returns a not-found response when retrieved directly by ID — verified by requesting the property detail immediately after archiving.
- **SC-006**: An archive request completes in under 500 milliseconds under normal operating conditions.
- **SC-007**: The archive endpoint is visible and testable in the API reference with documented success, not-found, and authentication responses.

---

## Assumptions

- The property data model already supports tracking an archive timestamp; the mechanism for recording this timestamp is already in place.
- All existing property read operations (list, detail) already filter out archived records; this story does not need to modify those queries.
- Archiving is a one-way operation in this story — no restore or un-archive capability is included.
- Any authenticated member of a tenant workspace may archive any property within that workspace; no sub-role permission distinction applies to this operation.
- No request body is sent with the archive request — the operation is fully specified by the URL path and the authenticated tenant context.
- Notifications, webhooks, and audit logging are out of scope for this story.
- The relationship between an archived property and its associated units is explicitly deferred to the Unit Management epic (Epic 9), as documented in the Deferred Scope section above.
