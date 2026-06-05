# SpecKit Workflow with Claude Code

## Overview

SpecKit (GitHub Spec Kit) is installed in this project to enable Spec-Driven Development (SDD) with Claude Code.
It enforces a structured workflow — specify → plan → implement — so that features are fully scoped before any code is written.

- **SpecKit version**: 0.8.3
- **Integration**: Claude Code (`claude`)
- **CLI**: `specify` (installed via `uv tool install specify-cli`)

---

## How SpecKit Is Installed

SpecKit uses the `specify` CLI to manage its project configuration.

```powershell
# Check integration status
pnpm speckit:status
# or directly:
specify integration list

# Upgrade the Claude integration if a new version is released
pnpm speckit:upgrade
```

The core project config lives in `.specify/` and is committed to the repo.
The Claude Code integration adds slash skills under `.claude/skills/`.

---

## Slash Skills (Claude Code)

Once in a Claude Code session, the following skills are available:

| Skill | How to invoke | Purpose |
|---|---|---|
| `speckit-constitution` | `/speckit-constitution` | Review/update governing project principles |
| `speckit-specify` | `/speckit-specify <description>` | Create a feature spec from a natural language description |
| `speckit-clarify` | `/speckit-clarify` | Resolve ambiguities in an existing spec |
| `speckit-plan` | `/speckit-plan` | Generate a technical implementation plan from the spec |
| `speckit-tasks` | `/speckit-tasks` | Break the plan into discrete implementation tasks |
| `speckit-implement` | `/speckit-implement` | Execute implementation following the plan and tasks |
| `speckit-checklist` | `/speckit-checklist` | Validate spec or plan completeness |
| `speckit-analyze` | `/speckit-analyze` | Analyse consistency between spec, plan, and tasks |
| `speckit-taskstoissues` | `/speckit-taskstoissues` | Convert tasks to GitHub issues |

---

## Recommended Workflow for New Features (Sprint 2+)

Follow this sequence strictly. Do **not** jump to implement before the plan is approved.

### 1. Specify

```
/speckit-specify <brief natural language description of the feature>
```

Claude will create `specs/<NNN>-<name>/spec.md` and a requirements checklist.
Review the spec and ensure all `[NEEDS CLARIFICATION]` markers are resolved.

### 2. Clarify (if needed)

```
/speckit-clarify
```

Use this if the spec still has open questions. It runs a structured Q&A to fill gaps before planning.

### 3. Plan

```
/speckit-plan
```

Claude will read the spec and create `specs/<NNN>-<name>/plan.md`.
The plan includes a Constitution Check — verify all LeaseKo architecture rules are satisfied before approving.

**Do not start implementation until the plan is reviewed and approved.**

### 4. Tasks

```
/speckit-tasks
```

Claude will create `specs/<NNN>-<name>/tasks.md` with discrete implementation steps.

### 5. Implement

```
/speckit-implement
```

Claude will implement the feature following the plan and tasks.
Only run this after the plan and tasks are approved.

### 6. Validate

After implementation, run:

```powershell
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

### 7. Update BACKLOG.md

Update `BACKLOG.md` **only after** all validation commands pass.
This is a project rule — the backlog tracks verified implemented features.

---

## File Structure

```
specs/
  <NNN>-<feature-name>/
    spec.md          ← Feature specification (product-level, no implementation details)
    plan.md          ← Technical implementation plan
    tasks.md         ← Discrete implementation tasks
    research.md      ← Background research (optional)
    data-model.md    ← Data model notes (optional)
    quickstart.md    ← Quickstart notes (optional)
    checklists/
      requirements.md  ← Spec quality checklist
    contracts/
      *.md             ← API contracts, interface definitions

.specify/
  memory/
    constitution.md   ← LeaseKo project constitution (architecture rules)
  templates/          ← Spec/plan/tasks templates
  scripts/powershell/ ← Helper scripts
  extensions/         ← Git extension commands
  integrations/
    speckit.manifest.json   ← Core SpecKit install manifest
    claude.manifest.json    ← Claude Code integration manifest
    # .cache/ is git-ignored (auto-downloaded catalog)

.claude/
  skills/
    speckit-*/SKILL.md  ← Claude Code slash skill definitions
```

---

## What Should Be Committed

| Path | Commit? | Reason |
|---|---|---|
| `specs/**` | Yes | Feature specs are the source of truth |
| `.specify/memory/constitution.md` | Yes | Project-wide architecture principles |
| `.specify/templates/` | Yes | Shared spec/plan/tasks templates |
| `.specify/scripts/` | Yes | Helper scripts |
| `.specify/extensions/` | Yes | Git extension config |
| `.specify/integrations/speckit.manifest.json` | Yes | Core install metadata |
| `.specify/integrations/claude.manifest.json` | Yes | Claude integration metadata |
| `.specify/feature.json` | Yes | Tracks the current active feature directory |
| `.specify/init-options.json` | Yes | Project initialization options |
| `.claude/skills/` | Yes | Claude Code slash skills |

## What Should Stay Local / Not Be Committed

| Path | Reason |
|---|---|
| `.specify/integrations/.cache/` | Auto-downloaded catalog — already in `.gitignore` |

---

## Git Extension Commands

The SpecKit git extension is also installed. These commands are available in Copilot (if ever re-enabled) and as reference scripts in `.specify/extensions/git/`:

- `speckit.git.feature` — create a feature branch
- `speckit.git.commit` — auto-commit after a SpecKit command
- `speckit.git.initialize` — initialize a git repo for SpecKit
- `speckit.git.remote` — set up remote tracking
- `speckit.git.validate` — validate git state

These are in `.github/agents/` as Copilot-style agents (legacy, not used by Claude Code directly).

---

## Constitution

The LeaseKo constitution at [`.specify/memory/constitution.md`](../.specify/memory/constitution.md) defines the non-negotiable architecture rules.
Every `plan.md` includes a **Constitution Check** section. All items must pass before implementation starts.

Key rules:
- All business logic in NestJS backend only
- Clean Architecture: domain → application → infrastructure → presentation
- `tenantId` from verified JWT context only (never from body/query/header)
- Prisma only through repository interfaces
- Every table has `tenant_id` with indexed column
- `BACKLOG.md` updated only after verified implementation

---

## Sprint 2 — Next Steps

The next Sprint 2 feature to specify/implement is: **Property Data Model & Prisma Migration**.

Before starting:
1. Create a new branch: `git checkout -b feature/property-data-model`
2. Run `/speckit-specify Property Data Model with Prisma migration for landlord property management`
3. Review the generated spec
4. Run `/speckit-plan`
5. Get plan approved
6. Run `/speckit-implement`
