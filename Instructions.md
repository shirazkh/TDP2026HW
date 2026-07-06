# IssueFlow Agent Instructions and Guardrails

This document records the project-level instructions, design standards, and business guardrails that guided the AI-assisted implementation of IssueFlow. These instructions were derived from the requirements PDF, the approved `DEVELOPMENT_PLAN.md`, and the repository-level `.cursorrules` file.

## Source of Truth

- Treat the README API table as the external implementation contract.
- Treat the IssueFlow requirements PDF as the business-rule authority.
- Implement the backend as a NestJS TypeScript service using TypeORM and PostgreSQL.
- Keep implementation choices aligned with `DEVELOPMENT_PLAN.md`.
- Keep documentation current in `prompts.md` and `run.md`.

## Architecture Standards

- Keep controllers thin.
  - Controllers should handle routing, guards, request DTOs, response DTOs, and request-context extraction.
  - Business logic belongs in services.
- Use domain modules that match ownership boundaries:
  - `auth`
  - `users`
  - `projects`
  - `tickets`
  - `comments`
  - `audit-logs`
  - shared `common` and `config`
- Prefer explicit service methods for domain rules such as:
  - Ticket status transitions.
  - Optimistic-locking checks.
  - Audit logging.
  - Mention extraction.
  - Auto-assignment.
  - Auto-escalation.
- Use TypeORM repositories for persistence.
- Use transactions where multi-entity state changes must be atomic with audit logging.
- Do not introduce unrelated frameworks or abstractions outside the approved NestJS/TypeORM/PostgreSQL stack.

## Code Style Standards

- Write TypeScript with explicit types for DTOs, services, entities, and response mappers.
- Use `class-validator` DTOs for request validation.
- Reject non-whitelisted request fields through the global validation pipe.
- Use response mappers so internal fields are not leaked.
- Keep naming consistent with NestJS conventions:
  - `*.module.ts`
  - `*.controller.ts`
  - `*.service.ts`
  - `*.entity.ts`
  - `dto/*.dto.ts`
  - `*.spec.ts`
- Keep comments rare and focused on non-obvious business rules.
- Prefer structured libraries and framework features over ad hoc parsing.

## Persistence Rules

- Configure PostgreSQL through TypeORM using defaults compatible with `compose.yml`.
- Use generated IDs and timestamp columns on core entities.
- Use enum columns for constrained values.
- Add `@VersionColumn` to records requiring optimistic locking:
  - Tickets.
  - Comments.
- Add soft-delete support for:
  - Projects.
  - Tickets.
- Store audit logs as append-only records.
- Store revoked JWT tokens by hash, not by raw token value.

## Authentication and Authorization Rules

- Protect all API endpoints with JWT authentication unless explicitly public.
- `POST /auth/login` is public.
- `POST /auth/logout` invalidates the current token using a server-side deny-list.
- `GET /auth/me` returns the authenticated user's profile.
- Use role-based authorization for ADMIN-only endpoints.
- `GET /audit-logs` is ADMIN-only.
- Passwords must be hashed with bcrypt.
- The fallback password `Password123!` exists only to preserve the assignment README contract, which omits a password field during user creation while still requiring `/auth/login`.
- The fallback password is a documented assignment compatibility decision, not a production credential strategy.

## Core API Rules

- Implement endpoints according to the README API paths and response shapes.
- Users API:
  - `GET /users`
  - `GET /users/:userId`
  - `POST /users`
  - `POST /users/update/:userId`
  - `DELETE /users/:userId`
- Projects API:
  - `GET /projects`
  - `GET /projects/:projectId`
  - `POST /projects`
  - `PATCH /projects/:projectId`
  - `DELETE /projects/:projectId`
- Tickets API:
  - `GET /tickets?projectId=:projectId`
  - `GET /tickets/:ticketId`
  - `POST /tickets`
  - `PATCH /tickets/:ticketId`
  - `DELETE /tickets/:ticketId`
- Comments API:
  - `GET /tickets/:ticketId/comments`
  - `POST /tickets/:ticketId/comments`
  - `PATCH /tickets/:ticketId/comments/:commentId`
  - `DELETE /tickets/:ticketId/comments/:commentId`
- Standard project and ticket reads must hide soft-deleted records.
- Project and ticket delete endpoints must use soft delete.
- Do not expose hard-delete behavior for projects or tickets.

## Validation Rules

- User roles are limited to:
  - `ADMIN`
  - `DEVELOPER`
- Ticket statuses are limited to:
  - `TODO`
  - `IN_PROGRESS`
  - `IN_REVIEW`
  - `DONE`
