# Code Review Standards

This document defines the review criteria, reviewer expectations, feedback style, and approval workflow for backend pull requests.

---

## Scope

These standards apply to:

- Backend application code (`backend/src`)
- Backend tests (`backend/test`, `*.spec.ts`, `*.e2e-spec.ts`)
- Backend documentation (`backend/docs`)
- Infrastructure changes tied to backend behavior

---

## Review Criteria

Every review should evaluate:

- Correctness: Does the change satisfy the issue and preserve existing behavior?
- Security: Are auth, validation, secrets, and sensitive data handled safely?
- Reliability: Are failure paths, retries, and edge cases handled?
- Performance: Does the change introduce heavy queries, N+1 patterns, or extra latency?
- Maintainability: Is the code readable, typed, and aligned with module boundaries?
- Test quality: Are tests meaningful, deterministic, and scoped to the change?
- Documentation: Are API docs, runbooks, and references updated where required?

---

## Reviewer Responsibilities

Reviewers are expected to:

- Review for behavior and risk, not only style.
- Validate that tests cover the primary path and important edge cases.
- Confirm API and docs updates when contracts or behavior changed.
- Mark blocking issues clearly and explain impact.
- Acknowledge resolved comments after verification.
- Escalate architecture-level concerns to module owners early.

Author responsibilities:

- Keep PRs focused and reasonably sized.
- Provide clear context, risk notes, and testing evidence.
- Respond to review comments within the review timeline.
- Avoid force-push patterns that obscure reviewer context unless needed.

---

## Feedback Guidelines

Use feedback that is specific, respectful, and actionable.

Preferred format:

1. Observation: what is risky or unclear.
2. Impact: why it matters.
3. Proposal: concrete alternative or question.

Good feedback examples:

- "This query loads all tenant records without pagination; that can time out in production. Can we add `limit` and `cursor` support?"
- "The endpoint returns `200` on validation failure. This should be `400` to align with API standards and client error handling."

Poor feedback examples:

- "This is wrong."
- "Please fix."

---

## Approval Process

- Minimum approvals: at least 1 approval from a backend maintainer.
- Required checks: CI must pass (lint, typecheck, tests, build).
- Blocking comments: all blocking comments must be resolved before merge.
- Self-approval is not allowed.
- Draft PRs cannot be merged until marked ready for review.

Recommended merge policy:

- Prefer squash merge for small focused PRs.
- Use merge commits when preserving a meaningful commit history is important.

---

## Review Timeline

- Initial review target: within 1 business day.
- Follow-up review target: within 1 business day after author updates.
- Hotfix/incident PRs: expedite and prioritize same-day review.

If a review is blocked longer than 1 business day, ping reviewers in the project channel and tag the module owner.

---

## Conflict Resolution

When reviewer and author disagree:

1. Clarify goals and constraints in the PR thread.
2. Compare options with tradeoffs (correctness, risk, complexity, time).
3. If unresolved, escalate to the team lead or architecture owner for a decision.
4. Document the final decision in the PR for future reference.

---

## Tools

- GitHub Pull Requests for review discussion and approvals.
- CODEOWNERS for module ownership routing.
- GitHub labels for priority and risk tagging.
- Draft PRs for early feedback before final approval.

---

## Automation

Automated checks should catch baseline quality issues before human review:

- Formatting and linting
- Type safety checks
- Unit and integration tests
- Build verification
- Security or dependency scanning where configured

Reviewers should focus human effort on correctness, behavior, and architecture once automation passes.

---

## Review Training

- New contributors should shadow at least 2 full PR reviews.
- Maintainers should model high-signal comments with clear rationale.
- Teams should periodically review merged PRs to calibrate standards.

---

## Code Review Checklist

- [ ] PR scope and description are clear.
- [ ] Change implements issue requirements without unrelated edits.
- [ ] Security, privacy, and authorization impacts were reviewed.
- [ ] Error handling and edge cases are covered.
- [ ] Tests are sufficient and deterministic.
- [ ] Documentation and API contracts are updated where needed.
- [ ] CI checks are passing.
- [ ] Blocking comments are resolved before approval.
