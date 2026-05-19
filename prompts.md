# IssueFlow AI Prompts and Outcomes

This file documents the AI-assisted development journey for IssueFlow. Update it at the end of each phase with the prompts used, decisions made, files changed, verification performed, and any follow-up work.

## Model Used

- Primary model: GPT-5.5
- Environment: Cursor Cloud autonomous coding agent

## Architecture Methodology

- Treat the README API table as the external implementation contract.
- Treat the IssueFlow requirements PDF as the source of business constraints.
- Implement the system phase by phase according to `DEVELOPMENT_PLAN.md`.
- Preserve strict domain boundaries between NestJS modules.
- Keep controllers thin and place business rules in services.
- Use TypeORM and PostgreSQL for persistence.
- Use transactions for multi-record state changes and audit logging.
- Enforce business invariants through service-level checks and DTO validation.
- Add focused tests for high-risk behavior before considering a phase complete.

## Global Requirement Notes

- All protected APIs require JWT authentication.
- Tickets and comments require optimistic-locking protection for concurrent updates.
- Ticket status transitions are forward-only: `TODO -> IN_PROGRESS -> IN_REVIEW -> DONE`.
- Tickets cannot be updated after reaching `DONE`.
- Tickets cannot transition to `DONE` with unresolved blockers.
- Projects and tickets use soft delete only.
- All state-changing actions require append-only audit log entries.
- Automated actions such as auto-assignment and auto-escalation use actor `SYSTEM`.
- Mentions are matched case-insensitively.
- Auto-escalation changes priority and overdue state only; it never changes status.

## Phase 0: Requirements and Planning

### Prompt(s)

- Initial request: review the attached IssueFlow requirements PDF and inspect the skeleton repository without writing code.
- Planning request: create `DEVELOPMENT_PLAN.md` with phases, file checklists, and explicit business constraints.
- Rules/template request: generate `.cursorrules` and initialize this `prompts.md` template.

### Outcome

- Confirmed the repository is a minimal NestJS skeleton with TypeORM/PostgreSQL dependencies and `compose.yml`, but no active TypeORM configuration or domain modules.
- Created `DEVELOPMENT_PLAN.md`.
- Created `.cursorrules`.
- Initialized `prompts.md`.

### Decisions and Open Questions

- Credential model must be resolved because login requires a password but the user creation example omits one.
- Project-linked developer modeling must be resolved because auto-assignment mentions users linked to the project but the README does not define membership endpoints.

### Verification

- Documentation-only changes; no application tests required.

## Phase 1: DB and Entities

### Prompt(s)

- Execute Phase 1: Project Foundation, Database Configuration, and Entities exactly as described in `DEVELOPMENT_PLAN.md`.
- Implement TypeORM PostgreSQL configuration in `AppModule`, ensure the connection loads correctly, and create core entities with relationships, soft-delete fields, and optimistic-locking version columns.
- Provide guidance for running `npm run start:dev` and verifying database table generation.

### Implementation Summary

- Added TypeORM PostgreSQL configuration with environment-variable defaults matching `compose.yml`.
- Enabled development schema synchronization by default through `TYPEORM_SYNCHRONIZE=true`.
- Added a global Nest validation pipe with transformation, whitelist, and non-whitelisted property rejection.
- Added shared enum definitions for user roles, ticket status, ticket priority, ticket type, audit actions, audit entity types, and audit actors.
- Added a shared base entity with generated ID, `createdAt`, and `updatedAt` columns.
- Added core TypeORM entities and relationships for users, projects, tickets, comments, ticket dependencies, and audit logs.
- Added `@VersionColumn` to tickets and comments for optimistic-locking support.
- Added soft-delete support for projects and tickets through `@DeleteDateColumn`.

### Files Changed

- `.env.example`
- `src/app.module.ts`
- `src/main.ts`
- `src/audit-logs/audit-log.entity.ts`
- `src/comments/comment.entity.ts`
- `src/common/entities/base.entity.ts`
- `src/common/enums/audit-action.enum.ts`
- `src/common/enums/audit-actor.enum.ts`
- `src/common/enums/audit-entity-type.enum.ts`
- `src/common/enums/ticket-priority.enum.ts`
- `src/common/enums/ticket-status.enum.ts`
- `src/common/enums/ticket-type.enum.ts`
- `src/common/enums/user-role.enum.ts`
- `src/config/database.config.ts`
- `src/projects/project.entity.ts`
- `src/tickets/ticket-dependency.entity.ts`
- `src/tickets/ticket.entity.ts`
- `src/users/user.entity.ts`