- Ticket priorities are limited to:
  - `LOW`
  - `MEDIUM`
  - `HIGH`
  - `CRITICAL`
- Ticket types are limited to:
  - `BUG`
  - `FEATURE`
  - `TECHNICAL`
- Reject invalid enum values before they reach business logic.
- Validate numeric identifiers and ISO-8601 date fields through DTOs.

## Ticket State Machine Rules

- Ticket status progression is strictly forward-only:
  - `TODO -> IN_PROGRESS -> IN_REVIEW -> DONE`
- Reject backward transitions.
- Reject skipped transitions.
- Reject any update to a ticket already in `DONE`.
- Reject soft-delete attempts on a `DONE` ticket.
- Before moving a ticket to `DONE`, verify that it has no unresolved blockers.
- A blocker is unresolved when the blocking ticket status is not `DONE`.
- Throw an informative `BadRequestException` for invalid state transitions.

## Optimistic Locking Rules

- Ticket updates must require and validate an expected `version`.
- Comment updates must require and validate an expected `version`.
- Stale ticket updates must fail with `ConflictException`.
- Stale comment updates must fail with `ConflictException`.
- Update operations must include version criteria so concurrent stale writes cannot silently overwrite newer data.
- Do not bypass version checks in mutation services.

## Audit Logging Rules

- Audit logs are append-only.
- Record state-changing actions for:
  - Users.
  - Projects.
  - Tickets.
  - Comments.
  - Automated system actions.
- Audit records must include:
  - Action.
  - Entity type.
  - Entity ID.
  - Actor type.
  - Performing user ID when applicable.
  - Timestamp.
  - Metadata when useful.
- Use `actor = USER` for authenticated user actions.
- Use `actor = SYSTEM` for automated actions such as auto-assignment and auto-escalation.
- Support audit log filtering by:
  - `entityType`
  - `entityId`
  - `action`
  - `actor`

## Extended Feature Guardrails

### Ticket Dependencies

- A ticket cannot transition to `DONE` while blocked by unresolved tickets.
- Both tickets in a dependency must belong to the same project when dependency management endpoints are implemented.

### Mentions

- Detect `@username` patterns in ticket descriptions and comments.
- Match mentions case-insensitively.
- Normalize duplicate mentions.
- Record detected mention usernames in audit metadata.

### Auto-Assignment

- Auto-assignment runs when a ticket is created without an assignee.
- Only `DEVELOPER` users are eligible.
- `ADMIN` users are excluded.
- Workload is the count of non-`DONE` tickets assigned to a developer within the same project.
- Choose the lowest-workload developer.
- Break ties by registration order, represented by ascending user ID.
- If no eligible developer exists, leave the ticket unassigned.
- Record auto-assignment with `actor = SYSTEM` and `action = AUTO_ASSIGN`.
- Because the README does not define project membership endpoints, the implemented candidate pool is all `DEVELOPER` users, with workload scoped to the target project.

### Auto-Escalation

- Escalation applies only to unresolved tickets with a past `dueDate`.
- Escalation must never change ticket status.
- Priority promotion order:
  - `LOW -> MEDIUM`
  - `MEDIUM -> HIGH`
  - `HIGH -> CRITICAL`
  - `CRITICAL -> CRITICAL`
- Set `isOverdue = true` when an overdue ticket reaches `CRITICAL`.
- Manual priority changes clear `isOverdue` so escalation can be re-evaluated from the new priority.
- Critical overdue tickets with `isOverdue = true` are idempotent and are not repeatedly audited.
- Record auto-escalation with `actor = SYSTEM` and `action = AUTO_ESCALATE`.

## Testing Standards

- Add focused tests for high-risk business rules.
- Required high-risk coverage includes:
  - Ticket stale-version conflicts.
  - Comment stale-version conflicts.
  - DONE ticket immutability.
  - Rejected skipped ticket transitions.
  - Rejected transition to `DONE` with unresolved blockers.
  - Mention extraction and normalization.
  - Auto-assignment selection and SYSTEM audit logging.
  - Auto-escalation without status changes.
  - Idempotent critical overdue escalation.
- Keep tests aligned with the README API paths and business-rule contracts.

## Documentation Standards

- `run.md` must explain:
  - Prerequisites.
  - Dependency installation.
  - `.env` setup.
  - PostgreSQL startup through Docker Compose.
  - Application startup.
  - Test commands.
  - Database verification commands.
- `prompts.md` must document:
  - Model used.
  - Architecture methodology.
  - Phase prompts.
  - Implementation outcomes.
  - Files changed.
  - Business rules covered.
  - Verification commands/results.
  - Follow-ups and residual risks.
- `Instructions.md` must summarize the global project rules and business guardrails for evaluators.
