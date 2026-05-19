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

- TODO: Add the user's Phase 1 execution prompt here.

### Implementation Summary

- TODO: Summarize database configuration, entities, migrations, and validation bootstrap.

### Files Changed

- TODO: List files created or modified.

### Business Rules Covered

- TODO: List constraints implemented during this phase.

### Verification

- TODO: List commands/tests run and results.

### Follow-ups

- TODO: List unresolved items or next-phase handoffs.

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