### Business Rules Covered

- User roles are represented as `ADMIN` and `DEVELOPER`.
- Ticket statuses are represented as `TODO`, `IN_PROGRESS`, `IN_REVIEW`, and `DONE`.
- Ticket priorities are represented as `LOW`, `MEDIUM`, `HIGH`, and `CRITICAL`.
- Ticket types are represented as `BUG`, `FEATURE`, and `TECHNICAL`.
- Tickets belong to exactly one project.
- Comments belong to exactly one ticket and one author.
- Projects and tickets have soft-delete columns.
- Tickets and comments have version columns to support optimistic locking in later service logic.
- Audit logs capture action, entity type, entity ID, actor, optional performer, metadata, and timestamp.

### Verification

- `npm install --no-package-lock` completed successfully to install existing project dependencies in the cloud environment.
- `npm run build` passed.
- Local verification was completed by the project owner after pulling the Phase 1 branch:
  - `docker compose up -d db` started PostgreSQL successfully.
  - `npm run start:dev` started the NestJS application successfully.
  - TypeORM connected to PostgreSQL and generated the schema successfully.
  - Core tables were verified in PostgreSQL, including `users`, `projects`, `tickets`, `comments`, `ticket_dependencies`, and `audit_logs`.
  - `tickets.version` and `comments.version` were verified for optimistic-locking support.
  - `tickets.deleted_at` and `projects.deleted_at` were verified for soft-delete support.
- Phase 1 was approved after local database bootstrap verification.

### Follow-ups

- Implement service-level optimistic-lock checks when ticket and comment update endpoints are added.
- Resolve the credential model during Phase 2 because the auth API requires a password but the README user creation example does not include one.

## Phase 2: Auth

### Prompt(s)

- TODO: Add the user's Phase 2 execution prompt here.

### Implementation Summary

- TODO: Summarize JWT login/logout/me, guards, roles, and credential decisions.

### Files Changed

- TODO: List files created or modified.

### Business Rules Covered

- TODO: List constraints implemented during this phase.

### Verification

- TODO: List commands/tests run and results.

### Follow-ups

- TODO: List unresolved items or next-phase handoffs.

## Phase 3: Core API

### Prompt(s)

- TODO: Add the user's Phase 3 execution prompt here.

### Implementation Summary

- TODO: Summarize users, projects, tickets, and comments CRUD implementation.

### Files Changed

- TODO: List files created or modified.

### Business Rules Covered

- TODO: List constraints implemented during this phase.

### Verification

- TODO: List commands/tests run and results.

### Follow-ups

- TODO: List unresolved items or next-phase handoffs.

## Phase 4: Business Rules and Concurrency

### Prompt(s)

- TODO: Add the user's Phase 4 execution prompt here.

### Implementation Summary

- TODO: Summarize state machine, optimistic locking, audit logging, and rule enforcement.

### Files Changed

- TODO: List files created or modified.

### Business Rules Covered

- TODO: List constraints implemented during this phase.

### Verification

- TODO: List commands/tests run and results.

### Follow-ups

- TODO: List unresolved items or next-phase handoffs.

## Phase 5: Extended Features

### Prompt(s)

- TODO: Add the user's Phase 5 execution prompt here.

### Implementation Summary

- TODO: Summarize dependencies, attachments, CSV import/export, soft-delete restore, mentions, auto-escalation, and auto-assignment.

### Files Changed

- TODO: List files created or modified.

### Business Rules Covered

- TODO: List constraints implemented during this phase.

### Verification

- TODO: List commands/tests run and results.

### Follow-ups

- TODO: List unresolved items or next-phase handoffs.

## Phase 6: Testing and Documentation

### Prompt(s)

- TODO: Add the user's Phase 6 execution prompt here.

### Implementation Summary

- TODO: Summarize final tests, `run.md`, README updates if any, and final prompt documentation updates.

### Files Changed

- TODO: List files created or modified.

### Business Rules Covered

- TODO: List constraints verified or documented during this phase.

### Verification

- TODO: List commands/tests run and results.

### Follow-ups

- TODO: List unresolved items, residual risks, or final submission notes.
