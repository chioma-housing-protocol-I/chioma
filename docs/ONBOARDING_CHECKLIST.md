# Onboarding Checklist

A concrete, checkable task list for a new contributor's first day and first
week. For *why* each step exists (coding standards, PR process, commit
format), see [`CONTRIBUTOR_GUIDELINES.md`](CONTRIBUTOR_GUIDELINES.md); this
page is the "what to actually do, in order" companion to it.

## Day 1: setup, read docs, run tests

- [ ] Clone the repo and run through [`QUICKSTART.md`](../QUICKSTART.md)
      end to end: Postgres + Redis via Docker, backend `pnpm install` +
      migrations, frontend `pnpm install`, both dev servers running.
- [ ] Read, in this order:
  1. [Root README](../README.md), for the overall product and repo layout.
  2. [`docs/GLOSSARY.md`](GLOSSARY.md), so domain terms (booking, escrow,
     dispute, agreement, rate limiting, ...) read naturally everywhere else.
  3. [`docs/DECISION_LOG.md`](DECISION_LOG.md), for *why* the stack looks
     the way it does, so you don't propose re-litigating a settled decision
     without realizing it already has an ADR.
  4. [`CONTRIBUTOR_GUIDELINES.md`](CONTRIBUTOR_GUIDELINES.md) in full,
     especially Coding Standards and Commit Convention.
- [ ] Run the backend test suite (`cd backend && pnpm test`) and the
      frontend test suite (`cd frontend && pnpm test`) locally, confirm
      both pass on a clean checkout before you change anything, so you can
      tell your own changes apart from pre-existing failures later.
- [ ] Open the Swagger/OpenAPI docs for the running backend and the running
      frontend in a browser; click through one flow of each (e.g. browse
      properties on the frontend, hit `GET /api/v1/properties` directly).
- [ ] Join the project's Telegram (linked in
      [`CONTRIBUTOR_GUIDELINES.md`](CONTRIBUTOR_GUIDELINES.md#first-steps))
      and introduce yourself.

## Week 1: first PR

- [ ] Pick one `good-first-issue`-labeled issue (see
      [`CONTRIBUTOR_GUIDELINES.md`](CONTRIBUTOR_GUIDELINES.md#first-steps)
      for where to look) and comment on it to claim it before starting.
- [ ] Create a feature branch following the naming convention in
      [`CONTRIBUTOR_GUIDELINES.md`](CONTRIBUTOR_GUIDELINES.md#2-create-a-feature-branch).
- [ ] Make the change, with tests. Run the relevant test suite and linter
      locally before pushing, not just at CI time.
- [ ] Commit using the project's commit convention (see
      [`CONTRIBUTOR_GUIDELINES.md`](CONTRIBUTOR_GUIDELINES.md#commit-convention)).
- [ ] Open a PR against the correct base branch, using the PR template, and
      fill in every section (not just the title).
- [ ] Respond to review feedback; don't force-push over a reviewer's
      in-progress review without flagging it first.
- [ ] After merge: delete your branch, pull the latest base branch, and
      pick your next issue.

## If you get stuck

- Check [`docs/adr/`](adr/) first: your question about "why does X work
  this way" is often already answered there.
- Ask in Telegram rather than guessing silently for more than ~30 minutes
  on an environment/setup problem; onboarding friction you hit is friction
  the next contributor will hit too, so it's worth surfacing.
